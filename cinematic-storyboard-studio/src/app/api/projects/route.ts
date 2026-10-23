import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeImage, requireAccess } from "@/lib/routeGuard";
import { normalizeReference, paths, signedUrl, uploadImage } from "@/lib/projects";
import { LIMITS } from "@/lib/storyboard/types";
import { viaSource } from "@/lib/linkMark";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** GET — 내 프로젝트 목록(최근순, 참조 이미지 썸네일 서명 URL 포함) */
export async function GET() {
  const a = await requireAccess();
  if (a.error) return a.error;
  const { data, error } = await createAdminClient()
    .from("storyboard_projects")
    .select("id, title, topic, status, lang, engine, ref_path, master_path, created_at")
    .eq("user_id", a.user.id)
    .order("created_at", { ascending: false })
    .limit(LIMITS.maxProjects);
  if (error) return NextResponse.json({ error: "프로젝트를 불러오지 못했습니다." }, { status: 500 });
  const projects = await Promise.all(
    (data ?? []).map(async (p) => ({
      id: p.id,
      title: p.title,
      topic: p.topic,
      status: p.status,
      lang: p.lang,
      engine: p.engine,
      createdAt: p.created_at,
      thumb: await signedUrl(p.master_path ?? p.ref_path),
    })),
  );
  return NextResponse.json({ projects, limit: LIMITS.maxProjects });
}

/** POST — 새 프로젝트 만들기: 참조 이미지를 정리해 저장하고 프로젝트 행을 만든다 */
export async function POST(req: NextRequest) {
  const a = await requireAccess();
  if (a.error) return a.error;
  const body = await req.json().catch(() => null);
  const raw = decodeImage(body?.image, LIMITS.maxImageBytes);
  if (!raw) return NextResponse.json({ error: "이미지를 읽지 못했습니다. JPG·PNG·WebP 이미지(6MB 이하)를 올려 주세요." }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin.from("storyboard_projects").select("id", { count: "exact", head: true }).eq("user_id", a.user.id);
  if ((count ?? 0) >= LIMITS.maxProjects) {
    return NextResponse.json({ error: `프로젝트는 ${LIMITS.maxProjects}개까지 저장할 수 있습니다. 오래된 프로젝트를 삭제해 주세요.` }, { status: 400 });
  }

  let ref: Buffer;
  try {
    ref = await normalizeReference(raw);
  } catch {
    return NextResponse.json({ error: "이미지 형식을 처리하지 못했습니다. 다른 이미지로 시도해 주세요." }, { status: 400 });
  }

  const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, LIMITS.topic) : "";
  const lang = body?.lang === "en" ? "en" : "ko";
  const engine = body?.engine === "pro" ? "pro" : "standard";
  const { data: row, error } = await admin
    .from("storyboard_projects")
    .insert({ user_id: a.user.id, title: topic.slice(0, LIMITS.title) || (lang === "ko" ? "새 스토리보드" : "New storyboard"), topic, lang, engine })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ error: "프로젝트를 만들지 못했습니다." }, { status: 500 });

  const path = paths.ref(a.user.id, row.id);
  if (!(await uploadImage(path, ref))) {
    await admin.from("storyboard_projects").delete().eq("id", row.id).eq("user_id", a.user.id);
    return NextResponse.json({ error: "이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  await admin.from("storyboard_projects").update({ ref_path: path }).eq("id", row.id).eq("user_id", a.user.id);
  // v1.13: 다른 프로그램에서 보낸 참고 이미지로 만든 프로젝트면 보낸 곳(공용 `link-mark` 이름표에 있는 것만)을 따로 저장 —
  // `source` 칸이 없는 DB(설치 키트 등)에서 실패해도 프로젝트 만들기는 그대로 성공한다
  const source = viaSource(body?.source)?.key;
  if (source) await admin.from("storyboard_projects").update({ source }).eq("id", row.id).eq("user_id", a.user.id);
  return NextResponse.json({ id: row.id });
}
