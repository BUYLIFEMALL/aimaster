// Master-side adapter for existing Orca terminals. No shell, worker creation or replay.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = path => fileURLToPath(new URL(path, import.meta.url));
const config = JSON.parse(readFileSync(file('../.ai/master-wake-config.json'), 'utf8'));
const registry = readFileSync(file('../.ai/TEAM.md'), 'utf8');
function call(exe, args) {
  const result = spawnSync(exe, args, { encoding: 'utf8', windowsHide: true, timeout: 45000, maxBuffer: 8e6 });
  if (result.error || result.status !== 0) throw new Error('Command failed or timed out. Inspect the existing receipt before retrying.');
  return JSON.parse(result.stdout);
}
function orca(args) {
  const response = call(config.orcaExe, [...args, '--json']);
  if (!response.ok) throw new Error('Orca did not confirm the request.');
  return response.result;
}
function control(args) {
  return call(process.execPath, [file('./controller.mjs'), ...args]);
}
function main() {
  const packet = JSON.parse(readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
  const {command, task, role, attempt, revision, plan, base, workspace, scope, depends, reviewer, acceptance, submit, instruction} = packet;
  for (const id of [command, task, role, attempt, plan, reviewer]) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid packet identifier.');
  }
  if (!Number.isSafeInteger(revision) || revision < 1 || !/^[0-9a-f]{7,40}$/.test(base)) throw new Error('Invalid revision or Git baseline.');
  for (const field of [workspace, scope, depends, acceptance, submit, instruction]) {
    if (typeof field !== 'string' || !field.trim() || field.length > 2000) throw new Error('Incomplete packet.');
  }
  const label = {'CC-SUPPORT-01':'기존 policy','ADMIN-TESTER':'AdminPC Tester'}[role] ?? role;
  const rows = registry.split(/\r?\n/).filter(line => line.split('|')[1]?.trim() === label && line.split('|')[2]?.includes('term_'));
  if (rows.length !== 1) throw new Error('No unique registered recipient.');
  const address = rows[0].split('|')[2];
  const handle = address.match(/term_[a-f0-9-]+/)?.[0];
  const host = address.match(/--on ([A-Za-z0-9_-]+)/)?.[1] ?? 'local';
  const terminal = orca(['terminal','list','--environment',host]).terminals.find(t => t.handle === handle);
  if (!terminal?.connected || !terminal.writable || terminal.orphaned) throw new Error('Registered terminal unavailable.');
  const body = [instruction, '작업 '+task+' / 시도 '+attempt+' / 계획 '+plan+' / 배정 '+revision+' / 기준 '+base,
    '역할 '+role+' / 작업공간 '+workspace+' / 허용 경로 '+scope, '선행 '+depends+' / 검수 '+reviewer,
    '인수 조건 '+acceptance, '제출 '+submit].join('\n');
  const claim = control(['claim',command,task,role,attempt,String(revision)]);
  if (!claim.claimed) { console.log(JSON.stringify(claim)); return; }
  // On transport failure or loss of the receipt the claim survives. Master reconciles Orca inbox.
  const reply = orca(['orchestration','send','--run',config.targetRunId,...(host==='local'?[]:['--on',host]),
    '--to',handle,'--type','handoff','--subject',task+' · '+role,'--body',body]);
  if (!/^msg_[a-z0-9]+$/i.test(reply.messageId ?? '')) throw new Error('Receipt missing. Reconcile with Orca.');
  control(['event','ACK-'+reply.messageId.replace('_','-'),command,task,role,'delivered',reply.messageId,attempt,String(revision)]);
  console.log(JSON.stringify({role,task,host,receipt:reply.messageId}));
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
