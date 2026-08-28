import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboardPage from '../page';
import { usersApi } from '@/lib/users-api';
import { authStorage } from '@/lib/auth-storage';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/users-api', () => ({
  usersApi: {
    getUserProfile: jest.fn(),
  },
}));

jest.mock('@/lib/auth-storage', () => ({
  authStorage: {
    isAuthenticated: jest.fn(),
  },
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockNotFound = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  notFound: () => {
    mockNotFound();
  },
}));

const mockProfile = {
  id: 'u1',
  email: 'admin@example.com',
  name: 'Admin',
  emailVerifiedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const emptyPage = { items: [], page: 1, pageSize: 25, total: 0 };

const clickTab = async (name: string) => {
  const tab = await screen.findByRole('tab', { name });
  await userEvent.setup({ delay: null }).click(tab);
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users to login', async () => {
    (authStorage.isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('shows 404 when user does not have global admin access (backend returns 403)', async () => {
    (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
    (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
    (apiClient.get as jest.Mock).mockRejectedValue({
      statusCode: 403,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockNotFound).toHaveBeenCalled();
    });
  });

  it('renders users tab when admin data loads', async () => {
    (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
    (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
    (apiClient.get as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isGlobalAdmin: true,
          slug: null,
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('renders Name column as a link when user has a slug', async () => {
    (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
    (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
    (apiClient.get as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 'u1',
          email: 'admin@example.com',
          name: 'Admin User',
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          isGlobalAdmin: false,
          slug: 'admin-user',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Admin User' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/users/admin-user');
    });
  });

  it('renders Name column as plain text when user has no slug', async () => {
    (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
    (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
    (apiClient.get as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 'u2',
          email: 'noslug@example.com',
          name: 'No Slug User',
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          isGlobalAdmin: false,
          slug: null,
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No Slug User')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'No Slug User' })).toBeNull();
    });
  });

  // TASK-033: Events tab links
  describe('Events tab', () => {
    const setupEventsTab = (eventItems: object[]) => {
      (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
      (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/admin/dashboard/events')) {
          return Promise.resolve({
            items: eventItems,
            page: 1,
            pageSize: 25,
            total: eventItems.length,
          });
        }
        return Promise.resolve(emptyPage);
      });
    };

    it('renders Title column as a link to /events/{slug}', async () => {
      setupEventsTab([
        {
          id: 'e1',
          title: 'My Event',
          slug: 'my-event',
          organizationName: null,
          organizationSlug: null,
          startsAt: null,
          status: 'upcoming',
          createdAt: new Date().toISOString(),
          createdByUserEmail: null,
          isFeatured: false,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Events');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'My Event' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/events/my-event');
      });
    });

    it('renders Organization column as a link when organizationSlug is present', async () => {
      setupEventsTab([
        {
          id: 'e1',
          title: 'My Event',
          slug: 'my-event',
          organizationName: 'My Organization',
          organizationSlug: 'my-organization',
          startsAt: null,
          status: 'upcoming',
          createdAt: new Date().toISOString(),
          createdByUserEmail: null,
          isFeatured: false,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Events');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'My Organization' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/organization/my-organization');
      });
    });

    it('renders Organization column as plain text when organization has no slug', async () => {
      setupEventsTab([
        {
          id: 'e1',
          title: 'My Event',
          slug: 'my-event',
          organizationName: 'No Slug Organization',
          organizationSlug: null,
          startsAt: null,
          status: 'upcoming',
          createdAt: new Date().toISOString(),
          createdByUserEmail: null,
          isFeatured: false,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Events');

      await waitFor(() => {
        expect(screen.getByText('No Slug Organization')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'No Slug Organization' })).toBeNull();
      });
    });
  });

  // TASK-034: Sessions tab links
  describe('Sessions tab', () => {
    const setupSessionsTab = (sessionItems: object[]) => {
      (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
      (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/admin/dashboard/sessions')) {
          return Promise.resolve({
            items: sessionItems,
            page: 1,
            pageSize: 25,
            total: sessionItems.length,
          });
        }
        return Promise.resolve(emptyPage);
      });
    };

    it('renders Title column as a link to /session/{slug}', async () => {
      setupSessionsTab([
        {
          id: 's1',
          title: 'My Session',
          slug: 'my-session',
          eventTitle: null,
          eventSlug: null,
          scheduledAt: null,
          createdAt: new Date().toISOString(),
          createdByUserEmail: null,
          isFeatured: false,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Sessions');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'My Session' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/session/my-session');
      });
    });

    it('renders Event column as a link when eventSlug is present', async () => {
      setupSessionsTab([
        {
          id: 's1',
          title: 'My Session',
          slug: 'my-session',
          eventTitle: 'Parent Event',
          eventSlug: 'parent-event',
          scheduledAt: null,
          createdAt: new Date().toISOString(),
          createdByUserEmail: null,
          isFeatured: false,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Sessions');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Parent Event' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/events/parent-event');
      });
    });

    it('renders Event column as "—" when no event exists', async () => {
      setupSessionsTab([
        {
          id: 's1',
          title: 'My Session',
          slug: 'my-session',
          eventTitle: null,
          eventSlug: null,
          scheduledAt: null,
          createdAt: new Date().toISOString(),
          createdByUserEmail: null,
          isFeatured: false,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Sessions');

      await waitFor(() => {
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
      });
    });

    it('quarantines the session creator via the Quarantine action', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValue(undefined);
      const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('spam');
      setupSessionsTab([
        {
          id: 's1',
          title: 'Spammy Session',
          slug: 'spammy-session',
          eventTitle: null,
          eventSlug: null,
          scheduledAt: null,
          createdAt: new Date().toISOString(),
          createdByUserId: 'u-spam',
          createdByUserEmail: 'spammer@example.com',
          createdByUserQuarantinedAt: null,
          isFeatured: false,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Sessions');

      const button = await screen.findByRole('button', {
        name: 'Quarantine spammer@example.com',
      });
      await userEvent.setup({ delay: null }).click(button);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/api/admin/dashboard/users/u-spam/quarantine',
          { isQuarantined: true, reason: 'spam' },
        );
      });

      // Row should now reflect the quarantined status.
      await screen.findByRole('button', { name: 'Unquarantine spammer@example.com' });

      promptSpy.mockRestore();
    });
  });

  // TASK-035: Speakers tab links
  describe('Speakers tab', () => {
    const setupSpeakersTab = (speakerItems: object[]) => {
      (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
      (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/admin/dashboard/speakers')) {
          return Promise.resolve({
            items: speakerItems,
            page: 1,
            pageSize: 25,
            total: speakerItems.length,
          });
        }
        return Promise.resolve(emptyPage);
      });
    };

    it('renders Name column as a link when slug is present', async () => {
      setupSpeakersTab([
        {
          id: 'sp1',
          name: 'Jane Speaker',
          company: 'Acme',
          sessionsCount: 2,
          slug: 'jane-speaker',
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Speakers');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Jane Speaker' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/users/jane-speaker');
      });
    });

    it('renders Name column as plain text when slug is null', async () => {
      setupSpeakersTab([
        { id: 'sp1', name: 'No Slug Speaker', company: null, sessionsCount: 1, slug: null },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Speakers');

      await waitFor(() => {
        expect(screen.getByText('No Slug Speaker')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'No Slug Speaker' })).toBeNull();
      });
    });

    it('renders Name column as "—" when name is null', async () => {
      setupSpeakersTab([{ id: 'sp1', name: null, company: 'Acme', sessionsCount: 0, slug: null }]);

      render(<AdminDashboardPage />);
      await clickTab('Speakers');

      await waitFor(() => {
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
      });
    });
  });

  // TASK-036: Sponsors tab
  describe('Sponsors tab', () => {
    const setupSponsorsTab = (sponsorItems: object[]) => {
      (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
      (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/admin/dashboard/sponsors')) {
          return Promise.resolve({
            items: sponsorItems,
            page: 1,
            pageSize: 25,
            total: sponsorItems.length,
          });
        }
        return Promise.resolve(emptyPage);
      });
    };

    it('renders all columns correctly', async () => {
      setupSponsorsTab([
        {
          id: 'sp1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          company: 'Acme',
          website: 'https://acme.com',
          contactName: 'John Doe',
          contactEmail: 'john@acme.com',
          contactPhone: '555-1234',
          createdAt: new Date().toISOString(),
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Sponsors');

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('Acme')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@acme.com')).toBeInTheDocument();
        expect(screen.getByText('555-1234')).toBeInTheDocument();
        expect(screen.getByText('acme-corp')).toBeInTheDocument();
      });
    });

    it('renders Website column as external link when present', async () => {
      setupSponsorsTab([
        {
          id: 'sp1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          company: null,
          website: 'https://acme.com',
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          createdAt: new Date().toISOString(),
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Sponsors');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'https://acme.com' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://acme.com');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    it('renders Website column as "—" when website is null', async () => {
      setupSponsorsTab([
        {
          id: 'sp1',
          name: 'No Web Sponsor',
          slug: 'no-web',
          company: null,
          website: null,
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          createdAt: new Date().toISOString(),
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Sponsors');

      await waitFor(() => {
        expect(screen.getByText('No Web Sponsor')).toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
      });
    });
  });

  // TASK-037: Calendars tab links and Owner column
  describe('Calendars tab', () => {
    const setupCalendarsTab = (calendarItems: object[]) => {
      (authStorage.isAuthenticated as jest.Mock).mockReturnValue(true);
      (usersApi.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/admin/dashboard/calendars')) {
          return Promise.resolve({
            items: calendarItems,
            page: 1,
            pageSize: 25,
            total: calendarItems.length,
          });
        }
        return Promise.resolve(emptyPage);
      });
    };

    it('renders Name column as a link when slug is present', async () => {
      setupCalendarsTab([
        {
          id: 'c1',
          name: 'My Calendar',
          slug: 'my-cal',
          isFeatured: false,
          organizationName: null,
          organizationSlug: null,
          creatorName: 'Alice',
          creatorSlug: 'alice',
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Calendars');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'My Calendar' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/calendar/my-cal');
      });
    });

    it('renders Name column as plain text when slug is null', async () => {
      setupCalendarsTab([
        {
          id: 'c1',
          name: 'No Slug Cal',
          slug: null,
          isFeatured: false,
          organizationName: null,
          organizationSlug: null,
          creatorName: 'Alice',
          creatorSlug: 'alice',
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Calendars');

      await waitFor(() => {
        expect(screen.getByText('No Slug Cal')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'No Slug Cal' })).toBeNull();
      });
    });

    it('renders Owner column with organization link when calendar has a organization', async () => {
      setupCalendarsTab([
        {
          id: 'c1',
          name: 'Organization Cal',
          slug: 'organization-cal',
          isFeatured: false,
          organizationName: 'My Organization',
          organizationSlug: 'my-organization',
          creatorName: null,
          creatorSlug: null,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Calendars');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'My Organization' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/organization/my-organization');
      });
    });

    it('renders Owner column with creator link when calendar has no organization', async () => {
      setupCalendarsTab([
        {
          id: 'c1',
          name: 'User Cal',
          slug: 'user-cal',
          isFeatured: false,
          organizationName: null,
          organizationSlug: null,
          creatorName: 'Bob Creator',
          creatorSlug: 'bob-creator',
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Calendars');

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'Bob Creator' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/users/bob-creator');
      });
    });

    it('renders Owner column as "—" when neither organization nor creator name is available', async () => {
      setupCalendarsTab([
        {
          id: 'c1',
          name: 'Mystery Cal',
          slug: 'mystery-cal',
          isFeatured: false,
          organizationName: null,
          organizationSlug: null,
          creatorName: null,
          creatorSlug: null,
        },
      ]);

      render(<AdminDashboardPage />);
      await clickTab('Calendars');

      await waitFor(() => {
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
      });
    });
  });
});
