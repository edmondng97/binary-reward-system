export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e4) / 1e4;
}
