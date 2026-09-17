import { computeRiskScore } from './risk-score';

describe('computeRiskScore', () => {
  const now = new Date('2026-03-17T12:00:00.000Z');

  it('scores near 0 for freshly checked empty bin', () => {
    const score = computeRiskScore({
      lastCheckedAt: now,
      moveTimestamps: [],
      palletCount: 0,
      now,
    });
    expect(score).toBe(0);
  });

  it('scores high for stale, busy, full bin', () => {
    const score = computeRiskScore({
      lastCheckedAt: new Date('2026-02-15T12:00:00.000Z'),
      moveTimestamps: Array.from({ length: 10 }, (_, i) =>
        new Date(now.getTime() - i * 60 * 60 * 1000),
      ),
      palletCount: 4,
      now,
    });
    expect(score).toBeGreaterThanOrEqual(90);
  });
});
