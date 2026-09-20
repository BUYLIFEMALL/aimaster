import "server-only";

// blog 서브프로젝트의 utils/ai/editorImage.ts(generateEditorImage)와 동일한 패턴 —
// Gemini(나노바나나)를 직접 호출한다(docs/PLATFORM_PATTERNS.md §12: Cloudinary
// generate-image를 거치지 않고 직접 호출 + 결과만 반환).
const ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent";

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export async function generateBlogImage(params: { apiKey: string; topic: string }): Promise<GeneratedImage> {
  const { apiKey, topic } = params;

  // 인물이 등장할 수 있는 프롬프트라 루트 CLAUDE.md 불변의 핵심 원칙 3번(기본은 한국인/
  // 동아시아인 묘사)을 반영한다 — blog/utils/ai/editorImage.ts와 동일한 문구.
  const prompt = `Create a single photorealistic photo for a Korean blog post. Topic: ${topic}. If human figures appear, depict realistic Korean/East Asian individuals by default — only depict a different ethnicity when the topic explicitly names a foreign celebrity, politician, athlete, or a foreign country/setting central to the scene. One unified scene in a single frame, not a collage, not a split screen, not multiple panels. Photorealistic, documentary-quality photography, natural lighting, 16:9, no visible text, no watermark.`;

  const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
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

  return { base64: String(base64).replace(/\s+/g, ""), mimeType };
}
