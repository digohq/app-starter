/**
 * Jest globalTeardown: wipes app_starter_test by truncating all tables (schema remains, data removed).
 */
const path = require('path');
const { Client } = require('pg');

const apiRoot = path.resolve(__dirname, '..');

process.env.NODE_ENV = 'test';
require('dotenv').config({ path: path.join(apiRoot, '.env.test.local') });
require('dotenv').config({ path: path.join(apiRoot, '.env.test') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('test-db-teardown: DATABASE_URL is required in .env.test');
  process.exit(1);
}

async function main() {
  console.log('test-db-teardown: wiping test database...');
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename != '_prisma_migrations'
    `);
    const tables = res.rows.map((r) => `"${r.tablename}"`).join(', ');
    if (tables) {
      await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await client.end();
  }
  console.log('test-db-teardown: done.');
}

/** Jest globalTeardown: run after all tests. */
module.exports = () => main();

if (require.main === module) {
  main().catch((err) => {
    console.error('test-db-teardown:', err);
    process.exit(1);
  });
}
