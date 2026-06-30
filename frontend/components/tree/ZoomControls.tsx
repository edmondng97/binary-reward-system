'use client';
export function ZoomControls({ onZoomIn, onZoomOut, onFit }:
  { onZoomIn: () => void; onZoomOut: () => void; onFit: () => void }) {
  const btn = 'h-8 w-8 rounded-md border border-[var(--line-2)] bg-[#0d1222] text-sm text-[#8a95ad] hover:text-[#e8ecf5]';
  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
      <button data-zoom="in" className={btn} onClick={onZoomIn} aria-label="Zoom in">+</button>
      <button data-zoom="out" className={btn} onClick={onZoomOut} aria-label="Zoom out">−</button>
      <button data-zoom="fit" className={`${btn} text-[10px]`} onClick={onFit} aria-label="Fit">fit</button>
    </div>
  );
}
