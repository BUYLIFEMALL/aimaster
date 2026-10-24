export type DevRequest = {
  id: string;
  kind: "doc_edit" | "doc_comment" | "role_note" | "work_result" | "owner_action";
  target_path: string | null;
  target_role: string | null;
  note: string | null;
  status: "open" | "applied" | "rejected";
  handled_by: string | null;
  commit_sha: string | null;
  reject_reason: string | null;
  handled_at: string | null;
  created_at: string;
  // 2026-10-24 마이그레이션 0044 — 에이전트 → 주인님 방향(작업 결과·주인님이 해 줄 일). 0044 적용 전에는 비어 있다.
  category?: string | null;
  title?: string | null;
  from_session?: string | null;
  parent_id?: string | null;
  link?: string | null;
  cost?: string | null;
};

/** 「주인님이 해 줄 일」 분류 — DB 제약(0044)·CLI(scripts/dev-requests.mjs)와 같은 값 */
export const OWNER_ACTION_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "approval", label: "승인·결정", icon: "✅" },
  { id: "cost", label: "비용 승인", icon: "💰" },
  { id: "account", label: "로그인·계정", icon: "🔑" },
  { id: "db", label: "DB SQL 실행", icon: "🗄" },
  { id: "install", label: "PC 설치·확장", icon: "💻" },
  { id: "check", label: "화면 확인·검수", icon: "👀" },
  { id: "external", label: "외부 서비스 설정", icon: "🌐" },
  { id: "etc", label: "기타", icon: "📌" },
];
