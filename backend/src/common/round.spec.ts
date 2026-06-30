import { round4 } from './round';

describe('round4', () => {
  it('rounds to 4 decimal places', () => {
    expect(round4(1.234567)).toBe(1.2346);
  });
  it('avoids float drift', () => {
    expect(round4(0.1 + 0.2)).toBe(0.3);
  });
});
