export const SCROLL_RESTORE_MAX_FRAMES = 120;

export interface ScrollMemoryState {
  active: boolean;
  y: number;
}

export type ScrollMemoryEvent =
  | { type: 'scroll'; y: number }
  | { type: 'deactivate' }
  | { type: 'tab-reselect' };

export type ScrollRestoreDecision = 'restore' | 'retry' | 'stop';

const normalizeScrollY = (value: number) => (
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
);

export const parseStoredScrollY = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
};

export const createScrollMemoryState = (initialY: number): ScrollMemoryState => ({
  active: true,
  y: normalizeScrollY(initialY),
});

export const reduceScrollMemoryState = (
  state: ScrollMemoryState,
  event: ScrollMemoryEvent,
): ScrollMemoryState => {
  if (event.type === 'deactivate') {
    return { ...state, active: false };
  }

  if (event.type === 'tab-reselect') {
    return { ...state, y: 0 };
  }

  if (!state.active) return state;
  return { ...state, y: normalizeScrollY(event.y) };
};

export const getMaxScrollY = (scrollHeight: number, viewportHeight: number) => (
  Math.max(0, scrollHeight - viewportHeight)
);

export const getScrollRestoreDecision = ({
  targetY,
  scrollHeight,
  viewportHeight,
  attempt,
  interrupted,
}: {
  targetY: number;
  scrollHeight: number;
  viewportHeight: number;
  attempt: number;
  interrupted: boolean;
}): ScrollRestoreDecision => {
  if (interrupted) return 'stop';
  if (targetY <= getMaxScrollY(scrollHeight, viewportHeight)) return 'restore';
  return attempt < SCROLL_RESTORE_MAX_FRAMES ? 'retry' : 'stop';
};
