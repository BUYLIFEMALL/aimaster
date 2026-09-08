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
