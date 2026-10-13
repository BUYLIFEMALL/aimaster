import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import * as ai from "@/lib/gemini";
import { BUCKET, cleanThumb, detectMedia, fileBase, isOwnTempPath, sizeError } from "@/lib/rpa/media";
import { mainPrompt } from "@/lib/rpa/schemas";
import { cleanOptions, cleanTitle } from "@/lib/rpa/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;
const MAX_HISTORY = 100;

/** 임시 Storage 파일을 읽어 분석하고 결과를 기록에 저장한다. 임시 파일은 다시 분석할 수 있게 1시간 남겨 둔다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const path = g.body.path;
  if (!isOwnTempPath(g.userId, path)) return json({ error: "분석할 파일이 올바르지 않습니다. 파일을 다시 올려 주세요." }, 400);
  const name = typeof g.body.name === "string" ? g.body.name.slice(0, 200) : "";
  const det = detectMedia(name || path, typeof g.body.mime === "string" ? g.body.mime : "");
  if (!det) return json({ error: "지원하지 않는 파일 형식입니다." }, 400);
  const options = cleanOptions(g.body.options, det.media);

  const admin = createAdminClient();
  const { data: blob, error: dlError } = await admin.storage.from(BUCKET).download(path);
  if (dlError || !blob) return json({ error: "업로드한 파일을 찾을 수 없습니다(보관 시간이 지났을 수 있습니다). 파일을 다시 올려 주세요.", expired: true }, 404);
  const bytes = Buffer.from(await blob.arrayBuffer());
  const tooBig = sizeError(det.media, bytes.length);
  if (tooBig) return json({ error: tooBig }, 413);

  let out: ai.AnalyzeOutput;
  try {
    out = await ai.analyze(g.apiKey, { media: det.media, mime: det.mime, bytes, options });
  } catch (e) { return fail(e); }

  const title = cleanTitle(g.body.title, cleanTitle(fileBase(name), "제목 없는 분석"));
  const { data, error } = await admin
    .from("reverse_prompt_history")
    .insert({
      user_id: g.userId, title, media_type: det.media, mime: det.mime, file_name: name,
      options, result: out.result, prompt: mainPrompt(det.media, out.result), model_used: out.modelUsed,
      thumb: cleanThumb(g.body.thumb),
    })
    .select("id, created_at")
    .single();
  if (error || !data) return json({ error: "분석은 끝났지만 기록 저장에 실패했습니다. 결과를 복사해 두고 다시 시도해 주세요.", result: out.result, media: det.media }, 500);

  // 기록은 최대 100건: 즐겨찾기가 아닌 오래된 것부터 정리
  const { data: old } = await admin
    .from("reverse_prompt_history").select("id").eq("user_id", g.userId).eq("favorite", false)
    .order("created_at", { ascending: false }).range(MAX_HISTORY, MAX_HISTORY + 200);
  if (old?.length) await admin.from("reverse_prompt_history").delete().eq("user_id", g.userId).in("id", old.map((r) => r.id as string));

  return json({ id: data.id, created_at: data.created_at, media: det.media, title, result: out.result, modelUsed: out.modelUsed, options });
}
