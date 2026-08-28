/**
 * Jest globalSetup: ensures app_starter_test exists, applies Prisma migrations, and seeds.
 * Load .env.test so DATABASE_URL points at app_starter_test.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const apiRoot = path.resolve(__dirname, '..');

// Load test env (same order as jest.setup.js)
process.env.NODE_ENV = 'test';
// Match jest.setup.js: test env must win over any pre-set DATABASE_URL (override: true).
require('dotenv').config({
  path: path.join(apiRoot, '.env.test'),
  override: true,
});
require('dotenv').config({
  path: path.join(apiRoot, '.env.test.local'),
  override: true,
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('test-db-setup: DATABASE_URL is required in .env.test');
  process.exit(1);
}

// Parse DB name from URL (e.g. postgresql://user:pass@host:port/app_starter_test?schema=public -> app_starter_test)
const url = new URL(databaseUrl.replace(/^postgresql:\/\//, 'http://'));
const dbName = url.pathname.replace(/^\//, '').split('?')[0] || 'app_starter_test';

// Connect to default DB to create app_starter_test if needed
const defaultUrl = databaseUrl.replace(/\/[^/]*(\?|$)/, '/postgres$1');

async function ensureDatabase() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: defaultUrl });
  try {
    await client.connect();
    const res = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    if (res.rows.length === 0) {
      const safeName = `"${dbName.replace(/"/g, '""')}"`;
      await client.query(`CREATE DATABASE ${safeName}`);
      console.log(`Created database: ${dbName}`);
    }
  } finally {
    await client.end();
  }
}

function run(cmd, args, description) {
  console.log(`test-db-setup: ${description}...`);
  const r = spawnSync(cmd, args, {
    cwd: apiRoot,
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) {
    console.error(`test-db-setup: ${description} failed (exit ${r.status})`);
    process.exit(r.status);
  }
}

async function main() {
  await ensureDatabase();
  run('npx', ['prisma', 'migrate', 'deploy'], 'Applying migrations');
  run('npx', ['prisma', 'db', 'seed'], 'Seeding database');
  console.log('test-db-setup: done.');
}

/** Jest globalSetup: run before all tests. */
module.exports = () => main().catch((err) => {
  console.error('test-db-setup:', err);
  process.exit(1);
});

if (require.main === module) {
  main().catch((err) => {
    console.error('test-db-setup:', err);
    process.exit(1);
  });
}
