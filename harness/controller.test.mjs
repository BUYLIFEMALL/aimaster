import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('delivery claims survive concurrency, pause, reassignment and restart', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'aimaster-harness-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('./controller.mjs', import.meta.url));
  const run = async (...args) => JSON.parse((await promisify(execFile)(process.execPath, [cli, ...args],
    { env: { ...process.env, AIMASTER_CONTROL_ROOT: dir }, windowsHide: true })).stdout);
  const cmd = ['command','CMD-T1','add','ALL','fixture only'];
  await run('sync');
  await run(...cmd);
  const board = JSON.parse(await readFile(new URL('../.ai/master-status.json', import.meta.url),'utf8'));
  const item = board.tasks.find(t => t.status === 'running' &&
    board.sessionReviews.some(r => r.owner === t.owner) &&
    !board.tasks.some(other => other.owner === t.owner && other.status === 'running' && other.task_id !== t.task_id));
  if (item) {
    const owner = board.sessionReviews.find(r => r.owner === item.owner);
    if (owner) {
      await run('claim','CMD-T1',item.task_id,owner.owner,'REV1','1');
      const review = await run('event','ROLE-R1','CMD-T1',item.task_id,owner.owner,'review','fixture','REV1','1');
      const row = review.ownerCoverage.find(r => r.owner === owner.owner);
      if (!board.tasks.some(t => t.owner === owner.owner && t.status === 'running' && t.task_id !== item.task_id)) {
        assert.equal(row.state,'검수·판정 또는 후속 배정');
      }
    }
    await run('command','CMD-PAUSE','stop',item.task_id,'fixture');
    const status = await readFile(join(dir,'STATUS.md'),'utf8');
    const [candidates, suspended] = status.split('## 실행·검수 후보')[1].split('## 개별 중지');
    assert.ok(!candidates.includes(item.task_id));
    assert.ok(suspended.includes(item.task_id));
  }
  const waiting = board.tasks.find(t => t.status === 'waiting_human' &&
    board.sessionReviews.some(r => r.owner === t.owner));
  if (waiting) {
    const stopped = await run('command','CMD-PAUSE-WAIT','stop',waiting.task_id,'fixture');
    assert.ok(!stopped.ownerCoverage.find(r => r.owner === waiting.owner).refs.includes(waiting.task_id));
  }
  const claim = ['claim','CMD-T1','T','R','A1','1'];
  assert.equal((await run(...cmd)).revision, (await run(...cmd)).revision);
  const concurrent = await Promise.all(Array.from({ length: 6 }, () => run(...claim)));
  assert.equal(concurrent.filter(x => x.claimed).length, 1);
  const accept = ['event','E1','CMD-T1','T','OTHER','accepted','fixture','A1','1'];
  assert.equal((await run(...accept)).stale, true);
  await run('command','CMD-T2','stop','ALL','pause fixture');
  assert.equal((await run(...claim)).reason, 'paused');
  await run('command','CMD-T3','resume','ALL','resume fixture');
  assert.equal((await run('claim','CMD-T3','T','R','A2','2')).claimed, true);
  assert.equal((await run('event','E2','CMD-T1','T','R','review','old result','A1','1')).stale, true);
  await rm(join(dir, 'CHECKPOINT.json'));
  const current = await run('status');
  assert.equal(JSON.parse(await readFile(join(dir,'CHECKPOINT.json'),'utf8')).lastSequence, current.lastSequence);
});
