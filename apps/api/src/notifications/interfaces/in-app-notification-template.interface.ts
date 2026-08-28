/**
 * Interface for in-app notification templates
 */
export interface InAppNotificationTemplate {
  generateTitle(variables: Record<string, any>): string;
  generateDescription(variables: Record<string, any>): string;
  generateData(variables: Record<string, any>): Record<string, any>;
}
