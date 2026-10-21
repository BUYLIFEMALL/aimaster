import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractVariables, type PromptTemplate } from "@/types/template";

// 「📁 내 템플릿」 저장소(2026-10-21 병합 C). 서비스 롤 클라이언트이므로 모든 쿼리를 user_id로 직접 거른다.
// 템플릿은 회원이 직접 만들어 다시 쓰는 보관함이라 30일 자동 삭제 대상이 아니다(AI 실행 결과는 저장하지 않음).
export const TABLE = "ai_prompt_templates";
export const MAX_TEMPLATES = 300;
export const LIMITS = { title: 120, description: 500, content: 20000, category: 40 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface TemplateInput { title: string; description: string; content: string; category: string }

/** 요청 본문의 템플릿 한 개를 저장 가능한 값으로 정리한다. 제목·본문이 없으면 null */
export function cleanTemplate(raw: unknown): TemplateInput | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const t = {
    title: clip(r.title, LIMITS.title),
    description: clip(r.description, LIMITS.description),
    content: typeof r.content === "string" ? r.content.slice(0, LIMITS.content) : "",
    category: clip(r.category, LIMITS.category) || "Personal",
  };
  return t.title && t.content.trim() ? t : null;
}

interface Row { id: string; title: string; description: string; content: string; category: string; created_at: string }
export const toTemplate = (r: Row): PromptTemplate => ({
  id: r.id,
  title: r.title,
  description: r.description,
  content: r.content,
  category: r.category,
  variables: extractVariables(r.content),
  createdAt: new Date(r.created_at).getTime(),
});

export async function listTemplates(userId: string): Promise<PromptTemplate[]> {
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .select("id, title, description, content, category, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_TEMPLATES);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toTemplate);
}

export async function countTemplates(userId: string): Promise<number> {
  const { count } = await createAdminClient().from(TABLE).select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}

/**
 * 여러 개를 한 번에 넣는다(백업 파일·옛 앱 옮기기). 같은 제목+본문은 건너뛰고, 300개 한도를 넘는 것은 넣지 않는다.
 * replace=true면 내 템플릿을 모두 지운 뒤 넣는다(백업 파일 「덮어쓰기」를 회원이 직접 고른 경우만).
 */
export async function importTemplates(userId: string, items: unknown[], replace = false): Promise<{ added: number; skipped: number }> {
  const admin = createAdminClient();
  const cleaned = items.map(cleanTemplate).filter((t): t is TemplateInput => !!t);
  if (replace) {
    const { error } = await admin.from(TABLE).delete().eq("user_id", userId);
    if (error) throw error;
  }
  const existing = replace ? [] : await listTemplates(userId);
  const seen = new Set(existing.map((t) => `${t.title}\u0000${t.content}`));
  const room = Math.max(0, MAX_TEMPLATES - existing.length);
  const now = new Date().toISOString();
  const rows: (TemplateInput & { user_id: string; created_at: string; updated_at: string })[] = [];
  for (const t of cleaned) {
    const k = `${t.title}\u0000${t.content}`;
    if (seen.has(k) || rows.length >= room) continue;
    seen.add(k);
    rows.push({ ...t, user_id: userId, created_at: now, updated_at: now });
  }
  if (rows.length) {
    const { error } = await admin.from(TABLE).insert(rows);
    if (error) throw error;
  }
  return { added: rows.length, skipped: items.length - rows.length };
}
