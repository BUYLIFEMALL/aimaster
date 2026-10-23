import { NextResponse } from "next/server";
import { z } from "zod";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicCandidate } from "@/lib/collectedMaterials";

export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {"Cache-Control": "no-store"}});
async function list(admin: any, owner: string) {
  const {data, error} = await admin.from("nba_collected_materials").select("*").eq("user_id", owner).gt("expires_at", new Date().toISOString()).order("created_at", {ascending: false}).limit(500);
  if (error) throw new Error("글감 목록을 불러오지 못했습니다.");
  return (data || []).map(publicCandidate);
}
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return reply({error: access.error}, access.status);
  try { return reply({candidates: await list(createAdminClient(), access.userId)}); }
  catch { return reply({error: "서버 글감 목록을 불러오지 못했습니다. 다시 열어 주세요."}, 503); }
}
const changeSchema = z.object({
  id: z.string().uuid(), revision: z.string().datetime({offset: true}), delete: z.boolean().optional(),
  fields: z.object({title: z.string().trim().min(1).max(300), content: z.string().max(6000), category: z.string().max(100), status: z.enum(["ready", "used"]), is_archived: z.boolean()}).strict().optional(),
}).strict().refine(change => change.delete === true ? !change.fields : Boolean(change.fields));
export async function PATCH(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return reply({error: access.error}, access.status);
  let parsed;
  try { parsed = z.object({changes: z.array(changeSchema).min(1).max(500)}).strict().safeParse(await request.json()); }
  catch { return reply({error: "수정 요청 형식을 확인해 주세요."}, 400); }
  if (!parsed.success) return reply({error: "제목·요약 또는 글감 저장 버전을 확인해 주세요."}, 400);
  const admin = createAdminClient() as any;
  const {error} = await admin.rpc("nba_edit_collected_materials", {p_owner: access.userId, p_changes: parsed.data.changes});
  if (error?.code === "P0001") return reply({error: "글감이 다른 탭에서 변경됐거나 만료됐습니다. 목록을 다시 열어 비교해 주세요. 이번 수정은 저장하지 않았습니다."}, 409);
  if (error) return reply({error: "글감 저장 결과를 확인하지 못했습니다. 같은 수정 전에 목록을 다시 열어 결과를 확인해 주세요."}, 503);
  try { return reply({success: true, candidates: await list(admin, access.userId)}); }
  catch { return reply({error: "수정 후 목록을 확인하지 못했습니다. 다시 열어 결과를 확인해 주세요."}, 503); }
}
