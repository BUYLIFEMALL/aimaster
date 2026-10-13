import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import * as ai from "@/lib/gemini";
import { pushVersion, removeImages, saveImage, signUrls, toJpeg } from "@/lib/images";
import { loadOwned } from "@/lib/projects";
import { imagePrompt } from "@/lib/tmb/prompts";
import { cleanInputs, cleanStrategy, isOpt, isUuid } from "@/lib/tmb/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/** 옵션(A/B) 1장 생성 → JPEG 변환 → 비공개 Storage 저장 → 새 버전 기록. A/B는 각각 별도 요청으로 호출한다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const { projectId, option } = g.body;
  if (!isUuid(projectId) || !isOpt(option)) return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const inputs = cleanInputs(g.body.inputs);
  const strategy = cleanStrategy(g.body.strategy);
  if (!strategy) return json({ error: "전략이 없습니다. 먼저 전략을 생성해 주세요." }, 400);
  const proj = await loadOwned(g.userId, projectId);
  if (!proj) return json({ error: "프로젝트를 찾을 수 없습니다." }, 404);

  let out: { bytes: Buffer; model: string };
  try {
    out = await ai.makeImage(g.apiKey, [{ text: imagePrompt(strategy, option, inputs) }], inputs.style.size);
  } catch (e) { return fail(e); }

  let path: string;
  try { path = await saveImage(g.userId, projectId, option, await toJpeg(out.bytes)); }
  catch { return json({ error: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." }, 500); }

  const current = option === "a" ? proj.images_a : proj.images_b;
  const { set, removed } = pushVersion(current, { path, at: new Date().toISOString(), model: out.model });
  const col = option === "a" ? "images_a" : "images_b";
  const { error } = await createAdminClient()
    .from("thumbnail_master_projects")
    .update({ [col]: set, inputs, strategy, stage: "image", updated_at: new Date().toISOString() })
    .eq("id", projectId).eq("user_id", g.userId);
  if (error) { await removeImages([path]); return json({ error: "결과를 저장하지 못했습니다. 다시 시도해 주세요." }, 500); }
  await removeImages(removed);
  return json({ option, set, urls: await signUrls(set.versions.map((v) => v.path)) });
}
