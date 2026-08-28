import { NotificationDefinitionModel } from '../models/notification-definition.model';
import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  NotificationCategory,
} from '../types/notification.types';
import { UserInvitationEmailTemplate } from '../templates/user-invitation.template';
import { InvitationAcceptedEmailTemplate } from '../templates/invitation-accepted.template';
import { EmailVerificationEmailTemplate } from '../templates/email-verification.template';
import { PasswordResetEmailTemplate } from '../templates/password-reset.template';
import { OtpVerificationEmailTemplate } from '../templates/otp-verification.template';
import { OrganizationInviteVerificationEmailTemplate } from '../templates/organization-invite-verification.template';
import { OrganizationInvitationInAppTemplate } from '../templates/in-app/invitation-in-app.templates';
import { OrganizationInvitationAcceptedInAppTemplate } from '../templates/in-app/acceptance-in-app.templates';

/**
 * Factory function to create all notification definitions
 */
export function createNotificationDefinitions(): NotificationDefinitionModel[] {
  return [
    new NotificationDefinitionModel({
      name: 'user-invitation',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.NORMAL,
      mandatory: true,
      category: NotificationCategory.INVITATIONS,
      displayName: 'User Invitations',
      description: 'Receive invitations to join App Starter via email',
      template: new UserInvitationEmailTemplate(),
    }),

    new NotificationDefinitionModel({
      name: 'invitation-accepted',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.NORMAL,
      mandatory: false,
      category: NotificationCategory.ACCEPTANCES,
      displayName: 'Invitation Accepted',
      description: 'get notified when someone accepts your invitation',
      template: new InvitationAcceptedEmailTemplate(),
    }),

    new NotificationDefinitionModel({
      name: 'email-verification',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.HIGH,
      mandatory: true,
      category: NotificationCategory.SYSTEM,
      displayName: 'Email Verification',
      description: 'Emails to verify your account',
      template: new EmailVerificationEmailTemplate(),
    }),

    new NotificationDefinitionModel({
      name: 'password-reset',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.HIGH,
      mandatory: true,
      category: NotificationCategory.SYSTEM,
      displayName: 'Password Reset',
      description: 'Emails to reset your password',
      template: new PasswordResetEmailTemplate(),
    }),

    new NotificationDefinitionModel({
      name: 'password-reset-confirmation',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.NORMAL,
      mandatory: true,
      category: NotificationCategory.SYSTEM,
      displayName: 'Password Reset Confirmation',
      description: 'Confirmation email when password is changed',
      template: new PasswordResetEmailTemplate(), // Can be updated to a separate template later
    }),

    new NotificationDefinitionModel({
      name: 'otp-verification',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.HIGH,
      mandatory: true,
      category: NotificationCategory.SYSTEM,
      displayName: 'OTP Verification',
      description: 'One-time password emails for login',
      template: new OtpVerificationEmailTemplate(),
    }),

    new NotificationDefinitionModel({
      name: 'organization-invite-verification',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.EMAIL],
      severity: NotificationSeverity.HIGH,
      mandatory: true,
      category: NotificationCategory.SYSTEM,
      displayName: 'Organization Verification',
      description: 'Verify your email to join a organization',
      template: new OrganizationInviteVerificationEmailTemplate(),
    }),

    new NotificationDefinitionModel({
      name: 'organization-invitation',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.IN_APP],
      severity: NotificationSeverity.NORMAL,
      mandatory: true,
      category: NotificationCategory.INVITATIONS,
      displayName: 'Organization Invitation',
      description: 'In-app notifications for organization invitations',
      template: new OrganizationInvitationInAppTemplate(),
    }),

    new NotificationDefinitionModel({
      name: 'organization-invitation-accepted',
      type: NotificationType.TRANSACTIONAL,
      channels: [NotificationChannel.IN_APP],
      severity: NotificationSeverity.NORMAL,
      mandatory: false,
      category: NotificationCategory.ACCEPTANCES,
      displayName: 'Organization Acceptance',
      description: 'Notification when someone joins your organization',
      template: new OrganizationInvitationAcceptedInAppTemplate(),
    }),
  ];
}
