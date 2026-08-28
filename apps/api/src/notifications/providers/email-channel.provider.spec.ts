import { Test, TestingModule } from '@nestjs/testing';
import { EmailChannelProvider } from './email-channel.provider';
import { EmailService } from '../../email/email.service';

describe('EmailChannelProvider', () => {
  let provider: EmailChannelProvider;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailChannelProvider, { provide: EmailService, useValue: mockEmailService }],
    }).compile();

    provider = module.get<EmailChannelProvider>(EmailChannelProvider);
  });

  it('should unescape HTML entities in the subject line', async () => {
    await provider.send('test@example.com', {
      subject: 'Invited to speak at &quot;Cool Session&quot;',
      htmlContent: '<p>Hi</p>',
    });

    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      'test@example.com',
      'Invited to speak at "Cool Session"',
      '<p>Hi</p>',
      '',
      { replyTo: undefined, fromName: undefined },
    );
  });

  it('should unescape all supported HTML entities', async () => {
    await provider.send('test@example.com', {
      subject: 'Symbols: &amp; &lt; &gt; &#039; &#39; &apos;',
      htmlContent: '<p>Hi</p>',
    });

    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
      'test@example.com',
      "Symbols: & < > ' ' '",
      '<p>Hi</p>',
      '',
      { replyTo: undefined, fromName: undefined },
    );
  });
});
