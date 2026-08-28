// `validate` is called here directly rather than through a Nest testing
// module, so the decorator metadata polyfill has to be loaded explicitly.
import 'reflect-metadata';
import { validate } from './config.validation';

const baseConfig = {
  DATABASE_URL: 'postgresql://app_starter:app_starter@localhost:5432/app_starter?schema=public',
  REDIS_HOST: 'localhost',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validate', () => {
  it('accepts a development config that leaves the optional variables unset', () => {
    const inputConfig = { ...baseConfig, NODE_ENV: 'development' };

    const actual = validate(inputConfig);

    expect(actual.JWT_SECRET).toBe(baseConfig.JWT_SECRET);
    expect(actual.COOKIE_DOMAIN).toBeUndefined();
  });

  it('throws when DATABASE_URL is missing', () => {
    const inputConfig = { ...baseConfig, DATABASE_URL: undefined };

    expect(() => validate(inputConfig)).toThrow(/DATABASE_URL/);
  });

  describe('in development', () => {
    it('allows the placeholder JWT_SECRET, so that pnpm bootstrap works unchanged', () => {
      const inputConfig = {
        ...baseConfig,
        NODE_ENV: 'development',
        JWT_SECRET: 'your-secret-key-change-in-production',
      };

      expect(() => validate(inputConfig)).not.toThrow();
    });

    it('allows a short JWT_SECRET', () => {
      const inputConfig = { ...baseConfig, NODE_ENV: 'development', JWT_SECRET: 'short' };

      expect(() => validate(inputConfig)).not.toThrow();
    });
  });

  describe('in production', () => {
    it('refuses to start when JWT_SECRET is still the placeholder', () => {
      const inputConfig = {
        ...baseConfig,
        NODE_ENV: 'production',
        JWT_SECRET: 'your-secret-key-change-in-production',
      };

      expect(() => validate(inputConfig)).toThrow(/placeholder/);
    });

    it('refuses to start when JWT_SECRET is shorter than 32 characters', () => {
      const inputConfig = { ...baseConfig, NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(31) };

      expect(() => validate(inputConfig)).toThrow(/at least 32 characters/);
    });

    it('accepts a JWT_SECRET of 32 characters or more', () => {
      const inputConfig = { ...baseConfig, NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(32) };

      expect(() => validate(inputConfig)).not.toThrow();
    });

    it('leaves COOKIE_DOMAIN unset rather than defaulting it to a domain you do not own', () => {
      const inputConfig = { ...baseConfig, NODE_ENV: 'production' };

      const actual = validate(inputConfig);

      expect(actual.COOKIE_DOMAIN).toBeUndefined();
    });
  });
});
