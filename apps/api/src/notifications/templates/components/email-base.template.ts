/**
 * Base email template components
 * Provides reusable components for building email templates
 */

import { emailBrandingStorage } from '../../utils/email-branding-storage';
import { branding } from '../../../config/branding';

export interface EmailTemplateComponents {
  header: (logoUrl?: string, logoAlt?: string) => string;
  footer: (contactEmail?: string) => string;
  ctaButton: (url: string, text: string, align?: 'left' | 'center' | 'right') => string;
  contentWrapper: (content: string) => string;
  fullTemplate: (options: {
    subject?: string;
    logoUrl?: string;
    logoAlt?: string;
    title?: string;
    content: string;
    ctaUrl?: string;
    ctaText?: string;
    contactEmail?: string;
  }) => string;
}

/**
 * Email template components implementation
 */
export const emailTemplateComponents: EmailTemplateComponents = {
  /**
   * Generate email header with logo
   */
  header: (logoUrl?: string, logoAlt: string = branding.email.logo.altText) => {
    if (!logoUrl) {
      return `
        <tr>
          <td style="padding: 40px 40px 20px; text-align: center;">
            <h1 style="color: #1f2937; font-size: 24px; margin: 0; font-weight: 600;">${branding.appName}</h1>
          </td>
        </tr>
      `;
    }

    return `
      <tr>
        <td style="padding: 40px 40px 20px; text-align: center;">
          <img
            src="${logoUrl}"
            alt="${logoAlt}"
            width="150"
            style="max-width: 150px; height: auto; display: block; margin: 0 auto;"
          />
        </td>
      </tr>
    `;
  },

  /**
   * Generate email footer
   */
  footer: (_contactEmail: string = branding.email.addresses.support) => {
    const currentYear = new Date().getFullYear();
    return `
      <tr>
        <td
          style="padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 14px; color: #6b7280;"
        >
          <p style="margin: 0 0 10px;">
            ${branding.email.templates.copyright(currentYear)}
          </p>
        </td>
      </tr>
    `;
  },

  /**
   * Generate CTA button
   */
  ctaButton: (url: string, text: string, align: 'left' | 'center' | 'right' = 'center') => {
    const alignStyle =
      align === 'left'
        ? 'text-align: left;'
        : align === 'right'
          ? 'text-align: right;'
          : 'text-align: center;';

    return `
      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        border="0"
        width="100%"
      >
        <tr>
          <td style="padding: 20px 0; ${alignStyle}">
            <a
              href="${url}"
              style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;"
            >${text}</a>
          </td>
        </tr>
      </table>
    `;
  },

  /**
   * Wrap content in proper structure
   */
  contentWrapper: (content: string) => {
    return `
      <tr>
        <td style="padding: 20px 40px;">
          ${content}
        </td>
      </tr>
    `;
  },

  /**
   * Generate full email template
   */
  fullTemplate: (options) => {
    const brandingContext = emailBrandingStorage.getStore();
    const { logoUrl, logoAlt, title, content, ctaUrl, ctaText, contactEmail } = options;

    const finalLogoUrl = logoUrl || brandingContext?.logoUrl;
    const finalLogoAlt = logoAlt || brandingContext?.logoAlt || branding.email.logo.altText;

    let bodyContent = '';

    if (title) {
      bodyContent += `
        <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px; font-weight: 600;">
          ${title}
        </h1>
      `;
    }

    bodyContent += `
      <div style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        ${content}
      </div>
    `;

    if (ctaUrl && ctaText) {
      bodyContent += emailTemplateComponents.ctaButton(ctaUrl, ctaText);
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <title>${options.subject || branding.email.templates.defaultTitle}</title>
          <!--[if mso]>
            <style type="text/css">
              table { border-collapse: collapse; }
              td { padding: 0; }
            </style>
          <![endif]-->
        </head>
        <body
          style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;"
        >
          <table
            role="presentation"
            cellspacing="0"
            cellpadding="0"
            border="0"
            width="100%"
            style="background-color: #f5f5f5;"
          >
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  width="600"
                  style="background-color: #ffffff; border-radius: 8px; max-width: 600px; width: 100%;"
                >
                  ${emailTemplateComponents.header(finalLogoUrl, finalLogoAlt)}
                  ${emailTemplateComponents.contentWrapper(bodyContent)}
                  ${emailTemplateComponents.footer(contactEmail)}
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },
};
