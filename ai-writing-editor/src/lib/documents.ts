import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITS, isFormat, type FormatId, type Source } from "@/lib/we/types";
import { cleanLine, cleanText, cleanSources, deriveTitle } from "@/lib/we/util";

// 문서: 회원당 최대 30개(오래된 것부터 정리). 서버는 service role이므로 모든 쿼리에서 user_id로 직접 거른다.
const TABLE = "ai_writing_editor_documents";
const COLUMNS = "id, title, content, format, sources, created_at, updated_at";

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  format: FormatId;
  sources: Source[];
  created_at: string;
  updated_at: string;
}
export interface DocumentSummary { id: string; title: string; format: FormatId; chars: number; updated_at: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

function toRow(d: Record<string, unknown>): DocumentRow {
  return {
    id: String(d.id),
    title: String(d.title ?? ""),
    content: String(d.content ?? ""),
    format: isFormat(d.format) ? d.format : "free",
    sources: cleanSources(Array.isArray(d.sources) ? (d.sources as { uri?: string; title?: string }[]) : []),
    created_at: String(d.created_at),
    updated_at: String(d.updated_at),
  };
}

export async function loadDocument(userId: string, id: string): Promise<DocumentRow | null> {
  const { data } = await createAdminClient().from(TABLE).select(COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
  return data ? toRow(data as Record<string, unknown>) : null;
}

export async function listDocuments(userId: string): Promise<DocumentSummary[]> {
  const { data } = await createAdminClient()
    .from(TABLE)
    .select("id, title, format, content, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(LIMITS.maxDocuments + 20);
  return (data ?? []).map((d) => ({
    id: String(d.id),
    title: String(d.title ?? ""),
    format: isFormat(d.format) ? d.format : "free",
    chars: String(d.content ?? "").replace(/\s/g, "").length,
    updated_at: String(d.updated_at),
  }));
}

export interface DocumentInput { title?: unknown; content?: unknown; format?: unknown; sources?: unknown }

function cleanInput(input: DocumentInput) {
  const content = cleanText(input.content, LIMITS.document);
  const title = cleanLine(input.title, LIMITS.title) || deriveTitle(content);
  const format: FormatId = isFormat(input.format) ? input.format : "free";
  const sources = cleanSources(Array.isArray(input.sources) ? (input.sources as { uri?: string; title?: string }[]) : []);
  return { title, content, format, sources };
}

export async function createDocument(userId: string, input: DocumentInput): Promise<DocumentRow | null> {
  const row = cleanInput(input);
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .insert({ user_id: userId, ...row })
    .select(COLUMNS)
    .single();
  if (error || !data) return null;
  await prune(userId);
  return toRow(data as Record<string, unknown>);
}

export async function updateDocument(userId: string, id: string, input: DocumentInput): Promise<DocumentRow | null> {
  const row = cleanInput(input);
  const { data } = await createAdminClient()
    .from(TABLE)
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .maybeSingle();
  return data ? toRow(data as Record<string, unknown>) : null;
}

export async function deleteDocument(userId: string, id: string): Promise<boolean> {
  const { error } = await createAdminClient().from(TABLE).delete().eq("id", id).eq("user_id", userId);
  return !error;
}

/** 한도를 넘으면 가장 오래 수정하지 않은 문서부터 지운다 */
async function prune(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from(TABLE)
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(LIMITS.maxDocuments, LIMITS.maxDocuments + 100);
  const ids = (data ?? []).map((r) => r.id as string);
  if (ids.length) await admin.from(TABLE).delete().eq("user_id", userId).in("id", ids);
}
