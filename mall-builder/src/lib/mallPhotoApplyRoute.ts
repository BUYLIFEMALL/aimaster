// 메이커 M3 적용 POST 라우트 연결 후보(2026-11-19, Master msg_c33cf9f00099) — 서버 전용. 아직 활성 라우트(src/app/**/route.ts)는 없다.
// 실제 연결은 디코더 의존성(sharp 직접 설치·빌드·S1 시험) 통과 뒤, route.ts가 이 파일의 handleApplyPost를 부르는 얇은 껍데기로 만든다.
// 재사용: 기존 회원 인증(createClient → auth.getUser)·RLS·0107 함수(begin/commit)·서명(applySignature)·순수 순서(applyProposal).
// 원칙:
//  - 버킷 이름은 고정 상수(요청이 정할 수 없음). 서버 설정(열쇠·kid·출처)은 환경변수에서만 오고 요청 본문에서 받지 않는다.
//  - 내려받기는 스트림으로 읽으며 상한을 넘는 순간 중단한다(Content-Length를 믿지 않음).
//  - 응답은 고정 문구·코드뿐: 서명 경로·열쇠·원문 오류를 내보내지 않는다. 결과를 모르면 unknown, 자동 재시도 0.
//  - 「그래도 적용」(force)은 불리언으로만 전달하고 직원 여부는 DB(0107 begin)가 판정한다(공급사는 forbidden).
import { applyProposal, APPLY_MAX_BYTES, APPLY_TEXT, validKey, type ApplyCode, type ApplyDeps, type DecodedImage } from "./mallPhotoApply.ts";
import { APPLIED_BUCKET, appliedPublicUrl } from "./applySignature.ts";
import { PROPOSAL_BUCKET } from "./mallPhotoSave.ts";

export const APPLY_BODY_MAX = 512; // 본문은 {proposalId, force}뿐
export const APPLY_SIGNED_URL_SECONDS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const APPLY_HTTP: Record<ApplyCode, number> = {
  done: 200, forbidden: 403, not_proposed: 409, stale: 409, busy: 409, gone: 410, bad_image: 422, too_large: 413,
  config: 503, compromised: 409, failed: 500, unknown: 502,
};

export interface ApplyConfig { kid: string; keyB64: string; origin: string }
/** 서버 환경변수만 읽는다. 값이 없거나 형식이 틀리면 null(= config 응답). 값은 로그·응답에 내보내지 않는다 */
export function readApplyConfig(env: Record<string, string | undefined>): ApplyConfig | null {
  const keyB64 = (env.MALL_APPLY_SIGNING_KEY ?? "").trim();
  const kid = (env.MALL_APPLY_KID ?? "k1").trim();
  const origin = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!validKey(keyB64) || !/^[a-z0-9]{1,16}$/.test(kid) || !origin) return null;
  try { new URL(origin); } catch { return null; }
  return { kid, keyB64, origin };
}

/** 응답 본문을 스트림으로 읽되 max를 넘는 순간 중단. 넘으면 "too_large", 실패 null */
export async function readCapped(res: { ok: boolean; body: ReadableStream<Uint8Array> | null; headers: { get(n: string): string | null } }, max: number): Promise<Uint8Array | "too_large" | null> {
  if (!res.ok || !res.body) return null;
  const declared = res.headers.get("content-length");
  if (declared !== null && /^[0-9]+$/.test(declared) && Number(declared) > max) { try { await res.body.cancel(); } catch { /* 무시 */ } return "too_large"; }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) return null;
      total += value.length;
      if (total > max) { try { await reader.cancel(); } catch { /* 무시 */ } return "too_large"; }
      chunks.push(value);
    }
  } catch { return null; }
  const out = new Uint8Array(total); let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

type Rpc = { data?: unknown; error?: unknown };
/** 회원 세션 Supabase 클라이언트에서 쓰는 부분만(구조 타입) */
export interface SupabaseLike {
  from(table: string): { select(cols: string): { eq(col: string, v: string): { maybeSingle(): PromiseLike<{ data?: unknown; error?: unknown }> } } };
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<Rpc>;
  storage: { from(bucket: string): {
    createSignedUrl(path: string, seconds: number): Promise<{ data?: { signedUrl?: string } | null; error?: unknown }>;
    upload(path: string, body: Uint8Array, o: { contentType: string; upsert: boolean; cacheControl: string }): Promise<{ error?: unknown }>;
  } };
}
type FetchLike = (url: string, init: { cache: "no-store"; redirect: "error" }) => Promise<{ ok: boolean; body: ReadableStream<Uint8Array> | null; headers: { get(n: string): string | null } }>;

