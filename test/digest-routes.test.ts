import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  copyFileSync('runs/2026-10-28.jsonl', join(dir, '2026-10-28.jsonl'));
  writeFileSync(join(dir, '2026-10-01.jsonl'), '');
  writeFileSync(join(dir, '2026-10-02.jsonl'), '{"at":"2026-10-02T01:00:00+01:00","job":"a/b","status":"ok","owner":null}\nnot json\n');
  app = createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
});

describe('digest routes', () => {
  it('page: 200 for a night on disk', async () => {
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('notes/backup');
  });
  it('json: 200, same jobs in same order as page', async () => {
    const j = (await (await app.request('/api/digest/2026-10-28')).json()) as { rows: { job: string }[] };
    const html = await (await app.request('/digest/2026-10-28')).text();
    const idx = j.rows.map((r) => html.indexOf(r.job));
    expect(j.rows).toHaveLength(5);
    expect(idx.every((v, i) => v > 0 && (i === 0 || v > idx[i - 1]))).toBe(true);
  });
  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/1999-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/1999-01-01')).status).toBe(404);
  });
  it('empty night renders "nothing ran"', async () => {
    const res = await app.request('/digest/2026-10-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
    expect(((await (await app.request('/api/digest/2026-10-01')).json()) as { rows: unknown[] }).rows).toEqual([]);
  });
  it('a bad line is counted, the night still renders', async () => {
    const j = (await (await app.request('/api/digest/2026-10-02')).json()) as { rows: unknown[]; badLines: number };
    expect(j.badLines).toBe(1);
    expect(j.rows).toHaveLength(1);
    expect((await app.request('/digest/2026-10-02')).status).toBe(200);
  });
});
