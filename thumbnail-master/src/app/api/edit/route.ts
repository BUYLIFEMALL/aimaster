import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import * as ai from "@/lib/gemini";
import { pushVersion, readImage, removeImages, saveImage, signUrls, toJpeg } from "@/lib/images";
import { loadOwned } from "@/lib/projects";
import { editPrompt } from "@/lib/tmb/prompts";
import { isOpt, isOwnImagePath, isUuid } from "@/lib/tmb/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

/** 현재 버전 이미지를 지시문대로 고쳐 새 버전으로 추가한다(원본 유지). 서버가 Storage에서 원본을 읽는다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const { projectId, option } = g.body;
  const instruction = typeof g.body.instruction === "string" ? g.body.instruction.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  if (!isUuid(projectId) || !isOpt(option)) return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  if (!instruction) return json({ error: "수정할 내용을 입력해 주세요." }, 400);
  const proj = await loadOwned(g.userId, projectId);
  if (!proj) return json({ error: "프로젝트를 찾을 수 없습니다." }, 404);

  const current = option === "a" ? proj.images_a : proj.images_b;
  const base = current.versions[current.cur];
  if (!base || !isOwnImagePath(g.userId, projectId, base.path)) return json({ error: "수정할 이미지가 없습니다. 먼저 썸네일을 생성해 주세요." }, 400);
  const original = await readImage(base.path);
  if (!original) return json({ error: "원본 이미지를 찾을 수 없습니다. 다시 생성해 주세요." }, 404);

  let out: { bytes: Buffer; model: string };
  try {
    out = await ai.makeImage(g.apiKey, [{ image: { mime: "image/jpeg", data: original } }, { text: editPrompt(instruction, proj.inputs.style.ratio) }], proj.inputs.style.size, proj.inputs.style.ratio);
  } catch (e) { return fail(e); }

  let path: string;
  try { path = await saveImage(g.userId, projectId, option, await toJpeg(out.bytes)); }
  catch { return json({ error: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." }, 500); }

  const { set, removed } = pushVersion(current, { path, at: new Date().toISOString(), model: out.model, instruction });
  const col = option === "a" ? "images_a" : "images_b";
  const { error } = await createAdminClient()
    .from("thumbnail_master_projects")
    .update({ [col]: set, updated_at: new Date().toISOString() })
    .eq("id", projectId).eq("user_id", g.userId);
  if (error) { await removeImages([path]); return json({ error: "결과를 저장하지 못했습니다. 다시 시도해 주세요." }, 500); }
  await removeImages(removed);
  return json({ option, set, urls: await signUrls(set.versions.map((v) => v.path)) });
}
