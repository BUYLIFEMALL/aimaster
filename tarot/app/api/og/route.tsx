import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCard } from "@/lib/cards";

export const dynamic = "force-dynamic";

// next/og(@vercel/og)의 기본 번들 폰트 로딩이 Windows 로컬 개발 환경에서 깨지는 문제가
// mbti-character에서 이미 확인됐다 — 한글 렌더링을 위해 별도 폰트가 필요하기도 해서,
// Noto Sans KR을 직접 읽어서 넘기는 방식으로 처음부터 우회한다. Vercel(Linux)에서는 무관.
let fontDataPromise: Promise<Buffer> | null = null;
function getFontData() {
  if (!fontDataPromise) {
    fontDataPromise = readFile(path.join(process.cwd(), "assets/fonts/NotoSansKR-Bold.ttf"));
  }
  return fontDataPromise;
}

// 3장의 카드를 전부 그려넣는 복잡한 동적 카드 대신, 브랜드 카드(대표 카드 1장의 이름만
// 선택적으로 표시)로 단순화했다 — MVP 범위 결정. 링크 공유 시 실제 생성된 카드 일러스트가
// 있으면 결과 페이지가 그 이미지를 og:image로 우선 사용하므로(app/result/page.tsx의
// getTrustedImageUrl), 이 라우트는 이미지가 없을 때의 대체 카드 역할만 한다.
export async function GET(request: NextRequest) {
  const presentCardId = request.nextUrl.searchParams.get("present");
  const card = presentCardId ? getCard(presentCardId) : null;
  const fontData = await getFontData();
  const fonts = [{ name: "Noto Sans KR", data: fontData, style: "normal" as const, weight: 700 as const }];

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
          background: "linear-gradient(135deg, #312e81, #581c87)",
          color: "white",
          fontFamily: "Noto Sans KR",
        }}
      >
        <div style={{ fontSize: 140, marginBottom: 10 }}>🔮</div>
        <div style={{ fontSize: 64, fontWeight: 900 }}>AI 타로</div>
        <div style={{ fontSize: 28, opacity: 0.85, marginTop: 14 }}>
          과거 · 현재 · 미래 3카드 리딩
        </div>
        {card && (
          <div style={{ fontSize: 26, opacity: 0.7, marginTop: 24 }}>
            오늘의 현재 카드: {card.nameKo}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
