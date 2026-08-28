'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectForm, type ProjectFormData } from '@/components/projects/ProjectForm';
import { projectsApi } from '@/lib/projects-api';

interface PageProps {
  params: Promise<{ organizationId: string }>;
}

/** Shape of the 403 the API returns when a plan limit blocks creation. */
interface PlanLimitError {
  error?: string;
  limit?: number;
  message?: string;
}

export default function CreateProjectPage({ params }: PageProps) {
  const { organizationId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const project = await projectsApi.create(organizationId, {
        name: data.name,
        description: data.description || undefined,
        visibility: data.visibility,
      });

      queryClient.invalidateQueries({ queryKey: ['projects', organizationId] });
      toast.success('Project created');
      router.push(`/organizations/${organizationId}/projects/${project.id}`);
    } catch (error) {
      const apiError = error as PlanLimitError;

      // The plan limit is enforced server-side, so this is the authoritative
      // signal even when the UI thought there was room.
      if (apiError.error === 'PLAN_LIMIT_EXCEEDED') {
        toast.error(apiError.message || 'Your plan does not allow more projects.');
        return;
      }

      toast.error(apiError.message || 'Could not create the project.');
      throw error;
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <PageHeader
          title="New project"
          description="Projects are the example vertical. Swap them for your own domain."
        />

        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/organizations/${organizationId}`)}
        />
      </div>
    </PageContainer>
  );
}
