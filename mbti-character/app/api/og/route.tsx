import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CHARACTERS, ALL_TYPE_CODES } from "@/lib/characters";

export const dynamic = "force-dynamic";

// next/og(@vercel/og)의 기본 번들 폰트 로딩은 Windows 로컬 개발 환경에서 file:// 경로 조합이
// 깨져 "Invalid URL"로 실패하는 알려진 문제가 있다(mbti 프로젝트에서 이미 확인) — 어차피
// 한글 렌더링을 위해 별도 폰트가 필요하므로, 기본 폰트 대신 직접 내려받은 Noto Sans KR을
// 명시적으로 넘겨서 이 문제를 함께 해결한다. Vercel 프로덕션(Linux)에서는 영향이 없다.
let fontDataPromise: Promise<Buffer> | null = null;
function getFontData() {
  if (!fontDataPromise) {
    fontDataPromise = readFile(path.join(process.cwd(), "assets/fonts/NotoSansKR-Bold.ttf"));
  }
  return fontDataPromise;
}

export async function GET(request: NextRequest) {
  const typeParam = request.nextUrl.searchParams.get("type")?.toUpperCase() ?? "";
  const character = ALL_TYPE_CODES.includes(typeParam) ? CHARACTERS[typeParam] : null;
  const fontData = await getFontData();
  const fonts = [{ name: "Noto Sans KR", data: fontData, style: "normal" as const, weight: 700 as const }];

  if (!character) {
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
          🎭 캐릭코드
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
          background: `linear-gradient(135deg, ${character.color}, #111827)`,
          color: "white",
          fontFamily: "Noto Sans KR",
        }}
      >
        <div style={{ fontSize: 140, marginBottom: 10 }}>{character.emoji}</div>
        <div style={{ fontSize: 28, opacity: 0.8, marginBottom: 6 }}>나와 닮은 캐릭터는</div>
        <div style={{ fontSize: 84, fontWeight: 900 }}>{character.name}</div>
        <div style={{ fontSize: 32, fontWeight: 700, marginTop: 10, opacity: 0.9 }}>
          {character.role}
        </div>
        <div style={{ fontSize: 26, letterSpacing: 4, marginTop: 20, opacity: 0.7 }}>
          {character.code}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
