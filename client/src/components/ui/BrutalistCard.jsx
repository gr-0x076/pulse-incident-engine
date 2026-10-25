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
      className={`relative p-4 md:p-5 rounded-lg border border-border-subtle bg-bg-secondary/70 backdrop-blur-md shadow-2xl transition-all duration-200 group ${
        onClick ? 'cursor-pointer hover:border-border-default hover:bg-bg-tertiary/40' : ''
      } ${className}`}
      style={{
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 8px 32px 0 rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* 4 Corner Crosshairs */}
      <span className="absolute -top-1.5 -left-1.5 font-mono text-[9px] text-text-tertiary/60 select-none pointer-events-none">+</span>
      <span className="absolute -top-1.5 -right-1.5 font-mono text-[9px] text-text-tertiary/60 select-none pointer-events-none">+</span>
      <span className="absolute -bottom-1.5 -left-1.5 font-mono text-[9px] text-text-tertiary/60 select-none pointer-events-none">+</span>
      <span className="absolute -bottom-1.5 -right-1.5 font-mono text-[9px] text-text-tertiary/60 select-none pointer-events-none">+</span>

      {/* Header Index Stamp if provided */}
      {indexStamp && (
        <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-text-tertiary uppercase mb-2 border-b border-border-subtle/50 pb-1.5">
          <span>{indexStamp}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 group-hover:bg-accent-primary transition-colors" />
        </div>
      )}

      {children}
    </div>
  );
};

export default BrutalistCard;
