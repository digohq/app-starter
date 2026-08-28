'use client';

import { useEffect, useState } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { authStorage } from '@/lib/auth-storage';
import { usersApi, type UserProfileResponse } from '@/lib/users-api';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  LogIn,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

type AdminUserItem = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  quarantinedAt: string | null;
  isGlobalAdmin: boolean;
  slug: string | null;
};

type AdminPaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type AdminEventItem = {
  id: string;
  title: string;
  organizationName?: string | null;
  organizationSlug?: string | null;
  slug: string;
  startsAt: string | null;
  status: 'upcoming' | 'past' | 'unscheduled';
  createdAt: string;
  createdByUserEmail: string | null;
  isFeatured: boolean;
};

type AdminSessionItem = {
  id: string;
  title: string;
  slug: string;
  eventTitle?: string | null;
  eventSlug?: string | null;
  scheduledAt: string | null;
  createdAt: string;
  createdByUserId: string | null;
  createdByUserEmail: string | null;
  createdByUserQuarantinedAt: string | null;
  isFeatured: boolean;
};

type AdminVenueSubmissionItem = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
  submitterEmail: string;
};

type AdminCalendarItem = {
  id: string;
  name: string;
  slug: string | null;
  isFeatured: boolean;
  organizationName: string | null;
  organizationSlug: string | null;
  creatorName: string | null;
  creatorSlug: string | null;
};

type AdminSpeakerItem = {
  id: string;
  name: string | null;
  email: string | null;
  company?: string | null;
  sessionsCount: number;
  phone: string | null;
  slug: string | null;
};

type AdminSponsorItem = {
  id: string;
  name: string;
  slug: string;
  company: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
};

type AdminActivityItem = {
  id: string;
  type: string;
  occurredAt: string;
  summary: string;
};

