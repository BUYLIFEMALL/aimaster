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
