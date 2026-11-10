import "server-only";
// 원고 만들기 흐름 — 입력 검사 → 생성 중 중복 막기 → 줄 만들기(writing) → 참고 주소 읽기 → AI → 저장(ready).
// AI가 실패하면 만든 줄을 지운다(빈 원고를 남기지 않음). 회원 본인 줄만 다룬다(서버 키라 user_id 조건 필수).
import { getMemberKey } from "../memberKeys";
import { pickModel, pickLength, type DraftModelId } from "./models";
import { parseRefUrls, readReference, type Reference } from "./reference";
import { generateDraft, DraftError, type DraftInput, type Draft } from "./generate";
import { sanitizeBody, cleanSlug, cleanTags } from "./sanitize";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };

export type CreateDeps = {
  generate?: (apiKey: string, model: DraftModelId, input: DraftInput) => Promise<Draft>;
  readRef?: (url: string) => Promise<Reference>;
  now?: () => number;
};

export class InputError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "bad_request") { super(message); }
}

export function parseDraftRequest(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const topic = String(b.topic ?? "").replace(/\s+/g, " ").trim();
  if (topic.length < 2 || topic.length > 200) throw new InputError("주제를 2~200자로 넣어 주세요.");
  const keywords = String(Array.isArray(b.keywords) ? b.keywords.join(",") : b.keywords ?? "")
    .split(/[,\n]/).map((k) => k.trim()).filter(Boolean).slice(0, 8).map((k) => k.slice(0, 40));
  const platform = b.platform === "blogger" ? "blogger" : "wordpress";
  const language = b.language === "en" ? "en" : "ko";
  const memo = String(b.memo ?? "").trim().slice(0, 1000);
  return { topic, keywords, platform, language, length: pickLength(b.length), model: pickModel(b.model), memo, refUrls: parseRefUrls(b.refUrls) } as const;
}

export async function createDraft(admin: AdminDb, userId: string, body: unknown, deps: CreateDeps = {}): Promise<{ id: string; draft: Draft; references: Reference[] }> {
  const req = parseDraftRequest(body);
  const apiKey = await getMemberKey(admin, userId, "anthropic");
  if (!apiKey) throw new InputError("원고를 만들려면 본인 Anthropic(Claude) API 키를 먼저 등록해 주세요.", 400, "need_key");

  const now = (deps.now ?? Date.now)();
  const { data: busy } = await admin.from("wba_posts").select("id").eq("user_id", userId).eq("status", "writing").gte("created_at", new Date(now - 5 * 60_000).toISOString()).limit(1);
  if (Array.isArray(busy) && busy.length) throw new InputError("이미 원고를 만드는 중입니다. 끝난 뒤 다시 눌러 주세요.", 409, "busy");

  const { data: row, error: insErr } = await admin.from("wba_posts")
    .insert({ user_id: userId, platform: req.platform, topic: [req.topic, ...req.keywords].join(" · ").slice(0, 500), status: "writing" })
    .select("id").single();
  if (insErr || !row?.id) throw new InputError("원고를 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500, "server");
  const id = String(row.id);

  try {
    const read = deps.readRef ?? ((u: string) => readReference(u));
    const references = await Promise.all(req.refUrls.map((u) => read(u)));
    const gen = deps.generate ?? ((k, m, i) => generateDraft(k, m, i));
    const draft = await gen(apiKey, req.model, { topic: req.topic, keywords: req.keywords, platform: req.platform, language: req.language, length: req.length, memo: req.memo, references });
    const { error: upErr } = await admin.from("wba_posts")
      .update({ title: draft.title, excerpt: draft.excerpt, slug: draft.slug, html: draft.html, tags: draft.tags, status: "ready", updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", userId);
    if (upErr) throw new InputError("원고를 저장하지 못했습니다.", 500, "server");
    return { id, draft, references };
  } catch (e) {
    await admin.from("wba_posts").delete().eq("id", id).eq("user_id", userId).eq("status", "writing");
    throw e;
  }
}

/** 회원이 고친 원고 저장 — 발행 중·예약·발행된 글은 여기서 고치지 않는다 */
export const EDITABLE = ["ready", "draft", "failed"];

export function parseDraftEdit(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (b.title !== undefined) {
    const t = String(b.title).replace(/\s+/g, " ").trim();
    if (!t || t.length > 120) throw new InputError("제목을 1~120자로 넣어 주세요.");
    patch.title = t;
  }
  if (b.excerpt !== undefined) patch.excerpt = String(b.excerpt).replace(/\s+/g, " ").trim().slice(0, 300) || null;
  if (b.slug !== undefined) patch.slug = cleanSlug(String(b.slug)) || null;
  if (b.tags !== undefined) patch.tags = cleanTags(Array.isArray(b.tags) ? b.tags : String(b.tags).split(","));
  if (b.html !== undefined) {
    const h = sanitizeBody(String(b.html));
    if (h.length > 290_000) throw new InputError("본문이 너무 깁니다.");
    patch.html = h;
  }
  if (b.platform !== undefined) patch.platform = b.platform === "blogger" ? "blogger" : "wordpress";
  if (!Object.keys(patch).length) throw new InputError("바꿀 내용이 없습니다.");
  return patch;
}

export function draftErrorView(e: unknown): { status: number; error: string; code: string } {
  if (e instanceof InputError) return { status: e.status, error: e.message, code: e.code };
  if (e instanceof DraftError) return { status: e.code === "auth" || e.code === "billing" ? 400 : e.code === "rate_limited" ? 429 : 502, error: e.message, code: e.code };
  return { status: 500, error: "원고를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.", code: "server" };
}
