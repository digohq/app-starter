import { PrismaClient, DomainVerificationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyDomain() {
  const domain = process.argv[2];

  if (!domain) {
    console.error('Please provide a domain name as an argument.');
    console.error('Usage: npx tsx scripts/verify-domain.ts <domain>');
    process.exit(1);
  }

  // Normalize domain
  const normalizedDomain = domain.trim().toLowerCase();

  console.log(`Searching for domain mapping: ${normalizedDomain}`);

  const mapping = await prisma.domainMapping.findUnique({
    where: { domain: normalizedDomain },
  });

  if (!mapping) {
    console.error(`Error: Domain mapping for "${normalizedDomain}" not found.`);
    process.exit(1);
  }

  console.log(`Found mapping with status: ${mapping.verificationStatus}`);
  console.log(`Updating stauts to VERIFIED...`);

  const updated = await prisma.domainMapping.update({
    where: { id: mapping.id },
    data: {
      verificationStatus: DomainVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      errorMessage: null,
    },
  });

  console.log(`Success! Domain "${updated.domain}" is now VERIFIED.`);

  // Try to clear Redis cache if possible, but since we are not in NestJS context with RedisService,
  // we might skip this or do a direct redis call if critical.
  // For a simple admin script, we can accept that the cache might take 5 mins to expire,
  // or the user can just wait. I will add a note about cache.
  console.log(
    'Note: It may take up to 5 minutes for the changes to propagate if the domain resolution is cached.',
  );
}

verifyDomain()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
