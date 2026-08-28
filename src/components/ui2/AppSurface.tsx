import React from 'react';
import { cn } from '@/lib/utils';

interface AppSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

const AppSurface = React.forwardRef<HTMLDivElement, AppSurfaceProps>(
  ({ elevated = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(elevated ? 'app-surface-elevated' : 'app-surface', className)}
      {...props}
    />
  ),
);

AppSurface.displayName = 'AppSurface';

export default AppSurface;
