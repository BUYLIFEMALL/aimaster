import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCard, type TarotCard, type Orientation } from "@/lib/cards";
import { deserializeDraw, SPREAD_CONFIGS } from "@/lib/deck";

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

// app/result/page.tsx의 getTrustedImageUrl()과 동일한 검증 — imgs 파라미터는 클라이언트가
// 조작해서 보낼 수 있는 값이라, 여기서도 반드시 우리 Storage 버킷 URL인지 재검증해야
// 이 라우트가 임의 외부 URL을 대신 fetch해주는 오픈 이미지 프록시(SSRF)로 악용되지 않는다.
const TRUSTED_IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tarot-card-images/`;
function isTrustedImageUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith(TRUSTED_IMAGE_PREFIX);
}

// 카드 여러 장을 한 화면에 합성해서 보여줄 수 있는 최대 개수. 켈틱 크로스(10장)처럼 이보다
// 많으면 작은 OG 미리보기 썸네일 안에서 카드 한 장 한 장이 알아보기 힘들 만큼 작아지므로,
// 이 개수를 넘는 스프레드는 대표 카드 1장짜리 브랜드 카드로 대체한다(의도적 MVP 범위 결정).
const MAX_COMPOSITE_CARDS = 5;

function brandFallback(fonts: { name: string; data: Buffer; style: "normal"; weight: 700 }[], presentCardId: string | null) {
  const card = presentCardId ? getCard(presentCardId) : null;
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
        <div style={{ fontSize: 64, fontWeight: 900 }}>AIMaster 타로점</div>
        <div style={{ fontSize: 28, opacity: 0.85, marginTop: 14 }}>과거 · 현재 · 미래 3카드 리딩</div>
        {card && (
          <div style={{ fontSize: 26, opacity: 0.7, marginTop: 24 }}>오늘의 현재 카드: {card.nameKo}</div>
        )}
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const presentCardId = params.get("present");
  const spreadParam = params.get("spread");
  const cardsParam = params.get("cards");
  const imgsParam = params.get("imgs");

  const fontData = await getFontData();
  const fonts = [{ name: "Noto Sans KR", data: fontData, style: "normal" as const, weight: 700 as const }];

  // 카드 여러 장을 나란히 배치하는 합성 이미지를 시도한다 — cards/imgs 둘 다 있을 때만.
  if (cardsParam && imgsParam) {
    const parsed = deserializeDraw(cardsParam);

    if (parsed && parsed.cards.length <= MAX_COMPOSITE_CARDS) {
      let imgsMap: Record<string, unknown> = {};
      try {
        imgsMap = JSON.parse(imgsParam);
      } catch {}

      const tiles = parsed.cards
        .map((d) => ({ card: getCard(d.cardId), url: imgsMap[d.cardId], orientation: d.orientation }))
        .filter(
          (t): t is { card: TarotCard; url: string; orientation: Orientation } =>
            Boolean(t.card) && isTrustedImageUrl(t.url),
        );

      if (tiles.length > 0) {
        const config = SPREAD_CONFIGS[spreadParam as keyof typeof SPREAD_CONFIGS] ?? SPREAD_CONFIGS.three_cards;

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
                padding: 36,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
                <div style={{ fontSize: 52 }}>🔮</div>
                <div style={{ fontSize: 42, fontWeight: 900 }}>{config.title}</div>
              </div>
              <div style={{ display: "flex", gap: 22 }}>
                {tiles.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      width: 190,
                      height: 285,
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "3px solid rgba(251,191,36,0.6)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.url} alt="" width={190} height={285} style={{ objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </div>
          ),
          { width: 1200, height: 630, fonts },
        );
      }
    }
  }

  // 합성 조건을 만족하지 못하거나(이미지 없음, 카드 수 초과) cards/imgs가 없는 경우:
  // 기존 브랜드 카드(대표 카드 1장짜리)로 대체한다.
  return brandFallback(fonts, presentCardId);
}
