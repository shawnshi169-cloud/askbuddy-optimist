
import React, { useState } from 'react';
import { ChevronRight, CircleHelp, Compass, HandHeart, Home, MessageSquare, Plus, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useUnreadMessageCount } from '@/hooks/useMessages';
import { isNativeApp } from '@/utils/platform';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { buildFromState } from '@/utils/navigation';

const HOME_TAB_PREFIXES = ['/education', '/career', '/lifestyle', '/hobbies', '/search', '/topic'];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: unreadNotifCount } = useUnreadCount();
  const { count: unreadMessageCount } = useUnreadMessageCount();
  const nativeMode = isNativeApp();
  const unreadCount = (unreadNotifCount || 0) + (unreadMessageCount || 0);
  const dispatchTabReselect = (path: string) => {
    window.dispatchEvent(new CustomEvent('app:tab-reselect', { detail: { path } }));
  };

  const belongsToTab = (path: string) => {
    if (path === '/') {
      return currentPath === '/' || HOME_TAB_PREFIXES.some((prefix) => currentPath.startsWith(prefix));
    }
    if (path === '/discover') {
      return currentPath === '/discover' || currentPath.startsWith('/discover/');
    }
    if (path === '/messages') {
      return currentPath === '/messages' || currentPath.startsWith('/notifications') || currentPath.startsWith('/chat/');
    }
    if (path === '/profile') {
      return currentPath === '/profile' || currentPath.startsWith('/profile/') || currentPath.startsWith('/settings/');
    }
    return currentPath === path;
  };

  const isRootRouteOfTab = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath === path;
  };

  const navigateOrScrollTop = (path: string) => {
    if (isRootRouteOfTab(path)) {
      dispatchTabReselect(path);
      return;
    }
    navigate(path, { state: buildFromState(location) });
  };

  const handleNeedClick = () => {
    setIsMenuOpen(false);
    navigate('/new', { state: buildFromState(location) });
  };

  const handleSkillClick = () => {
    setIsMenuOpen(false);
    navigate('/skill-publish', { state: buildFromState(location) });
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-app-border-subtle bg-white/95 backdrop-blur-sm ${
        nativeMode ? '' : 'max-w-md mx-auto'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14">
        <button 
          onClick={() => navigateOrScrollTop('/')}
          className={`nav-item flex flex-col items-center justify-center w-1/5 py-1 ${belongsToTab('/') ? 'active' : ''}`}
          aria-current={belongsToTab('/') ? 'page' : undefined}
        >
          <Home size={20} className={belongsToTab('/') ? "text-app-action" : "text-muted-foreground"} />
          <span className={`text-[10px] mt-0.5 ${belongsToTab('/') ? "text-app-action font-medium" : "text-muted-foreground"}`}>首页</span>
        </button>
        
        <button 
          onClick={() => navigateOrScrollTop('/discover')}
          className={`nav-item flex flex-col items-center justify-center w-1/5 py-1 ${belongsToTab('/discover') ? 'active' : ''}`}
          aria-current={belongsToTab('/discover') ? 'page' : undefined}
        >
          <Compass size={20} className={belongsToTab('/discover') ? "text-app-action" : "text-muted-foreground"} />
          <span className={`text-[10px] mt-0.5 ${belongsToTab('/discover') ? "text-app-action font-medium" : "text-muted-foreground"}`}>发现</span>
        </button>
        
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="w-1/5 flex flex-col items-center justify-center -mt-6 active:scale-[0.98]"
              aria-label="发布内容"
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-action text-white shadow-[0_6px_16px_rgba(43,127,115,0.24)]">
                <Plus size={22} />
              </div>
              <span className="mt-0.5 text-[10px] font-semibold text-app-action">发布</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[24px] border-app-border-subtle px-4 pb-8 pt-6 shadow-[0_-12px_36px_rgba(15,23,42,0.12)]">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-semibold text-slate-800">想做点什么？</SheetTitle>
              <SheetDescription>选择一个真实可用的发布入口</SheetDescription>
            </SheetHeader>

            <div className="mt-5 divide-y divide-app-border-subtle overflow-hidden rounded-2xl border border-app-border-subtle bg-white">
              <button
                type="button"
                onClick={handleNeedClick}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/25 active:bg-app-action-soft/60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-action-soft text-app-action">
                  <CircleHelp aria-hidden size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-slate-800">提个问题</span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">有件事想找人问问</span>
                </span>
                <ChevronRight aria-hidden size={18} className="text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleSkillClick}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/25 active:bg-app-action-soft/60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <HandHeart aria-hidden size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-slate-800">我能帮忙</span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">把自己的经历和能力告诉大家</span>
                </span>
                <ChevronRight aria-hidden size={18} className="text-slate-400" />
              </button>
            </div>
          </SheetContent>
        </Sheet>
        
        <button 
          onClick={() => navigateOrScrollTop('/messages')}
          className={`nav-item flex flex-col items-center justify-center w-1/5 py-1 relative ${belongsToTab('/messages') ? 'active' : ''}`}
          aria-current={belongsToTab('/messages') ? 'page' : undefined}
        >
          <div className="relative">
            <MessageSquare size={20} className={belongsToTab('/messages') ? "text-app-action" : "text-muted-foreground"} />
            {(unreadCount || 0) > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center px-1">
                {(unreadCount || 0) > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-0.5 ${belongsToTab('/messages') ? "text-app-action font-medium" : "text-muted-foreground"}`}>消息</span>
        </button>
        
        <button 
          onClick={() => navigateOrScrollTop('/profile')}
          className={`nav-item flex flex-col items-center justify-center w-1/5 py-1 ${belongsToTab('/profile') ? 'active' : ''}`}
          aria-current={belongsToTab('/profile') ? 'page' : undefined}
        >
          <User size={20} className={belongsToTab('/profile') ? "text-app-action" : "text-muted-foreground"} />
          <span className={`text-[10px] mt-0.5 ${belongsToTab('/profile') ? "text-app-action font-medium" : "text-muted-foreground"}`}>我的</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
