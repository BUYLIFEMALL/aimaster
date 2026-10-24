export type DevRequest = {
  id: string;
  kind: "doc_edit" | "doc_comment" | "role_note";
  target_path: string | null;
  target_role: string | null;
  note: string | null;
  status: "open" | "applied" | "rejected";
  handled_by: string | null;
  commit_sha: string | null;
  reject_reason: string | null;
  handled_at: string | null;
  created_at: string;
};
