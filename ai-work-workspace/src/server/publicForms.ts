// 공개 폼(2026-11-15 주인님 「둘 다 권장대로 진행해」, 공개 페이지 2단계).
// 로그인 없는 방문자가 「누구나(공개)」로 정한 폼을 보고 응답을 낸다. 원본 폼 규칙(공개 여부·질문 검증·익명 응답)은 그대로 쓰고 그 위에:
//  · 허용 명령 2개(getPublicForm·submitFormResponse)와 신고(awwReportPublicForm)만 — 응답 사본 메일(emailFormResponse)은 계속 닫음
//  · 개인정보 수집·이용 동의(consent: true) 없이 제출하면 거절
//  · 응답자(IP)당 1분 5번, 폼당 하루 300건(한국 날짜, DB에 셈)
//  · 관리자가 내린 폼은 닫힘(aww_public_takedowns — 키는 폼 보기 id), 폼 주인 회원의 이용 기간이 끝나면 자동으로 닫힘
//  · 응답에 파일 올리기는 원본대로 익명 응답에서 막힘
import "server-only";
import { createHash } from "node:crypto";
import type { BlockRecord, CollectionRecord, CollectionViewRecord, SpaceRecord } from "#shared/records.ts";
import { formConfigOf, questionName } from "#shared/form/index.ts";
import { newId } from "#shared/ids.ts";
import { db, getRecord, withRequestCache } from "@/litpage/server/db.ts";
import { hit } from "@/litpage/server/ratelimit.ts";
import type { RpcResult } from "./runtime";
import { tokenOwnerAllowed } from "./tokenOwnerAccess";

export const FORM_RPCS = new Set(["getPublicForm", "submitFormResponse", "awwReportPublicForm"]);
export const FORM_PER_MINUTE = 5;
export const FORM_PER_DAY = 300;
const NOT_FOUND: RpcResult = { status: 404, body: { name: "NotFound", message: "폼을 찾을 수 없거나 닫혔습니다." } };

let ready = false;
function ensureTables() {
  if (ready) return;
  db.exec("CREATE TABLE IF NOT EXISTS aww_public_takedowns (page_id TEXT PRIMARY KEY, reason TEXT, by_id TEXT, created_time BIGINT NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS aww_public_reports (id TEXT PRIMARY KEY, page_id TEXT NOT NULL, reason TEXT NOT NULL, ip_hash TEXT, created_time BIGINT NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS aww_public_form_usage (view_id TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (view_id, day))");
  ready = true;
}
const kstDay = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
const ipHash = (ip: string) => createHash("sha256").update(`aww-public:${ip}`).digest("hex").slice(0, 24);

export interface PublicFormInfo { viewId: string; blockId: string; spaceId: string; ownerId: string; title: string; spaceName: string; items: string[]; purpose: string; retention: string }

/** 「누구나(공개)」 폼이면 정보, 아니면 null(공개 아님·삭제됨) */
export function publicFormInfo(viewId: string): PublicFormInfo | null {
  const view = viewId ? getRecord<CollectionViewRecord>("collection_view", viewId) : undefined;
  if (!view || view.alive === false || view.type !== "form") return null;
  const form = formConfigOf(view.format as Record<string, unknown>);
  if (!form || (form.permission ?? "space") !== "public") return null;
  const block = getRecord<BlockRecord>("block", view.parent_id);
  if (!block || block.alive === false) return null;
  const collection = block.collection_id ? getRecord<CollectionRecord>("collection", block.collection_id) : undefined;
  const spaceId = String(block.space_id ?? "");
  const space = getRecord<SpaceRecord>("space", spaceId);
  const items = collection
    ? (form.questions ?? []).map((q) => String(questionName(q, collection.schema ?? {}) ?? "").trim()).filter(Boolean).slice(0, 30)
    : [];
  const title = String(form.title ?? "").trim() || "폼";
  return {
    viewId, blockId: block.id, spaceId, ownerId: String(form.ownerId ?? block.created_by_id ?? ""), title, spaceName: space?.name ?? "워크스페이스",
    items,
    purpose: String(form.awwConsentPurpose ?? "").trim().slice(0, 200) || `「${title}」 응답 확인과 연락`,
    retention: String(form.awwConsentRetention ?? "").trim().slice(0, 200) || "목적을 이룰 때까지(폼 운영자가 지울 때까지)",
  };
}

// 폼 주인 회원의 이용 권한(5분 기억) — 공개 페이지와 같은 판정, 시험에서는 publicPages.setPublicOwnerCheckForTests가 함께 바꿈
let ownerCheck: (userId: string) => Promise<boolean> = (userId) => tokenOwnerAllowed(userId);
const ownerCache = new Map<string, { ok: boolean; at: number }>();
export function setFormOwnerCheck(fn: (userId: string) => Promise<boolean>) {
  ownerCheck = fn;
  ownerCache.clear();
}
async function ownerAllowed(userId: string): Promise<boolean> {
  if (!userId) return false;
  const c = ownerCache.get(userId);
  if (c && Date.now() - c.at < 5 * 60_000) return c.ok;
  const ok = await ownerCheck(userId).catch(() => false);
  ownerCache.set(userId, { ok, at: Date.now() });
  return ok;
}

function takenDown(viewId: string): boolean {
  return !!db.prepare("SELECT page_id FROM aww_public_takedowns WHERE page_id = ?").get(viewId);
}

/** 방문자에게 열어도 되는 폼인가(공개 + 내리지 않음 + 주인 이용 중) */
export async function publicFormOpen(viewId: string): Promise<PublicFormInfo | null> {
  ensureTables();
  const info = withRequestCache(() => {
    const i = publicFormInfo(viewId);
    return i && !takenDown(viewId) ? i : null;
  });
  if (!info || !(await ownerAllowed(info.ownerId))) return null;
  return info;
}

