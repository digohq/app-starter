'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { organizationsApi } from '@/lib/organizations-api';

/**
 * Post-login landing. Lists the organizations the user belongs to, which is
 * the entry point to everything else.
 */
export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['user-organizations'],
    queryFn: () => organizationsApi.getUserOrganizations(),
  });

  return (
    <>
      <PageHeader title="Home" description="Pick up where you left off.">
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
          title="Create your first organization"
          description="Organizations own your projects and members."
          action={
            <Button asChild>
              <Link href="/organizations/create">Create an organization</Link>
            </Button>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.organizations.map((organization) => (
          <Link key={organization.id} href={`/organizations/${organization.id}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{organization.name}</CardTitle>
                  <Badge variant="secondary">{organization.role.toLowerCase()}</Badge>
                </div>
                {organization.description && (
                  <CardDescription>{organization.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
