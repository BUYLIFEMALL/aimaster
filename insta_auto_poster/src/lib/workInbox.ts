// U7 업무 받은편지함 — 다른 AIMaster 프로그램이 결과를 회원의 「받은 업무」함으로 보내는 기준 코드.
// 사용 안내: docs/WORK_INBOX.md. 다른 프로그램은 이 파일을 사본으로 가져가 서버(API 라우트·서버 액션)에서만 부른다.
// - 반드시 로그인 회원 본인 user_id로만 보낸다(checkProgramAccessApi 등으로 확인한 뒤). 다른 회원 id로 보내지 않는다.
// - 서버 키(createAdminClient)로 넣는다 — 표에 insert 정책이 없어 브라우저에서는 넣을 수 없다.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkInboxKind = "note" | "task" | "meeting" | "document" | "table" | "link";

export interface WorkInboxItem {
  /** 로그인 회원 본인 id(auth.users.id) */
  userId: string;
  /** 보낸 프로그램 programs.slug (영문 소문자·숫자·하이픈) */
  sourceSlug: string;
  kind?: WorkInboxKind;
  /** 1~200자 */
  title: string;
  /** 본문 마크다운(최대 20만 자) */
  bodyMd?: string;
  /** 표에 행으로 넣을 단순 값(문자·숫자·참거짓·목록). 키 = 속성 이름 */
  data?: Record<string, string | number | boolean | string[]>;
  /** 원본 결과 화면 주소(선택) */
  sourceUrl?: string;
  /** 받는 프로그램 programs.slug — 기본 ai-work-workspace (U8-B: ai-task-planner 등) */
  targetSlug?: string;
}

const KINDS: WorkInboxKind[] = ["note", "task", "meeting", "document", "table", "link"];

/** 넣기 전 검사 — 문제가 있으면 한국어 오류 문구, 없으면 null */
export function validateWorkInboxItem(item: WorkInboxItem): string | null {
  if (!item.userId || !/^[0-9a-f-]{36}$/i.test(item.userId)) return "회원 정보가 올바르지 않습니다.";
  if (!/^[a-z0-9-]{2,60}$/.test(item.sourceSlug ?? "")) return "보낸 프로그램 이름(slug)이 올바르지 않습니다.";
  if (item.kind && !KINDS.includes(item.kind)) return "종류가 올바르지 않습니다.";
  const title = (item.title ?? "").trim();
  if (!title || title.length > 200) return "제목은 1~200자로 적어 주세요.";
  if ((item.bodyMd ?? "").length > 200_000) return "본문이 너무 깁니다(최대 20만 자).";
  if (item.targetSlug !== undefined && !/^[a-z0-9-]{2,60}$/.test(item.targetSlug)) return "받는 프로그램 이름(slug)이 올바르지 않습니다.";
  if (item.sourceUrl && !/^https:\/\//.test(item.sourceUrl)) return "원본 주소는 https:// 로 시작해야 합니다.";
  return null;
}

/** 회원의 받은편지함으로 보내기(기본은 워크스페이스 「받은 업무」, targetSlug로 다른 프로그램). 성공하면 받은편지함 항목 id */
export async function sendToWorkInbox(item: WorkInboxItem): Promise<{ id: string }> {
  const problem = validateWorkInboxItem(item);
  if (problem) throw new Error(problem);
  const { data, error } = await createAdminClient()
    .from("work_inbox")
    .insert({
      user_id: item.userId,
      source_slug: item.sourceSlug,
      kind: item.kind ?? "note",
      title: item.title.trim(),
      body_md: item.bodyMd ?? "",
      data: item.data ?? {},
      source_url: item.sourceUrl ?? null,
      target_slug: item.targetSlug ?? "ai-work-workspace",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("업무 워크스페이스로 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return { id: data.id as string };
}

/** U9: 받는 프로그램이 읽는 항목(회원 본인 + 자기 slug 줄만) */
export interface ReceivedWorkInboxItem {
  id: string;
  sourceSlug: string;
  kind: WorkInboxKind;
  title: string;
  bodyMd: string;
  createdAt: string;
  importedAt: string | null;
}

/** U9: 받은편지함 목록(최근 순, 가져가지 않은 것만이 기본). 반드시 로그인 회원 본인 id와 자기 프로그램 slug로 부른다 */
export async function listReceivedWorkInbox(userId: string, targetSlug: string, opts: { includeImported?: boolean; limit?: number } = {}): Promise<ReceivedWorkInboxItem[]> {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[a-z0-9-]{2,60}$/.test(targetSlug)) throw new Error("받은편지함을 읽을 수 없습니다.");
  let query = createAdminClient()
    .from("work_inbox")
    .select("id,source_slug,kind,title,body_md,created_at,imported_at")
    .eq("user_id", userId)
    .eq("target_slug", targetSlug)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 30, 1), 100));
  if (!opts.includeImported) query = query.is("imported_at", null);
  const { data, error } = await query;
  if (error) throw new Error("받은편지함을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return (data ?? []).map((r) => ({
    id: r.id as string,
    sourceSlug: r.source_slug as string,
    kind: r.kind as WorkInboxKind,
    title: r.title as string,
    bodyMd: (r.body_md as string) ?? "",
    createdAt: r.created_at as string,
    importedAt: (r.imported_at as string | null) ?? null,
  }));
}

/** U9: 가져감 표시(가져가 만든 것의 id를 ref로). 회원 본인 + 자기 slug 줄만 바뀐다 */
export async function markWorkInboxImported(userId: string, targetSlug: string, id: string, ref = ""): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[a-z0-9-]{2,60}$/.test(targetSlug) || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("받은 항목을 확인할 수 없습니다.");
  const { error } = await createAdminClient()
    .from("work_inbox")
    .update({ imported_at: new Date().toISOString(), imported_ref: ref.slice(0, 200) || null })
    .eq("user_id", userId)
    .eq("target_slug", targetSlug)
    .eq("id", id);
  if (error) throw new Error("가져감 표시를 하지 못했습니다.");
}
