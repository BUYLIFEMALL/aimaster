import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/bnc/paths";
import { MAX_PRESETS, cleanPresetName, cleanPresetSettings, isPresetKind } from "@/lib/bnc/presets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 「내 작업 레시피」(v1.18): 회원 본인 레시피만 읽고·저장하고·이름 바꾸고(v1.19)·지운다(banana_canvas_presets, 회원당 최대 20개)

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { data, error } = await createAdminClient()
    .from("banana_canvas_presets").select("id, kind, name, settings")
    .eq("user_id", access.user.id).order("created_at", { ascending: false }).limit(MAX_PRESETS);
  if (error) return json({ error: "레시피를 불러오지 못했습니다." }, 500);
  return json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!isPresetKind(body.kind)) return json({ error: "레시피로 저장할 수 없는 작업입니다." }, 400);
  const name = cleanPresetName(body.name);
  if (!name) return json({ error: "레시피 이름을 입력해 주세요(30자 이내)." }, 400);
  const settings = cleanPresetSettings(body.kind, body.settings);
  if (!settings) return json({ error: "저장할 설정이 없습니다. 처리 방식·스타일·추가 요청 중 하나 이상을 골라 주세요." }, 400);

  const admin = createAdminClient();
  const { count } = await admin.from("banana_canvas_presets").select("id", { count: "exact", head: true }).eq("user_id", access.user.id);
  if ((count ?? 0) >= MAX_PRESETS) return json({ error: `레시피는 ${MAX_PRESETS}개까지 저장할 수 있습니다. 안 쓰는 레시피를 지운 뒤 저장해 주세요.` }, 400);
  const { data, error } = await admin
    .from("banana_canvas_presets").insert({ user_id: access.user.id, kind: body.kind, name, settings })
    .select("id, kind, name, settings").single();
  if (error || !data) return json({ error: "레시피를 저장하지 못했습니다." }, 500);
  return json({ item: data });
}

// v1.19: 레시피 이름 바꾸기(본인 레시피만)
export async function PATCH(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!isUuid(body.id)) return json({ error: "레시피를 찾을 수 없습니다." }, 404);
  const name = cleanPresetName(body.name);
  if (!name) return json({ error: "레시피 이름을 입력해 주세요(30자 이내)." }, 400);
  const { data, error } = await createAdminClient()
    .from("banana_canvas_presets").update({ name }).eq("id", body.id).eq("user_id", access.user.id)
    .select("id, kind, name, settings").maybeSingle();
  if (error) return json({ error: "이름을 바꾸지 못했습니다." }, 500);
  if (!data) return json({ error: "레시피를 찾을 수 없습니다." }, 404);
  return json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return json({ error: "레시피를 찾을 수 없습니다." }, 404);
  const { error } = await createAdminClient().from("banana_canvas_presets").delete().eq("id", id).eq("user_id", access.user.id);
  if (error) return json({ error: "삭제하지 못했습니다." }, 500);
  return json({ ok: true });
}
