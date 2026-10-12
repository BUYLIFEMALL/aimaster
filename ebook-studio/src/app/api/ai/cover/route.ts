import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${finalApiKey}`;

    try {
      const imgRes = await fetch(imagenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4",
            outputMimeType: "image/jpeg",
          },
        }),
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        const base64Bytes = imgData.predictions?.[0]?.bytesBase64Encoded;
        if (base64Bytes) {
          return NextResponse.json({
            success: true,
            imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
          });
        }
      }
    } catch {
      // Imagen 호출 실패 시 SVG 모티프 표지 폴백 제공
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
