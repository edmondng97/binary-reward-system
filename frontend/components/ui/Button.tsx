import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'gold';

export function Button({ children, variant = 'primary', className = '', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium ' +
    'transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[#38e1ff]/50 disabled:opacity-50';
  const styles: Record<Variant, string> = {
    // gold = the money action (settlement). The page spends its boldness here.
    gold: 'bg-[#f5b233] text-[#1a1206] font-semibold hover:bg-[#ffcf6b] shadow-[0_6px_24px_-8px_rgba(245,178,51,0.7)]',
    primary: 'bg-white/[0.06] text-[#e8ecf5] border border-[var(--line-2)] hover:bg-white/[0.10]',
    ghost: 'text-[#8a95ad] hover:text-[#e8ecf5] hover:bg-white/[0.05]',
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props}>{children}</button>;
}
