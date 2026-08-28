'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scrolls the window to top whenever the route pathname changes (client-side navigation).
 *
 * This appears to work around a bug: Next.js App Router is supposed to scroll to top on
 * navigation by default, but in practice scroll position is often preserved (e.g. when
 * navigating from organizer dashboard to edit session page, the new page opens scrolled
 * to the middle). This component ensures users land at the top of the page on route change.
 */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
