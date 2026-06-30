import type { ReactNode } from 'react';
export function Card({ children, className = '', glow = false }:
  { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur
      ${glow ? 'shadow-[0_0_24px_-4px_rgba(52,211,153,0.5)] border-emerald-400/40' : ''} ${className}`}>
      {children}
    </div>
  );
}
