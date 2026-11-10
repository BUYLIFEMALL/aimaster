// 영수증·세금계산서(2026-11-11) — 워크스페이스 명령(/api/rpc/rcpt*). 플랜 docs/PLAN_20261027_RECEIPT_TAX_INVOICE.md §6.
// · 저장: 워크스페이스 자체 DB(원본 litpage 방식대로 처음 쓸 때 표를 만듦 — 운영 Supabase 표 변경 없음).
// · 회원 격리: 모든 조회·수정에 user_id = 로그인 회원(ctx.userId).
// · 사진 읽기: 회원 본인 AI 키만(Claude → OpenAI → Gemini), 사진은 저장하지 않음, 재시도 없음(이중 과금 방지).
// · 보관: 사업자 정보·거래처·품목은 설정(지우기 전까지), 발행 문서·증빙 장부는 생성 데이터 → 30일 정리(보관 예외 회원 제외).
import "server-only";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { db } from "@/litpage/server/db.ts";
import { newId } from "#shared/ids.ts";
import { loadMemberAiKeys } from "./memberAiKeys";
import {
  cleanBiz, cleanEvidence, cleanLines, docTotals, evidenceCsv, monthSummary, normalizeEvidence, ocrPrompt, parseJsonLoose,
  DOC_KINDS, type DocKind, type Evidence, type TaxMode,
} from "./receiptsCore";

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;

export const RECEIPT_RETENTION_DAYS = 365; // 2026-11-11 보관 예외: 1년
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // Vercel 요청 본문 한도(4.5MB) 안
const LIMIT_ROWS = 2_000;

function uid(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError("Unauthorized", 401);
  return ctx.userId;
}

let ready = false;
export function ensureReceiptTables() {
  if (ready) return;
  db.exec(`
CREATE TABLE IF NOT EXISTS aww_rcpt_profile (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_time INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS aww_rcpt_partners (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL, updated_time INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_aww_rcpt_partners_user ON aww_rcpt_partners(user_id);
CREATE TABLE IF NOT EXISTS aww_rcpt_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL, updated_time INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_aww_rcpt_items_user ON aww_rcpt_items(user_id);
CREATE TABLE IF NOT EXISTS aww_rcpt_docs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, doc_date TEXT, data TEXT NOT NULL, created_time INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_aww_rcpt_docs_user ON aww_rcpt_docs(user_id, created_time);
CREATE TABLE IF NOT EXISTS aww_rcpt_evidence (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, doc_date TEXT, data TEXT NOT NULL, created_time INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_aww_rcpt_evidence_user ON aww_rcpt_evidence(user_id, doc_date);
`);
  ready = true;
}

const parse = <T>(s: string): T => JSON.parse(s) as T;

function listOwn<T>(table: string, userId: string): (T & { id: string })[] {
  const rows = db.prepare(`SELECT id, data FROM ${table} WHERE user_id = ? ORDER BY updated_time DESC LIMIT ${LIMIT_ROWS}`).all(userId) as { id: string; data: string }[];
  return rows.map((r) => ({ ...parse<T>(r.data), id: r.id }));
}

function evidenceOf(userId: string, month?: string): Evidence[] {
  const rows = (month && /^\d{4}-\d{2}$/.test(month)
    ? db.prepare(`SELECT id, data FROM aww_rcpt_evidence WHERE user_id = ? AND doc_date LIKE ? ORDER BY doc_date DESC, created_time DESC LIMIT ${LIMIT_ROWS}`).all(userId, `${month}%`)
    : db.prepare(`SELECT id, data FROM aww_rcpt_evidence WHERE user_id = ? ORDER BY doc_date DESC, created_time DESC LIMIT ${LIMIT_ROWS}`).all(userId)) as { id: string; data: string }[];
  return rows.map((r) => ({ ...parse<Omit<Evidence, "id">>(r.data), id: r.id }));
}

