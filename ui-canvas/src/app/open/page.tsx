import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPTY_DOC } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 프로그램 진입점: 가장 최근 프로젝트의 캔버스를 바로 열고, 하나도 없으면 새 프로젝트를 만들어 연다. */
export default async function OpenPage() {
  const user = await requireProgramAccess();
  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("ui_canvas_projects")
    .select("id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest) redirect(`/editor/${latest.id}`);
  const { data: created } = await admin
    .from("ui_canvas_projects")
    .insert({ user_id: user.id, name: "제목 없는 디자인", doc: EMPTY_DOC, component_count: 0 })
    .select("id")
    .single();
  if (!created) redirect("/dashboard");
  redirect(`/editor/${created.id}`);
}
