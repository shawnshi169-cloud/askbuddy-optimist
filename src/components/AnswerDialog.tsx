import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

export interface AnswerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { message: string }) => void;
  submitting?: boolean;
  error?: string;
  disabled?: boolean;
}

export const AnswerDialog: React.FC<AnswerDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  error = '',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) setMessage('');
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = message.trim();
    if (!content || submitting || disabled) return;
    onSubmit({ message: content });
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-[24px] border-app-border-subtle px-4 pb-6 pt-6 shadow-[0_-12px_36px_rgba(15,23,42,0.12)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <SheetHeader className="pr-14 text-left">
          <SheetTitle className="text-xl font-semibold text-slate-900">分享你的回答</SheetTitle>
          <SheetDescription className="text-[13px] leading-5 text-slate-500">
            写下与问题直接相关的真实经历或建议。
          </SheetDescription>
        </SheetHeader>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="answer-content" className="mb-2 block text-sm font-medium text-slate-700">
              回答内容
            </label>
            <Textarea
              id="answer-content"
              autoFocus
              placeholder="说说你经历过什么，以及你会怎么做…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-36 resize-none rounded-2xl border-app-border-subtle bg-white px-4 py-3 text-[15px] leading-6 focus-visible:ring-app-action/30"
              disabled={submitting}
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {disabled && <p className="text-sm text-slate-500">问题已关闭，不能新增回答。</p>}
          <SheetFooter className="gap-2 sm:space-x-0">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="h-11 rounded-full" disabled={submitting}>
                取消
              </Button>
            </SheetClose>
            <Button
              type="submit"
              variant="action"
              className="h-11 rounded-full"
              disabled={!message.trim() || submitting || disabled}
            >
              {submitting ? '提交中…' : '提交回答'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AnswerDialog;
