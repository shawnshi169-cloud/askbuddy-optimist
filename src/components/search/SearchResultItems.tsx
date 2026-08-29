import React from 'react';
import { ArrowRight, MapPin, MessageCircle, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { SearchExpert, SearchPost, SearchQuestion, SearchSkill } from '@/hooks/useSearch';

const formatRelativeTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
};

interface SearchQuestionItemProps {
  question: SearchQuestion;
  onOpen: (id: string) => void;
}

export const SearchQuestionItem: React.FC<SearchQuestionItemProps> = ({ question, onOpen }) => {
  const time = formatRelativeTime(question.created_at);
  const metadata = [
    typeof question.answers_count === 'number' ? `${question.answers_count}个回答` : null,
    typeof question.view_count === 'number' ? `${question.view_count}人看过` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <article>
      <button
        type="button"
        className="block w-full py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/25 active:bg-app-action-soft/40"
        onClick={() => onOpen(question.id)}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="app-content-title min-w-0 flex-1">{question.title}</h3>
          {question.bounty_points > 0 ? (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
              {question.bounty_points} 积分
            </span>
          ) : null}
        </div>

        {question.content ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{question.content}</p>
        ) : null}

        {question.tags && question.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {question.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-app-action-soft px-2 py-1 text-[11px] font-medium text-app-action">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="min-w-0 truncate">
            {question.profile_nickname || '匿名用户'}{time ? ` · ${time}` : ''}
          </span>
          {metadata.length > 0 ? <span className="shrink-0">{metadata.join(' · ')}</span> : null}
        </div>
      </button>
    </article>
  );
};

interface SearchPersonItemProps {
  person: SearchExpert;
  onOpen: (id: string) => void;
}

export const SearchPersonItem: React.FC<SearchPersonItemProps> = ({ person, onOpen }) => {
  const displayName = person.nickname || '匿名用户';

  return (
    <article>
      <button
        type="button"
        className="block w-full py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/25 active:bg-app-action-soft/40"
        onClick={() => onOpen(person.id)}
        aria-label={`查看${displayName}的个人主页`}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0 border border-app-border-subtle">
            <AvatarImage src={person.avatar_url || undefined} alt={displayName} className="object-cover" />
            <AvatarFallback className="bg-app-action-soft text-app-action">{displayName.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-6 text-slate-800">{displayName}</h3>
            {person.headline ? <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{person.headline}</p> : null}
            {person.intro ? <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600">{person.intro}</p> : null}
            <span className="mt-2 flex min-h-11 items-center justify-end gap-1 text-sm font-semibold text-app-action">
              看看TA
              <ArrowRight aria-hidden size={16} />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
};

export const SearchPostItem: React.FC<{ post: SearchPost }> = ({ post }) => {
  const time = formatRelativeTime(post.created_at);
  const displayName = post.author_nickname || '匿名用户';

  return (
    <article className="py-4">
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 border border-app-border-subtle">
          <AvatarImage src={post.author_avatar || undefined} alt={displayName} />
          <AvatarFallback className="bg-slate-100 text-xs text-slate-600">{displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-slate-700">{displayName}</p>
          {(post.city || time) ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              {post.city ? <><MapPin aria-hidden size={12} />{post.city}</> : null}
              {post.city && time ? <span>·</span> : null}
              {time}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-[15px] leading-6 text-slate-700">{post.content}</p>
      {(typeof post.like_count === 'number' || typeof post.comment_count === 'number') ? (
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          {typeof post.like_count === 'number' ? (
            <span className="inline-flex items-center gap-1"><ThumbsUp aria-hidden size={13} />{post.like_count}</span>
          ) : null}
          {typeof post.comment_count === 'number' ? (
            <span className="inline-flex items-center gap-1"><MessageCircle aria-hidden size={13} />{post.comment_count}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

export const SearchServiceItem: React.FC<{ service: SearchSkill }> = ({ service }) => {
  const attributes = [
    service.category_name,
    service.city,
    service.is_remote_supported ? '支持远程' : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <article className="py-4">
      <h3 className="text-[15px] font-semibold leading-6 text-slate-800">{service.title}</h3>
      {service.description ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600">{service.description}</p>
      ) : null}
      {attributes.length > 0 ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{attributes.join(' · ')}</p>
      ) : null}
      {service.expert_nickname ? (
        <p className="mt-2 text-xs text-slate-500">由 {service.expert_nickname} 提供</p>
      ) : null}
    </article>
  );
};
