import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  text,
  fullScreen = false,
}) => {
  const sizes = {
    sm: 20,
    md: 32,
    lg: 48,
    xl: 64,
  };
  
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2
          size={sizes[size]}
          className="animate-spin text-kia-red"
        />
        <div className="absolute inset-0 animate-ping opacity-20">
          <Loader2 size={sizes[size]} className="text-kia-red" />
        </div>
      </div>
      {text && (
        <p className="text-kia-silver text-sm font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
  
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-kia-black/90 backdrop-blur-sm">
        {content}
      </div>
    );
  }
  
  return content;
};

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`skeleton rounded-lg ${className}`} />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <SkeletonLoader key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};
