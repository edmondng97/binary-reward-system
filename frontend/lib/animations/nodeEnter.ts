import { gsap } from 'gsap';

export function nodeEnter(root: HTMLElement, nodeId: string): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const card = root.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`);
  if (card) tl.fromTo(card, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' });
  tl.play();
  return tl;
}
