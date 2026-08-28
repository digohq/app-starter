import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test.local' });
  dotenv.config({ path: '.env.test' });
} else if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx ts-node prisma/seed.ts',
  },
});
