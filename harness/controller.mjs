import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const repo = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const root = path.resolve(process.env.AIMASTER_CONTROL_ROOT || 'D:/AIMaster-Control/AIMaster');
const [verb = 'help', ...args] = process.argv.slice(2);
const kinds = ['add', 'change', 'priority', 'stop', 'resume'];
const stages = ['received', 'planned', 'delivered', 'accepted', 'review', 'verified', 'failed', 'integrated', 'applied'];
const help = [
  'node harness/controller.mjs sync | status',
  'node harness/controller.mjs command CMD-ID add|change|priority|stop|resume TASK-ID "public summary"',
  'node harness/controller.mjs claim CMD-ID TASK-ID ROLE ATTEMPT-ID ASSIGNMENT-REVISION',
  'node harness/controller.mjs event EVENT-ID CMD-ID TASK-ID ROLE STAGE "public summary" [ATTEMPT-ID ASSIGNMENT-REVISION]',
  'Stages: ' + stages.join(', '),
  'Use task ALL for a global stop/resume. Delivery records require actual transport evidence in the summary.',
  'AIMASTER_CONTROL_ROOT selects an external local directory. sync reads .ai/master-status.json.',
];

function identifier(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,150}$/.test(value || '')) throw Error('Invalid identifier.');
  return value;
}

