import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccess } from "@/lib/routeGuard";
import { signedUrl } from "@/lib/projects";
import { LIMITS } from "@/lib/playlist/types";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET — 내 프로젝트 목록(최근순, 썸네일 서명 URL 포함) */
export async function GET() {
  const a = await requireAccess();
  if (a.error) return a.error;
  const { data, error } = await createAdminClient()
    .from("playlist_projects")
    .select("id, genre, title, status, thumb_path, created_at")
    .eq("user_id", a.user.id)
    .order("created_at", { ascending: false })
    .limit(LIMITS.maxProjects);
  if (error) return NextResponse.json({ error: "프로젝트를 불러오지 못했습니다." }, { status: 500 });
  const projects = await Promise.all(
    (data ?? []).map(async (p) => ({
      id: p.id,
      genre: p.genre,
      title: p.title,
      status: p.status,
      createdAt: p.created_at,
      thumb: await signedUrl(p.thumb_path),
    })),
  );
  return NextResponse.json({ projects, limit: LIMITS.maxProjects });
}

/** POST — 새 프로젝트 만들기(장르 선택) */
export async function POST(req: NextRequest) {
  const a = await requireAccess();
  if (a.error) return a.error;
  const body = await req.json().catch(() => null);
  const genre = typeof body?.genre === "string" ? body.genre.trim().slice(0, 60) : "";
  if (!genre) return NextResponse.json({ error: "장르를 선택하거나 입력해 주세요." }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin.from("playlist_projects").select("id", { count: "exact", head: true }).eq("user_id", a.user.id);
  if ((count ?? 0) >= LIMITS.maxProjects) {
    return NextResponse.json({ error: `프로젝트는 ${LIMITS.maxProjects}개까지 저장할 수 있습니다. 오래된 프로젝트를 삭제해 주세요.` }, { status: 400 });
  }
  const { data: row, error } = await admin.from("playlist_projects").insert({ user_id: a.user.id, genre }).select("id").single();
  if (error || !row) return NextResponse.json({ error: "프로젝트를 만들지 못했습니다." }, { status: 500 });
  return NextResponse.json({ id: row.id });
}
