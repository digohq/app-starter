import { AsyncLocalStorage } from 'async_hooks';

export interface EmailBrandingContext {
  logoUrl?: string;
  logoAlt?: string;
  hasEmailBranding?: boolean;
}

export const emailBrandingStorage = new AsyncLocalStorage<EmailBrandingContext>();
