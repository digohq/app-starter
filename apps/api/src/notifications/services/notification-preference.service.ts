import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDefinitionRegistryService } from './notification-definition-registry.service';
import {
  NotificationPreferenceOrganization,
  NotificationPreferenceItem,
  NotificationCategory,
  NotificationPreferenceUpdate,
  UpdateNotificationPreferencesResponse,
  BulkUpdateNotificationPreferencesResponse,
  NotificationChannel,
  NotificationType,
  NotificationCategoryInfo,
} from '../types/notification.types';
import { $Enums } from '@prisma/client';

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

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly definitionsRegistry: NotificationDefinitionRegistryService,
  ) {}

  /**
   * Get user preferences grouped by category
   */
  async getUserPreferences(
    userId: string,
    organizationId?: string,
    _includeDefaults = true,
  ): Promise<NotificationPreferenceOrganization[]> {
    // 1. Get raw preferences from DB
    const preferencesList = await this.prisma.notificationPreference.findMany({
      where: {
        userId,
        organizationId: organizationId || null,
      },
    });

    // 2. Get all categories and definitions
    const categoriesInfo = this.definitionsRegistry.getCategories();

    // 3. Map to response structure, merging with defaults
    return categoriesInfo.map((catInfo) => {
      const categoryPreferences: NotificationPreferenceItem[] = [];

      // For each definition in this category
      for (const def of catInfo.definitions) {
        // Create preference items for each supported channel
        for (const channel of def.supportedChannels) {
          // Find existing preference
          const existingPref = preferencesList.find(
            (p) => p.definitionName === def.definitionName && p.channel === channel,
          );

          // If no specific preference, check if there's a category/type level preference
          // Using strict definition match for now as per PRD focus on granular control
          // But falling back to defaultEnabled if not found
          const isEnabled = existingPref ? existingPref.enabled : def.defaultEnabled;

          categoryPreferences.push({
            id: existingPref?.id || `default-${def.definitionName}-${channel}`,
            type: def.type,
            channel,
            definitionName: def.definitionName,
            displayName: def.displayName,
            description: def.description,
            enabled: isEnabled,
            organizationId: organizationId || null,
            category: catInfo.category,
            isDefault: !existingPref,
            canDisable: def.canDisable,
          });
        }
      }

      return {
        category: catInfo.category,
        displayName: catInfo.displayName,
        description: catInfo.description,
        preferences: categoryPreferences,
      };
    });
  }

  /**
   * Update multiple preferences atomically
   */
  async updateUserPreferences(
    userId: string,
    updates: NotificationPreferenceUpdate[],
    organizationId?: string,
  ): Promise<UpdateNotificationPreferencesResponse> {
    const response: UpdateNotificationPreferencesResponse = {
      updated: [],
      created: [],
      errors: [],
    };

    // Use transaction
    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const def = update.definitionName
          ? this.definitionsRegistry.get(update.definitionName)
          : null;

        // If definition name provided, validate it
        if (update.definitionName && !def) {
          response.errors.push({
            type: update.type,
            channel: update.channel,
            error: `Definition ${update.definitionName} not found`,
            code: 'DEFINITION_NOT_FOUND',
          });
          continue;
        }

        // Validate channel support if definition known
        if (def && !def.channels.includes(update.channel)) {
          response.errors.push({
            type: update.type,
            channel: update.channel,
            error: `Channel ${update.channel} not supported for ${update.definitionName}`,
            code: 'CHANNEL_NOT_SUPPORTED',
          });
          continue;
        }

        // Validate mandatory if definition known
        if (def && def.mandatory && !update.enabled) {
          response.errors.push({
            type: update.type,
            channel: update.channel,
            error: `Cannot disable mandatory notification ${update.definitionName}`,
            code: 'MANDATORY_NOTIFICATION',
          });
          continue;
        }

        try {
          const prismaChannel = update.channel as $Enums.NotificationChannel;
          const prismaType = update.type as $Enums.NotificationType;

          // Check for existing preference manually to avoid upsert issues with nullable unique keys
          const existing = await tx.notificationPreference.findFirst({
            where: {
              userId,
              channel: prismaChannel,
              type: prismaType,
              organizationId: organizationId || null,
              definitionName: update.definitionName || null,
            },
          });

          let result;

          if (existing) {
            result = await tx.notificationPreference.update({
              where: { id: existing.id },
              data: {
                enabled: update.enabled,
                category: update.category || (def?.category as string) || null,
              },
            });
          } else {
            result = await tx.notificationPreference.create({
              data: {
                userId,
                organizationId: organizationId || null,
                channel: prismaChannel,
                type: prismaType,
                definitionName: update.definitionName || null,
                enabled: update.enabled,
                category: update.category || (def?.category as string) || null,
              },
            });
          }

          response.updated.push({
            id: result.id,
            type: result.type as NotificationType,
            channel: result.channel as NotificationChannel,
            definitionName: result.definitionName,
            displayName: update.definitionName || result.type,
            description: '',
            enabled: result.enabled,
            organizationId: result.organizationId,
            category: result.category,
            isDefault: false,
            canDisable: true,
          });
        } catch (e) {
          this.logger.error(e);
          response.errors.push({
            type: update.type,
            channel: update.channel,
            error: 'Database error',
            code: 'DB_ERROR',
          });
        }
      }
    });

    return response;
  }

  /**
   * Bulk update preferences
   */
  async bulkUpdatePreferences(
    userId: string,
    action: BulkUpdateAction,
    options: BulkUpdateOptions,
  ): Promise<BulkUpdateNotificationPreferencesResponse> {
    const definitions = this.definitionsRegistry.getAll();
    const updates: NotificationPreferenceUpdate[] = [];

    // Filter definitions based on category if provided
    const targetDefinitions = options.category
      ? definitions.filter((d) => d.category === options.category)
      : definitions;

    for (const def of targetDefinitions) {
      if (def.mandatory && (action === 'disable_all' || options.enabled === false)) {
        continue;
      }

      for (const channel of def.channels) {
        if (options.channels && !options.channels.includes(channel)) {
          continue;
        }

        let enabled = def.defaultEnabled;

        switch (action) {
          case 'enable_all':
            enabled = true;
            break;
          case 'disable_all':
            enabled = false;
            break;
          case 'reset_to_defaults':
            enabled = def.defaultEnabled;
            break;
          case 'update_category':
            if (options.enabled === undefined) continue;
            enabled = options.enabled;
            break;
        }

        updates.push({
          type: def.type,
          channel,
          definitionName: def.name,
          category: def.category,
          enabled,
        });
      }
    }

    const result = await this.updateUserPreferences(userId, updates, options.organizationId);

    return {
      affectedCount: result.updated.length + result.created.length,
      preferences: [...result.updated, ...result.created],
      errors: result.errors,
    };
  }

  /**
   * Check if user should receive notification
   */
  async shouldReceiveNotification(
    userId: string,
    definitionName: string,
    channel: NotificationChannel,
    organizationId?: string,
  ): Promise<boolean> {
    const def = this.definitionsRegistry.get(definitionName);
    if (!def) {
      this.logger.warn(`Definition ${definitionName} not found during preference check`);
      return false;
    }

    // Check explicit preferences first (user may have disabled "all transactional" etc.)
    // 1. Organization specific
    if (organizationId) {
      const organizationPref = await this.prisma.notificationPreference.findFirst({
        where: {
          userId,
          organizationId,
          channel: channel as $Enums.NotificationChannel,
          definitionName: definitionName,
        },
      });
      if (organizationPref) return organizationPref.enabled;
    }

    // 2. Global specific for this definition
    const globalPref = await this.prisma.notificationPreference.findFirst({
      where: {
        userId,
        organizationId: null,
        channel: channel as $Enums.NotificationChannel,
        definitionName: definitionName,
      },
    });
    if (globalPref) return globalPref.enabled;

    // 3. Global for channel+type (definitionName null) - e.g. "all transactional" off
    const globalChannelTypePref = await this.prisma.notificationPreference.findFirst({
      where: {
        userId,
        organizationId: null,
        channel: channel as $Enums.NotificationChannel,
        type: def.type as $Enums.NotificationType,
        definitionName: null,
      },
    });
    if (globalChannelTypePref) return globalChannelTypePref.enabled;

    // 4. Mandatory definitions default to on when no preference is set
    if (def.mandatory) return true;

    // 5. Default
    return def.defaultEnabled;
  }

  /**
   * Create default preferences (helper method, though we mostly query dynamically)
   */
  async createDefaultPreferences(_userId: string, _organizationId?: string): Promise<void> {
    // No-op for now as we treat missing records as "default"
    // But we could pre-populate if needed for performance or explicit user visibility
    return;
  }

  /**
   * Get categories and definitions
   */
  async getNotificationCategories(): Promise<NotificationCategoryInfo[]> {
    return this.definitionsRegistry.getCategories();
  }
}
