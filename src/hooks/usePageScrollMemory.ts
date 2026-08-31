import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  createScrollMemoryState,
  getScrollRestoreDecision,
  parseStoredScrollY,
  reduceScrollMemoryState,
} from '@/hooks/pageScrollMemoryCore';

const KEY_PREFIX = 'page-scroll-memory:';
const TAB_RESELECT_EVENT = 'app:tab-reselect';
const TAB_SCROLL_PATHS: Record<string, string[]> = {
  index: ['/'],
  discover: ['/discover'],
  messages: ['/messages'],
  profile: ['/profile'],
};
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
]);

const getStorageKey = (key: string) => `${KEY_PREFIX}${key}`;

export const readPageScrollMemory = (key: string) => {
  if (typeof window === 'undefined') return null;
  return parseStoredScrollY(window.sessionStorage.getItem(getStorageKey(key)));
};

export const usePageScrollMemory = (key: string) => {
  const initialScrollYRef = useRef(readPageScrollMemory(key));
  const prepareForNavigationRef = useRef<() => void>(() => undefined);
  const [isRestoring, setIsRestoring] = useState(
    () => (initialScrollYRef.current ?? 0) > 0,
  );
  const prepareForNavigation = useCallback(() => {
    prepareForNavigationRef.current();
  }, []);

  useLayoutEffect(() => {
    const storageKey = getStorageKey(key);
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const savedY = parseStoredScrollY(sessionStorage.getItem(storageKey));
    const targetY = savedY ?? 0;
    let memoryState = createScrollMemoryState(savedY ?? window.scrollY);
    let writeRafId: number | null = null;
    let restoreRafId: number | null = null;
    let restoreAttempt = 0;
    let restoreInterrupted = false;
    let lastSavedY = savedY ?? -1;

    const persistScroll = (y: number) => {
      if (Math.abs(y - lastSavedY) < 1) return;
      lastSavedY = y;
      sessionStorage.setItem(storageKey, String(y));
    };

    const finishRestore = () => {
      if (restoreRafId !== null) {
        window.cancelAnimationFrame(restoreRafId);
        restoreRafId = null;
      }
      setIsRestoring(false);
    };

    const restoreScroll = () => {
      restoreRafId = null;
      restoreAttempt += 1;
      const decision = getScrollRestoreDecision({
        targetY,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        attempt: restoreAttempt,
        interrupted: restoreInterrupted,
      });

      if (decision === 'stop') {
        finishRestore();
        return;
      }

      if (decision === 'retry') {
        restoreRafId = window.requestAnimationFrame(restoreScroll);
        return;
      }

      window.scrollTo({ top: targetY, behavior: 'auto' });
      finishRestore();
    };

    const interruptRestore = () => {
      if (restoreRafId === null) return;
      restoreInterrupted = true;
      finishRestore();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) interruptRestore();
    };

    const onScroll = () => {
      memoryState = reduceScrollMemoryState(memoryState, {
        type: 'scroll',
        y: window.scrollY,
      });
      if (writeRafId !== null) return;
      writeRafId = window.requestAnimationFrame(() => {
        writeRafId = null;
        persistScroll(memoryState.y);
      });
    };

    const onTabReselect = (event: Event) => {
      const payload = (event as CustomEvent<{ path?: string }>).detail;
      const path = payload?.path;
      if (!path) return;
      const matchedPaths = TAB_SCROLL_PATHS[key] || [];
      if (!matchedPaths.includes(path)) return;
      interruptRestore();
      memoryState = reduceScrollMemoryState(memoryState, { type: 'tab-reselect' });
      persistScroll(memoryState.y);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    prepareForNavigationRef.current = () => {
      memoryState = reduceScrollMemoryState(memoryState, {
        type: 'scroll',
        y: window.scrollY,
      });
      memoryState = reduceScrollMemoryState(memoryState, { type: 'deactivate' });
      if (writeRafId !== null) {
        window.cancelAnimationFrame(writeRafId);
        writeRafId = null;
      }
      persistScroll(memoryState.y);
    };

    setIsRestoring(targetY > 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', interruptRestore, { passive: true });
    window.addEventListener('touchstart', interruptRestore, { passive: true });
    window.addEventListener('wheel', interruptRestore, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(TAB_RESELECT_EVENT, onTabReselect as EventListener);

    if (targetY === 0) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      setIsRestoring(false);
    } else {
      restoreRafId = window.requestAnimationFrame(restoreScroll);
    }

    return () => {
      memoryState = reduceScrollMemoryState(memoryState, { type: 'deactivate' });
      if (writeRafId !== null) window.cancelAnimationFrame(writeRafId);
      if (restoreRafId !== null) window.cancelAnimationFrame(restoreRafId);
      persistScroll(memoryState.y);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', interruptRestore);
      window.removeEventListener('touchstart', interruptRestore);
      window.removeEventListener('wheel', interruptRestore);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(TAB_RESELECT_EVENT, onTabReselect as EventListener);
      prepareForNavigationRef.current = () => undefined;
    };
  }, [key]);

  return {
    initialScrollY: initialScrollYRef.current ?? 0,
    isRestoring,
    prepareForNavigation,
  };
};
