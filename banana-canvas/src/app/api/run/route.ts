import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanParams, missingInput } from "@/lib/bnc/tasks";
import { MAX_HISTORY, type OutputItem } from "@/lib/bnc/types";
import { remove, signUrls } from "@/lib/files";
import { InputError, runTask } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** 작업 1건 실행: 입력 이미지는 Storage 경로로만 받고, 결과는 Storage 저장 후 서명 URL만 돌려준다. */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const p = cleanParams(g.body.params ?? g.body);
  if (!p) return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const miss = missingInput(p);
  if (miss) return json({ error: miss }, 400);

  let result;
  try { result = await runTask(g.apiKey, g.userId, p); }
  catch (e) {
    if (e instanceof InputError) return json({ error: e.message, expired: true }, 400);
    return fail(e);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("banana_canvas_results")
    .insert({
      user_id: g.userId, kind: p.kind, title: result.title, prompt: (p.prompt ?? "").slice(0, 600),
      options: { model: p.model, aspect: p.aspect, processes: p.processes, style: p.style, upscale: p.upscale, category: p.category, age: p.age, comicStyle: p.comicStyle, comicLang: p.comicLang, repair: p.repair, colorize: p.colorize, background: p.background, sourceNotes: p.sourceNotes },
      input_paths: result.inputs, outputs: result.outputs, model_used: result.model,
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    await remove(result.outputs.map((o) => o.path));
    return json({ error: "결과를 저장하지 못했습니다. 다시 시도해 주세요." }, 500);
  }

  // 기록은 최대 MAX_HISTORY건: 즐겨찾기가 아닌 오래된 것부터 정리(파일 포함)
  const { data: old } = await admin
    .from("banana_canvas_results").select("id, outputs").eq("user_id", g.userId).eq("favorite", false)
    .order("created_at", { ascending: false }).range(MAX_HISTORY, MAX_HISTORY + 100);
  if (old?.length) {
    await admin.from("banana_canvas_results").delete().eq("user_id", g.userId).in("id", old.map((r) => r.id as string));
    await remove(old.flatMap((r) => ((r.outputs as OutputItem[]) ?? []).map((o) => o.path)));
  }

  const urls = await signUrls(result.outputs.map((o) => o.path));
  return json({
    id: data.id, kind: p.kind, title: result.title, model: result.model, warning: result.warning ?? null,
    outputs: result.outputs.map((o) => ({ ...o, url: o.path ? urls[o.path] ?? null : null })),
    texts: result.texts,
  });
}
