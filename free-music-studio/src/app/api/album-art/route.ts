import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { GeminiImageError, generateGeminiImage } from "@/lib/ai/geminiImage";
import { getNanoBananaConfig } from "@/lib/ai/nanoBananaModels";
import { ART_PROMPT_LIMIT, albumArtPrompt } from "@/lib/albumArt";
import { ART_PROVIDERS, replicateInput, toArtModel, toArtProvider } from "@/lib/albumArtModels";
import { ArtError, openaiImage, replicateImage } from "@/lib/ai/artProviders";
import { LIMITS } from "@/lib/songs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180;

// 앨범 그림 1장(정사각형, 2026-11-05 주인님 「앨범 그림 만들기 기능도 넣어줘」). 회원 본인 키만(고른 플랫폼), 이중 과금 방지로 재시도 없음.
// 그림은 서버에 저장하지 않는다 — 화면이 받아 회원 PC 엔진(노래 저장 폴더)에 넣는다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, LIMITS.title) : "";
  const style = typeof b.style === "string" ? b.style.trim().slice(0, LIMITS.style) : "";
  const art = typeof b.art === "string" ? b.art.trim().slice(0, ART_PROMPT_LIMIT) : "";
  if (!title && !art) return NextResponse.json({ error: "곡 제목이나 앨범 그림 설명을 적어 주세요." }, { status: 400 });

  // 플랫폼·모델은 회원이 고른다(Gemini 나노바나나 / GPT Image / Replicate FLUX 2) — 목록 밖 값은 기본값으로
  const provider = toArtProvider(b.provider);
  const model = toArtModel(provider, b.model);
  const info = ART_PROVIDERS.find((p) => p.id === provider)!;
  const apiKey = await getUserApiKey(access.user.id, provider);
  if (!apiKey) {
    return NextResponse.json({ error: `${info.keyName} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록하거나 다른 플랫폼을 골라 주세요.`, needApiKey: true }, { status: 400 });
  }

  const prompt = albumArtPrompt({ title, style, art, artStyle: b.artStyle });
  try {
    if (provider === "openai") return NextResponse.json(await openaiImage(apiKey, model, prompt));
    if (provider === "replicate") return NextResponse.json(await replicateImage(apiKey, model, prompt, replicateInput(model)));
    const config = getNanoBananaConfig(model);
    const image = await generateGeminiImage({
      apiKey,
      modelName: config.modelName,
      endpoint: config.endpoint,
      prompt,
      aspectRatio: "1:1",
      imageSize: "1K",
      temperature: config.temperature,
      timeoutMs: 120_000,
      retries: 0,
    });
    return NextResponse.json({ base64: image.base64, mimeType: image.mimeType });
  } catch (err) {
    if (err instanceof GeminiImageError) return NextResponse.json({ error: err.message }, { status: err.status >= 400 && err.status < 600 ? err.status : 502 });
    if (err instanceof ArtError) return NextResponse.json({ error: err.message }, { status: err.status });
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") return NextResponse.json({ error: `${info.label} 응답이 너무 늦습니다. 잠시 뒤 다시 시도해 주세요.` }, { status: 504 });
    return NextResponse.json({ error: "앨범 그림을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
