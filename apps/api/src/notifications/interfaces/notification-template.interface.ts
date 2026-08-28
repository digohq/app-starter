import { NotificationChannel } from '../types/notification.types';

/**
 * Template variable definition
 */
export interface TemplateVariableDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'array';
  required: boolean;
  description?: string;
}

/**
 * Rendered template content
 */
export interface RenderedTemplateContent {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

/**
 * Notification Template interface for rendering content
 */
export interface NotificationTemplate {
  readonly variables: Record<string, TemplateVariableDefinition>;
  render(channel: NotificationChannel, variables: Record<string, any>): RenderedTemplateContent;
}
