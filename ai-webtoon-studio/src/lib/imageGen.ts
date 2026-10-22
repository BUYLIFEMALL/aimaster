import { ArtStyle, CharacterInfo, CutScene, WebtoonProject } from "./types";
import { ART_STYLE_PROMPT_MAP } from "./gemini";
import { pickCutRefUrls, type CutRef } from "./cutRefs";

// 1. 캐릭터 시트 이미지 생성 (턴어라운드 모델 시트)
export async function generateCharacterSheetImage(
  character: CharacterInfo,
  artStyle: ArtStyle,
  onFallback?: (reason: string) => void
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[artStyle];
  const prompt = `character design sheet, model sheet turnaround, front view, side view, and facial expressions of ${character.name}, ${character.description}, on clean solid neutral studio background, concept art, character turnaround sheet, ${styleInfo.enTag}`;

  return await requestImageGeneration(prompt, { width: 1024, height: 768 }, onFallback);
}

// 2. 메인 표지 이미지 생성
export async function generateCoverImage(
  project: WebtoonProject,
  onFallback?: (reason: string) => void
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[project.artStyle];
  const charDetails = project.characters.map((c) => `${c.name}: ${c.description}`).join(", ");

  const prompt = `epic main title cover illustration for Korean webtoon series titled "${project.title}", key visual featuring main characters (${charDetails}), cinematic lighting, dramatic hero shot, title artwork aesthetic, ${project.synopsis}, masterpiece, highest quality, ${styleInfo.enTag}`;

  return await requestImageGeneration(prompt, { width: 768, height: 1024 }, onFallback);
}

// 3. 개별 컷 이미지 생성
export async function generateCutImage(
  cut: CutScene,
  project: WebtoonProject,
  onFallback?: (reason: string) => void
): Promise<string> {
  const styleInfo = ART_STYLE_PROMPT_MAP[project.artStyle];
  const prompt = `${cut.prompt}, ${cut.cameraAngle}, ${cut.description}, ${styleInfo.enTag}, 8k comic artwork, masterpiece`;

  // W8(v1.29): 이 컷 인물의 캐릭터 시트(없으면 참고 사진)를 줄여서 함께 보낸다 — 컷마다 같은 얼굴·옷
  const refs = await shrinkRefs(pickCutRefUrls(cut, project.characters || []));

  // 세로 스크롤 레이아웃에 최적화된 종횡비 (3:4 또는 1:1)
  return await requestImageGeneration(prompt, { width: 768, height: 1024 }, onFallback, refs);
}

/** 참고 그림을 긴 변 768px JPEG로 줄인다(요청 크기 한도 안, 4컷 만화 shrinkForUpload와 같은 방식). 실패한 그림은 건너뜀 */
async function shrinkRefs(urls: string[], maxEdge = 768): Promise<CutRef[]> {
  const out: CutRef[] = [];
  for (const url of urls) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("load"));
        el.src = url;
      });
      const s = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * s));
      c.height = Math.max(1, Math.round(img.naturalHeight * s));
      const ctx = c.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      out.push({ data: c.toDataURL("image/jpeg", 0.85).split(",")[1], mimeType: "image/jpeg" });
    } catch { /* 이 그림만 건너뜀 */ }
  }
  return out;
}

// 실제 이미지 생성 API 요청 함수
async function requestImageGeneration(
  prompt: string,
  dimensions: { width: number; height: number },
  onFallback?: (reason: string) => void,
  refs: CutRef[] = []
): Promise<string> {
  // 1. Gemini 이미지 모델 시도 (사용자 본인 키가 있을 때)
  // [이미지 모델 교체 2026-10-17] 종료된 Imagen 3(predict) → gemini-nano-banana-2.1(generateContent), 기준: ai-image-studio v1.11.
  // 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
  // 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(./geminiImage — 기준은 ai-image-studio), v1.27부터 서버 경로에서 사용.
  // v1.27: 서버(/api/ai/image)가 회원 본인 키로 Gemini를 부른다(키를 브라우저에 두지 않음). 모델·비율·화질·시간 제한·재시도 없음은 예전과 같고,
  // 키가 없거나 실패하면(한도·시간 초과 등) 기존처럼 아래 무료 렌더러로 넘어가며 원인을 화면에 알린다.
  try {
    const res = await fetch("/api/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio: dimensions.width > dimensions.height ? "4:3" : "3:4", ...(refs.length ? { refs } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data?.dataUrl === "string") return data.dataUrl;
    onFallback?.(data?.error || `HTTP ${res.status}`);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "알 수 없는 오류";
    console.warn("Gemini image generation failed, falling back to high-res comic generator:", reason);
    onFallback?.(reason);
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
