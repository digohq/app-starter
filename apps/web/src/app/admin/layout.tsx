import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { authStorage } from '@/lib/auth-storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Server-side layout: only render admin children if the current user is a global admin.
 * Non-admins and unauthenticated users get 404 so the admin route does not appear to exist.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const accessToken = authStorage.getAccessTokenFromCookie(cookieHeader);

  if (!accessToken) {
    notFound();
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/dashboard/users?page=1&pageSize=1`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    notFound();
  }

  return <>{children}</>;
}
