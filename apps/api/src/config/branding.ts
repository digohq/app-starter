/**
 * Branding configuration for App Starter API
 *
 * This file centralizes all branding-related strings and values.
 * Used for easy rebranding and future localization/i18n support.
 */

export const branding = {
  /**
   * Application name
   */
  appName: 'App Starter',

  /**
   * Email configuration
   */
  email: {
    /**
     * Email addresses
     */
    addresses: {
      from: 'noreply@app-starter.local',
      support: 'support@app-starter.local',
      domain: 'app-starter.local',
    },

    /**
     * Default sender names
     */
    fromName: 'App Starter',
    fromNameDev: 'App Starter Dev',

    /**
     * Logo and alt text
     */
    logo: {
      altText: 'App Starter Logo',
      defaultAltText: 'Organization Logo',
    },

    /**
     * Email template text
     */
    templates: {
      defaultTitle: 'App Starter',
      copyright: (year: number) => `© ${year} App Starter. All rights reserved.`,
      helpText: (contactEmail: string) => `Need help? Contact us at ${contactEmail}`,
    },
  },

  /**
   * Email subject lines
   */
  emailSubjects: {
    verification: 'Verify your App Starter email address',
    passwordReset: 'App Starter - Password Reset Request',
    otpVerification: 'Your App Starter Verification Code',
    userInvitation: (organizationName: string) =>
      `You're invited to join ${organizationName} on App Starter`,
    invitationAccepted: (organizationName: string) =>
      `Welcome to ${organizationName} on App Starter`,
  },

  /**
   * Email body text
   */
  emailBody: {
    verification: {
      greeting: (firstName: string) => `Hi ${firstName},`,
      signupThanks: 'Thank you for signing up for App Starter!',
      verifyPrompt: 'Please verify your email address by clicking the button below:',
      ignoreNotice: "If you didn't create a App Starter account, you can safely ignore this email.",
    },
    passwordReset: {
      resetPrompt:
        'We received a request to reset your password for your App Starter account. If you made this request, click the button below to reset your password:',
    },
    otpVerification: {
      codePrompt: 'Your verification code for App Starter is:',
    },
    userInvitation: {
      invitationText: (inviterName: string, organizationName: string, roleName: string) =>
        `${inviterName} has invited you to join ${organizationName} on App Starter as a ${roleName}.`,
      welcomeText: 'Welcome to App Starter!',
    },
    invitationAccepted: {
      welcomeText: (organizationName: string, roleName: string) =>
        `Congratulations! You have successfully joined ${organizationName} on App Starter as a ${roleName}.`,
    },
  },

  /**
   * Service defaults
   */
  service: {
    defaultOrganizationName: 'App Starter',
  },

  /**
   * Frontend URLs
   */
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
} as const;

/**
 * Type-safe branding access
 */
export type Branding = typeof branding;