async function fetchAdminData<T>(
  path: string,
  page: number,
  pageSize: number,
  extraParams: Record<string, string | boolean | undefined> = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  return apiClient.get<AdminPaginatedResponse<T>>(`/api${path}?${params.toString()}`);
}

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState('users');

  const [usersState, setUsersState] = useState<{
    data: AdminPaginatedResponse<AdminUserItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
    search: string;
    quarantinedOnly: boolean;
  }>({ data: null, loading: false, page: 1, pageSize: 25, search: '', quarantinedOnly: false });

  const [eventsState, setEventsState] = useState<{
    data: AdminPaginatedResponse<AdminEventItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  }>({ data: null, loading: false, page: 1, pageSize: 25 });

  const [sessionsState, setSessionsState] = useState<{
    data: AdminPaginatedResponse<AdminSessionItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  }>({ data: null, loading: false, page: 1, pageSize: 25 });

  const [speakersState, setSpeakersState] = useState<{
    data: AdminPaginatedResponse<AdminSpeakerItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  }>({ data: null, loading: false, page: 1, pageSize: 25 });

  const [activityState, setActivityState] = useState<{
    data: AdminPaginatedResponse<AdminActivityItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  }>({ data: null, loading: false, page: 1, pageSize: 25 });

  const [venuesState, setVenuesState] = useState<{
    data: AdminPaginatedResponse<AdminVenueSubmissionItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
    statusFilter: 'PENDING' | 'ALL';
  }>({ data: null, loading: false, page: 1, pageSize: 25, statusFilter: 'PENDING' });

  const [calendarsState, setCalendarsState] = useState<{
    data: AdminPaginatedResponse<AdminCalendarItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  }>({ data: null, loading: false, page: 1, pageSize: 25 });

  const [sponsorsState, setSponsorsState] = useState<{
    data: AdminPaginatedResponse<AdminSponsorItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  }>({ data: null, loading: false, page: 1, pageSize: 25 });

  useEffect(() => {
    const checkAuth = async () => {
      if (!authStorage.isAuthenticated()) {
        router.push('/login');
        return;
      }

      try {
        const userProfile = await usersApi.getUserProfile();
        // isGlobalAdmin is not part of the current profile DTO, so we infer from API access below.
        setProfile(userProfile);
      } catch {
        // If fetching profile fails, treat as unauthenticated
        router.push('/login');
        return;
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadUsers = async () => {
    setUsersState((prev) => ({ ...prev, loading: true }));
    try {
      const data = await fetchAdminData<AdminUserItem>(
        '/admin/dashboard/users',
        usersState.page,
        usersState.pageSize,
        {
          search: usersState.search,
          quarantinedOnly: usersState.quarantinedOnly,
        },
      );
      setUsersState((prev) => ({ ...prev, data, loading: false }));
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err?.statusCode === 403) notFound();
      setUsersState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (!isCheckingAuth && activeTab === 'users') loadUsers();
  }, [isCheckingAuth, activeTab, usersState.page, usersState.pageSize]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  useEffect(() => {
    if (isCheckingAuth || activeTab !== 'events') return;
    const load = async () => {
      setEventsState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAdminData<AdminEventItem>(
          '/admin/dashboard/events',
          eventsState.page,
          eventsState.pageSize,
        );
        setEventsState((prev) => ({ ...prev, data, loading: false }));
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) notFound();
        setEventsState((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, [isCheckingAuth, activeTab, eventsState.page, eventsState.pageSize]);

  useEffect(() => {
    if (isCheckingAuth || activeTab !== 'sessions') return;
    const load = async () => {
      setSessionsState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAdminData<AdminSessionItem>(
          '/admin/dashboard/sessions',
          sessionsState.page,
          sessionsState.pageSize,
        );
        setSessionsState((prev) => ({ ...prev, data, loading: false }));
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) notFound();
        setSessionsState((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, [isCheckingAuth, activeTab, sessionsState.page, sessionsState.pageSize]);

  useEffect(() => {
    if (isCheckingAuth || activeTab !== 'speakers') return;
    const load = async () => {
      setSpeakersState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAdminData<AdminSpeakerItem>(
          '/admin/dashboard/speakers',
          speakersState.page,
          speakersState.pageSize,
        );
        setSpeakersState((prev) => ({ ...prev, data, loading: false }));
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) notFound();
        setSpeakersState((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, [isCheckingAuth, activeTab, speakersState.page, speakersState.pageSize]);

  useEffect(() => {
    if (isCheckingAuth || activeTab !== 'activity') return;
    const load = async () => {
      setActivityState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAdminData<AdminActivityItem>(
          '/admin/dashboard/activity',
          activityState.page,
          activityState.pageSize,
        );
        setActivityState((prev) => ({ ...prev, data, loading: false }));
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) notFound();
        setActivityState((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, [isCheckingAuth, activeTab, activityState.page, activityState.pageSize]);

  useEffect(() => {
    if (isCheckingAuth || activeTab !== 'venues') return;
    const load = async () => {
      setVenuesState((prev) => ({ ...prev, loading: true }));
      try {
        const params = new URLSearchParams({
          page: String(venuesState.page),
          pageSize: String(venuesState.pageSize),
        });
        if (venuesState.statusFilter === 'PENDING') params.set('status', 'PENDING');
        const data = await apiClient.get<AdminPaginatedResponse<AdminVenueSubmissionItem>>(
          `/api/admin/venues/submissions?${params.toString()}`,
        );
        setVenuesState((prev) => ({ ...prev, data, loading: false }));
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) notFound();
        setVenuesState((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, [isCheckingAuth, activeTab, venuesState.page, venuesState.pageSize, venuesState.statusFilter]);

  useEffect(() => {
    if (isCheckingAuth || activeTab !== 'calendars') return;
    const load = async () => {
      setCalendarsState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAdminData<AdminCalendarItem>(
          '/admin/dashboard/calendars',
          calendarsState.page,
          calendarsState.pageSize,
        );
        setCalendarsState((prev) => ({ ...prev, data, loading: false }));
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) notFound();
        setCalendarsState((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, [isCheckingAuth, activeTab, calendarsState.page, calendarsState.pageSize]);

  useEffect(() => {
    if (isCheckingAuth || activeTab !== 'sponsors') return;
    const load = async () => {
      setSponsorsState((prev) => ({ ...prev, loading: true }));
      try {
        const data = await fetchAdminData<AdminSponsorItem>(
          '/admin/dashboard/sponsors',
          sponsorsState.page,
          sponsorsState.pageSize,
        );
        setSponsorsState((prev) => ({ ...prev, data, loading: false }));
      } catch (e) {
        if ((e as { statusCode?: number })?.statusCode === 403) notFound();
        setSponsorsState((prev) => ({ ...prev, loading: false }));
      }
    };
    load();
  }, [isCheckingAuth, activeTab, sponsorsState.page, sponsorsState.pageSize]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking permissions…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin Dashboard"
        description="Monitor App Starter usage across users, events, sessions, speakers, and recent activity."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="venues">Venue Submissions</TabsTrigger>
          <TabsTrigger value="calendars">Calendars</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="pt-4">
          <AdminUsersTable
            state={usersState}
            setState={setUsersState}
            onImpersonate={async (userId) => {
              try {
                const res = await apiClient.post<{ accessToken: string; redirectUrl?: string }>(
                  '/api/admin/dashboard/impersonate',
                  { targetUserId: userId, reason: 'Admin dashboard' },
                );
                const url =
                  res.redirectUrl ??
                  `${typeof window !== 'undefined' ? window.location.origin : ''}/impersonate?token=${encodeURIComponent(res.accessToken)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              } catch (e) {
                const msg = (e as { message?: string })?.message ?? 'Impersonation failed';
                if (typeof window !== 'undefined') window.alert(msg);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          <AdminEventsTable state={eventsState} setState={setEventsState} />
        </TabsContent>

        <TabsContent value="sessions" className="pt-4">
          <AdminSessionsTable state={sessionsState} setState={setSessionsState} />
        </TabsContent>

        <TabsContent value="speakers" className="pt-4">
          <AdminSpeakersTable state={speakersState} setState={setSpeakersState} />
        </TabsContent>

        <TabsContent value="venues" className="pt-4">
          <AdminVenueSubmissionsTable state={venuesState} setState={setVenuesState} />
        </TabsContent>

        <TabsContent value="calendars" className="pt-4">
          <AdminCalendarsTable state={calendarsState} setState={setCalendarsState} />
        </TabsContent>

        <TabsContent value="sponsors" className="pt-4">
          <AdminSponsorsTable state={sponsorsState} setState={setSponsorsState} />
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <AdminActivityList state={activityState} setState={setActivityState} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function PaginationControls<T>({
  page,
  pageSize,
  total,
  setState,
}: {
  page: number;
  pageSize: number;
  total: number;
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<T> | null;
      loading: boolean;
      page: number;
      pageSize: number;
    }>
  >;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <span className="text-xs text-muted-foreground">
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setState((prev) => ({ ...prev, page: prev.page - 1 }))}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setState((prev) => ({ ...prev, page: prev.page + 1 }))}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={pageSize}
          onChange={(e) =>
            setState((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))
          }
          aria-label="Page size"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AdminUsersTable({
  state,
  setState,
  onImpersonate,
}: {
  state: {
    data: AdminPaginatedResponse<AdminUserItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
    search: string;
    quarantinedOnly: boolean;
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminUserItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
      search: string;
      quarantinedOnly: boolean;
    }>
  >;
  onImpersonate: (userId: string) => Promise<void>;
}) {
  const handleQuarantineToggle = async (user: AdminUserItem) => {
    const isQuarantined = !!user.quarantinedAt;
    const action = isQuarantined ? 'unquarantine' : 'quarantine';
    const reason = window.prompt(`Reason for ${action} (optional):`) ?? undefined;

    try {
      await apiClient.patch(`/api/admin/dashboard/users/${user.id}/quarantine`, {
        isQuarantined: !isQuarantined,
        reason,
      });
      toast.success(`User ${isQuarantined ? 'unquarantined' : 'quarantined'}`);

      // Update local state
      setState((prev) => ({
        ...prev,
        data: prev.data
          ? {
              ...prev.data,
              items: prev.data.items.map((u) =>
                u.id === user.id
                  ? { ...u, quarantinedAt: isQuarantined ? null : new Date().toISOString() }
                  : u,
              ),
            }
          : null,
      }));
    } catch {
      toast.error(`Failed to ${action} user`);
    }
  };

  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading users…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full rounded-md border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
            value={state.search}
            onChange={(e) => setState((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Quarantined only</label>
          <Switch
            checked={state.quarantinedOnly}
            onCheckedChange={(checked) =>
              setState((prev) => ({ ...prev, quarantinedOnly: checked, page: 1 }))
            }
          />
        </div>
      </div>

      {!state.data || state.data.items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No users found.</div>
      ) : (
        <div className={cn('rounded-md border bg-card')}>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Created</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Global Admin</th>
                <th className="px-4 py-2 text-left font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.data.items.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 align-middle">{user.email}</td>
                  <td className="px-4 py-2 align-middle">
                    {user.slug ? (
                      <Link
                        href={`/users/${user.slug}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {user.name ?? '—'}
                      </Link>
                    ) : (
                      (user.name ?? '—')
                    )}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {user.quarantinedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        <ShieldAlert className="h-3 w-3" />
                        Quarantined
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        <ShieldCheck className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {user.isGlobalAdmin ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        Global Admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'gap-1',
                          user.quarantinedAt
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-red-600 hover:text-red-700',
                        )}
                        onClick={() => handleQuarantineToggle(user)}
                        aria-label={
                          user.quarantinedAt
                            ? `Unquarantine ${user.email}`
                            : `Quarantine ${user.email}`
                        }
                      >
                        {user.quarantinedAt ? (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Unquarantine
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Quarantine
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => onImpersonate(user.id)}
                        aria-label={`Log in as ${user.email}`}
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Log in as
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <PaginationControls
              page={state.page}
              pageSize={state.pageSize}
              total={state.data.total}
              setState={setState as any}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminEventsTable({
  state,
  setState,
}: {
  state: {
    data: AdminPaginatedResponse<AdminEventItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminEventItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
    }>
  >;
}) {
  const handleFeaturedChange = async (eventId: string, isFeatured: boolean) => {
    try {
      await apiClient.patch(`/api/admin/featured/event/${eventId}`, { isFeatured });
      setState((prev) => ({
        ...prev,
        data: prev.data
          ? {
              ...prev.data,
              items: prev.data.items.map((e) => (e.id === eventId ? { ...e, isFeatured } : e)),
            }
          : null,
      }));
    } catch {
      if (typeof window !== 'undefined') window.alert('Failed to update featured status.');
    }
  };

  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading events…</span>
      </div>
    );
  }

  if (!state.data || state.data.items.length === 0) {
    return <div className="text-sm text-muted-foreground">No events found.</div>;
  }

  return (
    <div className={cn('rounded-md border bg-card')}>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Title</th>
            <th className="px-4 py-2 text-left font-medium">Organization</th>
            <th className="px-4 py-2 text-left font-medium">Start</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Created by</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
            <th className="px-4 py-2 text-left font-medium">Featured</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((event) => (
            <tr key={event.id} className="border-b last:border-b-0">
              <td className="px-4 py-2 align-middle">
                <Link href={`/events/${event.slug}`} className="underline-offset-4 hover:underline">
                  {event.title}
                </Link>
              </td>
              <td className="px-4 py-2 align-middle">
                {event.organizationName ? (
                  event.organizationSlug ? (
                    <Link
                      href={`/organization/${event.organizationSlug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {event.organizationName}
                    </Link>
                  ) : (
                    event.organizationName
                  )
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-2 align-middle">
                {event.startsAt ? new Date(event.startsAt).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-2 align-middle capitalize">{event.status}</td>
              <td className="px-4 py-2 align-middle">{event.createdByUserEmail ?? 'Unknown'}</td>
              <td className="px-4 py-2 align-middle">
                {new Date(event.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2 align-middle">
                <Switch
                  checked={event.isFeatured}
                  onCheckedChange={(checked) => handleFeaturedChange(event.id, checked)}
                  aria-label={`Toggle featured for ${event.title}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 pb-3">
        <PaginationControls
          page={state.page}
          pageSize={state.pageSize}
          total={state.data.total}
          setState={setState}
        />
      </div>
    </div>
  );
}

function AdminSessionsTable({
  state,
  setState,
}: {
  state: {
    data: AdminPaginatedResponse<AdminSessionItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminSessionItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
    }>
  >;
}) {
  const handleFeaturedChange = async (sessionId: string, isFeatured: boolean) => {
    try {
      await apiClient.patch(`/api/admin/featured/session/${sessionId}`, { isFeatured });
      setState((prev) => ({
        ...prev,
        data: prev.data
          ? {
              ...prev.data,
              items: prev.data.items.map((s) => (s.id === sessionId ? { ...s, isFeatured } : s)),
            }
          : null,
      }));
    } catch {
      if (typeof window !== 'undefined') window.alert('Failed to update featured status.');
    }
  };

  const handleQuarantineCreator = async (session: AdminSessionItem) => {
    if (!session.createdByUserId) return;
    const isQuarantined = !!session.createdByUserQuarantinedAt;
    const action = isQuarantined ? 'unquarantine' : 'quarantine';
    const reason = window.prompt(`Reason for ${action} (optional):`) ?? undefined;

    try {
      await apiClient.patch(`/api/admin/dashboard/users/${session.createdByUserId}/quarantine`, {
        isQuarantined: !isQuarantined,
        reason,
      });
      toast.success(`User ${isQuarantined ? 'unquarantined' : 'quarantined'}`);

      // Reflect the new status on every session by the same creator.
      const nextQuarantinedAt = isQuarantined ? null : new Date().toISOString();
      setState((prev) => ({
        ...prev,
        data: prev.data
          ? {
              ...prev.data,
              items: prev.data.items.map((s) =>
                s.createdByUserId === session.createdByUserId
                  ? { ...s, createdByUserQuarantinedAt: nextQuarantinedAt }
                  : s,
              ),
            }
          : null,
      }));
    } catch {
      toast.error(`Failed to ${action} user`);
    }
  };

  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading sessions…</span>
      </div>
    );
  }

  if (!state.data || state.data.items.length === 0) {
    return <div className="text-sm text-muted-foreground">No sessions found.</div>;
  }

  return (
    <div className={cn('rounded-md border bg-card')}>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Title</th>
            <th className="px-4 py-2 text-left font-medium">Event</th>
            <th className="px-4 py-2 text-left font-medium">Scheduled</th>
            <th className="px-4 py-2 text-left font-medium">Created by</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
            <th className="px-4 py-2 text-left font-medium">Featured</th>
            <th className="px-4 py-2 text-left font-medium">Creator</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((session) => (
            <tr key={session.id} className="border-b last:border-b-0">
              <td className="px-4 py-2 align-middle">
                <Link
                  href={`/session/${session.slug}`}
                  className="underline-offset-4 hover:underline"
                >
                  {session.title}
                </Link>
              </td>
              <td className="px-4 py-2 align-middle">
                {session.eventSlug ? (
                  <Link
                    href={`/events/${session.eventSlug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {session.eventTitle ?? session.eventSlug}
                  </Link>
                ) : (
                  (session.eventTitle ?? '—')
                )}
              </td>
              <td className="px-4 py-2 align-middle">
                {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : '—'}
              </td>
              <td className="px-4 py-2 align-middle">
                <div className="flex items-center gap-2">
                  <span>{session.createdByUserEmail ?? 'Unknown'}</span>
                  {session.createdByUserQuarantinedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      <ShieldAlert className="h-3 w-3" />
                      Quarantined
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 align-middle">
                {new Date(session.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2 align-middle">
                <Switch
                  checked={session.isFeatured}
                  onCheckedChange={(checked) => handleFeaturedChange(session.id, checked)}
                  aria-label={`Toggle featured for ${session.title}`}
                />
              </td>
              <td className="px-4 py-2 align-middle">
                {session.createdByUserId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'gap-1',
                      session.createdByUserQuarantinedAt
                        ? 'text-emerald-600 hover:text-emerald-700'
                        : 'text-red-600 hover:text-red-700',
                    )}
                    onClick={() => handleQuarantineCreator(session)}
                    aria-label={
                      session.createdByUserQuarantinedAt
                        ? `Unquarantine ${session.createdByUserEmail ?? 'creator'}`
                        : `Quarantine ${session.createdByUserEmail ?? 'creator'}`
                    }
                  >
                    {session.createdByUserQuarantinedAt ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Unquarantine
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Quarantine
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 pb-3">
        <PaginationControls
          page={state.page}
          pageSize={state.pageSize}
          total={state.data.total}
          setState={setState}
        />
      </div>
    </div>
  );
}

function AdminSpeakersTable({
  state,
  setState,
}: {
  state: {
    data: AdminPaginatedResponse<AdminSpeakerItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminSpeakerItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
    }>
  >;
}) {
  const handleCopyContacts = async () => {
    if (!state.data?.items?.length) return;
    const contactsCsv = [
      ['name', 'email', 'phone'].join(','),
      ...state.data.items.map((s) => {
        const row = [s.name ?? '', s.email ?? '', s.phone ?? ''];
        // Basic CSV escaping
        return row
          .map((v) => {
            const str = String(v ?? '');
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replaceAll('"', '""')}"`
              : str;
          })
          .join(',');
      }),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(contactsCsv);
      toast.success('Speaker contacts copied');
    } catch {
      toast.error('Failed to copy contacts');
    }
  };

  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading speakers…</span>
      </div>
    );
  }

  if (!state.data || state.data.items.length === 0) {
    return <div className="text-sm text-muted-foreground">No speakers found.</div>;
  }

  return (
    <div className={cn('rounded-md border bg-card')}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="text-sm text-muted-foreground">Speaker contact info</div>
        <Button type="button" variant="outline" size="sm" onClick={handleCopyContacts}>
          Copy Contacts
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Company</th>
            <th className="px-4 py-2 text-left font-medium">Phone</th>
            <th className="px-4 py-2 text-left font-medium">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((speaker) => (
            <tr key={speaker.id} className="border-b last:border-b-0">
              <td className="px-4 py-2 align-middle">
                {speaker.name && speaker.slug ? (
                  <Link
                    href={`/users/${speaker.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {speaker.name}
                  </Link>
                ) : (
                  (speaker.name ?? '—')
                )}
              </td>
              <td className="px-4 py-2 align-middle">{speaker.email ?? '—'}</td>
              <td className="px-4 py-2 align-middle">{speaker.company ?? '—'}</td>
              <td className="px-4 py-2 align-middle">{speaker.phone ?? '—'}</td>
              <td className="px-4 py-2 align-middle">{speaker.sessionsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 pb-3">
        <PaginationControls
          page={state.page}
          pageSize={state.pageSize}
          total={state.data.total}
          setState={setState}
        />
      </div>
    </div>
  );
}

function AdminActivityList({
  state,
  setState,
}: {
  state: {
    data: AdminPaginatedResponse<AdminActivityItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminActivityItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
    }>
  >;
}) {
  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading activity…</span>
      </div>
    );
  }

  if (!state.data || state.data.items.length === 0) {
    return <div className="text-sm text-muted-foreground">No recent activity found.</div>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {state.data.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between rounded-md border bg-card px-4 py-3"
          >
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.type}
              </div>
              <div className="text-sm font-medium">{item.summary}</div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap pl-4">
              {new Date(item.occurredAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
      <div className="px-1">
        <PaginationControls
          page={state.page}
          pageSize={state.pageSize}
          total={state.data.total}
          setState={setState}
        />
      </div>
    </div>
  );
}

function AdminVenueSubmissionsTable({
  state,
  setState,
}: {
  state: {
    data: AdminPaginatedResponse<AdminVenueSubmissionItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
    statusFilter: 'PENDING' | 'ALL';
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminVenueSubmissionItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
      statusFilter: 'PENDING' | 'ALL';
    }>
  >;
}) {
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await apiClient.post(`/api/admin/venues/submissions/${id}/approve`, {});
      setState((prev) => ({
        ...prev,
        data: prev.data
          ? {
              ...prev.data,
              items: prev.data.items.filter((s) => s.id !== id),
              total: Math.max(0, prev.data.total - 1),
            }
          : null,
      }));
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'Approval failed';
      if (typeof window !== 'undefined') window.alert(msg);
    } finally {
      setApprovingId(null);
    }
  };

  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading venue submissions…</span>
      </div>
    );
  }

  if (!state.data || state.data.items.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Filter:</label>
          <select
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={state.statusFilter}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                statusFilter: e.target.value as 'PENDING' | 'ALL',
                page: 1,
              }))
            }
          >
            <option value="PENDING">PENDING</option>
            <option value="ALL">All</option>
          </select>
        </div>
        <div className="text-sm text-muted-foreground">No venue submissions found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Filter:</label>
        <select
          className="rounded-md border bg-background px-2 py-1 text-sm"
          value={state.statusFilter}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              statusFilter: e.target.value as 'PENDING' | 'ALL',
              page: 1,
            }))
          }
        >
          <option value="PENDING">PENDING</option>
          <option value="ALL">All</option>
        </select>
      </div>
      <div className={cn('rounded-md border bg-card')}>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">City</th>
              <th className="px-4 py-2 text-left font-medium">State</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Submitter</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <th className="px-4 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.data.items.map((s) => (
              <tr key={s.id} className="border-b last:border-b-0">
                <td className="px-4 py-2 align-middle">{s.name}</td>
                <td className="px-4 py-2 align-middle">{s.city}</td>
                <td className="px-4 py-2 align-middle">{s.state}</td>
                <td className="px-4 py-2 align-middle">{s.status}</td>
                <td className="px-4 py-2 align-middle">{s.submitterEmail}</td>
                <td className="px-4 py-2 align-middle">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 align-middle">
                  {s.status === 'PENDING' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={approvingId === s.id}
                      onClick={() => handleApprove(s.id)}
                    >
                      {approvingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Approve'
                      )}
                    </Button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 pb-3">
          <PaginationControls
            page={state.page}
            pageSize={state.pageSize}
            total={state.data.total}
            setState={
              setState as React.Dispatch<
                React.SetStateAction<{
                  data: AdminPaginatedResponse<AdminVenueSubmissionItem> | null;
                  loading: boolean;
                  page: number;
                  pageSize: number;
                }>
              >
            }
          />
        </div>
      </div>
    </div>
  );
}

function AdminSponsorsTable({
  state,
  setState,
}: {
  state: {
    data: AdminPaginatedResponse<AdminSponsorItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminSponsorItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
    }>
  >;
}) {
  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading sponsors…</span>
      </div>
    );
  }

  if (!state.data || state.data.items.length === 0) {
    return <div className="text-sm text-muted-foreground">No sponsors found.</div>;
  }

  return (
    <div className={cn('rounded-md border bg-card')}>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Company</th>
            <th className="px-4 py-2 text-left font-medium">Website</th>
            <th className="px-4 py-2 text-left font-medium">Contact Name</th>
            <th className="px-4 py-2 text-left font-medium">Contact Email</th>
            <th className="px-4 py-2 text-left font-medium">Contact Phone</th>
            <th className="px-4 py-2 text-left font-medium">Slug</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((sponsor) => (
            <tr key={sponsor.id} className="border-b last:border-b-0">
              <td className="px-4 py-2 align-middle">{sponsor.name}</td>
              <td className="px-4 py-2 align-middle">{sponsor.company ?? '—'}</td>
              <td className="px-4 py-2 align-middle">
                {sponsor.website ? (
                  <a
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {sponsor.website}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-2 align-middle">{sponsor.contactName ?? '—'}</td>
              <td className="px-4 py-2 align-middle">{sponsor.contactEmail ?? '—'}</td>
              <td className="px-4 py-2 align-middle">{sponsor.contactPhone ?? '—'}</td>
              <td className="px-4 py-2 align-middle">{sponsor.slug}</td>
              <td className="px-4 py-2 align-middle">
                {new Date(sponsor.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 pb-3">
        <PaginationControls
          page={state.page}
          pageSize={state.pageSize}
          total={state.data.total}
          setState={setState}
        />
      </div>
    </div>
  );
}

function AdminCalendarsTable({
  state,
  setState,
}: {
  state: {
    data: AdminPaginatedResponse<AdminCalendarItem> | null;
    loading: boolean;
    page: number;
    pageSize: number;
  };
  setState: React.Dispatch<
    React.SetStateAction<{
      data: AdminPaginatedResponse<AdminCalendarItem> | null;
      loading: boolean;
      page: number;
      pageSize: number;
    }>
  >;
}) {
  const handleFeaturedChange = async (calendarId: string, isFeatured: boolean) => {
    try {
      await apiClient.patch(`/api/admin/featured/calendar/${calendarId}`, { isFeatured });
      setState((prev) => ({
        ...prev,
        data: prev.data
          ? {
              ...prev.data,
              items: prev.data.items.map((c) => (c.id === calendarId ? { ...c, isFeatured } : c)),
            }
          : null,
      }));
    } catch {
      if (typeof window !== 'undefined') window.alert('Failed to update featured status.');
    }
  };

  if (state.loading && !state.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading calendars…</span>
      </div>
    );
  }

  if (!state.data || state.data.items.length === 0) {
    return <div className="text-sm text-muted-foreground">No calendars found.</div>;
  }

  return (
    <div className={cn('rounded-md border bg-card')}>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Owner</th>
            <th className="px-4 py-2 text-left font-medium">Slug</th>
            <th className="px-4 py-2 text-left font-medium">Featured</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((cal) => (
            <tr key={cal.id} className="border-b last:border-b-0">
              <td className="px-4 py-2 align-middle">
                {cal.slug ? (
                  <Link
                    href={`/calendar/${cal.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {cal.name}
                  </Link>
                ) : (
                  cal.name
                )}
              </td>
              <td className="px-4 py-2 align-middle">
                {cal.organizationName ? (
                  cal.organizationSlug ? (
                    <Link
                      href={`/organization/${cal.organizationSlug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {cal.organizationName}
                    </Link>
                  ) : (
                    cal.organizationName
                  )
                ) : cal.creatorName ? (
                  cal.creatorSlug ? (
                    <Link
                      href={`/users/${cal.creatorSlug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {cal.creatorName}
                    </Link>
                  ) : (
                    cal.creatorName
                  )
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-2 align-middle">{cal.slug ?? '—'}</td>
              <td className="px-4 py-2 align-middle">
                <Switch
                  checked={cal.isFeatured}
                  onCheckedChange={(checked) => handleFeaturedChange(cal.id, checked)}
                  aria-label={`Toggle featured for ${cal.name}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 pb-3">
        <PaginationControls
          page={state.page}
          pageSize={state.pageSize}
          total={state.data.total}
          setState={setState}
        />
      </div>
    </div>
  );
}
