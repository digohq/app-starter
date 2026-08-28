import { COMMON_TIMEZONES } from '../timezones';

describe('timezones', () => {
  describe('COMMON_TIMEZONES', () => {
    it('includes UTC', () => {
      const utc = COMMON_TIMEZONES.find((tz) => tz.value === 'UTC');
      expect(utc).toBeDefined();
      expect(utc?.label).toBe('UTC');
    });

    it('includes common IANA timezones', () => {
      const values = COMMON_TIMEZONES.map((tz) => tz.value);
      expect(values).toContain('America/New_York');
      expect(values).toContain('Europe/London');
      expect(values).toContain('Asia/Tokyo');
      expect(values).toContain('Australia/Sydney');
    });

    it('each entry has value and label', () => {
      COMMON_TIMEZONES.forEach((tz) => {
        expect(tz.value).toBeDefined();
        expect(typeof tz.value).toBe('string');
        expect(tz.value.length).toBeGreaterThan(0);
        expect(tz.label).toBeDefined();
        expect(typeof tz.label).toBe('string');
        expect(tz.label.length).toBeGreaterThan(0);
      });
    });

    it('has no duplicate values', () => {
      const values = COMMON_TIMEZONES.map((tz) => tz.value);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });
});
