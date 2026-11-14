// 세금계산서 발급대행 — 볼타 명령(/api/rpc/bt*). 2026-11-13 주인님 「일단 볼타로 정리해」(팝빌 대신, 미배포였던 팝빌 코드는 지움).
// 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5.
// · 최상위 규칙: 회원이 볼타 개발자센터에서 본인 사업자로 받은 API 키(공용 user_api_keys bolta_api_key)만 쓴다. 운영자 키 없음.
// · 키 앞부분 test_ = 테스트(국세청 전송·포인트 차감 없음), live_ = 실제 발급(건당 포인트 — 볼타가 회원에게 청구). 실제 키로 처음 발급하기 전 동의 1번.
// · 발급은 회원이 문서마다 직접 누른다(자동 대량 발급 없음). 볼타는 요청을 먼저 접수하고(issuanceKey) 결과는 나중(테스트 10~30초, 실제 약 10분)이라,
//   같은 버튼을 다시 누르면 결과(국세청 승인번호)를 확인한다.
// · 이중 발급 방지: 보내기 전에 요청 번호(Bolta-Client-Reference-Id)를 문서에 먼저 저장. 응답을 못 받았으면 다음에 누를 때 그 번호로 접수 여부를 먼저 조회하고,
//   접수 기록이 없을 때만 같은 번호로 다시 보낸다(볼타도 같은 번호는 두 번 받지 않음). 자동 재시도 없음.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError, type Ctx } from '@/litpage/server/api/handlers.ts';
import { db } from '@/litpage/server/db.ts';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureReceiptTables } from './receipts';
import type { BizInfo, HometaxDoc } from './receiptsCore';
import { boltaAmendBody, boltaAuth, boltaErrorText, boltaInvoice, boltaModeOf, isAmendReason, newClientRef, BOLTA_API, BOLTA_KEY_PROVIDER, type AmendReason, type BoltaMode } from './boltaCore';

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;
type Fetch = typeof fetch;
let fetchImpl: Fetch = (...a) => fetch(...a);
/** 시험에서 바꿔 끼움 */
export function setBoltaFetch(f: Fetch | undefined) {
  fetchImpl = f ?? ((...a) => fetch(...a));
}
type KeyReader = (userId: string) => Promise<string | null>;
let readKey: KeyReader = async (userId) => {
  const { data } = await (createAdminClient() as unknown as SupabaseClient).from('user_api_keys').select('api_key').eq('user_id', userId).eq('provider', BOLTA_KEY_PROVIDER).maybeSingle();
  const v = typeof data?.api_key === 'string' ? data.api_key.trim() : '';
  return v || null;
};
/** 시험에서 바꿔 끼움 */
export function setBoltaKeyReader(f: KeyReader | undefined) {
  if (f) readKey = f;
}

function uid(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError('Unauthorized', 401);
  return ctx.userId;
}

let ready = false;
function ensureTable() {
  if (ready) return;
  ensureReceiptTables();
  db.exec('CREATE TABLE IF NOT EXISTS aww_bolta (user_id TEXT PRIMARY KEY, live_agreed_time INTEGER, updated_time INTEGER NOT NULL)');
  // 2026-11-13 웹훅(boltaWebhook.ts): 회원 전용 주소의 토큰(해시만 저장)과 받은 알림 번호(중복 방지)
  db.exec('ALTER TABLE aww_bolta ADD COLUMN IF NOT EXISTS webhook_token_hash TEXT');
  db.exec('CREATE TABLE IF NOT EXISTS aww_bolta_webhook_seen (webhook_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, seen_time INTEGER NOT NULL)');
  ready = true;
}
/** boltaWebhook.ts가 함께 쓰는 것 */
export const boltaInternals = {
  ensureTable: () => ensureTable(),
  readKey: (userId: string) => readKey(userId),
  call: (key: string, method: string, path: string) => call(key, method, path),
  saveDocState: (userId: string, docId: string, data: object, bt: BtState) => saveDocState(userId, docId, data, bt),
  saveAmend: (userId: string, docId: string, idx: number, a: AmendState) => saveAmend(userId, docId, idx, a), // 2026-11-15 수정발행 웹훅
};
export type { BtState };
const liveAgreed = (userId: string) => !!(db.prepare('SELECT live_agreed_time FROM aww_bolta WHERE user_id = ?').get(userId) as { live_agreed_time: number | null } | undefined)?.live_agreed_time;
function profileOf(userId: string): BizInfo | null {
  const r = db.prepare('SELECT data FROM aww_rcpt_profile WHERE user_id = ?').get(userId) as { data: string } | undefined;
  try {
    return r ? (JSON.parse(r.data) as BizInfo) : null;
  } catch {
    return null;
  }
}
const corpOf = (me: BizInfo | null) => String(me?.bizNo ?? '').replace(/\D/g, '');

