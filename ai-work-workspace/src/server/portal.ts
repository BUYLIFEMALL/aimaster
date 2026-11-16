// PLAN-20261117-01 E2 7-3(2026-11-17, Master msg_f0616e6ab766) — 손님 포털: 데이터베이스 행 하나의 「회원이 고른 속성」만
// 로그인 없이 읽기 전용으로 보여 주는 비밀 주소. 계획: ai-work-workspace/docs/PLAN_20261117_WORKSPACE_EXPANSION.md 7-3·7-5 B.
//  · 기능 스위치 PORTAL_ENABLED(기본 false): 꺼져 있으면 모든 진입점이 DB 접속·표 생성 전에 「없음」을 돌려준다(모듈 import만으로 DB 0).
//    켜는 것은 운영 저장소 표 추가(aww_portals)라 묶음 배포 승인 항목 — 시험은 격리 시험 DB에서만 setPortalEnabledForTests로 켠다.
//  · 만들기·바꾸기 권한은 기존 공유 규칙을 그대로 씀: 공유 변경 = 그 행 editor 이상(litpage/server/authz.ts 358) +
//    워크스페이스·팀스페이스 공개 게시 정책(policy.ts policyProblem 'publish').
//  · 손님이 열 때마다: 행 살아 있음·포털 켜짐·만료 전·만든 회원이 지금도 editor·공개 정책 허용·만든 회원 이용 기간(tokenOwnerAccess, 공개 폼·페이지와 같은 판정).
//  · 보이는 값: 허용 종류(제목·텍스트·숫자·선택·다중 선택·상태·날짜·체크박스)만. 글자 값은 사람·페이지·날짜·수식·그룹 멘션을 통째로 빼고 링크 주소도 버린 평문.
//  · 토큰 원문은 저장·기록하지 않음(SHA-256 해시만). 원문은 만들 때 응답 한 번에만 돌려준다.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db, getRecord } from "@/litpage/server/db.ts";
import { blockRole } from "@/litpage/server/records.ts";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { policyProblem } from "@/litpage/server/policy.ts";
import { hit } from "@/litpage/server/ratelimit.ts";
import { roleAtLeast } from "#shared/permissions.ts";
import { getPropertyValue, valueToText } from "#shared/database/values.ts";
import type { BlockRecord, CollectionRecord, PropertySchema, SpaceRecord } from "#shared/records.ts";
import type { RichText } from "#shared/richtext.ts";
import { tokenOwnerAllowed } from "./tokenOwnerAccess";

let PORTAL_ENABLED = false;
/** 시험 전용(격리 시험 DB). 운영에서 켜는 것은 배포 승인 뒤 위 상수를 바꾸는 배포로만. */
export function setPortalEnabledForTests(on: boolean) {
  PORTAL_ENABLED = on;
}
let ownerCheck: (userId: string) => Promise<boolean> = (userId) => tokenOwnerAllowed(userId);
/** 시험 전용: 만든 회원 이용 기간 판정 바꿔 끼우기 */
export function setPortalOwnerCheckForTests(fn: (userId: string) => Promise<boolean>) {
  ownerCheck = fn;
}

/** 손님에게 보여도 되는 속성 종류(관계·롤업·사람·작성자·수식·파일·이메일·전화·주소 등은 제외) */
export const PORTAL_ALLOWED_TYPES = new Set(["title", "text", "number", "select", "multi_select", "status", "date", "checkbox"]);
const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;
const DAY = 86_400_000;
const CLOSED_KEEP_MS = 30 * DAY; // 끈·만료된 포털 기록은 30일 뒤 삭제

let tablesReady = false;
function ensureTables() {
  if (tablesReady) return;
  db.exec(`CREATE TABLE IF NOT EXISTS aww_portals (
    row_id TEXT PRIMARY KEY, space_id TEXT NOT NULL, created_by TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
    props TEXT NOT NULL, expires_time BIGINT NOT NULL, enabled INTEGER NOT NULL, created_time BIGINT NOT NULL, updated_time BIGINT NOT NULL)`);
  tablesReady = true;
}

