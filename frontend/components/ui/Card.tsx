import type { ReactNode } from 'react';

export function Card({ children, className = '', glow = false }:
  { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`panel ${glow ? 'shadow-[0_0_30px_-6px_rgba(245,178,51,0.35)] border-[#f5b233]/30' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
