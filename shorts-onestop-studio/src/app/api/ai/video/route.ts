import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { signPaths } from "@/lib/media";
import { UserError } from "@/lib/errors";
import { recordUsage } from "@/lib/usage";
import { checkVideo, submitVideo, type VideoJob } from "@/lib/videoGen";
import { findVideoModel, motionPrompt, PROVIDER_NAME } from "@/lib/videoModels";
import { isFrameUrl } from "@/lib/videoParse";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.23 AI 동영상 장면(회원 본인 키): action=submit → 작업 번호(또는 바로 완성), action=check → 진행 중/완성(회원 폴더 저장 + 서명 주소)
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const action = g.body.action === "check" ? "check" : "submit";

    if (action === "check") {
      const job = g.body.job as VideoJob | undefined;
      const model = findVideoModel(job?.model);
      if (!job || !model || model.provider !== job.provider) throw new UserError(400, "영상 작업 정보가 올바르지 않습니다. 다시 만들어 주세요.");
      const key = (await getUserApiKeys(g.userId, [model.provider]))[model.provider];
      if (!key) throw new UserError(400, `${PROVIDER_NAME[model.provider]} 키가 없어 진행 상황을 확인할 수 없습니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.`, { needKey: true });
      const r = await checkVideo({ userId: g.userId, key, job });
      if (r.state === "running") return json({ state: "running" });
      await recordUsage(g.userId, "video_made", { provider: model.provider, model: model.id, withEnd: job.withEnd });
      return json({ state: "done", path: r.path, src: (await signPaths(g.userId, [r.path]))[r.path] });
    }

    const model = findVideoModel(g.body.model);
    if (!model) throw new UserError(400, "영상 모델을 골라 주세요.");
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid").hostname;
    if (!isFrameUrl(g.body.startUrl, host)) throw new UserError(400, "먼저 이 장면에 사진 배경(AI 이미지 또는 스톡 사진)을 넣어 주세요. 그 사진이 영상의 첫 화면이 됩니다.");
    const endUrl = g.body.endUrl == null || g.body.endUrl === "" ? undefined : g.body.endUrl;
    if (endUrl !== undefined && !isFrameUrl(endUrl, host)) throw new UserError(400, "다음 장면 사진을 끝 화면으로 쓸 수 없습니다. 다음 장면에 사진 배경을 넣거나 「이어지게」를 꺼 주세요.");
    const key = (await getUserApiKeys(g.userId, [model.provider]))[model.provider];
    if (!key) throw new UserError(400, `${model.name}은(는) 본인 ${PROVIDER_NAME[model.provider]} 키가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요.`, { needKey: true });
    const prompt = motionPrompt(String(g.body.prompt ?? ""), !!endUrl && model.endFrame);
    const r = await submitVideo({ userId: g.userId, key, model, prompt, startUrl: g.body.startUrl, endUrl: model.endFrame ? endUrl : undefined });
    if ("path" in r) {
      await recordUsage(g.userId, "video_made", { provider: model.provider, model: model.id, withEnd: !!endUrl });
      return json({ state: "done", path: r.path, src: (await signPaths(g.userId, [r.path]))[r.path] });
    }
    return json({ state: "running", job: r.job });
  } catch (e) { return fail(e); }
}
