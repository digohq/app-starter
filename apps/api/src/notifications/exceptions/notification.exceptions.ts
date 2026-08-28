import { NotificationRecipient } from '../types/notification.types';

/**
 * Exception thrown when a notification definition is not found
 */
export class NotificationDefinitionNotFoundException extends Error {
  constructor(definitionName: string) {
    super(`Notification definition not found: ${definitionName}`);
    this.name = 'NotificationDefinitionNotFoundException';
  }
}

/**
 * Exception thrown when recipient resolution fails
 */
export class RecipientResolutionException extends Error {
  constructor(recipient: NotificationRecipient, message: string) {
    super(`Failed to resolve recipient: ${message}`);
    this.name = 'RecipientResolutionException';
  }
}

/**
 * Exception thrown when a required template variable is missing
 */
export class TemplateVariableMissingException extends Error {
  constructor(variableName: string) {
    super(`Required template variable missing: ${variableName}`);
    this.name = 'TemplateVariableMissingException';
  }
}
