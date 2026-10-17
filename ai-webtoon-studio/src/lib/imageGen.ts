import { ArtStyle, CharacterInfo, CutScene, WebtoonProject } from "./types";
import { ART_STYLE_PROMPT_MAP } from "./gemini";
import { generateGeminiImage } from "./geminiImage";

// 1. 캐릭터 시트 이미지 생성 (턴어라운드 모델 시트)
export async function generateCharacterSheetImage(
  apiKey: string,
  character: CharacterInfo,
  artStyle: ArtStyle,
  onFallback?: (reason: string) => void
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[artStyle];
  const prompt = `character design sheet, model sheet turnaround, front view, side view, and facial expressions of ${character.name}, ${character.description}, on clean solid neutral studio background, concept art, character turnaround sheet, ${styleInfo.enTag}`;

  return await requestImageGeneration(apiKey, prompt, { width: 1024, height: 768 }, onFallback);
}

// 2. 메인 표지 이미지 생성
export async function generateCoverImage(
  apiKey: string,
  project: WebtoonProject,
  onFallback?: (reason: string) => void
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[project.artStyle];
  const charDetails = project.characters.map((c) => `${c.name}: ${c.description}`).join(", ");

  const prompt = `epic main title cover illustration for Korean webtoon series titled "${project.title}", key visual featuring main characters (${charDetails}), cinematic lighting, dramatic hero shot, title artwork aesthetic, ${project.synopsis}, masterpiece, highest quality, ${styleInfo.enTag}`;

  return await requestImageGeneration(apiKey, prompt, { width: 768, height: 1024 }, onFallback);
}

// 3. 개별 컷 이미지 생성
export async function generateCutImage(
  apiKey: string,
  cut: CutScene,
  project: WebtoonProject,
  onFallback?: (reason: string) => void
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[project.artStyle];
  const prompt = `${cut.prompt}, ${cut.cameraAngle}, ${cut.description}, ${styleInfo.enTag}, 8k comic artwork, masterpiece`;

  // 세로 스크롤 레이아웃에 최적화된 종횡비 (3:4 또는 1:1)
  return await requestImageGeneration(apiKey, prompt, { width: 768, height: 1024 }, onFallback);
}

// 실제 이미지 생성 API 요청 함수
async function requestImageGeneration(
  apiKey: string,
  prompt: string,
  dimensions: { width: number; height: number },
  onFallback?: (reason: string) => void
): Promise<string> {
  // 1. Gemini 이미지 모델 시도 (사용자 본인 키가 있을 때)
  // [이미지 모델 교체 2026-10-17] 종료된 Imagen 3(predict) → gemini-nano-banana-2.1(generateContent), 기준: ai-image-studio v1.11.
  // 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
  // 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio).
  // 키는 주소가 아니라 머리글로 보낸다. 브라우저 실행이라 함수 한도와 무관 → 시간 제한 120초, 유료 생성이라 재시도 없음(이중 과금 방지).
  // 실패하면(키·한도·시간 초과 등) 기존처럼 아래 무료 렌더러로 넘어간다. 모델·비율·화질·프롬프트는 그대로.
  if (apiKey) {
    try {
      const image = await generateGeminiImage({
        apiKey,
        modelName: "gemini-nano-banana-2.1",
        prompt,
        aspectRatio: dimensions.width > dimensions.height ? "4:3" : "3:4",
        imageSize: "1K",
        timeoutMs: 120_000,
        retries: 0,
      });
      return `data:${image.mimeType || "image/png"};base64,${image.base64}`;
    } catch (e) {
      const reason = e instanceof Error ? e.message : "알 수 없는 오류";
      console.warn("Gemini image generation failed, falling back to high-res comic generator:", reason);
      onFallback?.(reason); // 2026-10-18: 대체 그림을 쓰는 원인을 화면에 알린다
    }
  } else {
    onFallback?.("Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인 키를 등록하면 Gemini로 그립니다.");
  }

  // 2. Pollinations / Flux Webtoon 전용 고화질 다이렉트 렌더러
  const seed = Math.floor(Math.random() * 99999999);
  const encodedPrompt = encodeURIComponent(prompt.slice(0, 500));
  const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&seed=${seed}&nologo=true&model=flux`;

  // Base64로 즉시 다운로드하여 캔버스 CORS 오염 방지
  try {
    const fetchRes = await fetch(fallbackUrl);
    if (fetchRes.ok) {
      const blob = await fetchRes.blob();
      return await blobToBase64(blob);
    }
  } catch (err) {
    console.warn("Direct blob conversion error, using URL:", err);
  }

  return fallbackUrl;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
