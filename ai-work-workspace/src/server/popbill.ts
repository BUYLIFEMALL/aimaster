// 세금계산서 발급대행 — 팝빌 명령(/api/rpc/pb*). 2026-11-13 주인님 「팝빌 먼저, 바로 구현」·「각 개인이 본인 키값으로」.
// 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5.
// · 최상위 규칙: 회원이 본인 사업자로 팝빌 API를 신청해 받은 LinkID·SecretKey(공용 user_api_keys popbill_link_id·popbill_secret_key)만 쓴다. 운영자 키 없음.
// · 기본은 테스트 서버(무료 테스트 포인트). 실제 발급은 회원이 「실제 발급으로 전환」을 직접 켜야 한다(요금은 팝빌이 회원에게 청구).
// · 발급은 회원이 문서마다 직접 누른다(자동 대량 발급 없음). 보내기 전에 문서번호(MgtKey)를 문서에 먼저 저장하고,
//   결과가 불확실했던 문서는 다시 누르면 팝빌에 먼저 조회해 이미 발급됐으면 그 결과만 기록한다(이중 발급 방지, 자동 재시도 없음).
// · 토큰은 요청한 IP에서만 쓰이므로(팝빌 기본) 작업마다 새로 받아 바로 쓴다.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError, type Ctx } from '@/litpage/server/api/handlers.ts';
import { db } from '@/litpage/server/db.ts';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureReceiptTables } from './receipts';
import type { BizInfo, HometaxDoc } from './receiptsCore';
import {
  newMgtKey, popbillErrorText, popbillHosts, popbillInvoice, tokenRequest,
  POPBILL_LINK_PROVIDER, POPBILL_NOT_FOUND, POPBILL_SECRET_PROVIDER, type PopbillMode,
} from './popbillCore';

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;
type Fetch = typeof fetch;
let fetchImpl: Fetch = (...a) => fetch(...a);
/** 시험에서 바꿔 끼움 */
export function setPopbillFetch(f: Fetch | undefined) {
  fetchImpl = f ?? ((...a) => fetch(...a));
}
type KeyReader = (userId: string) => Promise<{ linkId: string | null; secretKey: string | null }>;
let readKeys: KeyReader = async (userId) => {
  const { data } = await (createAdminClient() as unknown as SupabaseClient).from('user_api_keys').select('provider, api_key')
    .eq('user_id', userId).in('provider', [POPBILL_LINK_PROVIDER, POPBILL_SECRET_PROVIDER]);
  const get = (p: string) => {
    const v = (data ?? []).find((r: { provider: string }) => r.provider === p)?.api_key;
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  return { linkId: get(POPBILL_LINK_PROVIDER), secretKey: get(POPBILL_SECRET_PROVIDER) };
};
/** 시험에서 바꿔 끼움 */
export function setPopbillKeyReader(f: KeyReader | undefined) {
  if (f) readKeys = f;
}

function uid(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError('Unauthorized', 401);
  return ctx.userId;
}

let ready = false;
function ensureTable() {
  if (ready) return;
  ensureReceiptTables();
  db.exec('CREATE TABLE IF NOT EXISTS aww_popbill (user_id TEXT PRIMARY KEY, mode TEXT NOT NULL, prod_agreed_time INTEGER, updated_time INTEGER NOT NULL)');
  ready = true;
}
function modeOf(userId: string): PopbillMode {
  ensureTable();
  const r = db.prepare('SELECT mode FROM aww_popbill WHERE user_id = ?').get(userId) as { mode: string } | undefined;
  return r?.mode === 'prod' ? 'prod' : 'test';
}
function profileOf(userId: string): BizInfo | null {
  const r = db.prepare('SELECT data FROM aww_rcpt_profile WHERE user_id = ?').get(userId) as { data: string } | undefined;
  try {
    return r ? (JSON.parse(r.data) as BizInfo) : null;
  } catch {
    return null;
  }
}
const corpOf = (me: BizInfo | null) => String(me?.bizNo ?? '').replace(/\D/g, '');

async function keysOrThrow(userId: string) {
  const k = await readKeys(userId);
  if (!k.linkId || !k.secretKey) throw new ApiError('팝빌 LinkID·SecretKey를 먼저 등록해 주세요(「API키등록·플랫폼연동」). 팝빌 개발자센터에서 본인 사업자로 API를 신청하면 받을 수 있습니다.', 400);
  return k as { linkId: string; secretKey: string };
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text.slice(0, 200) };
  }
}

