import { Injectable, Logger } from '@nestjs/common';
import { NotificationDefinition } from '../interfaces/notification-definition.interface';
import {
  NotificationCategory,
  NotificationCategoryInfo,
  NotificationChannel,
} from '../types/notification.types';

/**
 * Service for managing notification definitions registry
 */
@Injectable()
export class NotificationDefinitionRegistryService {
  private readonly logger = new Logger(NotificationDefinitionRegistryService.name);
  private definitions: Map<string, NotificationDefinition> = new Map();

  /**
   * Register a notification definition
   */
  register(definition: NotificationDefinition): void {
    if (this.definitions.has(definition.name)) {
      this.logger.warn(
        `Notification definition "${definition.name}" is already registered. Overwriting.`,
      );
    }

    this.definitions.set(definition.name, definition);
    this.logger.log(
      `Registered notification definition: "${definition.name}" (${definition.type}, channels: ${definition.channels.join(', ')})`,
    );
  }

  /**
   * Get a notification definition by name
   */
  get(name: string): NotificationDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * Get all registered notification definitions
   */
  getAll(): NotificationDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Check if a definition exists
   */
  has(name: string): boolean {
    return this.definitions.has(name);
  }

  /**
   * Get all definition names
   */
  getNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Get definitions by category
   */
  getDefinitionsByCategory(category: NotificationCategory): NotificationDefinition[] {
    return this.getAll().filter((def) => def.category === category);
  }

  /**
   * Get all categories with metadata
   */
  getCategories(): NotificationCategoryInfo[] {
    const categoryMap = new Map<NotificationCategory, Set<NotificationChannel>>();
    const categoryDefinitions = new Map<NotificationCategory, NotificationDefinition[]>();

    // Initialize all categories
    Object.values(NotificationCategory).forEach((cat) => {
      categoryMap.set(cat, new Set());
      categoryDefinitions.set(cat, []);
    });

    // Organization definitions by category
    this.getAll().forEach((def) => {
      const catChannels = categoryMap.get(def.category);
      if (catChannels) {
        def.channels.forEach((ch) => catChannels.add(ch));
      }
      categoryDefinitions.get(def.category)?.push(def);
    });

    // Map categories to display data
    // In a real app, these descriptions would likely be localized
    const displayNames: Record<NotificationCategory, string> = {
      [NotificationCategory.INVITATIONS]: 'Invitations',
      [NotificationCategory.ACCEPTANCES]: 'Acceptances',
      [NotificationCategory.FOLLOWS]: 'Follows',
      [NotificationCategory.COMMENTS]: 'Comments',
      [NotificationCategory.COLLABORATION]: 'Collaboration',
      [NotificationCategory.SYSTEM]: 'System',
    };

    const descriptions: Record<NotificationCategory, string> = {
      [NotificationCategory.INVITATIONS]:
        'Notifications when you are invited to join events, sessions, or organizations.',
      [NotificationCategory.ACCEPTANCES]: 'Notifications when someone accepts your invitation.',
      [NotificationCategory.FOLLOWS]: 'Notifications when someone follows you.',
      [NotificationCategory.COMMENTS]: 'Notifications when someone comments on your content.',
      [NotificationCategory.COLLABORATION]: 'Notifications about collaboration updates.',
      [NotificationCategory.SYSTEM]: 'Important system updates and announcements.',
    };

    return Object.values(NotificationCategory).map((category) => {
      const channels = Array.from(categoryMap.get(category) || []);
      const definitions = categoryDefinitions.get(category) || [];

      return {
        category,
        displayName: displayNames[category] || category,
        description: descriptions[category] || '',
        supportedChannels: channels,
        definitions: definitions.map((def) => ({
          definitionName: def.name,
          displayName: def.displayName,
          description: def.description,
          type: def.type,
          supportedChannels: def.channels,
          canDisable: !def.mandatory,
          defaultEnabled: def.defaultEnabled,
        })),
      };
    });
  }
}
