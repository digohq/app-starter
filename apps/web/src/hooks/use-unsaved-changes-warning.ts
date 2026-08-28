'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChangesWarning(
  isDirty: boolean,
  setShowDialog: (show: boolean) => void,
  setPendingNavigation: (callback: (() => void) | null) => void,
) {
  const router = useRouter();
  const trapRef = useRef(false);

  useEffect(() => {
    if (!isDirty) {
      trapRef.current = false;
      return;
    }

    // Push current state to create a "trap" if not already set
    if (!trapRef.current) {
      window.history.pushState(null, '', window.location.href);
      trapRef.current = true;
    }

    const handlePopState = (event: PopStateEvent) => {
      // User tried to go back.
      // We are now at the state *before* the trap (or the trap was popped).

      // Re-arm the trap immediately so the history stack is restored to "current page"
      // effectively cancelling the back navigation from the user's perspective.
      window.history.pushState(null, '', window.location.href);

      setShowDialog(true);

      // If the user chooses to leave, we need to go back TWO steps:
      // 1. The trap we just re-armed.
      // 2. The original trap that was popped to trigger this event.
      setPendingNavigation(() => () => {
        window.history.go(-2);
      });
    };

    // Intercept Next.js <Link> clicks (client-side navigation via anchor elements).
    // history.pushState / beforeunload don't fire for these; capturing the click
    // before Next.js handles it is the reliable interception point.
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') ?? '';
      // Ignore hash-only, mailto, tel, or external links
      if (!href || href.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(href)) return;

      // Ignore if the anchor opens in a new tab
      if (anchor.target === '_blank') return;

      e.preventDefault();
      e.stopPropagation();

      const targetUrl = href;
      setPendingNavigation(() => () => router.push(targetUrl));
      setShowDialog(true);
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [isDirty, setShowDialog, setPendingNavigation, router]);
}