type PortalRow = { row_id: string; space_id: string; created_by: string; token_hash: string; props: string; expires_time: number; enabled: number; created_time: number; updated_time: number };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

function rowAndCollection(rowId: string): { row: BlockRecord; collection: CollectionRecord } | null {
  const row = getRecord<BlockRecord>("block", rowId);
  if (!row || row.alive === false || row.parent_table !== "collection") return null;
  const collection = getRecord<CollectionRecord>("collection", String(row.parent_id));
  if (!collection || collection.alive === false) return null;
  return { row, collection };
}

/** 공유를 바꿀 수 있는가: 기존 공유 변경 규칙(editor 이상) + 공개 게시 정책. 사유 문구 또는 null */
function shareProblem(row: BlockRecord, userId: string): string | null {
  if (!roleAtLeast(blockRole(row.id, userId), "editor")) return "Only people with full access can change sharing";
  const space = getRecord<SpaceRecord>("space", String(row.space_id));
  return policyProblem(space, "publish", userId, { pageId: row.id });
}

/** 회원이 고를 수 있는 속성 목록(허용 종류만) */
function allowedProps(collection: CollectionRecord): { id: string; name: string; type: string }[] {
  return Object.entries(collection.schema ?? {})
    .filter(([, p]) => p && PORTAL_ALLOWED_TYPES.has(String(p.type)))
    .map(([id, p]) => ({ id, name: String((p as PropertySchema).name ?? ""), type: String(p.type) }));
}

/** 멘션(사람·페이지·날짜·수식·그룹)은 통째로 빼고, 링크는 주소 없이 글자만 남긴 평문 */
export function portalPlainText(rt: RichText | undefined | null): string {
  if (!Array.isArray(rt)) return "";
  let out = "";
  for (const d of rt) {
    if (!Array.isArray(d)) continue;
    const anns = Array.isArray(d[1]) ? d[1] : [];
    if (anns.some((a) => Array.isArray(a) && ["u", "p", "d", "e", "g"].includes(String(a[0])))) continue;
    out += typeof d[0] === "string" ? d[0] : "";
  }
  return out.slice(0, 2000);
}

function cleanupClosed(now: number) {
  db.prepare("DELETE FROM aww_portals WHERE (enabled = 0 AND updated_time < ?) OR expires_time < ?").run(now - CLOSED_KEEP_MS, now - CLOSED_KEEP_MS);
}

function readPortal(rowId: string): PortalRow | undefined {
  return db.prepare("SELECT * FROM aww_portals WHERE row_id = ?").get(rowId) as PortalRow | undefined;
}

function info(p: PortalRow | undefined, collection: CollectionRecord, now: number) {
  const props = p ? (JSON.parse(p.props) as string[]) : ["title"];
  return {
    exists: !!p,
    enabled: !!p && p.enabled === 1 && p.expires_time > now,
    expiresTime: p?.expires_time ?? null,
    props,
    choices: allowedProps(collection),
  };
}

function cleanProps(collection: CollectionRecord, raw: unknown): string[] {
  const allowed = new Set(allowedProps(collection).map((p) => p.id));
  const list = Array.isArray(raw) ? raw.map(String).filter((id) => allowed.has(id)) : [];
  return [...new Set(list)].slice(0, 20);
}

function memberTarget(ctx: Ctx, rowId: unknown) {
  if (!PORTAL_ENABLED) throw new ApiError("Not found", 404);
  const userId = ctx.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);
  const rc = rowAndCollection(String(rowId ?? ""));
  if (!rc) throw new ApiError("Not found", 404);
  const problem = shareProblem(rc.row, userId);
  if (problem) throw new ApiError(problem, 403);
  ensureTables();
  return { userId, ...rc };
}

