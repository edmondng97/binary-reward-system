import { gsap } from 'gsap';

export function settlementFlash(root: HTMLElement, nodeIds: string[]): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  for (const id of nodeIds) {
    const card = root.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (!card) continue;
    tl.fromTo(card, { boxShadow: '0 0 0px rgba(52,211,153,0)' },
      { boxShadow: '0 0 18px rgba(52,211,153,0.8)', duration: 0.3, yoyo: true, repeat: 1 }, 0);
  }
  tl.play();
  return tl;
}