class PopbillError extends Error {
  constructor(public code: number | undefined, message: string, public uncertain = false) {
    super(message);
  }
}

async function call(url: string, init: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new PopbillError(undefined, '팝빌에 연결하지 못했습니다(응답 없음).', true);
  }
  const j = await readJson(res);
  if (!res.ok || (typeof j?.code === 'number' && j.code < 0)) throw new PopbillError(typeof j?.code === 'number' ? j.code : undefined, popbillErrorText(j, `팝빌 요청이 실패했습니다(${res.status}).`), res.status >= 500);
  return j;
}

async function token(userId: string, mode: PopbillMode, corpNum: string): Promise<string> {
  const k = await keysOrThrow(userId);
  const t = tokenRequest({ linkId: k.linkId, secretKey: k.secretKey, mode, corpNum });
  const j = await call(t.url, { method: 'POST', headers: t.headers, body: t.body });
  if (typeof j?.session_token !== 'string') throw new PopbillError(undefined, '팝빌 인증에 실패했습니다. LinkID·SecretKey를 확인해 주세요.');
  return j.session_token;
}

const asApi = (e: unknown): never => {
  if (e instanceof ApiError) throw e;
  if (e instanceof PopbillError) throw new ApiError(e.message, 400);
  throw new ApiError('팝빌 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', 502);
};

interface PbState { mgtKey: string; mode: PopbillMode; state: 'sending' | 'issued' | 'failed'; ntsConfirmNum?: string; message?: string; time: number }

function saveDocState(userId: string, docId: string, data: object, pb: PbState) {
  db.prepare('UPDATE aww_rcpt_docs SET data = ? WHERE id = ? AND user_id = ?').run(JSON.stringify({ ...data, popbill: pb }), docId, userId);
}

