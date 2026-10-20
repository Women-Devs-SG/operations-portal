import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { requirePassword } from '../lib/auth.mjs';
import apiNotFound from '../netlify/functions/api-not-found.mjs';

const PASSWORD = 'short';

async function withPassword(value, run) {
  const original = process.env.PORTAL_PASSWORD;
  if (value === undefined) delete process.env.PORTAL_PASSWORD;
  else process.env.PORTAL_PASSWORD = value;

  try {
    await run();
  } finally {
    if (original === undefined) delete process.env.PORTAL_PASSWORD;
    else process.env.PORTAL_PASSWORD = original;
  }
}

function request(password) {
  return new Request('https://portal.example/api/tasks', {
    headers: password === undefined ? {} : { 'X-Portal-Password': password },
  });
}

test('password validation fails closed and accepts only the configured value', async () => {
  await withPassword(undefined, async () => {
    assert.equal(requirePassword(request())?.status, 503);
  });
  await withPassword('', async () => {
    assert.equal(requirePassword(request())?.status, 503);
  });
  await withPassword(PASSWORD, async () => {
    assert.equal(requirePassword(request(PASSWORD)), null);
    assert.equal(requirePassword(request('other'))?.status, 401);
  });
});

test('unknown API handler returns JSON 404 without caching', async () => {
  const response = apiNotFound();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await response.json(), {
    status: 'error',
    message: 'API endpoint not found.',
  });
});

test('unknown API rewrite precedes the SPA fallback', () => {
  const config = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  const apiFallback = config.indexOf('from = "/api/*"');
  const spaFallback = config.indexOf('from = "/*"');

  assert.notEqual(apiFallback, -1);
  assert.notEqual(spaFallback, -1);
  assert.ok(apiFallback < spaFallback);
  assert.match(
    config.slice(apiFallback, spaFallback),
    /to = "\/\.netlify\/functions\/api-not-found"/,
  );
});
