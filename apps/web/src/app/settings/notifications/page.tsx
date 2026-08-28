import { Metadata } from 'next';
import { NotificationPreferencesContent } from '@/components/settings/notifications/NotificationPreferencesContent';

export const metadata: Metadata = {
  title: 'Notification Settings',
  description: 'Manage your notification preferences.',
};

export default function NotificationsSettingsPage() {
  return <NotificationPreferencesContent />;
}
