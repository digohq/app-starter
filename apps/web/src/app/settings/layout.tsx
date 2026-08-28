import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function SettingsLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <UniversalLayout>{children}</UniversalLayout>;
}
