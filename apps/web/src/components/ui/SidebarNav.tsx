import type { ReactNode, ComponentType } from 'react';

export interface SidebarNavLinkItem {
  path: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface SidebarNavDividerItem {
  type: 'divider';
}

export interface SidebarNavSpacerItem {
  type: 'spacer';
}

export type SidebarNavItem = SidebarNavLinkItem | SidebarNavDividerItem | SidebarNavSpacerItem;

export interface SidebarNavLinkComponentProps {
  to: string;
  className: string;
  children: ReactNode;
  active: boolean;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
  className?: string;
  activePath?: string;
  LinkComponent?: ComponentType<SidebarNavLinkComponentProps>;
}

function isLinkItem(item: SidebarNavItem): item is SidebarNavLinkItem {
  return 'path' in item && 'label' in item;
}

const SidebarNav = ({ items, className = '', activePath = '', LinkComponent }: SidebarNavProps) => {
  const isNavActive = (path: string) => {
    if (path === '/') return activePath === '/';
    return activePath.startsWith(path);
  };

  const linkIndices = items.map((item, i) => (isLinkItem(item) ? i : -1)).filter((i) => i >= 0);
  const lastLinkIndex = linkIndices.length > 0 ? linkIndices[linkIndices.length - 1]! : -1;

  const DefaultLink = ({
    to,
    className: linkClassName,
    children,
    active,
  }: SidebarNavLinkComponentProps) => (
    <a href={to} className={linkClassName} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  );

  const Link = LinkComponent ?? DefaultLink;

  return (
    <div
      className={`flex flex-col h-full overflow-y-auto ${className}`.trim()}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      {items.map((item, index) => {
        if ('type' in item && item.type === 'divider') {
          return (
            <div
              key={`divider-${index}`}
              className="mx-2 my-2 border-t border-[var(--color-mist)]"
            />
          );
        }
        if ('type' in item && item.type === 'spacer') {
          return <div key={`spacer-${index}`} className="flex-1" />;
        }
        const linkItem = item as SidebarNavLinkItem;
        const { path, label, icon: Icon } = linkItem;
        const active = isNavActive(path);
        const isLastLink = index === lastLinkIndex;
        const linkClassName = [
          'flex flex-col items-center gap-0.5 px-1 py-2.5 rounded-lg transition-colors mx-1',
          isLastLink ? 'mb-2' : '',
          active
            ? 'bg-[var(--color-mist)] text-[var(--color-soil)]'
            : 'text-[var(--color-leaf)] hover:bg-[var(--color-mist)] hover:text-[var(--color-soil)]',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <Link key={path} to={path} className={linkClassName} active={active}>
            {Icon && <Icon className="w-5 h-5" />}
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default SidebarNav;
