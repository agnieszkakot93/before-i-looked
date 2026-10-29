import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunStatus } from './types.js';

export type NightCounts = Record<RunStatus, number>;

// Counts every logged line's status for one night; bad lines are skipped.
export function countNight(runsDir: string, night: string): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return counts;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return counts;
  for (const text of readFileSync(file, 'utf8').split('\n')) {
    if (text.trim() === '') continue;
    try {
      const s = (JSON.parse(text) as { status?: unknown } | null)?.status;
      if (s === 'ok' || s === 'retry' || s === 'fail') counts[s]++;
    } catch {
      // bad line
    }
  }
  return counts;
}
