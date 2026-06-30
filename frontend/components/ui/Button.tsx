import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Button({ children, variant = 'primary', className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost'; children: ReactNode }) {
  const base = 'px-3 py-1.5 rounded-lg text-sm font-medium transition active:scale-95';
  const styles = variant === 'primary'
    ? 'bg-emerald-500/90 text-slate-950 hover:bg-emerald-400'
    : 'border border-white/15 text-slate-200 hover:bg-white/5';
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>;
}
