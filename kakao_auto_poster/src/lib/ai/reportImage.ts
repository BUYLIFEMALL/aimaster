// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
import "server-only";
import { generateGeminiImage } from "./geminiImage";
import { DEFAULT_NANO_BANANA_MODEL, getNanoBananaConfig } from "./nanoBananaModels";

// docs/PLATFORM_PATTERNS.md §12 — Cloudinary의 대행 생성(generate-image) 대신 Gemini(나노바나나)를
// 직접 호출해서 이미지를 만든다. 회원 본인의 gemini API 키만 사용한다(BYOK, 폴백 없음).

/**
 * 리포트 본문에 넣을 이미지 1장을 생성한다. 결과는 base64 data URI로 반환하고, 호출부에서
 * Supabase Storage(kakao-report-images)에 업로드해 공개 URL로 바꾼다.
 */
export async function generateReportImage(prompt: string, apiKey: string): Promise<string> {
  // 인물이 등장할 수 있는 프롬프트라 루트 CLAUDE.md 불변의 핵심 원칙 3번(기본은 한국인/동아시아인
  // 묘사, 해외 유명인·정치인·연예인·운동선수이거나 해외 배경이 명시된 경우에만 예외)을 반영한다.
  const fullPrompt = `Create a single photorealistic photo for a newsletter report. Scene: ${prompt}. If human figures appear, depict realistic Korean/East Asian individuals by default — only depict a different ethnicity when the subject explicitly names a foreign celebrity, politician, athlete, or a foreign country/setting central to the scene. One unified scene in a single frame, not a collage, not a split screen, not multiple panels. Photorealistic, documentary-quality photography, natural lighting, 16:9, no visible text, no watermark.`;

  // 2026-10-17: 호출·대기·이미지 받아오기는 공용 기준 코드 gemini-image-client, 모델 이름은 gemini-image-models(기준은 ai-image-studio).
  // 키는 머리글로, 시간 제한·서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내. 프롬프트·비율·화질은 그대로.
  const { base64, mimeType } = await generateGeminiImage({
    apiKey,
    modelName: getNanoBananaConfig(DEFAULT_NANO_BANANA_MODEL).modelName,
    prompt: fullPrompt,
    temperature: 0.7,
    responseModalities: ["Image"],
  });

  return `data:${mimeType};base64,${base64}`;
}

type SupabaseLike = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Buffer,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

/**
 * 이미지 생성 + kakao-report-images 업로드를 한 번에 처리한다. 수동 버튼
 * (lib/actions/reports.ts의 generateReportImageAction)과 예약/수동 리포트 생성 시
 * 자동 삽입(lib/reportEngine.ts) 양쪽이 공유한다. gemini 키가 없거나 생성이 실패하면
 * null을 반환한다 — 호출부가 "이미지 없이 계속 진행"할지 "에러로 막을지"를 정한다.
 */
export async function generateAndUploadReportImage(
  supabase: SupabaseLike,
  userId: string,
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const dataUri = await generateReportImage(prompt, apiKey);
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUri);
  if (!match) return null;
  const [, mimeType, base64] = match;
  const ext = mimeType.split("/")[1] ?? "png";
  const path = `${userId}/ai-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("kakao-report-images")
    .upload(path, Buffer.from(base64, "base64"), { contentType: mimeType, upsert: false });
  if (error) return null;

  const { data: urlData } = supabase.storage.from("kakao-report-images").getPublicUrl(path);
  return urlData.publicUrl;
}
