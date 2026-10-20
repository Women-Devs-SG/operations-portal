import assert from 'node:assert/strict';
import test from 'node:test';
import createTask from '../netlify/functions/create-task.mjs';
import listTasks from '../netlify/functions/tasks.mjs';

const ENV_KEYS = [
  'DEMO_MODE',
  'DEMO_MODE_PREVIEW',
  'DEMO_DEPLOY_CONTEXT',
  'NETLIFY_DEV',
  'PORTAL_PASSWORD',
];

async function withEnvironment(values, run) {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  for (const key of ENV_KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }

  try {
    await run();
  } finally {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

function makeRequest(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://portal.example${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
}

const deployContext = (context) => ({ deploy: { context } });

async function readBody(response) {
  return response.json();
}

test('demo is disabled by default and for explicit false values', async () => {
  await withEnvironment({}, async () => {
    const tasksResponse = await listTasks(makeRequest('/api/tasks'));
    const createResponse = await createTask(
      makeRequest('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: 'Fictional test event' }),
      }),
    );
    assert.equal(tasksResponse.status, 503);
    assert.equal(createResponse.status, 503);
  });

  await withEnvironment({ DEMO_MODE: 'false' }, async () => {
    const response = await listTasks(makeRequest('/api/tasks'));
    assert.equal(response.status, 503);
  });
});

test('local Netlify Dev explicitly permits fixture-backed requests', async () => {
  await withEnvironment({ DEMO_MODE: '1', NETLIFY_DEV: 'true' }, async () => {
    const response = await listTasks(makeRequest('/api/tasks'), deployContext('dev'));
    const body = await readBody(response);
    assert.equal(response.status, 200);
    assert.equal(body.status, 'success');
    assert.equal(body.demoMode, true);
    assert.ok(body.tasks.length > 0);
  });
});

test('Deploy Preview requires the explicit server-side permission', async () => {
  await withEnvironment(
    {
      DEMO_MODE: '1',
      DEMO_MODE_PREVIEW: '1',
    },
    async () => {
      const response = await listTasks(makeRequest('/api/tasks'), deployContext('deploy-preview'));
      const body = await readBody(response);
      assert.equal(response.status, 200);
      assert.equal(body.status, 'success');
      assert.equal(body.demoMode, true);
      assert.ok(body.tasks.length > 0);
    },
  );
});

test('an absent preview authorization is not enough to enable demo mode', async () => {
  await withEnvironment({ DEMO_MODE: '1' }, async () => {
    const tasksResponse = await listTasks(makeRequest('/api/tasks'));
    const createResponse = await createTask(
      makeRequest('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: 'Fictional test event' }),
      }),
    );
    const body = await readBody(tasksResponse);

    assert.equal(tasksResponse.status, 503);
    assert.match(body.message, /DEMO_MODE/);
    assert.equal(createResponse.status, 503);
  });
});

test('preview permission without the runtime preview marker still refuses demo', async () => {
  // The double-misconfiguration case: both flags present but the runtime does
  // not prove this is a Deploy Preview. Fail closed rather than risk fixtures
  // in production.
  await withEnvironment({ DEMO_MODE: '1', DEMO_MODE_PREVIEW: '1' }, async () => {
    const tasksResponse = await listTasks(makeRequest('/api/tasks'));
    const createResponse = await createTask(
      makeRequest('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: 'Fictional test event' }),
      }),
    );
    assert.equal(tasksResponse.status, 503);
    assert.equal(createResponse.status, 503);
  });
});

test('production refuses demo even when preview variables leak into production', async () => {
  await withEnvironment(
    {
      DEMO_MODE: '1',
      DEMO_MODE_PREVIEW: '1',
      DEMO_DEPLOY_CONTEXT: 'deploy-preview',
      NETLIFY_DEV: 'true',
    },
    async () => {
      const tasksResponse = await listTasks(makeRequest('/api/tasks'), deployContext('production'));
      const createResponse = await createTask(
        makeRequest('/api/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }),
        deployContext('production'),
      );
      assert.equal(tasksResponse.status, 503);
      assert.equal(createResponse.status, 503);
    },
  );
});

test('explicit production with no preview authorization refuses demo', async () => {
  await withEnvironment({ DEMO_MODE: '1' }, async () => {
    const tasksResponse = await listTasks(makeRequest('/api/tasks'), deployContext('production'));
    const createResponse = await createTask(
      makeRequest('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
      deployContext('production'),
    );

    assert.equal(tasksResponse.status, 503);
    assert.equal(createResponse.status, 503);
  });
});

test('invalid demo and preview settings fail closed', async () => {
  await withEnvironment({ DEMO_MODE: 'yes', NETLIFY_DEV: 'true' }, async () => {
    const response = await listTasks(makeRequest('/api/tasks'));
    assert.equal(response.status, 503);
  });

  await withEnvironment(
    {
      DEMO_MODE: '1',
      DEMO_MODE_PREVIEW: 'true',
    },
    async () => {
      const response = await listTasks(makeRequest('/api/tasks'), deployContext('deploy-preview'));
      assert.equal(response.status, 503);
    },
  );

  await withEnvironment(
    {
      DEMO_MODE: '1',
      DEMO_MODE_PREVIEW: '1',
    },
    async () => {
      const response = await listTasks(makeRequest('/api/tasks'), deployContext('branch-deploy'));
      assert.equal(response.status, 503);
    },
  );
});

test('client-controlled values cannot grant preview demo permission', async () => {
  await withEnvironment({ DEMO_MODE: '1' }, async () => {
    const response = await listTasks(
      makeRequest('/api/tasks?DEMO_MODE_PREVIEW=1', {
        headers: { 'X-Demo-Mode-Preview': '1' },
      }),
    );
    assert.equal(response.status, 503);
  });
});

test('demo disabled preserves password enforcement on both endpoints', async () => {
  await withEnvironment({ DEMO_MODE: '0' }, async () => {
    const tasksResponse = await listTasks(makeRequest('/api/tasks'));
    const createResponse = await createTask(
      makeRequest('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: 'Fictional test event' }),
      }),
    );
    assert.equal(tasksResponse.status, 503);
    assert.equal(createResponse.status, 503);
  });

  await withEnvironment(
    { DEMO_MODE: '0', PORTAL_PASSWORD: 'a-long-enough-test-password' },
    async () => {
      const tasksResponse = await listTasks(makeRequest('/api/tasks'));
      const createResponse = await createTask(
        makeRequest('/api/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName: 'Fictional test event' }),
        }),
      );
      assert.equal(tasksResponse.status, 401);
      assert.equal(createResponse.status, 401);
    },
  );
});

test('preview demo serves fixtures and clearly refuses writes', async () => {
  await withEnvironment(
    {
      DEMO_MODE: '1',
      DEMO_MODE_PREVIEW: '1',
    },
    async () => {
      const response = await createTask(
        makeRequest('/api/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName: 'Fictional test event' }),
        }),
        deployContext('deploy-preview'),
      );
      const body = await readBody(response);
      assert.equal(response.status, 200);
      assert.match(body.message, /read-only/);
    },
  );
});
