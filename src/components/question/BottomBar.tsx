import React from 'react';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isNativeApp } from '@/utils/platform';

interface BottomBarProps {
  onAnswer: () => void;
  loading?: boolean;
}

const BottomBar: React.FC<BottomBarProps> = ({ onAnswer, loading = false }) => {
  const nativeMode = isNativeApp();

  return (
    <div
      className={`fixed bottom-0 z-40 border-t border-app-border-subtle bg-white/95 px-4 pt-3 backdrop-blur-sm ${
        nativeMode ? 'left-0 right-0' : 'left-1/2 w-full max-w-md -translate-x-1/2'
      }`}
      style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom)) + 12px)' }}
    >
      <Button
        type="button"
        variant="action"
        className="h-12 w-full rounded-full text-[15px] font-semibold"
        onClick={onAnswer}
        aria-label="我也来回答"
        disabled={loading}
      >
        <MessageSquareText aria-hidden size={18} className="mr-2" />
        {loading ? '提交中…' : '我也来回答'}
      </Button>
    </div>
  );
};

export default BottomBar;
