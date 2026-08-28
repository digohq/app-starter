import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { RichText } from '@/components/ui/rich-text';
import { PageContainer } from '@/components/layout/PageContainer';
import { API_BASE_URL } from '@/lib/api-client';
import type { PublicUserResponse } from '@/lib/users-api';
import { decodeHtmlEntities } from '@/lib/html-utils';

interface PageProps {
  params: Promise<{ username: string }>;
}

/**
 * Public profile page. Server-rendered and unauthenticated, so it fetches
 * directly rather than through the browser api client.
 */
async function fetchProfile(username: string): Promise<PublicUserResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/users/username/${encodeURIComponent(username)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username);

  if (!profile) {
    return { title: 'Profile not found' };
  }

  const name = decodeHtmlEntities(profile.name ?? username);
  return { title: name, description: `${name}'s profile` };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await fetchProfile(username);

  if (!profile) {
    notFound();
  }

  const displayName = decodeHtmlEntities(profile.name ?? username);

  return (
    <PageContainer>
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-2xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
            {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
          </div>
        </header>

        {profile.bio && (
          <>
            <Separator />
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                About
              </h2>
              <RichText html={profile.bio} />
            </section>
          </>
        )}
      </main>
    </PageContainer>
  );
}
