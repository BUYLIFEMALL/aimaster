import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PERSONALITY_TYPES, ALL_TYPE_CODES } from "@/lib/types";

export const dynamic = "force-dynamic";

// next/og(@vercel/og)의 기본 번들 폰트 로딩은 Windows 로컬 개발 환경에서 file:// 경로 조합이
// 깨져 "Invalid URL"로 실패하는 알려진 문제가 있다 — 어차피 한글 렌더링을 위해 별도 한글
// 폰트가 필요하므로, 기본 폰트를 아예 안 쓰고 직접 내려받은 Noto Sans KR을 명시적으로
// 넘겨서 이 문제를 함께 해결한다.
let fontDataPromise: Promise<Buffer> | null = null;
function getFontData() {
  if (!fontDataPromise) {
    fontDataPromise = readFile(path.join(process.cwd(), "assets/fonts/NotoSansKR-Bold.ttf"));
  }
  return fontDataPromise;
}

export async function GET(request: NextRequest) {
  const typeParam = request.nextUrl.searchParams.get("type")?.toUpperCase() ?? "";
  const type = ALL_TYPE_CODES.includes(typeParam) ? PERSONALITY_TYPES[typeParam] : null;
  const fontData = await getFontData();
  const fonts = [{ name: "Noto Sans KR", data: fontData, style: "normal" as const, weight: 700 as const }];

  if (!type) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#111827",
            color: "white",
            fontSize: 64,
            fontWeight: 900,
            fontFamily: "Noto Sans KR",
          }}
        >
          🔑 성격코드
        </div>
      ),
      { width: 1200, height: 630, fonts },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${type.color}, #111827)`,
          color: "white",
          fontFamily: "Noto Sans KR",
        }}
      >
        <div style={{ fontSize: 140, marginBottom: 10 }}>{type.emoji}</div>
        <div style={{ fontSize: 28, opacity: 0.8, marginBottom: 6 }}>나의 성격코드는</div>
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: 4 }}>{type.code}</div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 10 }}>{type.epithet}</div>
        <div style={{ fontSize: 26, opacity: 0.85, marginTop: 24 }}>{type.oneLiner}</div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
