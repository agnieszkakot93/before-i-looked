import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, RunStatus } from './types.js';

type Line = { at: string; job: string; status: RunStatus; owner: string | null; error?: string };

function parse(text: string): Line | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (o.status !== 'ok' && o.status !== 'retry' && o.status !== 'fail') return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return { at: o.at, job: o.job, status: o.status, owner: o.owner, error: o.error as string | undefined };
}

export function readNight(runsDir: string, night: string): Night | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const text of readFileSync(file, 'utf8').split('\n')) {
    if (text.trim() === '') continue;
    const l = parse(text);
    if (!l) {
      badLines++;
      continue;
    }
    const r = rows.get(l.job);
    if (!r) {
      rows.set(l.job, {
        job: l.job, owner: l.owner, runs: 1, retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status, lastError: l.error ?? null, firstAt: l.at, lastAt: l.at,
      });
      continue;
    }
    r.runs++;
    if (l.status === 'retry') r.retries++;
    if (l.owner !== null) r.owner = l.owner;
    if (Date.parse(l.at) < Date.parse(r.firstAt)) r.firstAt = l.at;
    if (Date.parse(l.at) >= Date.parse(r.lastAt)) {
      r.lastAt = l.at;
      r.lastStatus = l.status;
      if (l.error !== undefined) r.lastError = l.error;
      else if (l.status === 'ok') r.lastError = null;
    }
  }
  return { night, rows: [...rows.values()].sort((a, b) => a.job.localeCompare(b.job)), badLines };
}
