import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from '../Breadcrumbs';

jest.mock(
  'next/link',
  () =>
    ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
);

describe('Breadcrumbs', () => {
  it('renders nothing when no items are provided', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single non-clickable item as current page', () => {
    render(<Breadcrumbs items={[{ label: 'Project Title' }]} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(1);
    expect(listItems[0]).toHaveAttribute('aria-current', 'page');
  });

  it('renders all items with href as links and marks last as current page', async () => {
    const user = userEvent.setup();

    render(
      <Breadcrumbs
        items={[
          { label: 'Project', href: '/projects/123' },
          { label: 'Settings', href: '/projects/123/edit' },
          { label: 'Members' },
        ]}
      />,
    );

    const projectLink = screen.getByText('Project');
    const settingsLink = screen.getByText('Settings');
    const members = screen.getByText('Members');

    expect(projectLink.closest('a')).toHaveAttribute('href', '/projects/123');
    expect(settingsLink.closest('a')).toHaveAttribute('href', '/projects/123/edit');
    expect(members.closest('a')).toBeNull();

    const itemsWithCurrent = screen.getAllByRole('listitem');
    const lastItem = itemsWithCurrent[itemsWithCurrent.length - 1];
    expect(lastItem).toHaveAttribute('aria-current', 'page');

    // basic interaction sanity check
    await user.click(projectLink);
  });

  it('decodes HTML entities in labels', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Ben &amp; Jerry&#039;s', href: '/events/123' },
          { label: 'Q&amp;A Session' },
        ]}
      />,
    );

    expect(screen.getByText("Ben & Jerry's")).toBeInTheDocument();
    expect(screen.getByText('Q&A Session')).toBeInTheDocument();
  });

  it('truncates the last crumb when truncateLastItemAt is set', () => {
    const long = 'A'.repeat(30);
    render(
      <Breadcrumbs
        truncateLastItemAt={25}
        items={[
          { label: 'Project', href: '/p' },
          { label: long, href: '/x' },
        ]}
      />,
    );

    expect(screen.getByText(`${'A'.repeat(22)}...`)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: long });
    expect(link).toHaveAttribute('href', '/x');
    expect(link).toHaveAttribute('title', long);
  });
});
