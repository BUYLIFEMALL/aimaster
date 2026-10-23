import { type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/bnc/paths";
import { RECUT_LOCK_MS, recutPlan, replaceOutput } from "@/lib/bnc/recut";
import type { OutputItem } from "@/lib/bnc/types";
import { remove, signUrls } from "@/lib/files";
import { recutImage } from "@/lib/runner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * 「이 컷만 다시」(v1.18): 본인 연속 스토리·이미지 레시피 기록의 한 장만 다시 만든다(회원 본인 키, 이미지 1장).
 * 같은 기록에 동시에 들어온 요청은 busy_until 선점으로 유료 생성 전에 막는다(이중 과금 방지).
 */
export async function POST(request: NextRequest) {
  const g = await guardAi(request);
  if ("status" in g) return g;
  const id = g.body.id;
  if (!isUuid(id)) return json({ error: "기록을 찾을 수 없습니다." }, 404);

  const admin = createAdminClient();
  const release = () => admin.from("banana_canvas_results").update({ busy_until: null }).eq("id", id).eq("user_id", g.userId);
  const now = new Date();
  const { data: claimed } = await admin
    .from("banana_canvas_results").update({ busy_until: new Date(now.getTime() + RECUT_LOCK_MS).toISOString() })
    .eq("id", id).eq("user_id", g.userId).or(`busy_until.is.null,busy_until.lt.${now.toISOString()}`)
    .select("kind, prompt, options, outputs, input_paths").maybeSingle();
  if (!claimed) {
    const { data: exists } = await admin.from("banana_canvas_results").select("id").eq("id", id).eq("user_id", g.userId).maybeSingle();
    return exists
      ? json({ error: "이 기록의 다른 컷을 만드는 중입니다. 끝난 뒤 다시 눌러 주세요." }, 409)
      : json({ error: "기록을 찾을 수 없습니다." }, 404);
  }
  // 선점한 뒤에 읽은 목록이라 앞서 끝난 다른 컷의 결과도 들어 있다
  const row = claimed;
  const plan = recutPlan(row, g.body.index);
  if (typeof plan === "string") { await release(); return json({ error: plan }, 400); }

  let made;
  try { made = await recutImage(g.apiKey, g.userId, plan); }
  catch (e) {
    await release();
    return fail(e);
  }

  // 생성하는 동안 다른 요청은 막혀 있으므로 선점 때 읽은 목록에서 이 칸만 바꾼다
  const outputs = (row.outputs as OutputItem[]) ?? [];
  const old = outputs[plan.index]?.path;
  const { data: saved } = await admin
    .from("banana_canvas_results").update({ outputs: replaceOutput(outputs, plan.index, made.item), busy_until: null })
    .eq("id", id).eq("user_id", g.userId).select("id").maybeSingle();
  if (!saved) {
    await remove([made.item.path]);
    return json({ error: "기록이 삭제되어 저장하지 못했습니다." }, 404);
  }
  if (old && old !== made.item.path) await remove([old]);

  const urls = await signUrls([made.item.path]);
  return json({ index: plan.index, model: made.model, output: { ...made.item, url: urls[made.item.path] ?? null } });
}