class BoltaError extends Error {
  constructor(public status: number, public code: string, message: string, public uncertain = false) {
    super(message);
  }
}

async function keyOrThrow(userId: string): Promise<{ key: string; mode: BoltaMode }> {
  const key = await readKey(userId);
  const mode = boltaModeOf(key);
  if (!key) throw new ApiError('볼타 API 키를 먼저 등록해 주세요(「API키등록·플랫폼연동」). 볼타 개발자센터에서 본인 사업자로 가입하면 바로 받을 수 있습니다.', 400);
  if (!mode) throw new ApiError('볼타 API 키는 test_ 또는 live_로 시작해야 합니다. 키를 다시 확인해 주세요.', 400);
  return { key, mode };
}

async function call(key: string, method: string, path: string, opts: { body?: unknown; ref?: string } = {}): Promise<any> {
  let res: Response;
  try {
    res = await fetchImpl(BOLTA_API + path, {
      method,
      headers: { Authorization: boltaAuth(key), ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(opts.ref ? { 'Bolta-Client-Reference-Id': opts.ref } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new BoltaError(0, '', '볼타에 연결하지 못했습니다(응답 없음).', true);
  }
  const text = await res.text();
  let j: any = {};
  try {
    j = text ? JSON.parse(text) : {};
  } catch {
    j = {};
  }
  if (!res.ok) throw new BoltaError(res.status, typeof j?.code === 'string' ? j.code : '', boltaErrorText(res.status, j), res.status >= 500);
  return j;
}

const asApi = (e: unknown): never => {
  if (e instanceof ApiError) throw e;
  if (e instanceof BoltaError) throw new ApiError(e.message, 400);
  throw new ApiError('볼타 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', 502);
};

interface Issuer { issuerId: string; identificationNumber: string; certificate: { issuedAt?: string; expiresAt?: string } | null }
async function issuerOf(key: string, corpNum: string): Promise<Issuer | null> {
  const list = await call(key, 'GET', '/v1/issuers');
  return (Array.isArray(list) ? (list as Issuer[]) : []).find((i) => String(i.identificationNumber).replace(/\D/g, '') === corpNum) ?? null;
}

interface BtState { ref: string; mode: BoltaMode; state: 'sending' | 'requested' | 'issued' | 'failed'; issuanceKey?: string; ntsTransactionId?: string; message?: string; time: number }
function saveDocState(userId: string, docId: string, data: object, bt: BtState) {
  // 2026-11-13: 웹훅이 먼저 「발급됨·실패」로 바꾼 같은 요청을 옛 상태(보내는 중·요청됨)로 덮어쓰지 않는다
  const cur = db.prepare('SELECT data FROM aww_rcpt_docs WHERE id = ? AND user_id = ?').get(docId, userId) as { data: string } | undefined;
  const now = cur ? (JSON.parse(cur.data) as { bolta?: BtState }).bolta : undefined;
  if (now && now.ref === bt.ref && (now.state === 'issued' || now.state === 'failed') && (bt.state === 'sending' || bt.state === 'requested')) return;
  db.prepare('UPDATE aww_rcpt_docs SET data = ? WHERE id = ? AND user_id = ?').run(JSON.stringify({ ...data, bolta: bt }), docId, userId);
}

// ---------------------------------------------------------------- 수정발행(2026-11-15, 플랜 docs/PLAN_20261115_BOLTA_AMEND.md)
// 원본 문서의 boltaAmends 목록에 한 건씩 쌓는다(원본 발행 기록 bolta는 그대로). 결과를 기다리는 수정발행은 문서마다 한 번에 하나.
// 정발행과 같은 이중 발급 방지: 보내기 전에 요청 번호·본문을 저장 → 응답을 못 받으면 같은 번호로 접수 여부부터 조회, 기록이 없을 때만 같은 번호로 다시 보낸다.
// 기재사항 착오정정은 두 장(수정분 issuanceKey + 취소분 cancelIssuanceKey) — 두 장 모두 발행돼야 「발급됨」.
interface AmendPart { issuanceKey: string; state: 'requested' | 'issued' | 'failed'; ntsTransactionId?: string; message?: string }
interface AmendState {
  ref: string; mode: BoltaMode; reason: AmendReason; state: 'sending' | 'requested' | 'issued' | 'failed'; time: number; amount: number;
  body: Record<string, unknown> | null; issuanceKey?: string; ntsTransactionId?: string; message?: string; cancel?: AmendPart;
}
type TaxDocData = HometaxDoc & { bolta?: BtState; boltaAmends?: AmendState[] };
export type { AmendState };

function readTaxDoc(userId: string, docId: string): TaxDocData | null {
  const row = db.prepare("SELECT data FROM aww_rcpt_docs WHERE id = ? AND user_id = ? AND kind = 'tax_invoice'").get(docId, userId) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as TaxDocData) : null;
}
/** 수정발행 한 건을 고친다(늘 최신 문서를 다시 읽음). 웹훅이 먼저 끝낸(발급됨·실패) 건을 옛 상태로 되돌리지 않는다 */
function saveAmend(userId: string, docId: string, idx: number, next: AmendState) {
  const data = readTaxDoc(userId, docId);
  if (!data) return;
  const list = [...(data.boltaAmends ?? [])];
  const cur = list[idx];
  if (cur && cur.ref === next.ref && (cur.state === 'issued' || cur.state === 'failed') && (next.state === 'sending' || next.state === 'requested')) return;
  list[idx] = next;
  db.prepare('UPDATE aww_rcpt_docs SET data = ? WHERE id = ? AND user_id = ?').run(JSON.stringify({ ...data, boltaAmends: list }), docId, userId);
}

const AMEND_PATH: Record<AmendReason, string> = { termination: 'termination', doubleIssuance: 'doubleIssuance', changeSupplyCost: 'changeSupplyCost', return: 'return', misspell: 'misspell' };

/** 접수된 수정발행의 결과 확인(수정분·취소분 각각 승인번호) */
async function checkAmend(key: string, userId: string, docId: string, idx: number, a: AmendState): Promise<AmendState> {
  const nts = async (ik: string) => {
    try {
      const r = await call(key, 'GET', `/v1/taxInvoices/${encodeURIComponent(ik)}`);
      return typeof r?.ntsTransactionId === 'string' && r.ntsTransactionId ? r.ntsTransactionId : '';
    } catch (e) {
      if (e instanceof BoltaError && e.status === 401) throw e;
      return '';
    }
  };
  let next: AmendState = { ...a };
  if (a.issuanceKey && !a.ntsTransactionId) {
    const n = await nts(a.issuanceKey);
    if (n) next = { ...next, ntsTransactionId: n };
  }
  if (a.cancel && a.cancel.state !== 'issued' && a.cancel.state !== 'failed') {
    const n = await nts(a.cancel.issuanceKey);
    if (n) next = { ...next, cancel: { ...a.cancel, state: 'issued', ntsTransactionId: n } };
  }
  const done = !!next.ntsTransactionId && (!next.cancel || next.cancel.state === 'issued');
  if (done) next = { ...next, state: 'issued', message: '발행 완료', time: Date.now() };
  else {
    const status = await call(key, 'GET', `/v1/taxInvoices/issue/status?clientReferenceId=${encodeURIComponent(a.ref)}`).then((r) => (typeof r?.message === 'string' ? r.message.trim().slice(0, 200) : '')).catch(() => '');
    const half = next.ntsTransactionId && next.cancel ? '수정분은 발행됐고 취소분을 기다리는 중입니다. ' : '';
    next = { ...next, state: 'requested', message: `${half}${status || (a.mode === 'live' ? '국세청 처리 중입니다(보통 10분 안팎).' : '볼타가 처리 중입니다(테스트는 10~30초).')}` };
  }
  saveAmend(userId, docId, idx, next);
  return next;
}

/** 수정발행 보내기(접수 번호를 받으면 바로 결과도 한 번 확인) */
async function sendAmend(key: string, userId: string, docId: string, idx: number, a: AmendState, origKey: string): Promise<AmendState> {
  try {
    const r = await call(key, 'POST', `/v1/taxInvoices/${encodeURIComponent(origKey)}/amend/${AMEND_PATH[a.reason]}`, { body: a.body ?? undefined, ref: a.ref });
    if (typeof r?.issuanceKey !== 'string') throw new BoltaError(502, '', '볼타가 접수 번호를 돌려주지 않았습니다.', true);
    const accepted: AmendState = {
      ...a, state: 'requested', issuanceKey: r.issuanceKey, time: Date.now(),
      cancel: typeof r?.cancelIssuanceKey === 'string' && r.cancelIssuanceKey ? { issuanceKey: r.cancelIssuanceKey, state: 'requested' } : undefined,
    };
    saveAmend(userId, docId, idx, accepted);
    return await checkAmend(key, userId, docId, idx, accepted);
  } catch (e) {
    if (e instanceof BoltaError && !e.uncertain) {
      saveAmend(userId, docId, idx, { ...a, state: 'failed', message: e.message, time: Date.now() });
      throw new ApiError(`수정발행하지 못했습니다: ${e.message}`, 400);
    }
    throw new ApiError('볼타 응답을 받지 못했습니다. 수정발행이 접수됐는지 확실하지 않아 자동으로 다시 보내지 않습니다. 잠시 뒤 「수정발행 결과 확인」을 누르면 접수 여부부터 확인합니다.', 502);
  }
}

export const boltaHandlers: Record<string, Handler> = {
  /** 처음 설정 4단계 상태: 키 · 발급자(내 사업자) · 공동인증서 · 실제 발급 동의 */
  async btStatus(ctx) {
    const userId = uid(ctx);
    ensureTable();
    const key = await readKey(userId);
    const mode = boltaModeOf(key);
    const corpNum = corpOf(profileOf(userId));
    const out: Record<string, unknown> = { keys: !!key, keyOk: !!mode, mode, bizNo: corpNum.length === 10, issuer: null, cert: null, certExpires: null, liveAgreed: liveAgreed(userId), problem: null,
      webhookUrl: !!(db.prepare('SELECT webhook_token_hash FROM aww_bolta WHERE user_id = ?').get(userId) as { webhook_token_hash: string | null } | undefined)?.webhook_token_hash };
    if (!key || !mode || corpNum.length !== 10) return out;
    try {
      const iss = await issuerOf(key, corpNum);
      out.issuer = !!iss;
      out.cert = !!iss?.certificate;
      out.certExpires = iss?.certificate?.expiresAt ?? null;
    } catch (e) {
      out.problem = e instanceof Error ? e.message : '볼타 상태를 확인하지 못했습니다.';
    }
    return out;
  },

  /** 2단계: 「내 사업자」를 볼타 발급자로 등록(이미 있으면 그대로) */
  async btRegisterIssuer(ctx) {
    const userId = uid(ctx);
    ensureTable();
    const me = profileOf(userId);
    const corpNum = corpOf(me);
    if (!me || corpNum.length !== 10 || !me.name || !me.ceo) throw new ApiError('먼저 「내 사업자」(사업자등록번호·상호·대표자)를 저장해 주세요.', 400);
    const { key } = await keyOrThrow(userId);
    try {
      const have = await issuerOf(key, corpNum);
      if (have) return { issuerId: have.issuerId, already: true };
      const r = await call(key, 'POST', '/v1/issuers', { body: { identificationNumber: corpNum, representativeName: String(me.ceo).slice(0, 30), organizationName: String(me.name).slice(0, 70) } });
      return { issuerId: r?.issuerId ?? null, already: false };
    } catch (e) {
      return asApi(e);
    }
  },

  /** 3단계: 공동인증서 등록 주소(5분 유효). 등록을 마치면 화면에서 「상태 새로고침」 */
  async btCertUrl(ctx) {
    const userId = uid(ctx);
    ensureTable();
    const corpNum = corpOf(profileOf(userId));
    const { key } = await keyOrThrow(userId);
    try {
      const iss = await issuerOf(key, corpNum);
      if (!iss) throw new ApiError('먼저 「발급자 등록」을 해 주세요.', 400);
      const r = await call(key, 'GET', `/v1/issuers/${encodeURIComponent(iss.issuerId)}/certificates/url`);
      if (typeof r?.url !== 'string') throw new ApiError('인증서 등록 주소를 받지 못했습니다.', 502);
      return { url: r.url };
    } catch (e) {
      return asApi(e);
    }
  },

  /** 4단계: 실제(live_) 키로 발급하기 전 동의 1번 */
  btAgreeLive(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    if (body?.agree !== true) throw new ApiError('「건당 요금은 볼타가 내 계정 포인트에서 차감」에 동의해 주세요.', 400);
    db.prepare('INSERT INTO aww_bolta (user_id, live_agreed_time, updated_time) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET live_agreed_time = excluded.live_agreed_time, updated_time = excluded.updated_time').run(userId, Date.now(), Date.now());
    return { liveAgreed: true };
  },

  /** 저장한 세금계산서 한 건: 처음 누르면 발급 요청, 요청한 뒤 누르면 결과(국세청 승인번호) 확인 */
  async btIssue(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    const docId = String(body?.id ?? '');
    const row = db.prepare("SELECT data FROM aww_rcpt_docs WHERE id = ? AND user_id = ? AND kind = 'tax_invoice'").get(docId, userId) as { data: string } | undefined;
    if (!row) throw new ApiError('세금계산서를 찾지 못했습니다.', 404);
    const data = JSON.parse(row.data) as HometaxDoc & { bolta?: BtState };
    const { key, mode } = await keyOrThrow(userId);
    if (mode === 'live' && !liveAgreed(userId)) throw new ApiError('실제 발급 키(live_)입니다. 「볼타로 바로 발급」 칸에서 실제 발급 동의를 먼저 해 주세요.', 400);
    const prev = data.bolta?.mode === mode ? data.bolta : undefined;
    if (prev?.state === 'issued') return { state: 'issued', ntsTransactionId: prev.ntsTransactionId ?? null, mode, already: true };

    try {
      // 접수된 요청 → 결과 확인
      const check = async (bt: BtState) => {
        try {
          const r = await call(key, 'GET', `/v1/taxInvoices/${encodeURIComponent(bt.issuanceKey!)}`);
          if (typeof r?.ntsTransactionId === 'string' && r.ntsTransactionId) {
            const done: BtState = { ...bt, state: 'issued', ntsTransactionId: r.ntsTransactionId, message: '발행 완료', time: Date.now() };
            saveDocState(userId, docId, data, done);
            return { state: 'issued', ntsTransactionId: done.ntsTransactionId, mode };
          }
        } catch (e) {
          if (e instanceof BoltaError && e.status === 401) throw e;
        }
        // 아직 발행 전(또는 실패) — 볼타가 알려 주는 처리 상태 문구를 문서에 남겨 화면에 보여 준다(2026-11-13)
        const status = await call(key, 'GET', `/v1/taxInvoices/issue/status?clientReferenceId=${encodeURIComponent(bt.ref)}`).then((r) => (typeof r?.message === 'string' ? r.message.trim().slice(0, 200) : '')).catch(() => '');
        saveDocState(userId, docId, data, { ...bt, message: status || bt.message });
        const wait = mode === 'live' ? '국세청 처리 중입니다(보통 10분 안팎). 잠시 뒤 다시 눌러 확인해 주세요.' : '볼타가 처리 중입니다(테스트는 10~30초). 잠시 뒤 다시 눌러 확인해 주세요.';
        const old = Date.now() - bt.time > 30 * 60_000 ? ' 30분이 지나도 그대로면 볼타 개발자센터의 발행 내역에서 실패 사유를 확인해 주세요.' : '';
        return { state: 'requested', mode, message: `${wait}${status ? ` (볼타 상태: ${status})` : ''}${old}` };
      };
      if (prev?.state === 'requested' && prev.issuanceKey) return await check(prev);

      // 지난번 응답을 못 받았으면 같은 요청 번호로 접수 여부부터 확인
      if (prev?.state === 'sending') {
        try {
          const s = await call(key, 'GET', `/v1/taxInvoices/issue/status?clientReferenceId=${encodeURIComponent(prev.ref)}`);
          if (typeof s?.issuanceKey === 'string' && s.issuanceKey) return await check({ ...prev, state: 'requested', issuanceKey: s.issuanceKey, time: Date.now() });
        } catch (e) {
          if (!(e instanceof BoltaError && e.status === 400)) throw e; // 400 = 접수 기록 없음 → 같은 번호로 보낸다
        }
      }

      const ref = prev?.state === 'sending' ? prev.ref : newClientRef();
      const { body: inv, problems } = boltaInvoice(profileOf(userId), data);
      if (!inv) throw new ApiError(`볼타로 보낼 수 없습니다. ${problems.join(' ')}`, 400);
      saveDocState(userId, docId, data, { ref, mode, state: 'sending', time: Date.now() });
      try {
        const r = await call(key, 'POST', '/v1/taxInvoices/issue', { body: inv, ref });
        if (typeof r?.issuanceKey !== 'string') throw new BoltaError(502, '', '볼타가 접수 번호를 돌려주지 않았습니다.', true);
        const accepted: BtState = { ref, mode, state: 'requested', issuanceKey: r.issuanceKey, time: Date.now() };
        saveDocState(userId, docId, data, accepted); // 접수 번호를 바로 저장(웹훅이 몇 초 만에 올 수 있음 — 2026-11-13 운영 확인)
        return await check(accepted);
      } catch (e) {
        if (e instanceof BoltaError && !e.uncertain) {
          saveDocState(userId, docId, data, { ref, mode, state: 'failed', message: e.message, time: Date.now() });
          throw new ApiError(`발급하지 못했습니다: ${e.message}`, 400);
        }
        throw new ApiError('볼타 응답을 받지 못했습니다. 발급 요청이 접수됐는지 확실하지 않아 자동으로 다시 보내지 않습니다. 잠시 뒤 다시 누르면 접수 여부부터 확인합니다.', 502);
      }
    } catch (e) {
      return asApi(e);
    }
  },

  /** 수정발행 보내기 — 볼타로 발급을 마친 세금계산서만. body: { id, reason, date?, lines?, doc? } */
  async btAmend(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    const docId = String(body?.id ?? '');
    const data = readTaxDoc(userId, docId);
    if (!data) throw new ApiError('세금계산서를 찾지 못했습니다.', 404);
    if (!isAmendReason(body?.reason)) throw new ApiError('수정 사유를 골라 주세요.', 400);
    const reason: AmendReason = body.reason;
    const orig = data.bolta;
    if (orig?.state !== 'issued' || !orig.issuanceKey) throw new ApiError('볼타로 발급을 마친 세금계산서만 수정발행할 수 있습니다.', 400);
    const { key, mode } = await keyOrThrow(userId);
    if (mode !== orig.mode) throw new ApiError(`이 세금계산서는 ${orig.mode === 'live' ? '실제(live_)' : '테스트(test_)'} 키로 발급했습니다. 같은 종류의 키로만 수정발행할 수 있습니다.`, 400);
    if (mode === 'live' && !liveAgreed(userId)) throw new ApiError('실제 발급 키(live_)입니다. 「볼타로 바로 발급」 칸에서 실제 발급 동의를 먼저 해 주세요.', 400);
    const list = data.boltaAmends ?? [];
    if (list.some((a) => a.state === 'sending' || a.state === 'requested')) throw new ApiError('결과를 기다리는 수정발행이 있습니다. 먼저 「수정발행 결과 확인」을 눌러 주세요.', 400);
    const { body: amendBody, amount, problems } = boltaAmendBody(reason, data, { date: body?.date, lines: body?.lines, doc: body?.doc }, profileOf(userId));
    if (problems.length) throw new ApiError(`수정발행할 수 없습니다. ${problems.join(' ')}`, 400);
    const a: AmendState = { ref: newClientRef(), mode, reason, state: 'sending', time: Date.now(), amount, body: amendBody };
    const idx = list.length;
    saveAmend(userId, docId, idx, a); // 보내기 전에 요청 번호·본문을 먼저 저장
    try {
      const r = await sendAmend(key, userId, docId, idx, a, orig.issuanceKey);
      return { state: r.state, ntsTransactionId: r.ntsTransactionId ?? null, cancelNts: r.cancel?.ntsTransactionId ?? null, mode, amount, message: r.message };
    } catch (e) {
      return asApi(e);
    }
  },

  /** 결과를 기다리는 수정발행 확인(응답을 못 받은 건은 같은 요청 번호로 접수 여부부터 조회) */
  async btAmendCheck(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    const docId = String(body?.id ?? '');
    const data = readTaxDoc(userId, docId);
    if (!data) throw new ApiError('세금계산서를 찾지 못했습니다.', 404);
    const list = data.boltaAmends ?? [];
    const idx = list.findIndex((a) => a.state === 'sending' || a.state === 'requested');
    if (idx < 0) return { state: list.at(-1)?.state ?? null, message: '결과를 기다리는 수정발행이 없습니다.' };
    const a = list[idx];
    const { key, mode } = await keyOrThrow(userId);
    if (mode !== a.mode) throw new ApiError('수정발행할 때와 다른 종류의 볼타 키입니다. 같은 키로 확인해 주세요.', 400);
    try {
      if (a.state === 'requested') {
        const r = await checkAmend(key, userId, docId, idx, a);
        return { state: r.state, ntsTransactionId: r.ntsTransactionId ?? null, cancelNts: r.cancel?.ntsTransactionId ?? null, mode, message: r.message };
      }
      // 보내는 중(응답 못 받음) → 접수 기록부터
      try {
        const s = await call(key, 'GET', `/v1/taxInvoices/issue/status?clientReferenceId=${encodeURIComponent(a.ref)}`);
        if (typeof s?.issuanceKey === 'string' && s.issuanceKey) {
          const got: AmendState = { ...a, state: 'requested', issuanceKey: s.issuanceKey, time: Date.now(),
            cancel: typeof s?.cancelIssuanceKey === 'string' && s.cancelIssuanceKey ? { issuanceKey: s.cancelIssuanceKey, state: 'requested' } : a.cancel };
          const r = await checkAmend(key, userId, docId, idx, got);
          return { state: r.state, ntsTransactionId: r.ntsTransactionId ?? null, cancelNts: r.cancel?.ntsTransactionId ?? null, mode, message: r.message };
        }
      } catch (e) {
        if (!(e instanceof BoltaError && e.status === 400)) throw e; // 400 = 접수 기록 없음 → 같은 번호·같은 본문으로 다시 보낸다
      }
      if (mode === 'live' && !liveAgreed(userId)) throw new ApiError('실제 발급 동의가 풀려 있어 다시 보내지 않았습니다.', 400);
      const r = await sendAmend(key, userId, docId, idx, a, data.bolta!.issuanceKey!);
      return { state: r.state, ntsTransactionId: r.ntsTransactionId ?? null, cancelNts: r.cancel?.ntsTransactionId ?? null, mode, message: r.message };
    } catch (e) {
      return asApi(e);
    }
  },

  /** 발급을 마친 세금계산서(원본·수정분·취소분)의 PDF 내려받기 주소. 포인트 차감 없음. 준비 중이면 pending */
  async btPdf(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    const data = readTaxDoc(userId, String(body?.id ?? ''));
    if (!data) throw new ApiError('세금계산서를 찾지 못했습니다.', 404);
    const want = String(body?.issuanceKey ?? data.bolta?.issuanceKey ?? '');
    // 이 문서의 발행 번호만 허용(다른 문서·다른 회원 번호로 조회 금지)
    const issued = [
      data.bolta?.state === 'issued' ? data.bolta.issuanceKey : undefined,
      ...(data.boltaAmends ?? []).flatMap((a) => [a.ntsTransactionId ? a.issuanceKey : undefined, a.cancel?.state === 'issued' ? a.cancel.issuanceKey : undefined]),
    ].filter((k): k is string => !!k);
    if (!want || !issued.includes(want)) throw new ApiError('발급을 마친 세금계산서만 PDF를 받을 수 있습니다.', 400);
    const { key, mode } = await keyOrThrow(userId);
    // 볼타 규칙: PDF는 발행을 요청한 키로만 받는다(키를 바꾸면 그 키로 발행한 건의 PDF는 못 받음)
    if (data.bolta?.mode && mode !== data.bolta.mode) throw new ApiError(`이 세금계산서는 ${data.bolta.mode === 'live' ? '실제(live_)' : '테스트(test_)'} 키로 발급했습니다. 발급할 때 쓴 키로만 PDF를 받을 수 있습니다.`, 400);
    try {
      const r = await call(key, 'GET', `/v1/taxInvoices/${encodeURIComponent(want)}/pdf`);
      if (r?.status === 'READY' && typeof r.downloadUrl === 'string') return { ready: true, url: r.downloadUrl, filename: typeof r.filename === 'string' ? r.filename : null };
      return { ready: false, message: 'PDF를 만드는 중입니다. 몇 초 뒤 다시 눌러 주세요.' };
    } catch (e) {
      return asApi(e);
    }
  },
};
