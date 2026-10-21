import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccessAndKey } from "@/lib/routeGuard";
import { claimProject, downloadImage, getOwnedProject, newMasterPath, normalizeMaster, removeFiles, signedUrl, uploadImage } from "@/lib/projects";
import { generateImage, imagePart } from "@/lib/gemini";
import { buildContactSheetPrompt } from "@/lib/storyboard/prompts";
import { normalizeAnalysis } from "@/lib/storyboard/validate";
import type { EngineId } from "@/lib/storyboard/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 이미지 생성(특히 Pro 2K)은 오래 걸릴 수 있어 함수 최대 시간을 늘린다
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/** POST — 분석 결과로 9컷 마스터 콘택트 시트 이미지를 만든다 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const a = await requireAccessAndKey();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p || !p.ref_path) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  const analysis = normalizeAnalysis(p.analysis);
  if (!analysis) return NextResponse.json({ error: "먼저 이미지 분석을 완료해 주세요." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const engine: EngineId = body?.engine === "pro" ? "pro" : "standard";

  // 동시 렌더 막기(v1.10, D-02-01): 유료 생성 전에 선점. 같은 프로젝트에서 이미 렌더·분석이 진행 중이면 여기서 멈춘다.
  const claimed = await claimProject(a.user.id, id, p.updated_at);
  if (!claimed) {
    return NextResponse.json({ error: "이 프로젝트에서 다른 작업이 진행 중이거나 방금 바뀌었습니다. 잠시 뒤 화면을 새로 고친 다음 다시 시도해 주세요." }, { status: 409 });
  }

  const ref = await downloadImage(p.ref_path);
  if (!ref) return NextResponse.json({ error: "저장된 이미지를 읽지 못했습니다." }, { status: 500 });

  const result = await generateImage(a.apiKey, engine, [imagePart(ref), { text: buildContactSheetPrompt(analysis) }]);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  let master: Buffer;
  try {
    master = await normalizeMaster(result.data.buffer);
  } catch {
    return NextResponse.json({ error: "생성된 이미지를 처리하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
  }
  // 새 이름으로 올리고, 선점 이후 프로젝트가 바뀌지 않았을 때만 반영한다(옛 결과가 새 선택을 덮지 않게)
  const path = newMasterPath(a.user.id, id);
  if (!(await uploadImage(path, master))) return NextResponse.json({ error: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });

  const { data: saved, error } = await createAdminClient()
    .from("storyboard_projects")
    .update({ master_path: path, engine, status: "rendered", video_prompts: null, video_settings: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", a.user.id)
    .eq("updated_at", claimed)
    .select("id")
    .maybeSingle();
  if (error) {
    await removeFiles([path]);
    return NextResponse.json({ error: "결과를 저장하지 못했습니다." }, { status: 500 });
  }
  if (!saved) {
    await removeFiles([path]);
    return NextResponse.json({ error: "생성 중에 프로젝트가 바뀌어(다시 분석 등) 이 결과는 저장하지 않았습니다. 다시 만들어 주세요." }, { status: 409 });
  }
  if (p.master_path && p.master_path !== path) await removeFiles([p.master_path]);
  return NextResponse.json({ masterUrl: await signedUrl(path), ms: result.ms });
}
