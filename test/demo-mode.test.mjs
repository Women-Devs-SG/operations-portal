import assert from 'node:assert/strict';
import test from 'node:test';
import createTask from '../netlify/functions/create-task.mjs';
import listTasks from '../netlify/functions/tasks.mjs';

const ENV_KEYS = ['DEMO_MODE', 'DEMO_MODE_PREVIEW', 'NETLIFY_DEV', 'CONTEXT', 'PORTAL_PASSWORD'];

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
    const response = await listTasks(makeRequest('/api/tasks'));
    const body = await readBody(response);
    assert.equal(response.status, 200);
    assert.equal(body.status, 'success');
    assert.ok(body.tasks.length > 0);
  });
});

test('Deploy Preview requires the explicit server-side permission', async () => {
  await withEnvironment(
    { DEMO_MODE: '1', CONTEXT: 'deploy-preview', DEMO_MODE_PREVIEW: '1' },
    async () => {
      const response = await listTasks(makeRequest('/api/tasks'));
      const body = await readBody(response);
      assert.equal(response.status, 200);
      assert.equal(body.status, 'success');
      assert.ok(body.tasks.length > 0);
    },
  );
});

test('an absent CONTEXT is not enough to enable demo mode', async () => {
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

test('production refuses demo even with explicit preview and local flags', async () => {
  await withEnvironment(
    {
      DEMO_MODE: '1',
      DEMO_MODE_PREVIEW: '1',
      NETLIFY_DEV: 'true',
      CONTEXT: 'production',
    },
    async () => {
      const tasksResponse = await listTasks(makeRequest('/api/tasks'));
      const createResponse = await createTask(
        makeRequest('/api/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }),
      );
      assert.equal(tasksResponse.status, 503);
      assert.equal(createResponse.status, 503);
    },
  );
});

test('explicit production with no preview authorization refuses demo', async () => {
  await withEnvironment({ DEMO_MODE: '1', CONTEXT: 'production' }, async () => {
    const tasksResponse = await listTasks(makeRequest('/api/tasks'));
    const createResponse = await createTask(
      makeRequest('/api/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
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
    { DEMO_MODE: '1', CONTEXT: 'deploy-preview', DEMO_MODE_PREVIEW: 'true' },
    async () => {
      const response = await listTasks(makeRequest('/api/tasks'));
      assert.equal(response.status, 503);
    },
  );
});

test('client-controlled values cannot grant preview demo permission', async () => {
  await withEnvironment({ DEMO_MODE: '1', CONTEXT: 'deploy-preview' }, async () => {
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
    { DEMO_MODE: '1', CONTEXT: 'deploy-preview', DEMO_MODE_PREVIEW: '1' },
    async () => {
      const response = await createTask(
        makeRequest('/api/create-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName: 'Fictional test event' }),
        }),
      );
      const body = await readBody(response);
      assert.equal(response.status, 200);
      assert.match(body.message, /read-only/);
    },
  );
});
