import "server-only";

// docs/PLATFORM_PATTERNS.md §12 — Cloudinary의 대행 생성(generate-image) 대신 Gemini(나노바나나)를
// 직접 호출해서 이미지를 만든다. 회원 본인의 gemini API 키만 사용한다(BYOK, 폴백 없음).
const ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent";

/**
 * 리포트 본문에 넣을 이미지 1장을 생성한다. 결과는 base64 data URI로 반환하고, 호출부에서
 * Supabase Storage(kakao-report-images)에 업로드해 공개 URL로 바꾼다.
 */
export async function generateReportImage(prompt: string, apiKey: string): Promise<string> {
  // 인물이 등장할 수 있는 프롬프트라 루트 CLAUDE.md 불변의 핵심 원칙 3번(기본은 한국인/동아시아인
  // 묘사, 해외 유명인·정치인·연예인·운동선수이거나 해외 배경이 명시된 경우에만 예외)을 반영한다.
  const fullPrompt = `Create a single photorealistic photo for a newsletter report. Scene: ${prompt}. If human figures appear, depict realistic Korean/East Asian individuals by default — only depict a different ethnicity when the subject explicitly names a foreign celebrity, politician, athlete, or a foreign country/setting central to the scene. One unified scene in a single frame, not a collage, not a split screen, not multiple panels. Photorealistic, documentary-quality photography, natural lighting, 16:9, no visible text, no watermark.`;

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ["Image"], temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`이미지 생성에 실패했습니다. (${response.status}) ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.[0];
  const base64 = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType || "image/png";

  if (!base64) throw new Error("이미지 생성 결과를 받지 못했습니다.");

  return `data:${mimeType};base64,${base64.replace(/\s+/g, "")}`;
}
