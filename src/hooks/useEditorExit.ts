import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { installEditorHistoryGuard } from '@/utils/editorHistoryGuard';

export const useEditorExit = (options: {
  dirty: boolean;
  busy: boolean;
  prepareExit?: () => void;
}) => {
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  const pending = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const requestExit = (proceed: () => void) => {
    if (latest.current.busy) return;
    if (!latest.current.dirty) { proceed(); return; }
    latest.current.prepareExit?.();
    pending.current = proceed;
    setOpen(true);
  };
  const requestRef = useRef(requestExit);
  useLayoutEffect(() => { requestRef.current = requestExit; });

  useEffect(() => installEditorHistoryGuard(
    window,
    () => latest.current.dirty || latest.current.busy,
    (proceed) => requestRef.current(proceed),
  ), []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!latest.current.dirty && !latest.current.busy) return;
      latest.current.prepareExit?.();
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  return {
    open,
    requestExit,
    setOpen: (value: boolean) => {
      if (!value) pending.current = null;
      setOpen(value);
    },
    confirmExit: () => {
      if (latest.current.busy) return;
      const proceed = pending.current;
      pending.current = null;
      setOpen(false);
      proceed?.();
    },
  };
};
