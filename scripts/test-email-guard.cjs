// 플랫폼 메일 발송 안전장치 검사: 판단 규칙, 오류 분류, 기록 표 질의, 발송 모듈 통합(한도 오류 뒤 중단·중복·상한). 실제 DB·SMTP 없음.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// ---- 메모리 DB: platform_email_log (supabase 질의 체인 흉내) ----
let log = [];
let failQueries = false;
function table() {
  const filters = [];
  let op = 'select';
  let payload;
  let head = false;
  let count = null;
  let orderDesc = false;
  let lim = null;
  const api = {
    select(_cols, opts) { op = 'select'; head = Boolean(opts && opts.head); count = opts && opts.count ? opts.count : null; return api; },
    in(col, vals) { filters.push((r) => vals.includes(r[col])); return api; },
    eq(col, val) { filters.push((r) => r[col] === val); return api; },
    gte(col, val) { filters.push((r) => r[col] >= val); return api; },
    lt(col, val) { filters.push((r) => r[col] < val); return api; },
    order(_c, o) { orderDesc = Boolean(o && o.ascending === false); return api; },
    limit(n) { lim = n; return api; },
    insert(row) { op = 'insert'; payload = row; return api; },
    delete() { op = 'delete'; return api; },
    then(resolve) {
      if (failQueries) return resolve({ data: null, count: null, error: { message: 'boom' } });
      if (op === 'insert') {
        log.push({ id: String(log.length + 1), created_at: new Date().toISOString(), ...payload });
        return resolve({ error: null });
      }
      if (op === 'delete') {
        log = log.filter((r) => !filters.every((f) => f(r)));
        return resolve({ error: null });
      }
      let rows = log.filter((r) => filters.every((f) => f(r)));
      if (orderDesc) rows = rows.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const total = rows.length;
      if (lim != null) rows = rows.slice(0, lim);
      return resolve({ data: head ? null : rows, count: count ? total : null, error: null });
    },
  };
  return api;
}
const fakeClient = { from: () => table() };

let sendMailImpl = async () => ({});
let sendCalls = [];
const fakeTransporter = { sendMail: async (m) => { sendCalls.push(m); return sendMailImpl(m); } };

const cache = new Map();
function loadTS(rel) {
  const filename = path.join(root, rel);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mockRequire = (id) => {
    if (id === '@/lib/supabase/service') return { createServiceClient: () => fakeClient };
    if (id === './client') return { getTransporter: () => fakeTransporter, EMAIL_FROM: 'AI Master <noreply@test>' };
    if (id === './guard') return loadTS('lib/email/guard.ts');
    if (id === './guardStore') return loadTS('lib/email/guardStore.ts');
    if (id === './templates') return loadTS('lib/email/templates.ts');
    throw new Error('Unexpected import: ' + id);
  };
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})', { filename })(mockRequire, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

