/**
 * Development seed.
 *
 * Creates one demo organization with an owner, a member, and two projects.
 *
 * Idempotent — safe to run repeatedly. Records upsert on their natural keys,
 * so re-running updates rather than duplicates.
 *
 *   pnpm --filter @app-starter/api prisma:seed
 */
import { PrismaClient, OrgRole, ProjectVisibility } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Run directly via ts-node, so nothing else has loaded the env yet. Mirrors
// the order in prisma.config.ts: tests read .env.test, everything else .env.
const apiRoot = path.resolve(__dirname, '..');
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.join(apiRoot, '.env.test.local') });
  dotenv.config({ path: path.join(apiRoot, '.env.test') });
} else {
  dotenv.config({ path: path.join(apiRoot, '.env') });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env first.');
}

// The demo owner is a global admin with a password published in this file and
// in the README. Creating it against a production database hands anyone who
// has read the repository full control of the app, so refuse by default.
// `SEED_ALLOW_PRODUCTION=true` is the deliberate opt-out.
if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
  throw new Error(
    'Refusing to seed with NODE_ENV=production: the demo accounts have a publicly known password ' +
      'and owner@example.com is a global admin. Set SEED_ALLOW_PRODUCTION=true if you really mean it.',
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_PASSWORD = 'Password123!';

async function seedDemoOrganization() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      password: passwordHash,
      name: 'Ada Owner',
      username: 'ada',
      emailVerifiedAt: new Date(),
      isGlobalAdmin: true,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      password: passwordHash,
      name: 'Mo Member',
      username: 'mo',
      emailVerifiedAt: new Date(),
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Inc',
      slug: 'acme',
      description: 'Demo organization created by the seed script.',
      timezone: 'UTC',
    },
  });

  for (const [user, role] of [
    [owner, OrgRole.OWNER],
    [member, OrgRole.MEMBER],
  ] as const) {
    await prisma.organizationMember.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { role },
      create: { userId: user.id, organizationId: organization.id, role },
    });
  }

  const projects = [
    {
      slug: 'website-redesign',
      name: 'Website redesign',
      description: 'Visible to everyone in the organization.',
      visibility: ProjectVisibility.ORGANIZATION,
    },
    {
      slug: 'q3-planning',
      name: 'Q3 planning',
      description: "Private to its creator — won't appear for other members.",
      visibility: ProjectVisibility.PRIVATE,
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: project.slug } },
      update: {},
      create: { ...project, organizationId: organization.id, createdById: owner.id },
    });
  }

  console.log(`Seeded organization "${organization.name}" with 2 users and 2 projects`);
  console.log(`  owner@example.com / ${DEMO_PASSWORD}  (global admin)`);
  console.log(`  member@example.com / ${DEMO_PASSWORD}`);
}

async function main() {
  await seedDemoOrganization();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
