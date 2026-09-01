import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export interface AnswerFeedItem {
  id: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  content: string;
  time: string | null;
  expertId: string | null;
  accepted: boolean;
}

interface AnswerListProps {
  answers: AnswerFeedItem[];
  onOpenPerson: (expertId: string) => void;
  onAccept?: (answerId: string) => void;
  canAccept?: boolean;
  acceptingAnswerId?: string | null;
}

const AnswerList: React.FC<AnswerListProps> = ({
  answers,
  onOpenPerson,
  onAccept,
  canAccept = false,
  acceptingAnswerId = null,
}) => (
  <div className="divide-y divide-app-border-subtle">
    {answers.map((answer) => (
      <article key={answer.id} className="py-5 first:pt-0 last:pb-0">
        <header className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={answer.avatar || undefined} alt={answer.name} />
            <AvatarFallback>{answer.name.slice(0, 1)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="truncate text-[15px] font-semibold text-slate-900">{answer.name}</p>
              {answer.accepted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <CheckCircle2 aria-hidden size={12} />
                  已采纳
                </span>
              ) : null}
            </div>
            {answer.headline ? (
              <p className="mt-0.5 line-clamp-1 text-[13px] text-slate-500">{answer.headline}</p>
            ) : null}
          </div>

          {answer.time ? (
            <time className="shrink-0 pt-0.5 text-xs text-slate-400">{answer.time}</time>
          ) : null}
        </header>

        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
          {answer.content}
        </p>

        {(answer.expertId || (canAccept && !answer.accepted && onAccept)) ? (
          <footer className="mt-3 flex min-h-11 items-center justify-end gap-2">
            {canAccept && !answer.accepted && onAccept ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 rounded-full px-3 text-xs text-slate-600 hover:bg-slate-50"
                disabled={acceptingAnswerId === answer.id}
                onClick={() => onAccept(answer.id)}
              >
                {acceptingAnswerId === answer.id ? '采纳中…' : '采纳回答'}
              </Button>
            ) : null}

            {answer.expertId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 rounded-full px-3 text-xs font-semibold text-app-action hover:bg-app-action-soft hover:text-app-action"
                onClick={() => onOpenPerson(answer.expertId!)}
                aria-label={`查看${answer.name}的个人主页`}
              >
                看看TA
                <ArrowRight aria-hidden className="ml-1" size={14} />
              </Button>
            ) : null}
          </footer>
        ) : null}
      </article>
    ))}
  </div>
);

export default AnswerList;
