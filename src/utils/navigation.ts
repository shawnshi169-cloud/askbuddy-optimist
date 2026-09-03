import type { Location, NavigateFunction } from 'react-router-dom';

type LocationLike = Pick<Location, 'pathname' | 'search' | 'hash' | 'state'>;

const normalizeInternalPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/')) return null;
  return value;
};

const extractFromState = (state: unknown): string | null => {
  if (!state || typeof state !== 'object') return null;
  const candidate = state as Record<string, unknown>;

  const direct = normalizeInternalPath(candidate.fromPath);
  if (direct) return direct;

  const from = candidate.from;
  if (typeof from === 'string') {
    return normalizeInternalPath(from);
  }

  if (from && typeof from === 'object') {
    const fromObj = from as Record<string, unknown>;
    const pathname = normalizeInternalPath(fromObj.pathname);
    if (!pathname) return null;
    const search = typeof fromObj.search === 'string' ? fromObj.search : '';
    const hash = typeof fromObj.hash === 'string' ? fromObj.hash : '';
    return `${pathname}${search}${hash}`;
  }

  return null;
};

const getCurrentEntryState = () => {
  if (typeof window === 'undefined') return null;
  const state = window.history.state as { usr?: unknown } | null;
  return state?.usr ?? null;
};

const resolveRouteFallback = (pathname: string, search = ''): string | null => {
  if (pathname === '/auth') return '/';
  if (/^\/chat\//.test(pathname)) return '/messages';
  if (pathname === '/notifications') return '/messages';
  if (pathname === '/discover/interactions') return '/discover';
  if (pathname === '/education/search') return '/education';
  if (pathname === '/search') {
    const channel = new URLSearchParams(search).get('channel');
    if (channel === 'education') return '/education';
    if (channel === 'career') return '/career';
    if (channel === 'lifestyle') return '/lifestyle';
    if (channel === 'hobbies') return '/hobbies';
    return '/';
  }
  if (pathname === '/new') return '/';
  if (pathname === '/experience/new') return '/profile/experiences';
  if (/^\/experience\/[^/]+\/edit$/.test(pathname)) return '/profile/experiences';
  if (pathname === '/skill-publish') return '/profile';
  if (pathname === '/profile/recharge') return '/profile/earnings';
  if (pathname === '/edit-profile') return '/profile';
  if (pathname === '/admin') return '/profile';
  if (/^\/profile\/community\/[^/]+\/info$/.test(pathname)) {
    const match = pathname.match(/^\/profile\/community\/([^/]+)\/info$/);
    return match ? `/profile/community/${match[1]}` : '/profile/community';
  }
  if (/^\/profile\/community\/[^/]+$/.test(pathname)) return '/profile/community';
  if (/^\/profile\//.test(pathname)) return '/profile';
  if (/^\/settings\//.test(pathname)) return '/profile';
  if (pathname === '/city-selector') return '/';
  if (/^\/(question|topic|expert|expert-profile|person)\//.test(pathname)) return '/';
  if (/^\/(education|career|lifestyle|hobbies)$/.test(pathname)) return '/';
  return null;
};

export const getFallbackPathForRoute = (pathname: string, search = '', fallbackPath = '/') => {
  const routeFallback = resolveRouteFallback(pathname, search);
  return routeFallback || fallbackPath;
};

export const buildFromState = (location: Pick<LocationLike, 'pathname' | 'search' | 'hash'>) => ({
  from: {
    pathname: location.pathname,
    search: location.search || '',
    hash: location.hash || '',
  },
});

export const navigateToAuthWithReturn = (navigate: NavigateFunction, location: Pick<LocationLike, 'pathname' | 'search' | 'hash'>) => {
  navigate('/auth', { state: buildFromState(location) });
};

export const getReturnPathFromAuthState = (state: unknown, fallbackPath = '/profile') => {
  const from = extractFromState(state);
  if (!from) return fallbackPath;
  if (from === '/auth') return fallbackPath;
  return from;
};

export const navigateBackOr = (
  navigate: NavigateFunction,
  fallbackPath: string,
  options?: { location?: LocationLike | null }
) => {
  const stateFromLocation = options?.location?.state ?? null;
  const stateFromEntry = getCurrentEntryState();
  const fromTarget = extractFromState(stateFromLocation) || extractFromState(stateFromEntry);
  const currentPath = options?.location?.pathname;
  const currentSearch = options?.location?.search || '';
  const computedFallback = getFallbackPathForRoute(currentPath || '', currentSearch, fallbackPath);
  if (fromTarget && fromTarget !== currentPath && fromTarget !== '/auth') {
    navigate(fromTarget, { replace: true });
    return;
  }

  // 统一采用 route fallback，避免依赖 history 栈导致回错页。
  navigate(computedFallback, { replace: true });
};
