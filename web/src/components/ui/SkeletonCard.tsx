import React from 'react';

interface SkeletonCardProps {
  subtitle?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  subtitle = true,
}) => {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-slate-200 animate-pulse rounded" />
          {subtitle && (
            <div className="h-3 w-16 bg-slate-100 animate-pulse rounded" />
          )}
        </div>
      </div>
      <div className="h-8 w-1/2 bg-slate-200 animate-pulse rounded mt-4" />
    </div>
  );
};