export const portalHandlers = {
  /** 이 행의 포털 상태(만들 수 있는 사람만) */
  portalGet(ctx: Ctx, { rowId }: { rowId?: unknown }) {
    const { collection } = memberTarget(ctx, rowId);
    return info(readPortal(String(rowId)), collection, Date.now());
  },

  /** 켜기·속성/기간 바꾸기. 처음 켤 때와 rotate일 때만 새 주소 토큰(원문)을 한 번 돌려줌 */
  portalSave(ctx: Ctx, { rowId, props, days, rotate }: { rowId?: unknown; props?: unknown; days?: unknown; rotate?: unknown }) {
    const { userId, row, collection } = memberTarget(ctx, rowId);
    const now = Date.now();
    cleanupClosed(now);
    const chosen = cleanProps(collection, props);
    if (!chosen.length) throw new ApiError("Choose at least one property to show.", 400);
    const d = Math.min(MAX_DAYS, Math.max(1, Math.floor(Number(days) || DEFAULT_DAYS)));
    const cur = readPortal(row.id);
    let token: string | null = null;
    if (!cur || rotate === true || cur.enabled !== 1) token = newToken();
    const hash = token ? hashToken(token) : cur!.token_hash;
    db.prepare(`INSERT INTO aww_portals (row_id, space_id, created_by, token_hash, props, expires_time, enabled, created_time, updated_time)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT (row_id) DO UPDATE SET created_by = excluded.created_by, token_hash = excluded.token_hash, props = excluded.props,
                  expires_time = excluded.expires_time, enabled = 1, updated_time = excluded.updated_time`)
      .run(row.id, String(row.space_id), userId, hash, JSON.stringify(chosen), now + d * DAY, now, now);
    return { ...info(readPortal(row.id), collection, now), token };
  },

  /** 끄기(주소 즉시 닫힘). 기록은 30일 뒤 삭제 */
  portalOff(ctx: Ctx, { rowId }: { rowId?: unknown }) {
    const { row, collection } = memberTarget(ctx, rowId);
    const now = Date.now();
    db.prepare("UPDATE aww_portals SET enabled = 0, updated_time = ? WHERE row_id = ?").run(now, row.id);
    return info(readPortal(row.id), collection, now);
  },
};

export interface PortalView {
  title: string;
  fields: { name: string; value: string }[];
  updatedTime: number | null;
}

/** 손님 화면용: 토큰으로 열기. 조건이 하나라도 안 맞으면 null(화면은 404). ip는 요청 한도용(저장 안 함) */
export async function portalView(token: string, ip: string, now = Date.now()): Promise<PortalView | null> {
  if (!PORTAL_ENABLED) return null;
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  if (!hit(`aww-portal:${ip || "?"}`, 30, 60_000, now)) return null;
  ensureTables();
  const p = db.prepare("SELECT * FROM aww_portals WHERE token_hash = ?").get(hashToken(token)) as PortalRow | undefined;
  if (!p || p.enabled !== 1 || p.expires_time <= now) return null;
  const rc = rowAndCollection(p.row_id);
  if (!rc || String(rc.row.space_id) !== p.space_id) return null;
  if (shareProblem(rc.row, p.created_by)) return null; // 만든 회원이 권한을 잃었거나 공개 게시가 꺼짐
  if (!(await ownerCheck(p.created_by).catch(() => false))) return null; // 만든 회원 이용 기간
  const schema = rc.collection.schema ?? {};
  const fields: PortalView["fields"] = [];
  let title = "";
  for (const id of JSON.parse(p.props) as string[]) {
    const prop = schema[id] as PropertySchema | undefined;
    if (!prop || !PORTAL_ALLOWED_TYPES.has(String(prop.type))) continue; // 지워졌거나 금지 종류로 바뀐 속성은 표시 안 함
    const raw = (rc.row.properties as Record<string, RichText> | undefined)?.[id];
    let value: string;
    if (prop.type === "title" || prop.type === "text") value = portalPlainText(raw);
    else if (prop.type === "checkbox") value = valueToText(getPropertyValue(rc.row, id, schema)) === "Yes" ? "✓" : "—";
    else value = valueToText(getPropertyValue(rc.row, id, schema), prop);
    if (prop.type === "title") title = value;
    else fields.push({ name: String(prop.name ?? ""), value });
  }
  return { title, fields, updatedTime: (rc.row as { last_edited_time?: number }).last_edited_time ?? null };
}
