import { Injectable, Logger } from '@nestjs/common';
import { NotificationDefinition } from '../interfaces/notification-definition.interface';

/**
 * Service for validating notification definitions
 */
@Injectable()
export class NotificationDefinitionValidatorService {
  private readonly logger = new Logger(NotificationDefinitionValidatorService.name);

  /**
   * Validate a notification definition
   */
  validateDefinition(definition: NotificationDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!definition.name || definition.name.trim().length === 0) {
      errors.push('Definition name is required');
    }

    if (definition.name && !/^[a-z0-9-]+$/.test(definition.name)) {
      errors.push('Definition name must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate channels
    if (!definition.channels || definition.channels.length === 0) {
      errors.push('At least one channel must be specified');
    }

    // Validate template
    if (!definition.template) {
      errors.push('Template is required');
    } else {
      // Validate template variables
      if (definition.template.variables) {
        for (const [varName, varDef] of Object.entries(definition.template.variables)) {
          if (!varDef.type) {
            errors.push(`Variable "${varName}" must have a type`);
          }

          const validTypes = ['string', 'number', 'boolean', 'date', 'url', 'array'];
          if (!validTypes.includes(varDef.type)) {
            errors.push(
              `Variable "${varName}" has invalid type. Must be one of: ${validTypes.join(', ')}`,
            );
          }
        }
      }

      // Test template rendering for each channel
      for (const channel of definition.channels) {
        try {
          // Create dummy variables for validation
          const dummyVars: Record<string, any> = {};
          if (definition.template.variables) {
            for (const [varName, varDef] of Object.entries(definition.template.variables)) {
              switch (varDef.type) {
                case 'string':
                  dummyVars[varName] = 'test';
                  break;
                case 'number':
                  dummyVars[varName] = 0;
                  break;
                case 'boolean':
                  dummyVars[varName] = true;
                  break;
                case 'date':
                  dummyVars[varName] = new Date().toISOString();
                  break;
                case 'url':
                  dummyVars[varName] = 'https://example.com';
                  break;
                case 'array':
                  dummyVars[varName] = [];
                  break;
              }
            }
          }

          definition.template.render(channel, dummyVars);
        } catch (error) {
          errors.push(`Template failed to render for channel ${channel}: ${error.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
