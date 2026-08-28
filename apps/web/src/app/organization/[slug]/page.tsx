import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { API_BASE_URL } from '@/lib/api-client';
import type { PublicOrganizationResponse } from '@/lib/organizations-api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Public organization page.
 *
 * This is what a verified custom domain resolves to — the middleware rewrites
 * `https://theirdomain.com/` here. Server-rendered and unauthenticated, so it
 * fetches directly rather than through the browser api client.
 */
async function fetchOrganization(slug: string): Promise<PublicOrganizationResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/organizations/slug/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const organization = await fetchOrganization(slug);

  if (!organization) {
    return { title: 'Organization not found' };
  }

  return {
    title: organization.name,
    description: organization.description ?? `${organization.name} on App Starter`,
  };
}

export default async function PublicOrganizationPage({ params }: PageProps) {
  const { slug } = await params;
  const organization = await fetchOrganization(slug);

  if (!organization) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-16">
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20">
          <AvatarImage src={organization.logoUrl || undefined} alt={organization.name} />
          <AvatarFallback className="text-2xl">
            {organization.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{organization.name}</h1>
          {organization.location && (
            <p className="text-muted-foreground">{organization.location}</p>
          )}
          {organization.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              {organization.website}
            </a>
          )}
        </div>
      </header>

      {organization.description && (
        <>
          <Separator />
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              About
            </h2>
            <p className="leading-relaxed">{organization.description}</p>
          </section>
        </>
      )}
    </main>
  );
}
