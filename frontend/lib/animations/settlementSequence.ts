import { gsap } from 'gsap';
import type { SettlementRecord } from '@/lib/types';

// Faithful settlement: pulse each node that earned a bonus this batch.
// jsdom-safe — records with no matching card are skipped. Caller gates on reduced-motion.
export function settlementSequence(root: HTMLElement, records: SettlementRecord[]): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  records.filter((r) => r.bonus > 0).forEach((r, i) => {
    const card = root.querySelector<HTMLElement>(`[data-node-id="${r.nodeId}"]`);
    if (!card) return;
    tl.fromTo(
      card,
      { boxShadow: '0 0 0px rgba(52,211,153,0)' },
      { boxShadow: '0 0 22px rgba(52,211,153,0.8)', duration: 0.32, yoyo: true, repeat: 1, clearProps: 'boxShadow' },
      i * 0.12,
    );
  });
  tl.play();
  return tl;
}
