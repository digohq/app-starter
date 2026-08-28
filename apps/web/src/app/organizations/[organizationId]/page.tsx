'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Loader2, Plus, Settings, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { InviteOrganizationMembersDialog } from '@/components/organizations/InviteOrganizationMembersDialog';
import { organizationsApi } from '@/lib/organizations-api';
import { projectsApi } from '@/lib/projects-api';

interface PageProps {
  params: Promise<{ organizationId: string }>;
}

export default function OrganizationPage({ params }: PageProps) {
  const { organizationId } = use(params);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => organizationsApi.getOrganization(organizationId),
  });

  const { data: roleInfo } = useQuery({
    queryKey: ['organization-role', organizationId],
    queryFn: () => organizationsApi.getUserRoleInOrganization(organizationId),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', organizationId],
    queryFn: () => projectsApi.list(organizationId),
  });

  const canManage = roleInfo?.role === 'OWNER' || roleInfo?.role === 'ADMIN';
  const projectCount = projects?.total ?? 0;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (!organization) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
          Organization not found, or you no longer have access to it.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <PageHeader title={organization.name} description={organization.description || undefined}>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/organizations/${organizationId}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </PageHeader>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">
              Projects
              <span className="ml-2 text-sm font-normal text-muted-foreground">{projectCount}</span>
            </h2>

            <Button asChild size="sm">
              <Link href={`/organizations/${organizationId}/projects/create`}>
                <Plus className="mr-2 h-4 w-4" />
                New project
              </Link>
            </Button>
          </div>

          {projects && projects.items.length === 0 && (
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              description="Projects are the example vertical in this boilerplate. Replace them with your own domain."
              action={
                <Button asChild>
                  <Link href={`/organizations/${organizationId}/projects/create`}>
                    Create a project
                  </Link>
                </Button>
              }
            />
          )}

          <div className="grid gap-3">
            {projects?.items.map((project) => (
              <Link
                key={project.id}
                href={`/organizations/${organizationId}/projects/${project.id}`}
              >
                <Card className="transition-colors hover:border-primary">
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {project.archivedAt && <Badge variant="outline">Archived</Badge>}
                        <Badge variant="secondary">{project.visibility.toLowerCase()}</Badge>
                      </div>
                    </div>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {organization.location && (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              {organization.location}
            </CardContent>
          </Card>
        )}
      </div>

      <InviteOrganizationMembersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        defaultOrganizationId={organizationId}
      />
    </PageContainer>
  );
}
