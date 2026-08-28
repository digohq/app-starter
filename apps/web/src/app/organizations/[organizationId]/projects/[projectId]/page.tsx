'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectForm, type ProjectFormData } from '@/components/projects/ProjectForm';
import { organizationsApi } from '@/lib/organizations-api';
import { projectsApi } from '@/lib/projects-api';

interface PageProps {
  params: Promise<{ organizationId: string; projectId: string }>;
}

export default function ProjectPage({ params }: PageProps) {
  const { organizationId, projectId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', organizationId, projectId],
    queryFn: () => projectsApi.get(organizationId, projectId),
  });

  const { data: roleInfo } = useQuery({
    queryKey: ['organization-role', organizationId],
    queryFn: () => organizationsApi.getUserRoleInOrganization(organizationId),
  });

  const canDelete = roleInfo?.role === 'OWNER' || roleInfo?.role === 'ADMIN';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', organizationId, projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects', organizationId] });
  };

  const handleUpdate = async (data: ProjectFormData) => {
    try {
      await projectsApi.update(organizationId, projectId, {
        name: data.name,
        description: data.description || undefined,
        visibility: data.visibility,
      });
      invalidate();
      setIsEditing(false);
      toast.success('Project updated');
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Could not update the project.');
      throw error;
    }
  };

  const handleToggleArchive = async () => {
    if (!project) return;

    try {
      await projectsApi.update(organizationId, projectId, {
        archived: project.archivedAt === null,
      });
      invalidate();
      toast.success(project.archivedAt ? 'Project restored' : 'Project archived');
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Could not update the project.');
    }
  };

  const handleDelete = async () => {
    try {
      await projectsApi.remove(organizationId, projectId);
      queryClient.invalidateQueries({ queryKey: ['projects', organizationId] });
      toast.success('Project deleted');
      router.push(`/organizations/${organizationId}`);
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Could not delete the project.');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          Project not found, or you do not have access to it.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/organizations/${organizationId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to organization
          </Link>
        </Button>

        <PageHeader
          title={
            <span className="flex items-center gap-3">
              {project.name}
              {project.archivedAt && <Badge variant="outline">Archived</Badge>}
              <Badge variant="secondary">{project.visibility.toLowerCase()}</Badge>
            </span>
          }
        >
          {!isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleToggleArchive}>
                {project.archivedAt ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </Button>
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </PageHeader>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit project</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectForm
                defaultValues={{
                  name: project.name,
                  description: project.description ?? '',
                  visibility: project.visibility,
                }}
                submitLabel="Save changes"
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 py-6">
              <p className="text-sm text-muted-foreground">
                {project.description || 'No description yet.'}
              </p>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Slug</dt>
                  <dd className="font-mono">{project.slug}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(project.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{project.name}”. Archiving keeps it and frees a slot against
              your plan limit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
