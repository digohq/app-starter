import { getNotificationColor, getNotificationActionText, formatNotificationTime } from './utils';

describe('Notification Utils', () => {
  describe('getNotificationColor', () => {
    it('should return correct color for organization invitation', () => {
      expect(getNotificationColor('invitation', 'organization')).toContain('text-primary');
    });

    it('should return correct color for acceptance', () => {
      expect(getNotificationColor('acceptance')).toContain('text-[hsl(var(--success))]');
    });

    it('should return default color for unknown types', () => {
      expect(getNotificationColor('unknown')).toContain('text-muted-foreground');
    });
  });

  describe('getNotificationActionText', () => {
    it('should return correct text for organization invitation', () => {
      expect(getNotificationActionText('invitation', 'organization')).toBe('Join Organization');
    });

    it('should return correct text for acceptance', () => {
      expect(getNotificationActionText('acceptance')).toBe('View Details');
    });
  });

  describe('formatNotificationTime', () => {
    // Mock Date
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should return "Just now" for very recent', () => {
      expect(formatNotificationTime(new Date('2023-01-01T11:59:59Z').toISOString())).toBe(
        'Just now',
      );
    });
    // ... more tests
  });
});
