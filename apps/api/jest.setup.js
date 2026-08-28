/**
 * Runs before all API tests. Loads .env.test so that integration and e2e tests
 * use a test database and never the dev database from .env.
 *
 * Do not gate on NODE_ENV === 'test': Jest can execute setupFiles before it sets
 * NODE_ENV, which would skip this block and leave DATABASE_URL on the dev DB.
 */
const path = require('path');
const fs = require('fs');

function applyEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const parsed = require('dotenv').parse(fs.readFileSync(filePath));
  for (const key of Object.keys(parsed)) {
    process.env[key] = parsed[key];
  }
}

// Base test env, then optional local overrides (same merge order as dotenv-cli).
applyEnvFile(path.resolve(__dirname, '.env.test'));
applyEnvFile(path.resolve(__dirname, '.env.test.local'));
