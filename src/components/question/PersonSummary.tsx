import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { PublicPersonSummary } from '../../../packages/shared-types/src/public-person';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const questionContentTime = (timestamp: string) =>
  formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: zhCN });
export const PersonSummary = ({
  person,
  personId,
  createdAt,
  onOpenPerson,
}: {
  person: PublicPersonSummary | null;
  personId: string;
  createdAt: string;
  onOpenPerson: (id: string) => void;
}) => {
  const name = person?.displayName || '资料暂不可见';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={person?.avatarUrl || undefined} alt={name} />
        <AvatarFallback>
          {person?.displayName?.slice(0, 1) || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Button
          type="button"
          variant="ghost"
          className="h-11 max-w-full justify-start truncate rounded-lg px-0 text-[15px] font-semibold text-slate-800"
          onClick={() => onOpenPerson(personId)}
          aria-label={`查看${name}的个人主页`}
        >
          {name}
        </Button>
        <time dateTime={createdAt} className="block text-xs text-slate-400">
          {questionContentTime(createdAt)}
        </time>
      </div>
    </div>
  );
};
