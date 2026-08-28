import { ProjectVisibility } from '@prisma/client';

export class ProjectResponseDto {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: ProjectVisibility;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ProjectListResponseDto {
  items: ProjectResponseDto[];
  total: number;
}
