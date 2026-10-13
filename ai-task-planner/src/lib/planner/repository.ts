import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emptyWorkspace, workspaceSchema, type Workspace } from "./model";
import { PlannerError } from "./engine";
export type RecordSnapshot = { workspace: Workspace; revision: number; recentCommands: string[] };
export async function loadWorkspace(userId: string): Promise<RecordSnapshot> {
  const db = createAdminClient();
  const { data, error } = await db.from("task_planner_workspaces").select("payload, revision, recent_commands").eq("user_id", userId).maybeSingle();
  if (error) throw new PlannerError("회원별 기록 저장을 준비하고 있습니다. 잠시 후 다시 시도해주세요.", 503);
  if (data) return { workspace: workspaceSchema.parse(data.payload), revision: data.revision, recentCommands: data.recent_commands };
  const initial = emptyWorkspace();
  const { error: insertError } = await db.from("task_planner_workspaces").upsert({ user_id: userId, payload: initial }, { onConflict: "user_id", ignoreDuplicates: true });
  if (insertError) throw new PlannerError("회원 기록을 준비하지 못했습니다. 다시 시도해주세요.", 503);
  const { data: inserted, error: readError } = await db.from("task_planner_workspaces").select("payload, revision, recent_commands").eq("user_id", userId).single();
  if (readError) throw new PlannerError("회원 기록을 확인하지 못했습니다.", 503);
  return { workspace: workspaceSchema.parse(inserted.payload), revision: inserted.revision, recentCommands: inserted.recent_commands };
}
export async function commitWorkspace(userId: string, revision: number, commandId: string, workspace: Workspace): Promise<RecordSnapshot> {
  workspaceSchema.parse(workspace);
  const { data, error } = await createAdminClient().rpc("task_planner_commit", {
    p_user_id: userId, p_revision: revision, p_command_id: commandId, p_payload: workspace
  });
  if (error) {
    if (error.code === "40001") throw new PlannerError("다른 화면에서 기록이 변경됐습니다. 입력을 보존했습니다. 최신 기록을 불러온 뒤 다시 저장해주세요.", 409);
    throw new PlannerError("저장하지 못했습니다. 입력은 그대로 두고 다시 시도해주세요.", 503);
  }
  return { workspace: workspaceSchema.parse(data.payload), revision: data.revision, recentCommands: data.recent_commands };
}