function upsertOwned(table: string, userId: string, id: string | undefined, data: unknown): string {
  const now = Date.now();
  if (id) {
    const own = db.prepare(`SELECT id FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
    if (!own) throw new ApiError("찾을 수 없습니다.", 404);
    db.prepare(`UPDATE ${table} SET data = ?, updated_time = ? WHERE id = ? AND user_id = ?`).run(JSON.stringify(data), now, id, userId);
    return id;
  }
  const nid = newId();
  db.prepare(`INSERT INTO ${table} (id, user_id, data, updated_time) VALUES (?, ?, ?, ?)`).run(nid, userId, JSON.stringify(data), now);
  return nid;
}

function deleteOwned(table: string, userId: string, id: unknown) {
  if (typeof id !== "string" || !id) throw new ApiError("찾을 수 없습니다.", 404);
  const r = db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`).run(id, userId);
  if (!r.changes) throw new ApiError("찾을 수 없습니다.", 404);
}

// ---------------------------------------------------------------- 사진 읽기(회원 본인 키)

const MODELS = { anthropic: "claude-sonnet-5-5", openai: "gpt-6.1-terra", gemini: "gemini-3.8-flash" } as const;
export const NO_AI_KEY = "사진을 읽으려면 「API키등록·플랫폼연동」에 본인 AI 키(Claude·OpenAI·Gemini 중 하나)를 등록해 주세요.";

/** 시험에서 바꿔 끼우는 호출부 */
export type VisionCaller = (p: { provider: "anthropic" | "openai" | "gemini"; key: string; model: string; mime: string; base64: string; prompt: string }) => Promise<string>;

const callVision: VisionCaller = async ({ provider, key, model, mime, base64, prompt }) => {
  const signal = AbortSignal.timeout(90_000);
  if (provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: base64 } }, { type: "text", text: prompt }] }] }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(aiError("Claude", r.status, j), 502);
    return ((j.content ?? []) as { type: string; text?: string }[]).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  }
  if (provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }] }] }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(aiError("OpenAI", r.status, j), 502);
    return j.choices?.[0]?.message?.content ?? "";
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", signal,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(aiError("Gemini", r.status, j), 502);
  return ((j.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map((p) => p.text ?? "").join("");
};

let vision: VisionCaller = callVision;
export function setVisionCaller(v: VisionCaller | undefined) {
  vision = v ?? callVision;
}

function aiError(name: string, status: number, j: any): string {
  if (status === 401 || status === 403) return `${name} 키가 맞지 않습니다. 「API키등록·플랫폼연동」에서 키를 확인해 주세요.`;
  if (status === 429) return `${name} 사용 한도나 잔액을 넘었습니다. ${name} 계정을 확인해 주세요.`;
  const msg = String(j?.error?.message ?? "").slice(0, 120);
  return `${name}가 사진을 읽지 못했습니다(${status})${msg ? `: ${msg}` : ""}. 잠시 후 다시 해 주세요.`;
}

/** dataURL → mime·base64(이미지·PDF만, 4MB 이하) */
export function decodePhoto(dataUrl: unknown): { mime: string; base64: string } {
  const m = typeof dataUrl === "string" ? dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!m) throw new ApiError("사진(JPG·PNG·WEBP) 파일만 올릴 수 있습니다.", 400);
  if (Math.floor((m[2].length * 3) / 4) > MAX_PHOTO_BYTES) throw new ApiError("사진이 너무 큽니다(4MB 이하).", 413);
  return { mime: m[1], base64: m[2] };
}

export async function readPhoto(userId: string, dataUrl: unknown, mode: "evidence" | "issue") {
  const { mime, base64 } = decodePhoto(dataUrl);
  if (mime === "application/pdf") throw new ApiError("PDF는 아직 읽지 못합니다. 사진(JPG·PNG)으로 올려 주세요.", 400);
  const keys = await loadMemberAiKeys(userId).catch(() => ({} as Awaited<ReturnType<typeof loadMemberAiKeys>>));
  const provider = keys.anthropicKey ? "anthropic" : keys.openaiKey ? "openai" : keys.geminiKey ? "gemini" : null;
  if (!provider) throw new ApiError(NO_AI_KEY, 400);
  const key = (provider === "anthropic" ? keys.anthropicKey : provider === "openai" ? keys.openaiKey : keys.geminiKey) as string;
  const text = await vision({ provider, key, model: MODELS[provider], mime, base64, prompt: ocrPrompt(mode, new Date().getFullYear()) });
  const json = parseJsonLoose(text);
  if (!json) throw new ApiError("사진에서 내용을 읽지 못했습니다. 더 밝고 반듯하게 찍어 다시 올려 주세요.", 422);
  return { provider, json };
}

