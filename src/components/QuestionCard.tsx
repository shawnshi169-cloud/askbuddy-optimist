import React, { useState } from 'react';
import { MessageCircle, Award, Eye } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ExpertDetailDialog from './ExpertDetailDialog';
import AnswerDialog from "./AnswerDialog";
import { useLocation, useNavigate } from 'react-router-dom';
import { buildFromState } from '@/utils/navigation';

interface QuestionCardProps {
  id: string;
  title: string;
  description?: string;
  asker: {
    name: string;
    avatar: string | null;
  };
  time: string;
  tags: string[];
  points: number | null;
  viewCount?: string;
  delay?: number;
  answerName?: string;
  answerAvatar?: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  title,
  description,
  asker,
  time,
  tags,
  points,
  viewCount,
  delay = 0,
  answerName,
  answerAvatar
}) => {
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Create unique expert data for the asker based on their properties
  const askerExpertData = {
    id: id + '-asker',
    name: asker.name,
    avatar: asker.avatar || '',
    title: '提问者',
    description: `这位用户 ${asker.name} 经常在平台上提出高质量的问题，帮助社区成长。`,
    tags: tags,
    rating: 4.5,
    responseRate: '90%',
    orderCount: '10单',
    education: ['未知'],
    experience: ['活跃社区成员'],
    verified: false
  };

  // 伪数据：假定每个提问者的偏好时间段
  const askerTimeSlots = [
    { id: "today14", label: "今天 14:00-15:00" },
    { id: "today19", label: "今天 19:00-20:00" },
    { id: "weekend", label: "周末可约" }
  ];

  // 回答弹窗提交
  const handleAnswerDialogSubmit = (payload: { timeSlots: string[]; message: string }) => {
    // 预留：后续接入回答提交/预约接口
    void payload;
  };
  const openQuestionDetail = () => {
    navigate(`/question/${id}`, { state: buildFromState(location) });
  };

  return (
    <>
      <div
        className="surface-card rounded-3xl p-4 transition-all duration-300 animate-fade-in hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        style={{ animationDelay: `${delay}s` }}
      >
        <button
          type="button"
          className="mb-2 block w-full text-left"
          onClick={openQuestionDetail}
        >
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-base text-left text-foreground leading-7">{title}</h3>
            {viewCount && (
              <div className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                <Eye size={14} className="flex-shrink-0" />
                <span>{viewCount}</span>
              </div>
            )}
          </div>
        </button>
        
        {description && (
          <button type="button" className="mb-3 block w-full text-left" onClick={openQuestionDetail}>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-6">{description}</p>
          </button>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <ExpertDetailDialog {...askerExpertData}>
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={(event) => event.stopPropagation()}
              >
                <Avatar className="w-8 h-8 border app-soft-border">
                  <AvatarImage src={asker.avatar || undefined} alt={asker.name} className="object-cover" />
                  <AvatarFallback>{asker.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-xs font-medium text-foreground">{asker.name}</div>
                  <div className="text-xs text-muted-foreground">{time}</div>
                </div>
              </div>
            </ExpertDetailDialog>
          </div>
          
          <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-orange-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-100 shadow-sm">
            <Award size={14} className="text-amber-500" />
            {points === null ? '积分未提供' : `${points} 积分`}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (
              <span key={index} className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium border border-border">
                #{tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="h-8 min-w-[78px] bg-primary text-primary-foreground px-3 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1 shadow-sm hover:shadow-md hover:bg-primary/90 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              onClick={(event) => {
                event.stopPropagation();
                setShowAnswerDialog(true);
              }}
            >
              <MessageCircle size={12} />
              回答
            </button>
          </div>
        </div>
      </div>
      
      <AnswerDialog
        open={showAnswerDialog}
        onOpenChange={setShowAnswerDialog}
        askerTimeSlots={askerTimeSlots}
        onSubmit={handleAnswerDialogSubmit}
      />
    </>
  );
};

export default QuestionCard;
