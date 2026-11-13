// 볼타 웹훅 — 발급 결과 자동 수신(2026-11-13, 주인님 「진행하고」, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5 웹훅).
// · 회원마다 전용 주소 /api/bolta/webhook/<토큰>(토큰은 해시만 저장, 다시 만들면 옛 주소는 못 씀).
// · 회원이 볼타 개발자센터에 그 주소를 등록하고 받은 서명 키(whsec_…)를 공용 user_api_keys bolta_webhook_secret에 넣는다.
// · 서명(Standard Webhooks)이 맞을 때만 그 회원의 세금계산서 문서를 고친다. 같은 알림 번호는 한 번만 처리.
// · 선택 기능: 등록하지 않은 회원은 지금처럼 「발급 결과 확인」 버튼으로 확인한다.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { ApiError, type Ctx } from '@/litpage/server/api/handlers.ts';
import { db } from '@/litpage/server/db.ts';
import { createAdminClient } from '@/lib/supabase/admin';
import { boltaInternals, type BtState } from './bolta';
import { boltaCauseText, verifyBoltaWebhook, BOLTA_WEBHOOK_PROVIDER } from './boltaCore';
import type { HometaxDoc } from './receiptsCore';

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;
export const BOLTA_WEBHOOK_BASE = 'https://ai-work-workspace.buylife.xyz/api/bolta/webhook/';
const sha = (v: string) => createHash('sha256').update(v).digest('hex');

type SecretReader = (userId: string) => Promise<string | null>;
let readSecret: SecretReader = async (userId) => {
  const { data } = await (createAdminClient() as unknown as SupabaseClient).from('user_api_keys').select('api_key').eq('user_id', userId).eq('provider', BOLTA_WEBHOOK_PROVIDER).maybeSingle();
  const v = typeof data?.api_key === 'string' ? data.api_key.trim() : '';
  return v || null;
};
/** 시험에서 바꿔 끼움 */
export function setBoltaSecretReader(f: SecretReader | undefined) {
  if (f) readSecret = f;
}

export const boltaWebhookHandlers: Record<string, Handler> = {
  /** 회원 전용 웹훅 주소를 새로 만든다. 주소는 이때 한 번만 보여 준다 */
  btWebhookUrl(ctx) {
    if (!ctx.userId) throw new ApiError('Unauthorized', 401);
    boltaInternals.ensureTable();
    const token = randomBytes(24).toString('base64url');
    db.prepare('INSERT INTO aww_bolta (user_id, webhook_token_hash, updated_time) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET webhook_token_hash = excluded.webhook_token_hash, updated_time = excluded.updated_time').run(ctx.userId, sha(token), Date.now());
    return { url: BOLTA_WEBHOOK_BASE + token };
  },
};

/** 웹훅 주소의 토큰 → 회원 */
export function boltaWebhookOwner(token: string): string | null {
  boltaInternals.ensureTable();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const r = db.prepare('SELECT user_id FROM aww_bolta WHERE webhook_token_hash = ?').get(sha(token)) as { user_id: string } | undefined;
  return r?.user_id ?? null;
}

/**
 * 웹훅 한 건 처리. 돌려주는 status = HTTP 상태(볼타는 2xx가 아니면 최대 8번 다시 보낸다):
 * 400 = 서명 키 없음·서명 불일치(아무것도 바꾸지 않음), 200 = 그 밖(중복·모르는 문서 포함).
 */
export async function handleBoltaWebhook(userId: string, headers: { id?: string | null; timestamp?: string | null; signature?: string | null }, rawBody: string, now = Date.now()): Promise<{ status: number; result: string }> {
  boltaInternals.ensureTable();
  const secret = await readSecret(userId);
  if (!secret) return { status: 400, result: 'no_secret' };
  const why = verifyBoltaWebhook(secret, headers, rawBody, now);
  // 진단(2026-11-13): 키 모양만 남긴다(값은 남기지 않음) — whsec_ 머리 여부, 뒷부분이 base64로 풀리는 길이
  if (why) return { status: 400, result: `bad_signature(${why} keyPrefix=${secret.startsWith('whsec_')} keyBytes=${Buffer.from(secret.replace(/^whsec_/, ''), 'base64').length} keyLen=${secret.length})` };
  if (db.prepare('SELECT 1 AS x FROM aww_bolta_webhook_seen WHERE webhook_id = ?').get(headers.id!)) return { status: 200, result: 'duplicate' };
  const seen = (result: string) => {
    db.prepare('INSERT INTO aww_bolta_webhook_seen (webhook_id, user_id, seen_time) VALUES (?, ?, ?) ON CONFLICT (webhook_id) DO NOTHING').run(headers.id!, userId, now);
    db.prepare('DELETE FROM aww_bolta_webhook_seen WHERE seen_time < ?').run(now - 7 * 86_400_000);
    return { status: 200, result };
  };
  let ev: { eventType?: string; data?: { issuanceKey?: string; cause?: { code?: unknown; message?: unknown } } } = {};
  try {
    ev = JSON.parse(rawBody);
  } catch {
    return seen('ignored');
  }
  const issuanceKey = typeof ev?.data?.issuanceKey === 'string' ? ev.data.issuanceKey : '';
  const kind = ev?.eventType;
  if (!issuanceKey || (kind !== 'TAX_INVOICE_ISSUANCE_SUCCESS' && kind !== 'TAX_INVOICE_ISSUANCE_FAILURE')) return seen('ignored');
  const rows = db.prepare("SELECT id, data FROM aww_rcpt_docs WHERE user_id = ? AND kind = 'tax_invoice' AND data LIKE ?").all(userId, `%${issuanceKey.replace(/[%_\\]/g, '')}%`) as { id: string; data: string }[];
  const hit = rows.map((r) => ({ id: r.id, data: JSON.parse(r.data) as HometaxDoc & { bolta?: BtState } })).find((r) => r.data.bolta?.issuanceKey === issuanceKey);
  if (!hit?.data.bolta) return seen('unknown_doc');
  const bt = hit.data.bolta;
  if (bt.state === 'issued') return seen('already');
  if (kind === 'TAX_INVOICE_ISSUANCE_FAILURE') {
    boltaInternals.saveDocState(userId, hit.id, hit.data, { ...bt, state: 'failed', message: boltaCauseText(ev.data?.cause), time: now });
    return seen('failed');
  }
  // 성공: 승인번호는 웹훅에 없어 회원 본인 키로 조회한다. 조회가 안 되면 「요청됨」으로 두어 버튼으로 다시 확인할 수 있게 한다
  let nts = '';
  try {
    const key = await boltaInternals.readKey(userId);
    if (key) nts = String((await boltaInternals.call(key, 'GET', `/v1/taxInvoices/${encodeURIComponent(issuanceKey)}`))?.ntsTransactionId ?? '');
  } catch {
    /* 아래에서 요청됨으로 남김 */
  }
  boltaInternals.saveDocState(userId, hit.id, hit.data, nts
    ? { ...bt, state: 'issued', ntsTransactionId: nts, message: '발행 완료', time: now }
    : { ...bt, state: 'requested', message: '발행 완료 알림을 받았습니다. 「발급 결과 확인」을 누르면 승인번호를 가져옵니다.' });
  return seen(nts ? 'issued' : 'issued_pending_number');
}
