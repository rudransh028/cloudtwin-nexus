import React from 'react';
import { cn } from '@/lib/utils';
import { Hexagon } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullScreen = false,
  message = 'Loading...',
  className
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  const content = (
    <div className={cn("flex flex-col items-center justify-center text-brand-500", className)}>
      <div className="relative flex items-center justify-center">
        <div className={cn("absolute rounded-full border-t-2 border-brand-500 animate-spin opacity-50", sizeClasses[size])} />
        <Hexagon className={cn("animate-pulse fill-brand-500/20", {
          'h-3 w-3': size === 'sm',
          'h-5 w-5': size === 'md',
          'h-8 w-8': size === 'lg'
        })} />
      </div>
      {message && (
        <p className="mt-4 text-sm font-medium text-slate-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};
