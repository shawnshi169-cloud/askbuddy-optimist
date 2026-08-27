
import React from "react";
import { Eye, Award, CheckCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Answer {
  id: string;
  name: string;
  avatar: string | null;
  title: string;
  content: React.ReactNode;
  time: string;
  viewCount: number;
  best?: boolean;
}

interface AnswerListProps {
  answers: Answer[];
  onViewUser: (userId: string) => void;
  onReply: (answerId: string) => void;
  onAccept?: (answerId: string) => void;
  canAccept?: boolean;
}

const AnswerList: React.FC<AnswerListProps> = ({
  answers, onViewUser, onReply, onAccept, canAccept
}) => (
  <div className="space-y-4">
    {answers.map((ans) => (
      <div key={ans.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div
            className="flex min-w-0 items-center cursor-pointer"
            onClick={() => onViewUser(ans.id)}
          >
            <Avatar className="w-9 h-9 mr-3">
              <AvatarImage src={ans.avatar || undefined} />
              <AvatarFallback>{ans.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{ans.name}</p>
              <p className="text-xs text-muted-foreground">{ans.title}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ans.best && (
              <div className="bg-yellow-50 text-yellow-600 rounded-full px-2.5 py-1 text-xs flex items-center border border-yellow-100">
                <Award size={12} className="mr-1" />
                最佳回答
              </div>
            )}
            {canAccept && !ans.best && onAccept && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-full text-primary border-primary/30"
                onClick={() => onAccept(ans.id)}
              >
                <CheckCircle size={12} className="mr-1" />
                采纳
              </Button>
            )}
          </div>
        </div>
        <p className="mb-4 text-sm leading-7 text-slate-700 text-left">{ans.content}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{ans.time}</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Eye size={12} className="mr-1" />
              {ans.viewCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary h-6 text-xs rounded-full"
              onClick={() => onReply(ans.id)}
              aria-label={`回复${ans.name}`}
            >
              回复
            </Button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default AnswerList;
