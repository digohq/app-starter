import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export default function PrivacyPage() {
  return (
    <PageContainer>
      <PageHeader title="Privacy Policy" description="Last updated: May 4, 2026" />
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p>
          At App Starter, we take your privacy seriously. This policy explains how we collect, use,
          and protect your personal data.
        </p>
        <h2>Data We Collect</h2>
        <p>
          We collect information that you provide to us when you create an account, such as your
          name and email address.
        </p>
        <h2>How We Use Your Data</h2>
        <p>
          We use your data to provide our services, communicate with you, and improve our platform.
        </p>
        <h2>Your Rights</h2>
        <p>
          Under GDPR and CCPA, you have certain rights regarding your personal data, including the
          right to access, delete, and port your data.
        </p>
      </div>
    </PageContainer>
  );
}