// ---------------------------------------------------------------- 명령

export const receiptHandlers: Record<string, Handler> = {
  /** 처음 화면: 내 사업자 정보·거래처·품목·최근 발행 문서·이번 달 증빙 */
  async rcptState(ctx, { month } = {}) {
    const userId = uid(ctx);
    ensureReceiptTables();
    const prof = db.prepare("SELECT data FROM aww_rcpt_profile WHERE user_id = ?").get(userId) as { data: string } | undefined;
    const docs = (db.prepare(`SELECT id, kind, data, created_time FROM aww_rcpt_docs WHERE user_id = ? ORDER BY created_time DESC LIMIT 200`).all(userId) as { id: string; kind: string; data: string; created_time: number }[])
      .map((r) => ({ ...parse<Record<string, unknown>>(r.data), id: r.id, kind: r.kind, createdTime: r.created_time }));
    const m = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7);
    const evidence = evidenceOf(userId, m);
    return {
      profile: prof ? parse(prof.data) : null,
      partners: listOwn("aww_rcpt_partners", userId),
      items: listOwn("aww_rcpt_items", userId),
      docs,
      month: m,
      evidence,
      summary: monthSummary(evidence),
      retentionDays: RECEIPT_RETENTION_DAYS,
    };
  },

  rcptSaveProfile(ctx, { profile }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    const data = cleanBiz(profile);
    const now = Date.now();
    const has = db.prepare("SELECT user_id FROM aww_rcpt_profile WHERE user_id = ?").get(userId);
    if (has) db.prepare("UPDATE aww_rcpt_profile SET data = ?, updated_time = ? WHERE user_id = ?").run(JSON.stringify(data), now, userId);
    else db.prepare("INSERT INTO aww_rcpt_profile (user_id, data, updated_time) VALUES (?, ?, ?)").run(userId, JSON.stringify(data), now);
    return { profile: data };
  },

  rcptSavePartner(ctx, { partner }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    const data = cleanBiz(partner);
    if (!data.name) throw new ApiError("거래처 상호를 입력해 주세요.", 400);
    const id = upsertOwned("aww_rcpt_partners", userId, typeof partner?.id === "string" ? partner.id : undefined, data);
    return { partner: { ...data, id } };
  },

  rcptDeletePartner(ctx, { id }) {
    ensureReceiptTables();
    deleteOwned("aww_rcpt_partners", uid(ctx), id);
    return { ok: true };
  },

  rcptSaveItem(ctx, { item }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    const name = typeof item?.name === "string" ? item.name.trim().slice(0, 100) : "";
    if (!name) throw new ApiError("품목 이름을 입력해 주세요.", 400);
    const data = { name, spec: typeof item?.spec === "string" ? item.spec.trim().slice(0, 60) : "", unitPrice: Math.max(0, Math.round(Number(item?.unitPrice) || 0)) };
    const id = upsertOwned("aww_rcpt_items", userId, typeof item?.id === "string" ? item.id : undefined, data);
    return { item: { ...data, id } };
  },

  rcptDeleteItem(ctx, { id }) {
    ensureReceiptTables();
    deleteOwned("aww_rcpt_items", uid(ctx), id);
    return { ok: true };
  },

  /** 발행 문서 저장(간이영수증·거래명세서·세금계산서 작성본) — 금액은 서버가 다시 계산 */
  rcptSaveDoc(ctx, { doc }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    const kind = (Object.keys(DOC_KINDS) as DocKind[]).includes(doc?.kind) ? (doc.kind as DocKind) : null;
    if (!kind) throw new ApiError("문서 종류를 골라 주세요.", 400);
    const taxMode: TaxMode = doc?.taxMode === "included" || doc?.taxMode === "none" ? doc.taxMode : "separate";
    const lines = cleanLines(doc?.lines, taxMode);
    if (!lines.length) throw new ApiError("품목을 한 줄 이상 입력해 주세요.", 400);
    const date = typeof doc?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(doc.date) ? doc.date : new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    const data = {
      date, taxMode, lines, ...docTotals(lines),
      partner: cleanBiz(doc?.partner),
      purpose: doc?.purpose === "청구" ? "청구" : "영수",
      memo: typeof doc?.memo === "string" ? doc.memo.trim().slice(0, 300) : "",
    };
    const id = newId();
    db.prepare("INSERT INTO aww_rcpt_docs (id, user_id, kind, doc_date, data, created_time) VALUES (?, ?, ?, ?, ?, ?)").run(id, userId, kind, date, JSON.stringify(data), Date.now());
    return { doc: { ...data, id, kind } };
  },

  rcptDeleteDoc(ctx, { id }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    if (typeof id !== "string") throw new ApiError("찾을 수 없습니다.", 404);
    const r = db.prepare("DELETE FROM aww_rcpt_docs WHERE id = ? AND user_id = ?").run(id, userId);
    if (!r.changes) throw new ApiError("찾을 수 없습니다.", 404);
    return { ok: true };
  },

  /** 사진 → 읽은 값(저장하지 않음). mode: evidence(받은 증빙) | issue(발행 칸 채우기) */
  async rcptReadPhoto(ctx, { image, mode }) {
    const userId = uid(ctx);
    const m = mode === "issue" ? "issue" : "evidence";
    const { provider, json } = await readPhoto(userId, image, m);
    if (m === "evidence") return { provider, evidence: normalizeEvidence(json) };
    const p = json as { partner?: unknown; date?: unknown; lines?: unknown; memo?: unknown };
    return { provider, issue: { partner: cleanBiz(p.partner), date: typeof p.date === "string" ? p.date : "", lines: cleanLines(p.lines, "separate"), memo: typeof p.memo === "string" ? p.memo.slice(0, 300) : "" } };
  },

  /** 증빙 장부에 저장(회원이 확인·수정한 값). id가 있으면 고침 */
  rcptSaveEvidence(ctx, { evidence }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    const data = cleanEvidence(evidence);
    if (!data.date) throw new ApiError("날짜를 입력해 주세요.", 400);
    const id = typeof evidence?.id === "string" ? evidence.id : null;
    if (id) {
      const r = db.prepare("UPDATE aww_rcpt_evidence SET data = ?, doc_date = ? WHERE id = ? AND user_id = ?").run(JSON.stringify(data), data.date, id, userId);
      if (!r.changes) throw new ApiError("찾을 수 없습니다.", 404);
      return { evidence: { ...data, id } };
    }
    const nid = newId();
    db.prepare("INSERT INTO aww_rcpt_evidence (id, user_id, doc_date, data, created_time) VALUES (?, ?, ?, ?, ?)").run(nid, userId, data.date, JSON.stringify(data), Date.now());
    return { evidence: { ...data, id: nid } };
  },

  rcptDeleteEvidence(ctx, { id }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    if (typeof id !== "string") throw new ApiError("찾을 수 없습니다.", 404);
    const r = db.prepare("DELETE FROM aww_rcpt_evidence WHERE id = ? AND user_id = ?").run(id, userId);
    if (!r.changes) throw new ApiError("찾을 수 없습니다.", 404);
    return { ok: true };
  },

  /** 증빙 장부 CSV(엑셀) — month 비우면 전체 */
  rcptEvidenceCsv(ctx, { month }) {
    const userId = uid(ctx);
    ensureReceiptTables();
    const rows = evidenceOf(userId, typeof month === "string" ? month : undefined);
    return { filename: `증빙장부_${typeof month === "string" && month ? month : "전체"}.csv`, csv: evidenceCsv(rows) };
  },
};

/** 30일 정리(발행 문서·증빙 장부). exempt = 보관 예외 회원 id */
export function runReceiptRetention(now = Date.now(), exempt: ReadonlySet<string> = new Set()): { docs: number; evidence: number } {
  ensureReceiptTables();
  const cutoff = now - RECEIPT_RETENTION_DAYS * 86_400_000;
  const skip = [...exempt];
  const not = skip.length ? ` AND user_id NOT IN (${skip.map(() => "?").join(", ")})` : "";
  const docs = db.prepare(`DELETE FROM aww_rcpt_docs WHERE created_time < ?${not}`).run(cutoff, ...skip).changes;
  const evidence = db.prepare(`DELETE FROM aww_rcpt_evidence WHERE created_time < ?${not}`).run(cutoff, ...skip).changes;
  return { docs, evidence };
}
