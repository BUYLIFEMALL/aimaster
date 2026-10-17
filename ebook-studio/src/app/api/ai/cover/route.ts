import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateGeminiImage } from "@/lib/geminiImage";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    const body = await req.json();
    const { title, subtitle, author, genre = "business", apiKey: clientKey } = body;

    if (!title) {
      return NextResponse.json({ error: "표지를 생성할 책 제목이 필요합니다." }, { status: 400 });
    }

    // 최상위 불변 규칙: 회원 본인의 API 키 조회
    let finalApiKey = clientKey?.trim();
    if (!finalApiKey && user) {
      const adminSupabase = createAdminClient();
      const { data } = await adminSupabase
        .from("user_api_keys")
        .select("api_key")
        .eq("user_id", user.id)
        .eq("provider", "gemini")
        .maybeSingle();
      if (data?.api_key) {
        finalApiKey = data.api_key;
      }
    }

    if (!finalApiKey) {
      return NextResponse.json(
        { error: "Google Gemini API 키가 필요합니다. 설정에서 회원님의 API 키를 등록해주세요." },
        { status: 400 }
      );
    }

    // 표지 이미지 프롬프트 생성 (3:4 비율 전자책 표지)
    const prompt = `A professional, aesthetic, high-quality modern book cover illustration for a digital book titled "${title}".
Theme: ${genre}, contemporary typography and minimal graphic design, elegant aesthetic, 3:4 aspect ratio, publishing quality, clean composition, artistic, no distorted text.`;

    // [이미지 모델 교체 2026-10-17] 종료된 Imagen 3(predict) → gemini-nano-banana-2.1(generateContent), 기준: ai-image-studio v1.11.
    // 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
    // 2026-10-18: 호출·대기·이미지 받기는 공용 기준 코드 gemini-image-client(@/lib/geminiImage — 기준은 ai-image-studio).
    // 키는 주소가 아니라 머리글로 보낸다. 시간 제한 120초, 유료 생성이라 재시도 없음(이중 과금 방지). 실패하면 기존처럼 SVG 표지로 대체.
    try {
      const image = await generateGeminiImage({
        apiKey: finalApiKey,
        modelName: "gemini-nano-banana-2.1",
        prompt,
        aspectRatio: "3:4",
        imageSize: "1K",
        timeoutMs: 120_000,
        retries: 0,
      });
      return NextResponse.json({
        success: true,
        imageUrl: `data:${image.mimeType || "image/png"};base64,${image.base64}`,
      });
    } catch (e) {
      // 이미지 모델 호출 실패 시 SVG 모티프 표지 폴백 제공
      console.warn("표지 이미지 생성 실패, SVG 표지로 대체:", e instanceof Error ? e.message : e);
    }

    // SVG 모던 북커버 동적 생성 (항상 안전하고 실패 없는 아름다운 표지)
    const svgCover = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="%231e293b" />
          <stop offset="100%" stop-color="%230f172a" />
        </linearGradient>
      </defs>
      <rect width="600" height="800" fill="url(%23grad)" />
      <rect x="25" y="25" width="550" height="750" fill="none" stroke="%2338bdf8" stroke-width="2" stroke-opacity="0.4" />
      <text x="50" y="80" fill="%2338bdf8" font-family="sans-serif" font-size="14" letter-spacing="3" font-weight="bold">EBOOK STUDIO SPECIAL EDITION</text>
      <line x1="50" y1="100" x2="550" y2="100" stroke="%23334155" stroke-width="1" />
      <text x="50" y="260" fill="%23ffffff" font-family="sans-serif" font-size="34" font-weight="bold">${encodeURIComponent(title.slice(0, 20))}</text>
      <text x="50" y="310" fill="%2394a3b8" font-family="sans-serif" font-size="18">${encodeURIComponent((subtitle || "").slice(0, 30))}</text>
      <circle cx="300" cy="500" r="100" fill="none" stroke="%2338bdf8" stroke-width="3" stroke-dasharray="10 5" opacity="0.3" />
      <text x="50" y="730" fill="%23cbd5e1" font-family="sans-serif" font-size="16">${encodeURIComponent(author || "AI Publisher")}</text>
      <text x="500" y="730" fill="%2364748b" font-family="sans-serif" font-size="14">2026</text>
    </svg>`;

    return NextResponse.json({
      success: true,
      imageUrl: svgCover,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "표지 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
