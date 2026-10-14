import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Utility function to smoothly scroll the browser window to top (0, 0).
 * Passes `{ top: 0, left: 0, behavior: 'smooth' }` to `window.scrollTo` so the page
 * gracefully glides up to the top rather than instantly jumping.
 */
export function scrollToTop(smooth: boolean = true): void {
  try {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: smooth ? 'smooth' : 'instant',
      });

      // IMPORTANT: Never assign documentElement.scrollTop = 0 when smooth scrolling,
      // as that instantly aborts the smooth scrolling animation in modern browsers.
      if (!smooth) {
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }
      }
    }
  } catch {
    // Fallback for older browsers
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }
}

/**
 * ScrollToTop Component
 * Listens to React Router location changes (pathname, search, hash).
 * Whenever a user navigates to a new route, clicks a nav link, or changes view,
 * the page gracefully glides/scrolls up to the very top (0, 0) with smooth behavior.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If navigating to an in-page anchor (e.g. #leaderboards), scroll smoothly to target element
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Gracefully glide / smoothly scroll to top (0, 0) on route transition or location change
    scrollToTop(true);
  }, [pathname, search, hash]);

  // Listen for custom app view/tab switch events
  useEffect(() => {
    const handleScrollEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ smooth?: boolean }>;
      scrollToTop(customEvent.detail?.smooth ?? true);
    };

    window.addEventListener('app:scroll-to-top', handleScrollEvent);
    return () => {
      window.removeEventListener('app:scroll-to-top', handleScrollEvent);
    };
  }, []);

  return null;
};
