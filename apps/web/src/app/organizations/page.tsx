'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { organizationsApi } from '@/lib/organizations-api';

export default function OrganizationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: () => organizationsApi.getUserOrganizations(),
  });

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader title="Organizations" description="Every workspace you belong to.">
          <Button asChild>
            <Link href="/organizations/create">
              <Plus className="mr-2 h-4 w-4" />
              New organization
            </Link>
          </Button>
        </PageHeader>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && data?.organizations.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Create one to start inviting people and building."
            action={
              <Button asChild>
                <Link href="/organizations/create">Create an organization</Link>
              </Button>
            }
          />
        )}

        <div className="grid gap-4">
          {data?.organizations.map((organization) => (
            <Link key={organization.id} href={`/organizations/${organization.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{organization.name}</CardTitle>
                    <Badge variant="secondary">{organization.role.toLowerCase()}</Badge>
                  </div>
                  {organization.description && (
                    <CardDescription>{organization.description}</CardDescription>
                  )}
                </CardHeader>
                {organization.location && (
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    {organization.location}
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
