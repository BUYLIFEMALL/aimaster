import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { sanitizeProject } from "@/lib/cardnews/sanitize";
import { createClient } from "@/lib/cardnews/supabase/server";
import type { ProjectData, ProjectSummary } from "@/lib/cardnews/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_BODY = 300_000;
const MAX_PROJECTS = 100;

/** 내 프로젝트 목록(RLS + user_id 한정) */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cns_projects")
    .select("id, title, data, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_PROJECTS);
  if (error) return NextResponse.json({ error: "프로젝트 목록을 불러오지 못했습니다." }, { status: 500 });

  const projects: ProjectSummary[] = (data ?? []).map((row) => {
    const d = (row.data ?? {}) as Partial<ProjectData>;
    const pages = Array.isArray(d.pages) ? d.pages : [];
    return {
      id: row.id as string,
      title: row.title as string,
      updatedAt: row.updated_at as string,
      pageCount: pages.length,
      thumbnailUrl: pages.find((p) => p?.imageUrl)?.imageUrl ?? null,
      category: d.plan?.category ?? "",
      topic: d.plan?.topic ?? "",
    };
  });
  return NextResponse.json({ projects });
}

/** 새 프로젝트 저장 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;

  const text = await request.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "프로젝트 데이터가 너무 큽니다." }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { count } = await supabase.from("cns_projects").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_PROJECTS) {
    return NextResponse.json({ error: `프로젝트는 최대 ${MAX_PROJECTS}개까지 저장할 수 있습니다. 오래된 프로젝트를 삭제해주세요.` }, { status: 400 });
  }

  const checked = sanitizeProject(raw, { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!, userId });
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const { data, error } = await supabase
    .from("cns_projects")
    .insert({ user_id: userId, title: checked.data.title, data: checked.data })
    .select("id, updated_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "프로젝트를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ id: data.id, updatedAt: data.updated_at });
}
