import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl animate-in">
      <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 max-w-xs mb-6 text-sm">{description}</p>
      {action}
    </div>
  );
};
