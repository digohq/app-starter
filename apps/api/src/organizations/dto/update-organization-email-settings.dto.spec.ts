import { validate } from 'class-validator';
import { UpdateOrganizationEmailSettingsDto } from './update-organization-email-settings.dto';

describe('UpdateOrganizationEmailSettingsDto', () => {
  it('should pass with valid data', async () => {
    const dto = new UpdateOrganizationEmailSettingsDto();
    dto.emailReplyTo = 'test@example.com';
    dto.emailSenderName = 'Test Organization';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass when fields are optional', async () => {
    const dto = new UpdateOrganizationEmailSettingsDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid email for emailReplyTo', async () => {
    const dto = new UpdateOrganizationEmailSettingsDto();
    dto.emailReplyTo = 'invalid-email';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('emailReplyTo');
  });

  it('should fail when emailSenderName exceeds character limit', async () => {
    const dto = new UpdateOrganizationEmailSettingsDto();
    dto.emailSenderName = 'a'.repeat(101);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('emailSenderName');
  });

  it('should fail when emailSenderName is not a string', async () => {
    const dto = new UpdateOrganizationEmailSettingsDto();
    (dto as any).emailSenderName = 123;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('emailSenderName');
  });
});
