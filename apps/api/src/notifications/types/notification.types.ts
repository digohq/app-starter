/**
 * Notification recipient type - supports sending to email, phone, or userId
 */
export type NotificationRecipient =
  | { type: 'email'; email: string }
  | { type: 'phoneNumber'; phoneNumber: string }
  | { type: 'userId'; userId: string };

/**
 * Notification type enum
 */
export enum NotificationType {
  TRANSACTIONAL = 'TRANSACTIONAL',
  SYSTEM = 'SYSTEM',
}

/**
 * Notification channel enum
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

/**
 * Notification status enum
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * Notification severity enum
 */
export enum NotificationSeverity {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

/**
 * Filters for listing notifications
 */
export interface NotificationFilters {
  userId?: string;
  organizationId?: string;
  channel?: NotificationChannel;
  type?: NotificationType;
  status?: NotificationStatus;
  definitionName?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Paginated notifications response
 */
export interface PaginatedNotifications {
  notifications: any[]; // Will be Notification from Prisma
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Content for notification channel providers
 */
export interface NotificationContent {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  title?: string; // For push notifications
  body?: string; // For push/SMS notifications
}

/**
 * Options for notification channel providers
 */
export interface NotificationOptions {
  [key: string]: any; // Channel-specific options
}

/**
 * Result from notification channel provider
 */
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export enum NotificationCategory {
  INVITATIONS = 'invitations',
  ACCEPTANCES = 'acceptances',
  FOLLOWS = 'follows',
  COMMENTS = 'comments',
  COLLABORATION = 'collaboration',
  SYSTEM = 'system',
}

export interface NotificationPreferenceItem {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  definitionName: string | null;
  displayName: string;
  description: string;
  enabled: boolean;
  organizationId?: string | null;
  category: NotificationCategory | string | null;
  isDefault: boolean;
  canDisable: boolean;
}

export interface NotificationPreferenceOrganization {
  category: NotificationCategory | string;
  displayName: string;
  description: string;
  preferences: NotificationPreferenceItem[];
}

export interface NotificationPreferenceUpdate {
  type: NotificationType;
  channel: NotificationChannel;
  definitionName?: string;
  enabled: boolean;
  category?: NotificationCategory;
}

export interface PreferenceUpdateError {
  type: NotificationType;
  channel: NotificationChannel;
  error: string;
  code: string;
}

export interface UpdateNotificationPreferencesResponse {
  updated: NotificationPreferenceItem[];
  created: NotificationPreferenceItem[];
  errors: PreferenceUpdateError[];
}

export interface BulkUpdateNotificationPreferencesResponse {
  affectedCount: number;
  preferences: NotificationPreferenceItem[];
  errors: PreferenceUpdateError[];
}

export interface NotificationDefinitionInfo {
  definitionName: string;
  displayName: string;
  description: string;
  type: NotificationType;
  supportedChannels: NotificationChannel[];
  canDisable: boolean;
  defaultEnabled: boolean;
}

export interface NotificationCategoryInfo {
  category: NotificationCategory;
  displayName: string;
  description: string;
  supportedChannels: NotificationChannel[];
  definitions: NotificationDefinitionInfo[];
}
