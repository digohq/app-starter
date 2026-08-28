import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: any;

  const mockConfigService = {
    get: jest.fn((key, defaultValue) => defaultValue),
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should use default sender name when not provided', async () => {
    await service.sendEmail('test@example.com', 'Subject', 'html', 'text');

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"App Starter" <noreply@app-starter.local>',
      }),
    );
  });

  it('should use organization settings for sender name when provided', async () => {
    await service.sendEmail('test@example.com', 'Subject', 'html', 'text', {
      fromName: 'Custom Organization Name',
    });

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Custom Organization Name" <noreply@app-starter.local>',
      }),
    );
  });

  it('should use organization settings for reply-to when provided', async () => {
    await service.sendEmail('test@example.com', 'Subject', 'html', 'text', {
      replyTo: 'reply@example.com',
    });

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'reply@example.com',
      }),
    );
  });
});