/** 실제 연결용 deps — 회원 세션 클라이언트·디코더·fetch·시계를 받아 ApplyDeps를 만든다. 버킷은 고정 상수 */
export function makeApplyDeps(a: { supabase: SupabaseLike; decode: (b: Uint8Array) => Promise<DecodedImage | null>; fetch: FetchLike; origin: string; sha256: (b: Uint8Array) => Promise<string>; nowSeconds: () => number }): ApplyDeps {
  const { supabase } = a;
  return {
    async loadProposal(id) {
      const { data, error } = await supabase.from("mall_builder_photo_proposals").select("store_id, product_id, file_path").eq("id", id).maybeSingle();
      if (error) throw new Error("load");
      const r = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      if (!r) return null;
      return { storeId: r.store_id as string, productId: r.product_id as string, filePath: r.file_path as string };
    },
    begin: async (proposalId, force) => await supabase.rpc("mall_builder_photo_apply_begin", { p_proposal: proposalId, p_force: force }),
    async downloadProposal(filePath, maxBytes) {
      const signed = await supabase.storage.from(PROPOSAL_BUCKET).createSignedUrl(filePath, APPLY_SIGNED_URL_SECONDS);
      const url = signed?.data?.signedUrl;
      if (signed?.error || typeof url !== "string" || !url) return null;
      return await readCapped(await a.fetch(url, { cache: "no-store", redirect: "error" }), maxBytes);
    },
    decode: a.decode,
    sha256: a.sha256,
    upload: async (path, bytes) => (await supabase.storage.from(APPLIED_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" })) as { error?: { status?: number; statusCode?: string; code?: string; message?: string } },
    async downloadApplied(path, maxBytes) {
      const got = await readCapped(await a.fetch(appliedPublicUrl(a.origin, path), { cache: "no-store", redirect: "error" }), maxBytes);
      return got === "too_large" ? null : got;
    },
    commit: async (c) => await supabase.rpc("mall_builder_photo_apply_commit", { p_apply: c.apply, p_kid: c.kid, p_sha: c.sha, p_size: c.size, p_exp: c.exp, p_sig: c.sig, p_public_url: c.publicUrl }),
    nowSeconds: a.nowSeconds,
  };
}

const json = (code: ApplyCode, status = APPLY_HTTP[code]) =>
  new Response(JSON.stringify({ ok: code === "done", code, message: APPLY_TEXT[code] }), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export interface RouteDeps {
  /** 서버 설정(없으면 null) */
  config(): ApplyConfig | null;
  /** 로그인한 회원 id(없으면 null) — 기존 createClient().auth.getUser() */
  userId(): Promise<string | null>;
  /** 그 회원 세션으로 ApplyDeps 만들기 */
  deps(cfg: ApplyConfig): ApplyDeps;
}

/** 같은 출처 요청인가: Origin 머리글이 있고 그 host가 요청 host와 같으며, sec-fetch-site가 있으면 same-origin */
export function sameOrigin(h: { get(n: string): string | null }): boolean {
  const origin = h.get("origin"); const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) return false;
  let o: URL; try { o = new URL(origin); } catch { return false; }
  if (o.protocol !== "https:" && o.hostname !== "localhost" && o.hostname !== "127.0.0.1") return false;
  if (o.host.toLowerCase() !== host.toLowerCase()) return false;
  const site = h.get("sec-fetch-site");
  return site === null || site === "same-origin";
}

/** 본문 파싱: 정확히 {proposalId: uuid, force?: boolean}만. 그 밖의 칸(경로·버킷·kid·열쇠 등)이 있으면 거절 */
export function parseApplyBody(text: string): { proposalId: string; force: boolean } | null {
  if (typeof text !== "string" || text.length === 0 || text.length > APPLY_BODY_MAX) return null;
  let v: unknown; try { v = JSON.parse(text); } catch { return null; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  for (const k of Object.keys(o)) if (k !== "proposalId" && k !== "force") return null;
  if (typeof o.proposalId !== "string" || !UUID.test(o.proposalId)) return null;
  if (o.force !== undefined && typeof o.force !== "boolean") return null;
  return { proposalId: o.proposalId, force: o.force === true };
}

/** POST 처리기. 어떤 예외도 고정 문구로 끝낸다(원문 오류 미반환). 한 요청에 applyProposal 1회(재시도 0) */
export async function handleApplyPost(req: Request, d: RouteDeps): Promise<Response> {
  try {
    if (req.method !== "POST") return json("failed", 405);
    if (!sameOrigin(req.headers)) return json("forbidden");
    if (!/^application\/json\b/i.test(req.headers.get("content-type") ?? "")) return json("failed", 415);
    const declared = req.headers.get("content-length");
    if (declared !== null && (!/^[0-9]+$/.test(declared) || Number(declared) > APPLY_BODY_MAX)) return json("failed", 413);
    const raw = req.body ? await readCapped({ ok: true, body: req.body, headers: { get: () => null } }, APPLY_BODY_MAX) : null;
    if (raw === "too_large") return json("failed", 413);
    const body = raw ? parseApplyBody(new TextDecoder("utf-8", { fatal: false }).decode(raw)) : null;
    if (!body) return json("failed", 400);
    const uid = await d.userId();
    if (!uid || !UUID.test(uid)) return json("forbidden", 401);
    const cfg = d.config();
    if (!cfg) return json("config");
    const code = await applyProposal({ proposalId: body.proposalId, force: body.force, uid, kid: cfg.kid, keyB64: cfg.keyB64, origin: cfg.origin }, d.deps(cfg));
    return json(code);
  } catch {
    return json("unknown");
  }
}
