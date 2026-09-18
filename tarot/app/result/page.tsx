import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCard } from "@/lib/cards";
import { deserializeDraw, SPREAD_CONFIGS, SPREAD_POSITION_LABELS } from "@/lib/deck";
import { getSessionUser } from "@/lib/auth";
import { getUserApiKey } from "@/lib/apiKeys";
import { ResultInteractive } from "@/components/ResultInteractive";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tarot.vercel.app";

const TRUSTED_IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tarot-card-images/`;

function getTrustedImageUrl(img: string | undefined): string | null {
  if (!img) return null;
  return img.startsWith(TRUSTED_IMAGE_PREFIX) ? img : null;
}

// 카드가 이 개수 이하인 스프레드만 OG 이미지에 카드 전체를 합성한다. 이보다 많으면
// (켈틱 크로스 10장 등) 대표 카드 1장짜리 이미지로 대체한다 — app/api/og/route.tsx의
// MAX_COMPOSITE_CARDS와 동일한 기준.
const MAX_OG_COMPOSITE_CARDS = 5;

type SearchParams = { cards?: string; q?: string; img?: string; imgs?: string; rd?: string; gm?: string; om?: string };

function buildOgImageUrl(params: {
  spreadType: string;
  cardsParam: string;
  cardCount: number;
  img: string | undefined;
  imgs: string | undefined;
  mainCardId: string;
}): string {
  const { spreadType, cardsParam, cardCount, img, imgs, mainCardId } = params;

  // 카드별 이미지가 여러 장 있고(imgs) 합성 가능한 카드 수라면, /api/og가 실제 검증을
  // 다시 수행하니 여기서는 그대로 넘긴다(각 URL이 진짜 신뢰 가능한지는 /api/og가 재검증).
  if (imgs && cardCount <= MAX_OG_COMPOSITE_CARDS) {
    const composite = new URL(`${SITE_URL}/api/og`);
    composite.searchParams.set("spread", spreadType);
    composite.searchParams.set("cards", cardsParam);
    composite.searchParams.set("imgs", imgs);
    return composite.toString();
  }

  return getTrustedImageUrl(img) ?? `${SITE_URL}/api/og?present=${mainCardId}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { cards: cardsParam, img, imgs } = await searchParams;
  const parsed = deserializeDraw(cardsParam);
  if (!parsed) return {};

  const { spreadType, cards } = parsed;
  const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;

  const cardNames = cards.map((d) => {
    const posLabel = config.positionLabels[d.position] || SPREAD_POSITION_LABELS[d.position] || d.position;
    return `${posLabel}: ${getCard(d.cardId)!.nameKo}`;
  });

  const title = `나의 ${config.title} 리딩 결과`;
  const description = cardNames.join(" · ");
  const mainCard = cards[0] || { cardId: "major-00" };
  const ogImageUrl = buildOgImageUrl({
    spreadType,
    cardsParam: cardsParam!,
    cardCount: config.cardCount,
    img,
    imgs,
    mainCardId: mainCard.cardId,
  });

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImageUrl] },
    twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
  };
}

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getSessionUser();

  const { cards: cardsParam, q, img, imgs, rd, gm, om } = await searchParams;
  const parsed = deserializeDraw(cardsParam);
  if (!parsed) redirect("/draw");

  const { spreadType, cardStyle, cards } = parsed;
  const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;

  const [geminiKey, openaiKey] = user
    ? await Promise.all([
        getUserApiKey(user.id, "gemini"),
        getUserApiKey(user.id, "openai"),
      ])
    : [null, null];

  const params = new URLSearchParams();
  params.set("cards", cardsParam!);
  if (q) params.set("q", q);
  if (gm) params.set("gm", gm);
  if (om) params.set("om", om);

  const shareUrlBase = `${SITE_URL}/result?${params.toString()}`;
  const mainCard = cards[0] || { cardId: "major-00" };
  const fallbackOgImageUrl = `${SITE_URL}/api/og?present=${mainCard.cardId}`;
  const initialImageUrl = getTrustedImageUrl(img);

  const initialImages: Record<string, string> = {};
  if (imgs) {
    try {
      const parsedImgs = JSON.parse(imgs);
      if (typeof parsedImgs === "object" && parsedImgs !== null) {
        for (const [k, v] of Object.entries(parsedImgs)) {
          if (typeof v === "string") {
            const trusted = getTrustedImageUrl(v);
            if (trusted) initialImages[k] = trusted;
          }
        }
      }
    } catch {}
  }

  // 레거시 공유 링크(imgs/rd 없이 img 하나만 있던 옛 형식) 복원: 새로 카드를 뽑은 경우
  // (initialImageUrl이 없음)에는 절대 이 블록을 타지 않는다 — user_id 필터 없이 전체
  // tarot_readings를 뒤지는 아래 로직이 "새로 뽑은 카드가 우연히 다른 회원과 같아서 그
  // 회원의 질문/AI 해석이 내 화면에 뜨는" 크로스 유저 노출 사고로 이어졌던 부분이다.
  // initialImageUrl이 있을 때만, 그 정확한(고유한 user_id+timestamp가 박힌) 이미지 URL을
  // 실제로 갖고 있는 리딩 한 건만 매칭해서 나머지 카드 이미지/해석을 보충한다.
  let initialReading: string | null = rd || null;
  if (initialImageUrl) {
    try {
      const supabase = createAdminClient();
      const { data: readings } = await supabase
        .from("tarot_readings")
        .select("cards, card_images, ai_reading")
        .eq("spread_type", spreadType)
        .order("created_at", { ascending: false })
        .limit(100);

      if (readings && readings.length > 0) {
        const targetCardIds = cards.map((c) => c.cardId);

        for (const r of readings) {
          if (!r.card_images || typeof r.card_images !== "object") continue;
          const imgsMap = r.card_images as Record<string, string>;

          // 공유받은 이미지 URL을 실제로 갖고 있는 리딩인지 먼저 확인한다 — 이 URL엔
          // 원 작성자의 user_id와 생성 시각이 포함되어 있어 사실상 유일하다.
          const containsSharedImage = Object.values(imgsMap).some((v) => v === initialImageUrl);
          if (!containsSharedImage) continue;

          // 카드 구성도 함께 검증(추가 안전장치)
          if (Array.isArray(r.cards)) {
            const dbCardIds = r.cards.map((c: { cardId?: string }) => c.cardId);
            if (targetCardIds.length !== dbCardIds.length || !targetCardIds.every((id) => dbCardIds.includes(id))) {
              continue;
            }
          }

          for (const [k, v] of Object.entries(imgsMap)) {
            if (typeof v === "string" && !initialImages[k]) {
              const trusted = getTrustedImageUrl(v);
              if (trusted) initialImages[k] = trusted;
            }
          }
          if (!initialReading && r.ai_reading && typeof r.ai_reading === "string") {
            initialReading = r.ai_reading;
          }
          break;
        }
      }
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-neutral-900 mb-1">{config.title}</h1>
        <p className="text-xs text-neutral-400">{config.subtitle}</p>
      </div>
      <ResultInteractive
        cards={cards}
        spreadType={spreadType}
        cardStyle={cardStyle}
        geminiModel={gm}
        openaiModel={om}
        question={q}
        hasGeminiKey={!!geminiKey}
        hasOpenaiKey={!!openaiKey}
        initialImageUrl={initialImageUrl}
        initialImages={initialImages}
        initialReading={initialReading}
        shareUrlBase={shareUrlBase}
        fallbackOgImageUrl={fallbackOgImageUrl}
      />
    </div>
  );
}
