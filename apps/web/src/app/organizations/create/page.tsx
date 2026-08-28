'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateOrganizationForm } from '@/components/organizations/CreateOrganizationForm';

export default function CreateOrganizationPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader
          title="New organization"
          description="An organization owns your projects and members."
        />
        <CreateOrganizationForm
          onSuccess={(organization) => router.push(`/organizations/${organization.id}`)}
          onCancel={() => router.push('/organizations')}
        />
      </div>
    </PageContainer>
  );
}
