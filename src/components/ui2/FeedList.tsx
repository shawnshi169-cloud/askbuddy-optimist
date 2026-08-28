import React from 'react';
import { cn } from '@/lib/utils';

export const FeedList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('app-feed-list', className)} {...props} />
  ),
);

FeedList.displayName = 'FeedList';

export const FeedItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('app-feed-item', className)} {...props} />
  ),
);

FeedItem.displayName = 'FeedItem';
