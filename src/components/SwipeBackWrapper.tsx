import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSwipeBack } from '@/hooks/useSwipeBack';

const SwipeBackWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const isDetailRoute = /^\/(question|topic|expert|expert-profile|person|experience|chat)\//.test(pathname);
  const isSecondaryRoute = /^\/(city-selector|notifications|discover\/interactions|search|education\/search|education|career|lifestyle|hobbies)$/.test(pathname);
  const isProfileOrSettingsRoute = /^\/profile\//.test(pathname) || /^\/settings\//.test(pathname);

  // 一级 Tab 根页与编辑页默认禁用；仅详情/二级/设置子页启用。
  const swipeBackEnabled = isDetailRoute || isSecondaryRoute || isProfileOrSettingsRoute;
  const swipeBackThreshold = 84;

  useSwipeBack({ threshold: swipeBackThreshold, enabled: swipeBackEnabled });
  return <>{children}</>;
};

export default SwipeBackWrapper;
