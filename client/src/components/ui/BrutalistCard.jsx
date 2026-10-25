import React from 'react';

export const BrutalistCard = ({
  children,
  className = '',
  indexStamp,
  variant = 'default',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative p-4 md:p-5 rounded-2xl titanium-surface transition-all duration-200 group ${
        onClick ? 'cursor-pointer hover:border-white/20' : ''
      } ${className}`}
    >
      {/* Optional Editorial Header Label */}
      {indexStamp && (
        <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-text-tertiary uppercase mb-3 border-b border-border-subtle pb-2">
          <span>{indexStamp}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 group-hover:bg-accent-primary transition-colors" />
        </div>
      )}

      {children}
    </div>
  );
};

export default BrutalistCard;
