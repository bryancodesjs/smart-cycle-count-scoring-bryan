import { computeRiskScore } from './risk-score';

describe('computeRiskScore', () => {
  const now = new Date('2026-03-17T12:00:00.000Z');

  it('scores near 0 for freshly checked empty bin', () => {
    const score = computeRiskScore({
      lastCheckedAt: now,
      palletCount: 0,
      activities: [],
      lastAuditResult: null,
      now,
    });
    expect(score).toBe(0);
  });

  it('scores higher with activity, adjustments, occupancy, and failed audit', () => {
    const score = computeRiskScore({
      lastCheckedAt: new Date('2026-02-15T12:00:00.000Z'),
      palletCount: 4,
      activities: [
        ...Array.from({ length: 6 }, (_, i) => ({
          type: 'MOVE' as const,
          createdAt: new Date(now.getTime() - i * 60 * 60 * 1000),
        })),
        { type: 'PICK', createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        { type: 'PUTAWAY', createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
        { type: 'ADJUST', createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
        { type: 'ADJUST', createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000) },
        { type: 'ADJUST', createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000) },
      ],
      lastAuditResult: 'FAIL',
      now,
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });
});