/** 폼당 오늘 받은 응답 수 */
export function formUsedToday(viewId: string, now = Date.now()): number {
  ensureTables();
  return (db.prepare("SELECT count FROM aww_public_form_usage WHERE view_id = ? AND day = ?").get(viewId, kstDay(now)) as { count: number } | undefined)?.count ?? 0;
}

/** 제출 전 확인: 동의·한도. 통과하면 null(그리고 오늘 수 +1), 아니면 응답자에게 보일 이유 */
export function formSubmitGate(viewId: string, who: string, consent: unknown, now = Date.now()): string | null {
  if (consent !== true) return "개인정보 수집·이용에 동의해야 제출할 수 있습니다.";
  if (!hit(`aww-form-who:${who}`, FORM_PER_MINUTE, 60_000, now)) return `응답은 1분에 ${FORM_PER_MINUTE}번까지 보낼 수 있습니다. 잠시 후 다시 시도해 주세요.`;
  if (formUsedToday(viewId, now) >= FORM_PER_DAY) return "이 폼은 오늘 받을 수 있는 응답 수를 모두 채웠습니다. 내일 다시 시도해 주세요.";
  db.prepare("INSERT INTO aww_public_form_usage (view_id, day, count) VALUES (?, ?, 1) ON CONFLICT (view_id, day) DO UPDATE SET count = aww_public_form_usage.count + 1").run(viewId, kstDay(now));
  return null;
}

export const consentOf = (i: PublicFormInfo) => ({ collector: i.spaceName, items: i.items, purpose: i.purpose, retention: i.retention });

/** /api/public 의 폼 명령(공개 입구 handlePublicRpc가 부름). run = 로그인 없는 원본 명령 실행 */
export async function handlePublicForm(name: string, input: Record<string, unknown>, ip: string, run: (name: string, body: unknown) => Promise<RpcResult>): Promise<RpcResult> {
  if (name === "awwReportPublicForm") return reportForm(input, ip);
  const viewId = String(input.viewId ?? "");
  if (!/^[0-9a-f-]{32,36}$/i.test(viewId)) return NOT_FOUND;
  const info = await publicFormOpen(viewId);
  if (!info) return name === "getPublicForm" ? { status: 200, body: { status: "closed" } } : NOT_FOUND;
  if (name === "getPublicForm") {
    const res = await run("getPublicForm", { viewId });
    const form = (res.body as { form?: Record<string, unknown> }).form;
    if (res.status === 200 && form) {
      form.awwConsent = consentOf(info);
      // 응답 사본 메일은 닫아 둠(우리 서버가 바깥 사람에게 메일을 보내지 않음)
      if (form.submitScreen && typeof form.submitScreen === "object") (form.submitScreen as Record<string, unknown>).allowEmailResponse = false;
    }
    return res;
  }
  const why = withRequestCache(() => formSubmitGate(viewId, `ip:${ip}`, input.consent));
  if (why) return { status: 429, body: { name: "ValidationError", message: why } };
  return run("submitFormResponse", { viewId, answers: input.answers ?? {} });
}

/** 회원 로그인 입구(/api/rpc)로 남의 공개 폼에 응답할 때도 같은 동의·한도(내 워크스페이스 폼은 원래대로) */
export function memberFormGate(name: string, input: Record<string, unknown>, userId: string, mySpaceIds: Set<string>): string | null {
  if (name !== "submitFormResponse" || input.preview) return null;
  const viewId = String(input.viewId ?? "");
  const info = publicFormInfo(viewId);
  if (!info || mySpaceIds.has(info.spaceId)) return null;
  ensureTables();
  return formSubmitGate(viewId, `user:${userId}`, input.consent);
}

async function reportForm(input: Record<string, unknown>, ip: string): Promise<RpcResult> {
  const viewId = String(input.viewId ?? "");
  const reason = String(input.reason ?? "").trim().slice(0, 500);
  if (!viewId || !reason) return { status: 400, body: { name: "ValidationError", message: "신고 내용을 적어 주세요." } };
  if (!hit(`aww-public-report:${ip}`, 5, 3_600_000)) return { status: 429, body: { name: "RateLimitedError", message: "신고는 1시간에 5번까지 할 수 있습니다." } };
  ensureTables();
  if (!withRequestCache(() => !!publicFormInfo(viewId))) return NOT_FOUND;
  withRequestCache(() => {
    db.prepare("INSERT INTO aww_public_reports (id, page_id, reason, ip_hash, created_time) VALUES (?, ?, ?, ?, ?)").run(newId(), viewId, `[폼] ${reason}`, ipHash(ip), Date.now());
  });
  return { status: 200, body: { ok: true } };
}

/** 키 화면 「오늘 쓴 횟수」: 이 회원 워크스페이스의 공개 폼 중 오늘 가장 많이 받은 폼의 응답 수(폼마다 하루 FORM_PER_DAY) */
export function memberFormMaxToday(spaceIds: Set<string>, now = Date.now()): number {
  ensureTables();
  const rows = db.prepare(`SELECT id FROM records WHERE tbl = 'collection_view' AND alive = 1 AND data LIKE '%"permission":"public"%' LIMIT 2000`).all() as { id: string }[];
  let max = 0;
  for (const r of rows) {
    const f = publicFormInfo(r.id);
    if (f && spaceIds.has(f.spaceId)) max = Math.max(max, formUsedToday(f.viewId, now));
  }
  return max;
}