(async () => {
  const guard = loadTS('lib/email/guard.ts');
  const none = { recentBlockAt: null, duplicateSentRecently: false, recipientSentLast24h: 0, globalSentLast24h: 0 };

  // 1) 판단 규칙
  assert.deepEqual(guard.decideSend('welcome', none), { allow: true });
  assert.equal(guard.decideSend('welcome', { ...none, recentBlockAt: new Date() }).reason, 'cooldown');
  assert.equal(guard.decideSend('payment', { ...none, duplicateSentRecently: true }).reason, 'duplicate');
  assert.equal(guard.decideSend('welcome', { ...none, recipientSentLast24h: 1 }).reason, 'recipient_limit', '환영 메일은 하루 1통');
  assert.equal(guard.decideSend('support_confirm', { ...none, recipientSentLast24h: 3 }).reason, 'recipient_limit');
  assert.deepEqual(guard.decideSend('support_confirm', { ...none, recipientSentLast24h: 2 }), { allow: true });
  assert.equal(guard.decideSend('expiry', { ...none, globalSentLast24h: 300 }).reason, 'daily_limit');
  assert.deepEqual(guard.decideSend('expiry', { ...none, globalSentLast24h: 299 }), { allow: true });
  assert.equal(guard.resolveGlobalLimit('50'), 50);
  assert.equal(guard.resolveGlobalLimit(undefined), 300);
  assert.equal(guard.resolveGlobalLimit('abc'), 300);
  assert.equal(guard.resolveGlobalLimit('-5'), 300);

  // 2) 오류 분류
  assert.equal(guard.classifySendError({ responseCode: 421, message: '421 4.7.0 Try again later' }), 'rate_limited');
  assert.equal(guard.classifySendError({ message: '550 5.4.5 Daily user sending quota exceeded' }), 'rate_limited');
  assert.equal(guard.classifySendError({ message: '[429] User-rate limit exceeded' }), 'rate_limited');
  assert.equal(guard.classifySendError({ code: 'EAUTH', message: 'Invalid login' }), 'auth_failed');
  assert.equal(guard.classifySendError({ responseCode: 535, message: '535 5.7.8 Username and Password not accepted' }), 'auth_failed');
  assert.equal(guard.classifySendError(new Error('getaddrinfo ENOTFOUND')), 'other');

  // 3) 기록 표 질의(guardStore)
  const store = loadTS('lib/email/guardStore.ts');
  let facts = await store.loadGuardFacts('a@x.com', 'welcome', 'S');
  assert.deepEqual(facts, { recentBlockAt: null, duplicateSentRecently: false, recipientSentLast24h: 0, globalSentLast24h: 0 });
  await store.recordEmail('a@x.com', 'welcome', 'S', 'sent');
  await store.recordEmail('b@x.com', 'welcome', 'S', 'sent');
  facts = await store.loadGuardFacts('a@x.com', 'welcome', 'S');
  assert.equal(facts.duplicateSentRecently, true);
  assert.equal(facts.recipientSentLast24h, 1);
  assert.equal(facts.globalSentLast24h, 2, '전체는 다른 수신자 포함');
  facts = await store.loadGuardFacts('a@x.com', 'welcome', 'OTHER');
  assert.equal(facts.duplicateSentRecently, false, '제목이 다르면 중복 아님');
  await store.recordEmail('c@x.com', 'payment', 'P', 'rate_limited', '421');
  facts = await store.loadGuardFacts('d@x.com', 'payment', 'P2');
  assert.ok(facts.recentBlockAt instanceof Date, '한도 오류 기록이 있으면 쿨다운');
  log = log.map((r) => (r.status === 'rate_limited' ? { ...r, created_at: ago(31) } : r));
  facts = await store.loadGuardFacts('d@x.com', 'payment', 'P2');
  assert.equal(facts.recentBlockAt, null, '30분이 지나면 다시 보낼 수 있다');
  failQueries = true;
  assert.equal(await store.loadGuardFacts('a@x.com', 'welcome', 'S'), null);
  failQueries = false;
  log = [{ id: 'old', created_at: ago(40 * 24 * 60), status: 'sent', to_email: 'o@x.com', kind: 'welcome', subject_key: '' }, ...log];
  await store.purgeOldEmailLog(30);
  assert.equal(log.some((r) => r.id === 'old'), false, '30일 지난 기록 삭제');
  assert.ok(log.length > 0, '최근 기록은 유지');

  // 4) 발송 모듈 통합
  log = [];
  sendCalls = [];
  sendMailImpl = async () => ({});
  const sender = loadTS('lib/email/sender.ts');
  const welcome = { name: '홍길동', affiliateCode: 'ABC' };
  assert.equal(await sender.sendWelcomeEmail('m1@x.com', welcome), true, '첫 환영 메일은 발송');
  assert.equal(sendCalls.length, 1);
  assert.equal(await sender.sendWelcomeEmail('m1@x.com', welcome), false, '같은 사람에게 연달아 보내지 않는다');
  assert.equal(sendCalls.length, 1, 'SMTP는 한 번만 호출');
  assert.equal(log.filter((r) => r.status === 'skipped').length, 1);

  // 한도 오류 → 기록, 이후 다른 수신자도 쿨다운으로 SMTP를 호출하지 않는다
  sendMailImpl = async () => { throw Object.assign(new Error('421 4.7.0 Try again later'), { responseCode: 421 }); };
  assert.equal(await sender.sendWelcomeEmail('m2@x.com', welcome), false);
  assert.equal(sendCalls.length, 2, '한도 오류가 난 그 호출은 SMTP까지 갔다');
  assert.equal(log[log.length - 1].status, 'rate_limited');
  sendMailImpl = async () => ({});
  assert.equal(await sender.sendWelcomeEmail('m3@x.com', welcome), false, '쿨다운 중에는 다른 수신자도 보내지 않는다');
  const expiry = { name: 'n', programName: 'p', planName: 'pl', expiresAt: new Date().toISOString(), daysLeft: 3 };
  assert.equal(await sender.sendExpiryReminderEmail('m4@x.com', expiry), false);
  assert.equal(sendCalls.length, 2, '쿨다운 중에는 SMTP를 더 두드리지 않는다(재시도 없음)');

  // 쿨다운이 지나면 다시 보낸다
  log = log.map((r) => (r.status === 'rate_limited' ? { ...r, created_at: ago(31) } : r));
  assert.equal(await sender.sendWelcomeEmail('m3@x.com', welcome), true, '30분 뒤 재개');

  // 하루 전체 상한
  process.env.EMAIL_DAILY_LIMIT = '2';
  log = [];
  sendCalls = [];
  assert.equal(await sender.sendWelcomeEmail('u1@x.com', welcome), true);
  assert.equal(await sender.sendWelcomeEmail('u2@x.com', welcome), true);
  assert.equal(await sender.sendWelcomeEmail('u3@x.com', welcome), false, '하루 상한(2통) 초과');
  assert.equal(sendCalls.length, 2);
  delete process.env.EMAIL_DAILY_LIMIT;

  // 기록 표 장애 시에도 발송은 평소처럼
  log = [];
  sendCalls = [];
  failQueries = true;
  assert.equal(await sender.sendWelcomeEmail('z@x.com', welcome), true, '기록 표를 못 읽어도 메일은 나간다');
  failQueries = false;

  // 문의 메일: 관리자 + 고객 순차 발송, 같은 고객에게 접수 확인은 하루 3통까지
  log = [];
  sendCalls = [];
  const inquiry = { name: '고객', email: 'c@x.com', type: '문의', message: '내용' };
  const first = await sender.sendSupportEmails('admin@x.com', inquiry);
  assert.deepEqual(first, { toAdmin: true, toCustomer: true });
  for (const message of ['둘째', '셋째']) {
    log = log.map((r) => ({ ...r, created_at: ago(20) })); // 중복 창(10분) 밖으로
    await sender.sendSupportEmails('admin@x.com', { ...inquiry, message });
  }
  log = log.map((r) => ({ ...r, created_at: ago(20) }));
  const fourth = await sender.sendSupportEmails('admin@x.com', { ...inquiry, message: '넷째' });
  assert.equal(fourth.toCustomer, false, '같은 고객에게 접수 확인 메일은 하루 3통까지');

  console.log('email guard ok');
})().catch((e) => { console.error(e); process.exit(1); });
