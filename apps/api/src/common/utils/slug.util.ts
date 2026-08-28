import { randomBytes } from 'crypto';

/**
 * Generate a random 5-character alphabetic slug
 * Uses uppercase and lowercase letters (a-z, A-Z)
 * Total combinations: 52^5 = 380,204,032
 */
export function generateRandomSlug(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let slug = '';

  // Generate 5 random characters
  for (let i = 0; i < 5; i++) {
    const randomIndex = randomBytes(1)[0] % alphabet.length;
    slug += alphabet[randomIndex];
  }

  return slug;
}

/**
 * Ensure slug uniqueness by checking against a model and regenerating if needed
 * @param checkUnique - Function that checks if a slug exists, returns true if it exists
 * @param maxAttempts - Maximum number of attempts to generate a unique slug (default: 100)
 * @param generate - Slug generator; defaults to a random 5-character slug. Pass
 *   `() => generateSlugFromName(name)` for human-readable slugs.
 * @returns A unique slug
 */
export async function ensureUniqueSlug(
  checkUnique: (slug: string) => Promise<boolean>,
  maxAttempts: number = 100,
  generate: () => string = generateRandomSlug,
): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const slug = generate();
    const exists = await checkUnique(slug);

    if (!exists) {
      return slug;
    }

    attempts++;
  }

  // If we've exhausted attempts, throw an error
  // This should be extremely rare (probability < 0.0000003% with 100 attempts)
  throw new Error(
    `Failed to generate unique slug after ${maxAttempts} attempts. This is extremely unlikely.`,
  );
}

/**
 * Generate a slug from a name with random characters appended
 */
export function generateSlugFromName(name: string): string {
  const slugifiedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${slugifiedName}-${generateRandomSlug()}`;
}

/**
 * Generate a clean username from a name or email part
 */
export function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
