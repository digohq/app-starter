import { Injectable, Logger } from '@nestjs/common';
import { htmlToText } from '../utils/html-to-text.util';

/**
 * Service for rendering email templates with best practices
 * Handles HTML validation, CSS inlining, and text conversion
 */
@Injectable()
export class EmailTemplateEngineService {
  private readonly logger = new Logger(EmailTemplateEngineService.name);

  /**
   * Render email template with best practices
   * @param templateContent - HTML template content with placeholders
   * @param variables - Variables to replace in template
   * @returns Rendered HTML and text versions
   */
  async renderEmailTemplate(
    templateContent: string,
    variables: Record<string, any>,
  ): Promise<{
    html: string;
    text: string;
  }> {
    try {
      // Replace template variables
      const html = this.replaceTemplateVariables(templateContent, variables);

      // Validate HTML
      const validation = this.validateEmailHtml(html);
      if (!validation.valid) {
        this.logger.warn(`HTML validation warnings: ${validation.errors.join(', ')}`);
      }

      // Generate plain text version
      const text = htmlToText(html);

      return { html, text };
    } catch (error) {
      this.logger.error(`Failed to render email template: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate email HTML
   * Basic validation - can be enhanced with html-validator library
   */
  validateEmailHtml(html: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic HTML structure checks
    if (!html.includes('<!DOCTYPE')) {
      errors.push('Missing DOCTYPE declaration');
    }

    if (!html.includes('<html')) {
      errors.push('Missing <html> tag');
    }

    if (!html.includes('<body')) {
      errors.push('Missing <body> tag');
    }

    // Check for email-specific best practices
    if (!html.includes('viewport')) {
      errors.push('Missing viewport meta tag for mobile responsiveness');
    }

    // Check for external stylesheets (should use inline CSS)
    const externalStylesheetRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
    if (externalStylesheetRegex.test(html)) {
      errors.push('External stylesheets detected - should use inline CSS');
    }

    // Check HTML size (max 1MB)
    const htmlSizeInBytes = new Blob([html]).size;
    const maxSizeInBytes = 1024 * 1024; // 1MB
    if (htmlSizeInBytes > maxSizeInBytes) {
      errors.push(
        `HTML content exceeds 1MB limit (${(htmlSizeInBytes / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Inline CSS for email compatibility
   * Basic implementation - can be enhanced with juice or inline-css library
   */
  inlineCss(html: string, _css: string): string {
    // For now, this is a placeholder
    // In a full implementation, you would use a library like 'juice' or 'inline-css'
    // to properly inline CSS styles into HTML elements
    this.logger.warn(
      'CSS inlining is not fully implemented - consider using juice or inline-css library',
    );
    return html;
  }

  /**
   * Replace template variables in content
   * Uses simple {{variable}} syntax
   * Variables not found in the variables object are replaced with empty string
   */
  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace all {{variableName}} patterns
    // If variable exists in variables object, use its value, otherwise use empty string
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return key in variables ? String(variables[key] ?? '') : '';
    });

    return result;
  }
}
