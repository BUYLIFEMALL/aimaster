import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccessAndKey } from "@/lib/routeGuard";
import { downloadImage, getOwnedProject, normalizeMaster, paths, signedUrl, uploadImage } from "@/lib/projects";
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
  const path = paths.master(a.user.id, id);
  if (!(await uploadImage(path, master))) return NextResponse.json({ error: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });

  const { error } = await createAdminClient()
    .from("storyboard_projects")
    .update({ master_path: path, engine, status: "rendered", video_prompts: null, video_settings: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", a.user.id);
  if (error) return NextResponse.json({ error: "결과를 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ masterUrl: await signedUrl(path), ms: result.ms });
}