export const popbillHandlers: Record<string, Handler> = {
  /** 처음 설정 4단계 상태: 키 · 연동회원 · 공동인증서 · 모드(+ 남은 포인트·건당 단가) */
  async pbStatus(ctx) {
    const userId = uid(ctx);
    ensureTable();
    const mode = modeOf(userId);
    const me = profileOf(userId);
    const corpNum = corpOf(me);
    const k = await readKeys(userId);
    const out: Record<string, unknown> = { mode, keys: !!(k.linkId && k.secretKey), bizNo: corpNum.length === 10, member: null, cert: null, balance: null, unitCost: null, problem: null };
    if (!out.keys || !out.bizNo) return out;
    const { api, auth, service } = popbillHosts(mode);
    try {
      const m = await call(`${api}/Join?CorpNum=${corpNum}&LID=${encodeURIComponent(k.linkId!)}`, { method: 'GET' });
      out.member = m?.code === 1;
      if (!out.member) return out;
      const tk = await token(userId, mode, corpNum);
      const bearer = { Authorization: `Bearer ${tk}` };
      const cert = await call(`${api}/Taxinvoice/CertCheck`, { method: 'GET', headers: bearer }).then((r) => r?.code === 1).catch(() => false);
      out.cert = cert;
      out.balance = await call(`${auth}/${service}/Point`, { method: 'GET', headers: bearer }).then((r) => r?.remainPoint ?? null).catch(() => null);
      out.unitCost = await call(`${api}/Taxinvoice?cfg=UNITCOST`, { method: 'GET', headers: bearer }).then((r) => r?.unitCost ?? null).catch(() => null);
    } catch (e) {
      out.problem = e instanceof Error ? e.message : '팝빌 상태를 확인하지 못했습니다.';
    }
    return out;
  },

  /** 2단계: 본인 사업자를 팝빌 연동회원으로 가입(「내 사업자」 정보 + 팝빌 아이디·비밀번호·담당자). 비밀번호는 저장하지 않는다 */
  async pbJoin(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    const me = profileOf(userId);
    const corpNum = corpOf(me);
    if (!me || corpNum.length !== 10 || !me.name || !me.ceo) throw new ApiError('먼저 「내 사업자」(사업자등록번호·상호·대표자·주소·업태·종목)를 저장해 주세요.', 400);
    const id = String(body?.id ?? '').trim();
    const password = String(body?.password ?? '');
    const contactName = String(body?.contactName ?? '').trim();
    const contactEmail = String(body?.contactEmail ?? me.email ?? '').trim();
    const contactTel = String(body?.contactTel ?? me.phone ?? '').trim();
    if (!/^[A-Za-z0-9_.@-]{6,50}$/.test(id)) throw new ApiError('팝빌 아이디는 6~50자(영문·숫자)로 정해 주세요.', 400);
    if (password.length < 8 || password.length > 20) throw new ApiError('팝빌 비밀번호는 8~20자(영문·숫자·특수문자 포함)로 정해 주세요.', 400);
    if (!contactName || !contactEmail || !contactTel) throw new ApiError('담당자 이름·이메일·연락처를 입력해 주세요.', 400);
    const k = await keysOrThrow(userId);
    const { api } = popbillHosts(modeOf(userId));
    try {
      const r = await call(`${api}/Join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({
          ID: id, Password: password, LinkID: k.linkId, CorpNum: corpNum, CEOName: me.ceo, CorpName: me.name,
          Addr: me.address || '-', BizType: me.bizType || '-', BizClass: me.bizItem || '-', ContactName: contactName, ContactEmail: contactEmail, ContactTEL: contactTel,
        }),
      });
      return { ok: true, message: typeof r?.message === 'string' ? r.message : '가입 완료' };
    } catch (e) {
      return asApi(e);
    }
  },

  /** 3단계: 공동인증서 등록 팝업 주소(30초 동안만 유효 — 받자마자 연다) */
  async pbCertUrl(ctx) {
    const userId = uid(ctx);
    ensureTable();
    const corpNum = corpOf(profileOf(userId));
    if (corpNum.length !== 10) throw new ApiError('먼저 「내 사업자」의 사업자등록번호를 저장해 주세요.', 400);
    const mode = modeOf(userId);
    try {
      const tk = await token(userId, mode, corpNum);
      const r = await call(`${popbillHosts(mode).api}/Member?TG=CERT`, { method: 'GET', headers: { Authorization: `Bearer ${tk}` } });
      if (typeof r?.url !== 'string') throw new PopbillError(undefined, '인증서 등록 주소를 받지 못했습니다.');
      return { url: r.url };
    } catch (e) {
      return asApi(e);
    }
  },

  /** 4단계 뒤: 실제 발급 전환(동의 필수) / 테스트로 되돌리기 */
  pbSetMode(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    const mode: PopbillMode = body?.mode === 'prod' ? 'prod' : 'test';
    if (mode === 'prod' && body?.agree !== true) throw new ApiError('실제 발급으로 바꾸려면 「건당 요금은 팝빌이 내 계정에 청구」에 동의해 주세요.', 400);
    db.prepare('INSERT INTO aww_popbill (user_id, mode, prod_agreed_time, updated_time) VALUES (?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET mode = excluded.mode, prod_agreed_time = COALESCE(excluded.prod_agreed_time, aww_popbill.prod_agreed_time), updated_time = excluded.updated_time')
      .run(userId, mode, mode === 'prod' ? Date.now() : null, Date.now());
    return { mode };
  },

  /** 저장한 세금계산서 한 건 즉시 발행. 결과는 문서(data.popbill)에 기록 */
  async pbIssue(ctx, body) {
    const userId = uid(ctx);
    ensureTable();
    const docId = String(body?.id ?? '');
    const row = db.prepare("SELECT data FROM aww_rcpt_docs WHERE id = ? AND user_id = ? AND kind = 'tax_invoice'").get(docId, userId) as { data: string } | undefined;
    if (!row) throw new ApiError('세금계산서를 찾지 못했습니다.', 404);
    const data = JSON.parse(row.data) as HometaxDoc & { popbill?: PbState };
    const mode = modeOf(userId);
    const me = profileOf(userId);
    const corpNum = corpOf(me);
    const prev = data.popbill?.mode === mode ? data.popbill : undefined;
    if (prev?.state === 'issued') return { state: 'issued', already: true, ntsConfirmNum: prev.ntsConfirmNum ?? null, mode };

    try {
      const tk = await token(userId, mode, corpNum);
      const { api } = popbillHosts(mode);
      const bearer = { Authorization: `Bearer ${tk}` };
      // 지난번 결과가 불확실했으면 먼저 조회 — 팝빌에 이미 있으면 다시 보내지 않는다
      if (prev?.state === 'sending') {
        try {
          const info = await call(`${api}/Taxinvoice/SELL/${prev.mgtKey}`, { method: 'GET', headers: bearer });
          const code = Number(info?.stateCode);
          if (code >= 300 && code < 600) {
            const pb: PbState = { ...prev, state: 'issued', ntsConfirmNum: info?.ntsconfirmNum ?? info?.ntsConfirmNum, message: '이미 발급돼 있었습니다(다시 보내지 않음).', time: Date.now() };
            saveDocState(userId, docId, data, pb);
            return { state: 'issued', already: true, ntsConfirmNum: pb.ntsConfirmNum ?? null, mode };
          }
          throw new ApiError('팝빌에 이 문서가 발급되지 않은 상태로 남아 있습니다. 팝빌 사이트에서 확인한 뒤 처리해 주세요(자동으로 다시 보내지 않습니다).', 409);
        } catch (e) {
          if (!(e instanceof PopbillError && e.code !== undefined && POPBILL_NOT_FOUND.has(e.code))) throw e;
          // 팝빌에 없음 → 같은 문서번호로 보낸다(아래)
        }
      }
      const mgtKey = prev?.state === 'sending' ? prev.mgtKey : newMgtKey();
      const { body: inv, problems } = popbillInvoice(me, data, mgtKey);
      if (!inv) throw new ApiError(`팝빌로 보낼 수 없습니다. ${problems.join(' ')}`, 400);
      saveDocState(userId, docId, data, { mgtKey, mode, state: 'sending', time: Date.now() });
      try {
        const r = await call(`${api}/Taxinvoice`, { method: 'POST', headers: { ...bearer, 'Content-Type': 'application/json;charset=utf-8', 'X-HTTP-Method-Override': 'ISSUE' }, body: JSON.stringify(inv) });
        const pb: PbState = { mgtKey, mode, state: 'issued', ntsConfirmNum: r?.ntsConfirmNum, message: typeof r?.message === 'string' ? r.message : '발행 완료', time: Date.now() };
        saveDocState(userId, docId, data, pb);
        return { state: 'issued', ntsConfirmNum: pb.ntsConfirmNum ?? null, mode };
      } catch (e) {
        if (e instanceof PopbillError && !e.uncertain) {
          saveDocState(userId, docId, data, { mgtKey, mode, state: 'failed', message: e.message, time: Date.now() });
          throw new ApiError(`발급하지 못했습니다: ${e.message}`, 400);
        }
        // 응답을 못 받음 — 「보내는 중」으로 남겨 두고, 다음에 누르면 먼저 조회한다
        throw new ApiError('팝빌 응답을 받지 못했습니다. 발급됐는지 확실하지 않아 자동으로 다시 보내지 않습니다. 잠시 뒤 「팝빌 발급」을 다시 누르면 먼저 발급 여부를 확인합니다.', 502);
      }
    } catch (e) {
      return asApi(e);
    }
  },
};
