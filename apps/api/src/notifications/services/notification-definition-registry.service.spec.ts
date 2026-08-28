import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDefinitionRegistryService } from './notification-definition-registry.service';
import { NotificationDefinitionModel } from '../models/notification-definition.model';
import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
} from '../types/notification.types';
import { NotificationTemplate } from '../interfaces/notification-template.interface';

describe('NotificationDefinitionRegistryService', () => {
  let service: NotificationDefinitionRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationDefinitionRegistryService],
    }).compile();

    service = module.get<NotificationDefinitionRegistryService>(
      NotificationDefinitionRegistryService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register and retrieve a definition', () => {
    const mockTemplate: NotificationTemplate = {
      variables: {},
      render: jest.fn(),
    };

    const definition = new NotificationDefinitionModel({
      name: 'test-notification',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.NORMAL,
      mandatory: false,
      template: mockTemplate,
    });

    service.register(definition);
    const retrieved = service.get('test-notification');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test-notification');
  });

  // Additional tests would be added here
});
