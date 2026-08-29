import { useEffect } from 'react';

const KEY_PREFIX = 'page-scroll-memory:';
const TAB_RESELECT_EVENT = 'app:tab-reselect';
const TAB_SCROLL_PATHS: Record<string, string[]> = {
  index: ['/'],
  discover: ['/discover'],
  messages: ['/messages'],
  profile: ['/profile'],
};

export const usePageScrollMemory = (key: string) => {
  useEffect(() => {
    const storageKey = `${KEY_PREFIX}${key}`;
    const saved = sessionStorage.getItem(storageKey);
    let writeRafId: number | null = null;
    let lastSavedY = -1;
    let latestScrollY = window.scrollY;

    const persistScroll = (y: number) => {
      if (Math.abs(y - lastSavedY) < 8) return;
      lastSavedY = y;
      sessionStorage.setItem(storageKey, String(y));
    };

    if (saved) {
      const target = Number(saved);
      if (Number.isFinite(target) && target > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: target, behavior: 'auto' });
          });
        });
      }
    }

    const onScroll = () => {
      latestScrollY = window.scrollY;
      if (writeRafId !== null) return;
      writeRafId = window.requestAnimationFrame(() => {
        writeRafId = null;
        persistScroll(latestScrollY);
      });
    };

    const onTabReselect = (event: Event) => {
      const payload = (event as CustomEvent<{ path?: string }>).detail;
      const path = payload?.path;
      if (!path) return;
      const matchedPaths = TAB_SCROLL_PATHS[key] || [];
      if (!matchedPaths.includes(path)) return;
      latestScrollY = 0;
      persistScroll(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(TAB_RESELECT_EVENT, onTabReselect as EventListener);
    return () => {
      if (writeRafId !== null) {
        window.cancelAnimationFrame(writeRafId);
      }
      persistScroll(latestScrollY);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener(TAB_RESELECT_EVENT, onTabReselect as EventListener);
    };
  }, [key]);
};
