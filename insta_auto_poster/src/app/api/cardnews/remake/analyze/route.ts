import { NextResponse } from "next/server";
import { authorize, parseEngine, requireOwnKey } from "@/lib/cardnews/apiGuard";
import { callLlm, LlmError } from "@/lib/cardnews/ai/llm";
import { buildRemakeAnalysisPrompt, extractArticleText, isInstagramUrl, isYoutubeUrl, parseRemakeAnalysis } from "@/lib/cardnews/ai/remakePrompts";
import { BlockedUrlError, safeFetch } from "@/lib/cardnews/safeFetch";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const MAX_IMAGES = 6;
const MAX_IMAGE_B64 = 600_000; // 브라우저에서 긴 변 1024px JPEG로 줄여 보냄. 6장 합쳐도 Vercel 요청 한도 4.5MB 안
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_HTML_BYTES = 1_500_000;
// v1.49 릴스 소리: 브라우저가 뽑은 모노 12kHz WAV 최대 90초(약 2.2MB → base64 약 2.9MB). 장면 이미지와 합쳐도 4.5MB 안이 되게 화면에서 막음
const MAX_AUDIO_B64 = 3_000_000;

async function fetchArticle(url: string): Promise<{ title: string; text: string }> {
  const { response } = await safeFetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIMaster-CardnewsStudio/1.16)", Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new BlockedUrlError(`기사를 가져오지 못했습니다(${response.status}). 본문을 직접 붙여넣어 주세요.`);
  const type = response.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) throw new BlockedUrlError("웹 문서(기사) 주소만 가져올 수 있습니다.");
  const buf = await response.arrayBuffer();
  const html = new TextDecoder("utf-8").decode(buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf);
  return extractArticleText(html);
}

export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;

    const body = (await request.json()) as Record<string, unknown>;
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 40) : "";
    const text = typeof body.text === "string" ? body.text.slice(0, 12000) : "";
    const url = typeof body.url === "string" ? body.url.trim().slice(0, 1000) : "";
    const rawImages = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
    const images = rawImages
      .map((i) => (i && typeof i === "object" ? (i as Record<string, unknown>) : {}))
      .filter((i) => typeof i.mimeType === "string" && IMAGE_TYPES.includes(i.mimeType) && typeof i.data === "string" && i.data.length > 0 && i.data.length <= MAX_IMAGE_B64 && /^[A-Za-z0-9+/=]+$/.test(i.data))
      .map((i) => ({ mimeType: i.mimeType as string, data: i.data as string }));
    if (rawImages.length !== images.length) return NextResponse.json({ error: "이미지 형식이나 크기가 올바르지 않습니다. 다시 올려 주세요." }, { status: 400 });
    const reelFrames = Math.max(0, Math.min(images.length, Math.floor(Number(body.reelFrames) || 0)));
    const rawAudio = body.audio && typeof body.audio === "object" ? (body.audio as Record<string, unknown>) : null;
    const audio = rawAudio && rawAudio.mimeType === "audio/wav" && typeof rawAudio.data === "string" && rawAudio.data.length > 0 && rawAudio.data.length <= MAX_AUDIO_B64 && /^[A-Za-z0-9+/=]+$/.test(rawAudio.data)
      ? { mimeType: "audio/wav", data: rawAudio.data }
      : undefined;
    if (rawAudio && !audio) return NextResponse.json({ error: "릴스 소리 형식이나 길이가 올바르지 않습니다. 영상을 다시 올려 주세요." }, { status: 400 });
    if (!category) return NextResponse.json({ error: "분야를 먼저 정해주세요." }, { status: 400 });
    if (!text.trim() && !url && images.length === 0) {
      return NextResponse.json({ error: "레퍼런스를 하나 이상 넣어주세요(원문 붙여넣기·주소·화면 캡처·릴스 영상)." }, { status: 400 });
    }

    const engine = parseEngine(body.engine);
    if (!engine.ok) return engine.response;
    if (audio && engine.provider !== "gemini") {
      return NextResponse.json({ error: "릴스 소리 분석은 Google Gemini에서만 됩니다. 분석 AI를 Gemini로 바꾸거나 장면만 분석해 주세요." }, { status: 400 });
    }

    let videoUrl: string | undefined;
    let article: { title: string; text: string } | undefined;
    if (url) {
      if (isInstagramUrl(url)) {
        return NextResponse.json({ error: "인스타그램 주소는 로그인이 필요해 가져올 수 없습니다. 카드 화면을 캡처해 올리거나 캡션을 붙여넣어 주세요." }, { status: 400 });
      }
      if (isYoutubeUrl(url)) {
        if (engine.provider !== "gemini") {
          return NextResponse.json({ error: "유튜브 영상 분석은 Google Gemini에서만 됩니다. 분석 AI를 Gemini로 바꿔 주세요." }, { status: 400 });
        }
        videoUrl = url;
      } else {
        try {
          article = await fetchArticle(url);
        } catch (err) {
          const msg = err instanceof BlockedUrlError ? err.message : "기사를 가져오지 못했습니다. 본문을 직접 붙여넣어 주세요.";
          return NextResponse.json({ error: msg }, { status: 400 });
        }
        if (!article.text.trim()) return NextResponse.json({ error: "기사 본문을 찾지 못했습니다. 본문을 직접 붙여넣어 주세요." }, { status: 400 });
      }
    }

    const key = await requireOwnKey(gate.auth.user.id, engine.provider, engine.label);
    if (!key.ok) return key.response;

    const prompt = buildRemakeAnalysisPrompt({ category, text, articleText: article?.text, articleTitle: article?.title, videoUrl, imageCount: images.length, reelFrames, hasAudio: !!audio });
    const raw = await callLlm({ provider: engine.provider, model: engine.model, apiKey: key.apiKey, system: prompt.system, user: prompt.user, json: true, videoUrl, images, audio });
    const analysis = parseRemakeAnalysis(raw);
    if (!analysis) return NextResponse.json({ error: "AI 분석 결과 형식이 맞지 않습니다. 다시 시도하거나 다른 모델을 선택해보세요." }, { status: 502 });
    return NextResponse.json({ analysis, articleTitle: article?.title ?? "" });
  } catch (err) {
    if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("remake analyze error:", String((err as Error)?.message ?? "").slice(0, 200));
    return NextResponse.json({ error: "떡상 분석 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
}
