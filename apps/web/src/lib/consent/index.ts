export interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentStatus {
  version: number;
  timestamp: string;
  preferences: ConsentPreferences;
}

const CONSENT_COOKIE_NAME = 'app_starter_consent';
const CONSENT_VERSION = 1;

/**
 * Get the current consent status from cookies
 */
export function getConsentStatus(): ConsentStatus | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const consentCookie = cookies.find((c) => c.trim().startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!consentCookie) return null;

  try {
    const value = decodeURIComponent(consentCookie.split('=')[1]);
    const status = JSON.parse(value) as ConsentStatus;
    return status;
  } catch (error) {
    console.error('Failed to parse consent cookie:', error);
    return null;
  }
}

/**
 * Get only the preferences part of the consent status
 */
export function getConsentPreferences(): ConsentPreferences {
  const status = getConsentStatus();
  if (status) return status.preferences;

  // Default preferences if no cookie exists
  return {
    essential: true, // Always true
    analytics: false, // Opt-in required
    marketing: false, // Opt-in required
  };
}

/**
 * Save consent preferences to a cookie
 */
export function setConsentPreferences(preferences: ConsentPreferences): void {
  if (typeof window === 'undefined') return;

  const status: ConsentStatus = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    preferences: {
      ...preferences,
      essential: true, // Force essential to be true
    },
  };

  const value = encodeURIComponent(JSON.stringify(status));
  // Set cookie with 1 year expiration
  const maxAge = 31536000;

  // Get current domain for cross-subdomain support
  // If we're on example.com or a subdomain, we want to set it for .example.com
  let domainAttribute = '';
  const hostname = window.location.hostname;
  if (hostname.endsWith('example.com')) {
    domainAttribute = '; domain=.example.com';
  }

  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax; Secure${domainAttribute}`;

  // Dispatch custom event so components can react to change
  window.dispatchEvent(new CustomEvent('app-starter:consent-change', { detail: status }));
}

/**
 * Check if the user has already made a choice
 */
export function hasUserMadeChoice(): boolean {
  return getConsentStatus() !== null;
}

/**
 * Check if analytics consent has been granted
 */
export function hasAnalyticsConsent(): boolean {
  return getConsentPreferences().analytics;
}
