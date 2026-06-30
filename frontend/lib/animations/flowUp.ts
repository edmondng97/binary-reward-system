import { gsap } from 'gsap';

// Sends a glowing dot along each named edge path in order. jsdom-safe: when no
// path matches, returns an empty paused timeline. Caller gates on reduced-motion.
export function flowUpUplinePath(root: HTMLElement, edgeOrder: string[]): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  for (const key of edgeOrder) {
    const path = root.querySelector<SVGPathElement>(`[data-edge="${key}"]`);
    if (!path) continue;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', '#34d399');
    path.parentElement?.appendChild(dot);
    // animate a normalized progress var; on update place the dot along the path
    const state = { p: 0 };
    tl.to(state, {
      p: 1, duration: 0.5, ease: 'power1.inOut',
      onUpdate: () => {
        const len = path.getTotalLength?.() ?? 0;
        const pt = path.getPointAtLength?.(len * state.p) ?? { x: 0, y: 0 };
        dot.setAttribute('cx', String(pt.x));
        dot.setAttribute('cy', String(pt.y));
      },
      onComplete: () => dot.remove(),
    });
  }
  tl.play();
  return tl;
}
