import {
  getConsentStatus,
  setConsentPreferences,
  hasAnalyticsConsent,
  hasUserMadeChoice,
  getConsentPreferences,
} from '../index';

describe('Consent Utility', () => {
  beforeEach(() => {
    // Clear cookies before each test
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
    jest.clearAllMocks();
  });

  it('should return null if no consent cookie exists', () => {
    expect(getConsentStatus()).toBeNull();
    expect(hasUserMadeChoice()).toBe(false);
  });

  it('should return default preferences if no consent cookie exists', () => {
    const prefs = getConsentPreferences();
    expect(prefs.essential).toBe(true);
    expect(prefs.analytics).toBe(false);
    expect(prefs.marketing).toBe(false);
  });

  it('should set and get consent preferences correctly', () => {
    const prefs = {
      essential: true,
      analytics: true,
      marketing: false,
    };

    setConsentPreferences(prefs);

    const status = getConsentStatus();
    expect(status).not.toBeNull();
    expect(status?.preferences.analytics).toBe(true);
    expect(status?.preferences.marketing).toBe(false);
    expect(hasAnalyticsConsent()).toBe(true);
    expect(hasUserMadeChoice()).toBe(true);
  });

  it('should force essential to true even if set to false', () => {
    const prefs = {
      essential: false,
      analytics: true,
      marketing: true,
    } as any;

    setConsentPreferences(prefs);

    const savedPrefs = getConsentPreferences();
    expect(savedPrefs.essential).toBe(true);
  });

  it('should handle cookie parsing errors gracefully', () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'app_starter_consent=invalid-json',
    });

    expect(getConsentStatus()).toBeNull();
    expect(getConsentPreferences().analytics).toBe(false);
  });
});
