import "server-only";

// insta_auto_poster의 "nanobanana-pro" 등급(gemini-3.1-flash-image, 4K, temperature 낮게)과
// 동일한 조합을 써서 고퀄리티 정사각형 앨범 커버를 생성한다.
const MODEL_NAME = "gemini-3.1-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent`;

export interface AlbumCoverResult {
  base64: string;
  mimeType: string;
}

// lib/ai/musicPrompts.ts의 ALBUM_COVER_SYSTEM_PROMPT가 "텍스트를 넣지 말라"고 이미 지시하지만,
// 실제로 나노바나나가 이 지시를 무시하고 제목 타이포그래피를 자체적으로 그려 넣는 경우가
// 있었다(2026-08-15 확인 — 이번엔 우연히 제목이 정확했지만, 이미지 모델의 텍스트 렌더링은
// 오타/깨짐 위험이 있어 신뢰할 수 없다). GPT가 쓴 프롬프트 내용과 무관하게 항상 확실히
// 차단되도록, 실제 API 호출 직전에 강한 네거티브 지시를 서버에서 덧붙인다.
const NO_TEXT_SUFFIX =
  " Absolutely no text, no words, no letters, no titles, no typography, no captions, no watermark, no logo anywhere in the image — pure visual artwork only.";

/** 나노바나나(Gemini 이미지)로 곡 분위기에 맞는 고퀄리티 정사각형 앨범 커버를 생성한다. */
export async function generateAlbumCoverImage(prompt: string, apiKey: string): Promise<AlbumCoverResult> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다. 설정 > API 키 설정에서 본인의 Gemini API 키를 등록해주세요.");
  }

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt + NO_TEXT_SUFFIX }] }],
      generationConfig: {
        responseModalities: ["Image"],
        imageConfig: { aspectRatio: "1:1", imageSize: "4K" },
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`나노바나나 앨범 커버 생성 요청이 실패했습니다. (${response.status}) ${errorBody}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  const base64 = imagePart?.inlineData?.data?.replace(/\s+/g, "");
  const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!base64) {
    throw new Error("나노바나나가 이미지를 반환하지 않았습니다.");
  }
  return { base64, mimeType };
}
