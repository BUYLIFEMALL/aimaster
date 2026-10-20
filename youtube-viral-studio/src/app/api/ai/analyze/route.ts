import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { callLlm, LlmError } from "@/lib/ai/llm";
import { findEngine, isKnownModel } from "@/lib/ai/models";
import {
  AI_ANALYSIS_TYPES,
  buildPrompt,
  type AiAnalysisType,
  type ChannelPayload,
  type KeywordPayload,
  type VideoDigest,
} from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 영상 직접 분석은 시간이 걸릴 수 있다.
export const maxDuration = 300;

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

// 화면이 보낸 데이터는 길이·형식을 제한해서 프롬프트에 넣는다(프롬프트 비대화·형식 오류 방지).
function digestVideo(raw: unknown): VideoDigest {
  const v = rec(raw);
  return {
    id: str(v.id, 20),
    title: str(v.title, 200),
    publishedAt: str(v.publishedAt, 30),
    channelTitle: str(v.channelTitle, 100),
    viewCount: num(v.viewCount),
    likeCount: numOrNull(v.likeCount),
    commentCount: numOrNull(v.commentCount),
    durationSeconds: num(v.durationSeconds),
    isShort: v.isShort === true,
    popularity: num(v.popularity),
    tags: Array.isArray(v.tags) ? v.tags.slice(0, 8).map((t) => str(t, 40)) : [],
    description: str(v.description, 1500),
    channelSubscriberCount: numOrNull(v.channelSubscriberCount),
  };
}

function digestVideos(raw: unknown, max: number): VideoDigest[] {
  return Array.isArray(raw) ? raw.slice(0, max).map(digestVideo) : [];
}

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = rec(await request.json());
    const type = body.type as AiAnalysisType;
    const provider = str(body.provider, 20);
    const model = str(body.model, 80);

    if (!AI_ANALYSIS_TYPES.includes(type)) {
      return NextResponse.json({ error: "지원하지 않는 분석 종류입니다." }, { status: 400 });
    }
    const engine = findEngine(provider);
    if (!engine || !isKnownModel(provider, model)) {
      return NextResponse.json({ error: "지원하지 않는 AI 또는 모델입니다." }, { status: 400 });
    }

    // 최상위 규칙: 로그인한 회원 본인 키만 사용한다(폴백 없음).
    const apiKey = await getUserApiKey(access.user.id, provider as "gemini" | "openai" | "anthropic");
    if (!apiKey) {
      return NextResponse.json(
        { error: `${engine.label} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요.`, needApiKey: true, provider },
        { status: 400 }
      );
    }

    const payload = rec(body.payload);
    let prompt;
    if (type === "video-summary") {
      const video = digestVideo(payload.video);
      if (!/^[\w-]{11}$/.test(video.id)) {
        return NextResponse.json({ error: "영상 ID가 올바르지 않습니다." }, { status: 400 });
      }
      prompt = buildPrompt(type, video, { canWatchVideo: engine.watchesVideo });
    } else if (type === "keyword-competition") {
      const keyword = str(payload.keyword, 100);
      const videos = digestVideos(payload.videos, 30);
      if (!keyword || videos.length === 0) {
        return NextResponse.json({ error: "분석할 키워드 결과가 없습니다." }, { status: 400 });
      }
      const totals = rec(payload.totals);
      const kw: KeywordPayload = {
        keyword,
        region: str(payload.region, 20),
        order: str(payload.order, 20),
        totals: { views: num(totals.views), likes: num(totals.likes), comments: num(totals.comments) },
        channelShare: (Array.isArray(payload.channelShare) ? payload.channelShare.slice(0, 10) : []).map((c) => {
          const r = rec(c);
          return { title: str(r.title, 100), videoCount: num(r.videoCount), viewCount: num(r.viewCount) };
        }),
        videos,
      };
      prompt = buildPrompt(type, kw);
    } else {
      const c = rec(payload.channel);
      const videos = digestVideos(payload.videos, 60);
      if (!str(c.title, 100) || videos.length === 0) {
        return NextResponse.json({ error: "분석할 채널 데이터가 없습니다." }, { status: 400 });
      }
      const ch: ChannelPayload = {
        channel: {
          title: str(c.title, 100),
          handle: str(c.handle, 60),
          subscriberCount: numOrNull(c.subscriberCount),
          viewCount: num(c.viewCount),
          videoCount: num(c.videoCount),
          publishedAt: str(c.publishedAt, 30),
          averageIntervalHours: numOrNull(c.averageIntervalHours),
          sinceLastUploadHours: numOrNull(c.sinceLastUploadHours),
        },
        videos,
      };
      prompt = buildPrompt(type, ch);
    }

    const text = await callLlm({
      provider: provider as "gemini" | "openai" | "anthropic",
      model,
      apiKey,
      system: prompt.system,
      user: prompt.user,
      videoUrl: prompt.videoUrl,
    });

    return NextResponse.json({
      type,
      text,
      provider,
      providerLabel: engine.label,
      model,
      mode: prompt.mode,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof LlmError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("ai analyze error:", String((err as Error)?.message ?? "").replace(/key=[^&\s]+/g, "key=***").slice(0, 200));
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