// Only sanitized operational summaries belong here. Never import raw Orca messages or worker output.
function publicText(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/(?:https?|postgres(?:ql)?):\/\/[^\s]+/gi, '[link]')
    .replace(/\b(?:bearer|basic)\s+[\w.+/=:-]+/gi, '[redacted]')
    .replace(/(?:["']?(?:password|passphrase|otp|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|token|secret|비밀번호|인증번호|인증코드|토큰)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '[redacted]')
    .replace(/\b(?:sk-[\w-]{10,}|gh[pousr]_[\w]{10,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)/g, '[redacted]')
    .replace(/\b\d{6}\b/g, '[number]').slice(0, 420);
}

const sha = data => createHash('sha256').update(data).digest('hex');
const inside = (dir, candidate) => {
  const rel = path.relative(dir, candidate);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
};

function getDb() {
  let parent = root;
  while (!existsSync(parent)) parent = path.dirname(parent);
  const effective = path.resolve(realpathSync(parent), path.relative(parent, root));
  if (inside(repo, effective) || /^[/\\]{2}/.test(effective)) throw Error('CONTROL_ROOT must be external and local.');
  mkdirSync(root, { recursive: true });
  const db = new DatabaseSync(path.join(root, 'controller.sqlite'));
  db.exec(`PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, stamp TEXT NOT NULL,
      actor TEXT NOT NULL, task TEXT NOT NULL, cmd TEXT, stage TEXT NOT NULL,
      note TEXT NOT NULL, rev INTEGER NOT NULL, attempt TEXT, assignment INTEGER, stale INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK(id=1), hash TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK(id=1), rev INTEGER NOT NULL);
    INSERT OR IGNORE INTO meta VALUES(1,0);`);
  return db;
}

function append(db, event) {
  const old = db.prepare('SELECT * FROM events WHERE id=?').get(event.id);
  if (old) {
    for (const field of ['actor','task','cmd','stage','note','attempt','assignment']) {
      if (old[field] !== event[field]) throw Error('Event ID already records different content.');
    }
    return old;
  }
  db.prepare('INSERT INTO events(id,stamp,actor,task,cmd,stage,note,rev,attempt,assignment,stale) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .run(event.id, new Date().toISOString(), event.actor, event.task, event.cmd, event.stage,
      event.note, event.rev, event.attempt, event.assignment, Number(event.stale || false));
  return db.prepare('SELECT * FROM events WHERE id=?').get(event.id);
}

function sync(db, rev) {
  const source = JSON.parse(readFileSync(path.join(repo, '.ai/master-status.json'), 'utf8').replace(/^\uFEFF/, ''));
  for (const field of ['tasks','humanActions','sessionReviews']) if (!Array.isArray(source[field])) throw Error('Invalid task board.');
  const tasks = source.tasks.map(t => ({
    id: publicText(t.task_id), owner: publicText(t.owner), status: publicText(t.status), title: publicText(t.title),
  }));
  const projection = { checkedAt: publicText(source.checkedAt), tasks,
    roles: source.sessionReviews.map(s => publicText(s.owner)),
    human: source.humanActions.map(h => [h.condition,h.action,h.recommendation].map(publicText)) };
  const data = JSON.stringify(projection);
  const hash = sha(data);
  if (db.prepare('SELECT hash FROM snapshot WHERE id=1').get()?.hash === hash) return;
  db.prepare('INSERT OR REPLACE INTO snapshot VALUES(1,?,?)').run(hash, data);
  append(db, { id: 'sync-' + randomUUID(), actor: 'Controller', task: 'ALL', cmd: null,
    stage: 'sync', note: '기존 지휘표 반영 ' + tasks.length + '건', rev, attempt: null, assignment: null });
}

function record(db, rev) {
  const [id, second, task, fourth, stage, note, attempt = null, assign = null] = args;
  identifier(id); identifier(task);
  if (verb === 'command') {
    if (args.length !== 4 || !id.startsWith('CMD-') || !kinds.includes(second) || !fourth.trim()) throw Error(help[1]);
    const isNew = !db.prepare('SELECT 1 FROM events WHERE id=?').get(id);
    if (isNew) db.prepare('UPDATE meta SET rev=rev+1 WHERE id=1').run();
    return append(db, { id, actor: 'Admin', task, cmd: id, stage: second, note: publicText(fourth),
      rev: isNew ? rev + 1 : rev, attempt: null, assignment: null });
  }
  if (![6,8].includes(args.length) || !stages.includes(stage) || !note.trim()) throw Error(help[3]);
  identifier(second); identifier(fourth);
  if (attempt) identifier(attempt);
  if (assign !== null && (!/^[1-9]\d*$/.test(assign) || !Number.isSafeInteger(Number(assign)))) throw Error('Invalid assignment revision.');
  const cmd = db.prepare("SELECT * FROM events WHERE id=? AND actor='Admin'").get(second);
  if (!cmd || (cmd.task !== 'ALL' && cmd.task !== task)) throw Error('Unknown command or wrong task.');
  const latest = db.prepare("SELECT MAX(rev) AS rev FROM events WHERE actor='Admin' AND task=?").get(task);
  const priorAssignment = db.prepare("SELECT cmd,assignment,attempt FROM events WHERE task=? AND stage='assigned' AND stale=0 ORDER BY seq DESC LIMIT 1").get(task);
  const n = assign === null ? null : Number(assign);
  const assignmentEvent = n !== null || ['delivered','accepted','review','verified','failed','integrated'].includes(stage);
  const stale = cmd.rev < (latest.rev ?? 0) || (assignmentEvent &&
    (!priorAssignment || n !== priorAssignment.assignment || attempt !== priorAssignment.attempt || second !== priorAssignment.cmd));
  return append(db, { id, actor: fourth, task, cmd: second, stage, note: publicText(note), rev: cmd.rev, stale,
    attempt, assignment: n });
}

function held(db, task) {
  return db.prepare("SELECT stage FROM events WHERE actor='Admin' AND task=? AND stage IN ('stop','resume') ORDER BY seq DESC LIMIT 1").get(task)?.stage === 'stop';
}

function claim(db) {
  const [cmdId, task, actor, attempt, revision] = args;
  if (args.length !== 5) throw Error(help[2]);
  [cmdId,task,actor,attempt].forEach(identifier);
  if (!/^[1-9]\d*$/.test(revision) || !Number.isSafeInteger(Number(revision))) throw Error('Invalid assignment revision.');
  const cmd = db.prepare("SELECT * FROM events WHERE id=? AND actor='Admin'").get(cmdId);
  if (!cmd || (cmd.task !== 'ALL' && cmd.task !== task)) throw Error('Unknown command or wrong task.');
  if (held(db, task) || held(db, 'ALL')) return { claimed: false, reason: 'paused' };
  const latest = db.prepare("SELECT MAX(rev) AS rev FROM events WHERE actor='Admin' AND task=?").get(task);
  const prior = db.prepare("SELECT * FROM events WHERE task=? AND stage='assigned' AND stale=0 ORDER BY seq DESC LIMIT 1").get(task);
  const n = Number(revision);
  if (cmd.rev < (latest.rev ?? 0) || n < (prior?.assignment ?? 0)) return { claimed: false, reason: 'superseded' };
  if (prior?.assignment === n) return { claimed: false,
    reason: prior.actor === actor && prior.cmd === cmdId && prior.attempt === attempt ? 'duplicate' : 'conflict' };
  const id = 'claim-' + sha(JSON.stringify([task,n]));
  append(db, { id, actor, task, cmd: cmdId, stage: 'assigned', note: '발송 시도 확보 · 전송 확인 대기',
    rev: cmd.rev, attempt, assignment: n });
  return { claimed: true, claimId: id };
}

function replace(name, body) {
  const dest = path.join(root, name);
  const temp = dest + '.' + randomUUID() + '.tmp';
  try {
    writeFileSync(temp, body, { flag: 'wx', flush: true });
    renameSync(temp, dest);
  } finally { rmSync(temp, { force: true }); }
}

function publish(db) {
  const board = JSON.parse(db.prepare('SELECT data FROM snapshot WHERE id=1').get()?.data ?? '{"tasks":[],"roles":[],"human":[]}');
  const all = db.prepare('SELECT * FROM events ORDER BY seq').all();
  const latest = all.at(-1);
  const active = board.tasks.filter(t => !['done','superseded','cancelled','waiting_human'].includes(t.status));
  const paused = held(db, 'ALL');
  const runState = paused ? 'PAUSED_BY_ADMIN' : !board.checkedAt ? 'NOT_SYNCED' :
    active.length ? (board.human.length ? 'RUNNING_WITH_HUMAN_PENDING' : 'RUNNING') :
    board.human.length || board.tasks.some(t=>t.status==='waiting_human') ? 'WAITING_HUMAN' : 'MONITORING';
  const counts = {};
  for (const t of board.tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
  const commands = all.filter(e => e.actor === 'Admin');
  const assignments = new Map();
  for (const e of all) {
    if (e.stale) continue;
    if (e.stage === 'assigned') assignments.set(e.task, { claim: e, last: e });
    else if (e.assignment && assignments.get(e.task)?.claim.assignment === e.assignment) {
      assignments.get(e.task).last = e;
    }
  }
  const lastCommand = commands.at(-1);
  const lastStage = lastCommand && all.findLast(e => e.cmd === lastCommand.id && !e.stale);
  const summary = { root, state: runState, revision: db.prepare('SELECT rev FROM meta').get().rev,
    lastSequence: latest?.seq ?? 0, lastEvent: latest?.id ?? null, lastCommand: lastCommand?.id ?? null,
    lastCommandStage: lastStage?.stage ?? null, sourceCheckedAt: board.checkedAt ?? null,
    counts, roles: board.roles.length, humanEntries: board.human.length, trackedAssignments: assignments.size };
  const next = paused ? '관리자 재개 지시 대기' : 'Orca 수신과 점유·선행 조건을 확인하고 배정 또는 독립 검수';
  const lines = all.map(e => '[' + e.stamp + '][' + e.actor + '][' + e.task + '][' + e.stage + '] ' +
    (e.stale ? '[이전 배정 · 격리] ' : '') + e.note + ' | ' + e.id);
  replace('events.jsonl', all.map(e => JSON.stringify(e)).join('\n') + (all.length ? '\n' : ''));
  replace('master.log', lines.join('\n') + (all.length ? '\n' : ''));
  replace('STATUS.md', ['# Master 운영 상태', '', '상태 ' + runState,
    '기존 지휘표 기준 시각 ' + (board.checkedAt || '미수집'), '다음 행동 ' + next,
    '마지막 지시 ' + (lastCommand?.id ?? '없음') + ' / ' + (lastStage?.stage ?? '없음'),
    '', '## 하네스 배정 최신 기록', '',
    ...[...assignments.values()].map(({ claim, last })=>'- ' + [claim.task,claim.actor,claim.attempt,
      '배정 ' + claim.assignment,last.stage,last.note].join(' · ')),
    '', '## 기존 지휘표의 작업 집계', '', ...Object.entries(counts).map(([k,v])=>'- ' + k + ' ' + v),
    '', '## 실행·검수 후보 (실제 배정은 Master 확인)', '',
    ...active.map(t=>'- ' + [t.id,t.owner,t.status,t.title].join(' · ')),
    '', '## 관리자 요청 원장 (현재 필요 여부는 Master 확인)', '',
    ...board.human.map(row=>'- ' + row.join(' · ')), ''].join('\n'));
  replace('REPORT.md', ['# 운영 회차 보고', '', '사건 순번 ' + summary.lastSequence,
    '', ...lines.slice(-40), '', '다음 행동 ' + next, ''].join('\n'));
  replace('CHECKPOINT.json', JSON.stringify(summary, null, 2) + '\n');
  return summary;
}

function main() {
  if (['help','--help','-h'].includes(verb)) return console.log(help.join('\n'));
  if (!['sync','status','command','event','claim'].includes(verb)) throw Error('Unknown action.');
  if (['sync','status'].includes(verb) && args.length) throw Error('Unexpected arguments.');
  const db = getDb();
  try {
    db.exec('BEGIN IMMEDIATE');
    const { rev } = db.prepare('SELECT rev FROM meta').get();
    let event;
    let dispatch;
    if (verb === 'sync') sync(db, rev);
    else if (verb === 'claim') dispatch = claim(db);
    else if (verb !== 'status') event = record(db, rev);
    db.exec('COMMIT');
    // Serialize projections from committed events. A crash leaves repairable derived files.
    db.exec('BEGIN IMMEDIATE');
    const summary = publish(db);
    db.exec('COMMIT');
    console.log(JSON.stringify({ ...summary, ...dispatch, ...(event && { event: event.id, stale: Boolean(event.stale) }) }));
  } finally { db.close(); }
}

try { main(); } catch (e) { console.error(publicText(e.message)); process.exitCode = 1; }
