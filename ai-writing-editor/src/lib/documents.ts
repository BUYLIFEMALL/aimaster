import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeImages } from "@/lib/images";
import { IMAGE_BUCKET, LIMITS, isContentType, isFormat, type ContentType, type FormatId, type Source } from "@/lib/we/types";
import { cleanLine, cleanText, cleanSources, deriveTitle, htmlToPlain, imagePathsIn } from "@/lib/we/util";

// 문서: 회원당 최대 30개(오래된 것부터 정리). 서버는 service role이므로 모든 쿼리에서 user_id로 직접 거른다.
// 본문은 content_type에 따라 마크다운(이전 문서·AI 초안) 또는 HTML(서식 확장 저장)이다. HTML은 에디터의 스키마가 다시 읽을 때 걸러진다.
const TABLE = "ai_writing_editor_documents";
const COLUMNS = "id, title, content, content_type, format, sources, created_at, updated_at";

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  content_type: ContentType;
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

function plainOf(content: string, type: ContentType): string {
  return type === "html" ? htmlToPlain(content) : content;
}

function toRow(d: Record<string, unknown>): DocumentRow {
  return {
    id: String(d.id),
    title: String(d.title ?? ""),
    content: String(d.content ?? ""),
    content_type: isContentType(d.content_type) ? d.content_type : "markdown",
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
    .select("id, title, format, content, content_type, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(LIMITS.maxDocuments + 20);
  return (data ?? []).map((d) => {
    const type: ContentType = isContentType(d.content_type) ? d.content_type : "markdown";
    return {
      id: String(d.id),
      title: String(d.title ?? ""),
      format: isFormat(d.format) ? d.format : "free",
      chars: plainOf(String(d.content ?? ""), type).replace(/\s/g, "").length,
      updated_at: String(d.updated_at),
    };
  });
}

export interface DocumentInput { title?: unknown; content?: unknown; content_type?: unknown; format?: unknown; sources?: unknown }

function cleanInput(input: DocumentInput) {
  const content_type: ContentType = isContentType(input.content_type) ? input.content_type : "markdown";
  const content = cleanText(input.content, content_type === "html" ? LIMITS.documentHtml : LIMITS.document);
  const title = cleanLine(input.title, LIMITS.title) || deriveTitle(plainOf(content, content_type));
  const format: FormatId = isFormat(input.format) ? input.format : "free";
  const sources = cleanSources(Array.isArray(input.sources) ? (input.sources as { uri?: string; title?: string }[]) : []);
  return { title, content, content_type, format, sources };
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

/** 문서를 지우고, 다른 문서에서 쓰지 않는 이미지 파일도 함께 정리한다 */
export async function deleteDocument(userId: string, id: string): Promise<boolean> {
  const admin = createAdminClient();
  const doc = await loadDocument(userId, id);
  const { error } = await admin.from(TABLE).delete().eq("id", id).eq("user_id", userId);
  if (error) return false;
  if (doc) await cleanupImages(userId, imagePathsIn(doc.content, IMAGE_BUCKET));
  return true;
}

async function cleanupImages(userId: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const admin = createAdminClient();
  const unused: string[] = [];
  for (const p of paths) {
    const { count } = await admin.from(TABLE).select("id", { count: "exact", head: true }).eq("user_id", userId).like("content", `%${p}%`);
    if (!count) unused.push(p);
  }
  await removeImages(userId, unused);
}

/** 한도를 넘으면 가장 오래 수정하지 않은 문서부터 지운다(이미지도 정리) */
async function prune(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from(TABLE)
    .select("id, content")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(LIMITS.maxDocuments, LIMITS.maxDocuments + 100);
  const rows = data ?? [];
  if (!rows.length) return;
  const paths = new Set<string>();
  for (const r of rows) for (const p of imagePathsIn(String(r.content ?? ""), IMAGE_BUCKET)) paths.add(p);
  await admin.from(TABLE).delete().eq("user_id", userId).in("id", rows.map((r) => r.id as string));
  await cleanupImages(userId, [...paths]);
}
