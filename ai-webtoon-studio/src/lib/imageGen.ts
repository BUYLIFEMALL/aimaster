import { ArtStyle, CharacterInfo, CutScene, WebtoonProject } from "./types";
import { ART_STYLE_PROMPT_MAP } from "./gemini";

// 1. 캐릭터 시트 이미지 생성 (턴어라운드 모델 시트)
export async function generateCharacterSheetImage(
  apiKey: string,
  character: CharacterInfo,
  artStyle: ArtStyle
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[artStyle];
  const prompt = `character design sheet, model sheet turnaround, front view, side view, and facial expressions of ${character.name}, ${character.description}, on clean solid neutral studio background, concept art, character turnaround sheet, ${styleInfo.enTag}`;

  return await requestImageGeneration(apiKey, prompt, { width: 1024, height: 768 });
}

// 2. 메인 표지 이미지 생성
export async function generateCoverImage(
  apiKey: string,
  project: WebtoonProject
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[project.artStyle];
  const charDetails = project.characters.map((c) => `${c.name}: ${c.description}`).join(", ");

  const prompt = `epic main title cover illustration for Korean webtoon series titled "${project.title}", key visual featuring main characters (${charDetails}), cinematic lighting, dramatic hero shot, title artwork aesthetic, ${project.synopsis}, masterpiece, highest quality, ${styleInfo.enTag}`;

  return await requestImageGeneration(apiKey, prompt, { width: 768, height: 1024 });
}

// 3. 개별 컷 이미지 생성
export async function generateCutImage(
  apiKey: string,
  cut: CutScene,
  project: WebtoonProject
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[project.artStyle];
  const prompt = `${cut.prompt}, ${cut.cameraAngle}, ${cut.description}, ${styleInfo.enTag}, 8k comic artwork, masterpiece`;

  // 세로 스크롤 레이아웃에 최적화된 종횡비 (3:4 또는 1:1)
  return await requestImageGeneration(apiKey, prompt, { width: 768, height: 1024 });
}

// 실제 이미지 생성 API 요청 함수
async function requestImageGeneration(
  apiKey: string,
  prompt: string,
  dimensions: { width: number; height: number }
): Promise<string> {
  // 1. Gemini Imagen 3 시도 (사용자 본인 키가 있을 때)
  if (apiKey) {
    try {
      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      const res = await fetch(imagenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: dimensions.width > dimensions.height ? "4:3" : "3:4",
            outputMimeType: "image/jpeg",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
        if (base64) {
          return `data:image/jpeg;base64,${base64}`;
        }
      }
    } catch (e) {
      console.warn("Imagen 3 generation failed, falling back to high-res comic generator:", e);
    }
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
