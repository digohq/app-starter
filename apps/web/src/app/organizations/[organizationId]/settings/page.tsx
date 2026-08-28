'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { EditOrganizationForm } from '@/components/organizations/EditOrganizationForm';
import { OrganizationMembersTable } from '@/components/organizations/OrganizationMembersTable';
import { OrganizationPendingInvitesCard } from '@/components/organizations/OrganizationPendingInvitesCard';
import { InviteOrganizationMembersDialog } from '@/components/organizations/InviteOrganizationMembersDialog';
import { OrganizationEmailSettingsSection } from '@/components/organizations/OrganizationEmailSettingsSection';
import { OrganizationDangerZoneSection } from '@/components/organizations/OrganizationDangerZoneSection';
import { DomainMappingList } from '@/components/organizations/DomainMappingList';
import { DomainMappingForm } from '@/components/organizations/DomainMappingForm';
import { organizationsApi } from '@/lib/organizations-api';
import { domainMappingsApi } from '@/lib/domain-mappings-api';
import { authStorage } from '@/lib/auth-storage';

interface PageProps {
  params: Promise<{ organizationId: string }>;
}

export default function OrganizationSettingsPage({ params }: PageProps) {
  const { organizationId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  const currentUserId = authStorage.getUser()?.id;

  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => organizationsApi.getOrganization(organizationId),
  });

  const { data: roleInfo } = useQuery({
    queryKey: ['organization-role', organizationId],
    queryFn: () => organizationsApi.getUserRoleInOrganization(organizationId),
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: () => organizationsApi.getOrganizationUsers(organizationId),
  });

  const { data: domains, refetch: refetchDomains } = useQuery({
    queryKey: ['domain-mappings', organizationId],
    queryFn: () => domainMappingsApi.list(organizationId),
  });

  if (isLoading || !organization) {
    return (
      <PageContainer>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  const role = roleInfo?.role ?? 'MEMBER';
  const canManage = role === 'OWNER' || role === 'ADMIN';

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <PageHeader title="Organization settings" description={organization.name} />

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 pt-6">
            {canManage ? (
              <EditOrganizationForm
                initialData={organization}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
                  router.push(`/organizations/${organizationId}`);
                }}
                onCancel={() => router.push(`/organizations/${organizationId}`)}
              />
            ) : (
              <p className="text-muted-foreground">
                Only owners and admins can change organization settings.
              </p>
            )}

            <OrganizationEmailSettingsSection
              organizationId={organizationId}
              role={role}
              initialEmailReplyTo={organization.emailReplyTo}
              initialEmailSenderName={organization.emailSenderName}
            />

            {role === 'OWNER' && (
              <OrganizationDangerZoneSection
                organizationId={organizationId}
                organizationName={organization.name}
                role={role}
              />
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-6 pt-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium">Members</h2>
              {canManage && (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              )}
            </div>

            <OrganizationMembersTable
              users={members?.users ?? []}
              currentUserId={currentUserId}
              currentUserRole={role}
              organizationId={organizationId}
              onUserRemoved={() => refetchMembers()}
            />

            {canManage && <OrganizationPendingInvitesCard organizationId={organizationId} />}
          </TabsContent>

          <TabsContent value="domains" className="space-y-6 pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Add a domain</CardTitle>
                <CardDescription>
                  Point a domain you own at this organization. You will be given a DNS TXT record to
                  verify ownership.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DomainMappingForm
                  organizationId={organizationId}
                  onSuccess={() => refetchDomains()}
                />
              </CardContent>
            </Card>

            <DomainMappingList
              organizationId={organizationId}
              mappings={domains?.domainMappings ?? []}
              onRefresh={() => refetchDomains()}
            />
          </TabsContent>
        </Tabs>
      </div>

      <InviteOrganizationMembersDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) refetchMembers();
        }}
        defaultOrganizationId={organizationId}
      />
    </PageContainer>
  );
}
