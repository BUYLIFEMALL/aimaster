import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCard } from "@/lib/cards";
import { deserializeDraw, SPREAD_CONFIGS, SPREAD_POSITION_LABELS } from "@/lib/deck";
import { getSessionUser } from "@/lib/auth";
import { getUserApiKey } from "@/lib/apiKeys";
import { ResultInteractive } from "@/components/ResultInteractive";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tarot.vercel.app";

const TRUSTED_IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tarot-card-images/`;

function getTrustedImageUrl(img: string | undefined): string | null {
  if (!img) return null;
  return img.startsWith(TRUSTED_IMAGE_PREFIX) ? img : null;
}

type SearchParams = { cards?: string; q?: string; img?: string; imgs?: string; gm?: string; om?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { cards: cardsParam, img } = await searchParams;
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
  const ogImageUrl = getTrustedImageUrl(img) ?? `${SITE_URL}/api/og?present=${mainCard.cardId}`;

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

  const { cards: cardsParam, q, img, imgs, gm, om } = await searchParams;
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

  // DB(tarot_readings)에서 이 카드 구성(3장 전체)으로 이미 생성되었던 카드 이미지들 및 AI 해석 내용 복원
  let initialReading: string | null = null;
  try {
    const supabase = await createClient();
    const { data: readings } = await supabase
      .from("tarot_readings")
      .select("cards, card_images, ai_reading")
      .eq("spread_type", spreadType)
      .order("created_at", { ascending: false })
      .limit(30);

    if (readings && readings.length > 0) {
      const targetCardIds = cards.map((c) => c.cardId);

      for (const r of readings) {
        let isMatch = false;
        if (Array.isArray(r.cards)) {
          const dbCardIds = r.cards.map((c: { cardId?: string }) => c.cardId);
          if (targetCardIds.length === dbCardIds.length && targetCardIds.every((id) => dbCardIds.includes(id))) {
            isMatch = true;
          }
        } else if (r.card_images && typeof r.card_images === "object") {
          const imgsMap = r.card_images as Record<string, string>;
          if (targetCardIds.every((id) => Boolean(imgsMap[id]))) {
            isMatch = true;
          }
        }

        if (isMatch && r.card_images && typeof r.card_images === "object") {
          const imgsMap = r.card_images as Record<string, string>;
          for (const [k, v] of Object.entries(imgsMap)) {
            if (typeof v === "string" && !initialImages[k]) {
              const trusted = getTrustedImageUrl(v);
              if (trusted) initialImages[k] = trusted;
            }
          }
          if (r.ai_reading && typeof r.ai_reading === "string") {
            initialReading = r.ai_reading;
          }
          break;
        }
      }
    }
  } catch {}

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
