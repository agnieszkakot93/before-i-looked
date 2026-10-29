import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28')!;
    expect(n.rows).toHaveLength(5);
    expect(n.badLines).toBe(1);
    expect(n.rows.map((r) => r.job)).toEqual([...n.rows.map((r) => r.job)].sort((a, b) => a.localeCompare(b)));
  });
  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});
