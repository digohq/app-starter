export interface InAppNotification {
  id: string;
  type: 'invitation' | 'acceptance' | 'system';
  title: string;
  description: string;
  data: NotificationData;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationData {
  invitationType?:
    | 'organization'
    | 'speaker'
    | 'organizer'
    | 'session-speaker'
    | 'session-organizer';
  invitationId?: string;
  eventId?: string;
  organizationId?: string;
  sessionId?: string;
  inviterName?: string;
  inviteeName?: string;
  entityName?: string;
  actionUrl?: string;
  [key: string]: any;
}

export interface NotificationResponse {
  notifications: InAppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: 'invitation' | 'acceptance' | 'system';
  since?: string;
}

export enum NotificationType {
  TRANSACTIONAL = 'TRANSACTIONAL',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
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

export type BulkUpdateAction =
  | 'enable_all'
  | 'disable_all'
  | 'reset_to_defaults'
  | 'update_category';

export interface BulkUpdateOptions {
  category?: NotificationCategory;
  channels?: NotificationChannel[];
  enabled?: boolean;
  organizationId?: string;
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

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferenceOrganization[];
}

export interface NotificationCategoriesResponse {
  categories: NotificationCategoryInfo[];
}
