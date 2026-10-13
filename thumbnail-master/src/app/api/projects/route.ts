import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanSet, signUrls } from "@/lib/images";
import { EMPTY_INPUTS, MAX_PROJECTS } from "@/lib/tmb/types";
import { cleanInputs, cleanName } from "@/lib/tmb/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { data, error } = await createAdminClient()
    .from("thumbnail_master_projects")
    .select("id, name, stage, images_a, images_b, updated_at")
    .eq("user_id", access.user.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return json({ error: "프로젝트 목록을 불러오지 못했습니다." }, 500);
  const covers: Record<string, string | undefined> = {};
  for (const r of data ?? []) {
    const a = cleanSet(r.images_a), b = cleanSet(r.images_b);
    covers[r.id] = a.versions[a.cur]?.path ?? b.versions[b.cur]?.path;
  }
  const urls = await signUrls(Object.values(covers).filter((p): p is string => !!p));
  const projects = (data ?? []).map((r) => ({
    id: r.id, name: r.name, stage: r.stage, updated_at: r.updated_at, cover: covers[r.id] ? urls[covers[r.id]!] ?? null : null,
  }));
  return json({ projects });
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  let body: { name?: unknown; inputs?: unknown } = {};
  try { body = await request.json(); } catch { /* 빈 본문 허용 */ }
  const admin = createAdminClient();
  const { count } = await admin.from("thumbnail_master_projects").select("id", { count: "exact", head: true }).eq("user_id", access.user.id);
  if ((count ?? 0) >= MAX_PROJECTS) {
    return json({ error: `프로젝트는 최대 ${MAX_PROJECTS}개까지 저장할 수 있습니다. 쓰지 않는 프로젝트를 삭제해 주세요.` }, 409);
  }
  const { data, error } = await admin
    .from("thumbnail_master_projects")
    .insert({ user_id: access.user.id, name: cleanName(body.name), inputs: body.inputs ? cleanInputs(body.inputs) : EMPTY_INPUTS, stage: "input" })
    .select("id, name, updated_at")
    .single();
  if (error || !data) return json({ error: "프로젝트를 만들지 못했습니다." }, 500);
  return json({ project: data }, 201);
}
