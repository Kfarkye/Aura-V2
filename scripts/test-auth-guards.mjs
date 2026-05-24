#!/usr/bin/env node

const baseUrlRaw = process.env.SERVICE_URL || process.argv[2];
if (!baseUrlRaw) {
  console.error('Missing SERVICE_URL. Usage: SERVICE_URL=https://... npm run test:auth-guards');
  process.exit(1);
}

const baseUrl = baseUrlRaw.replace(/\/+$/, '');

async function request(method, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: options.headers || {},
    body: options.body
  });

  const text = await response.text();
  return { status: response.status, text };
}

function assertStatus(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected HTTP ${expected}, got ${actual}`);
  }
}

async function main() {
  console.log(`Running auth guard checks against ${baseUrl}`);

  const deployNoAuth = await request('POST', '/api/mcp/deploy');
  assertStatus(deployNoAuth.status, 401, 'POST /api/mcp/deploy without auth');

  const deployBadAuth = await request('POST', '/api/mcp/deploy', {
    headers: { Authorization: 'Bearer invalid-secret' }
  });
  assertStatus(deployBadAuth.status, 401, 'POST /api/mcp/deploy with invalid bearer');

  const kalshiNoAuth = await request('POST', '/api/mcp/kalshi/execute');
  assertStatus(kalshiNoAuth.status, 401, 'POST /api/mcp/kalshi/execute without auth');

  const kalshiBadAuth = await request('POST', '/api/mcp/kalshi/execute', {
    headers: {
      Authorization: 'Bearer invalid-secret',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tool: 'get_markets', args: { limit: 1, status: 'open' } })
  });
  assertStatus(kalshiBadAuth.status, 401, 'POST /api/mcp/kalshi/execute with invalid bearer');

  const workspaceNoAuth = await request('POST', '/api/workspace/normalize', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'GMAIL' })
  });
  assertStatus(workspaceNoAuth.status, 401, 'POST /api/workspace/normalize without auth');

  const workspaceMutateAttempt = await request('POST', '/api/workspace/normalize', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'CALENDAR', action: 'create event' })
  });
  assertStatus(workspaceMutateAttempt.status, 403, 'POST /api/workspace/normalize with mutation intent');

  console.log('Auth guard checks passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
