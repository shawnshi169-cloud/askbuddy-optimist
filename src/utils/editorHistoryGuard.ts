interface HistoryEntry { idx?: number }

const editors = new WeakMap<Window, { onPop?: (event: PopStateEvent) => void }>();

// Register before HashRouter: a later window listener can be removed when the
// router synchronously unmounts the editor. Inactive pages pass through unchanged.
export const initializeEditorHistoryGuard = (target: Window) => {
  if (editors.has(target)) return;
  const editor: { onPop?: (event: PopStateEvent) => void } = {};
  editors.set(target, editor);
  target.addEventListener('popstate', (event) => editor.onPop?.(event), true);
};

// HashRouter owns history.state.idx. Restore the current entry before showing a
// confirmation, so POP cannot unmount the dirty editor (including native Back).
export const installEditorHistoryGuard = (
  target: Window,
  shouldBlock: () => boolean,
  requestExit: (proceed: () => void) => void,
) => {
  initializeEditorHistoryGuard(target);
  const editor = editors.get(target)!;
  const originIndex = (target.history.state as HistoryEntry | null)?.idx;
  let restoring = false;
  let destinationIndex: number | undefined;
  let released = false;

  const onPop = (event: PopStateEvent) => {
    if (released) return;
    const index = (event.state as HistoryEntry | null)?.idx;
    if (typeof originIndex !== 'number' || typeof index !== 'number') return;
    if (!restoring && !shouldBlock()) return;
    event.stopImmediatePropagation();
    if (index !== originIndex) {
      destinationIndex ??= index;
      restoring = true;
      target.history.go(originIndex - index);
      return;
    }
    if (restoring) {
      restoring = false;
      const destination = destinationIndex;
      destinationIndex = undefined;
      requestExit(() => {
        released = true;
        target.history.go(destination! - originIndex);
      });
    }
  };
  editor.onPop = onPop;
  return () => { if (editor.onPop === onPop) editor.onPop = undefined; };
};
