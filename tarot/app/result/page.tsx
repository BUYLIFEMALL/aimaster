import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCard } from "@/lib/cards";
import {
  deserializeDraw,
  SPREAD_CONFIGS,
  SPREAD_POSITION_LABELS,
  type DrawnCard,
  type SpreadType,
} from "@/lib/deck";
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

type SearchParams = {
  rid?: string;
  cards?: string;
  q?: string;
  img?: string;
  imgs?: string;
  rd?: string;
  gm?: string;
  om?: string;
};

type StoredReading = {
  id: string;
  spread_type: string | null;
  question: string | null;
  cards: unknown;
  ai_reading: string | null;
  card_images: unknown;
};

/** tarot_readings.cards(JSONB)를 DrawnCard[]로 안전하게 되돌린다. */
function normalizeDbCards(raw: unknown): DrawnCard[] {
  if (!Array.isArray(raw)) return [];
  const result: DrawnCard[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const cardId = (c as Record<string, unknown>).cardId;
    const position = (c as Record<string, unknown>).position;
    const orientation = (c as Record<string, unknown>).orientation;
    if (
      typeof cardId === "string" &&
      typeof position === "string" &&
      (orientation === "upright" || orientation === "reversed")
    ) {
      result.push({ cardId, position: position as DrawnCard["position"], orientation });
    }
  }
  return result;
}

function normalizeDbImages(raw: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string") {
        const trusted = getTrustedImageUrl(v);
        if (trusted) result[k] = trusted;
      }
    }
  }
  return result;
}

/**
 * 완성된 리딩을 id로 직접 불러온다 — 공유 링크(/result?rid=...)의 표준 진입점.
 * user_id로 필터링하지 않고 admin client로 조회하는 게 의도된 동작이다: 공유란 "이
 * id를 아는 누구나 볼 수 있게" 하는 기능이고, id는 gen_random_uuid()라 추측이
 * 불가능하다(kakao_auto_poster의 /share/[token] 패턴과 동일한 설계).
 */
async function loadReadingById(rid: string): Promise<StoredReading | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tarot_readings")
    .select("id, spread_type, question, cards, ai_reading, card_images")
    .eq("id", rid)
    .maybeSingle();
  return (data as StoredReading | null) ?? null;
}

function buildOgImageUrl(params: { img: string | undefined; mainCardId: string }): string {
  const { img, mainCardId } = params;

  // 대표 카드의 실제 생성 이미지(Supabase Storage, Content-Length 정상 제공)가 있으면
  // 그 URL을 그대로 쓴다. 카드 여러 장을 합성한 /api/og?spread=...&imgs=...(next/og의
  // ImageResponse, Content-Length 없이 Transfer-Encoding: chunked로만 응답)는 curl로는
  // 200이 정상 오지만, 카카오톡 "링크 복사 → 붙여넣기" 미리보기 크롤러가 이 이미지를
  // 받아오지 못해 썸네일이 빈 채로 뜨는 문제가 있었다(2026-09-19 발견, 실제 로그로 요청
  // 자체는 200 성공한 것까지 확인했지만 카카오 쪽에서 렌더링이 안 됨). 카드 여러 장을
  // 합성해서 보여주는 기능 자체는 되돌리되, 안정성이 검증된 방식(대표 카드 1장의 직접
  // 이미지 URL)으로 og:image를 통일한다 — /api/og의 합성 렌더링 코드 자체는 남겨뒀다
  // (추후 Storage에 미리 렌더링해두는 방식으로 다시 시도할 수 있음).
  return getTrustedImageUrl(img) ?? `${SITE_URL}/api/og?present=${mainCardId}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { rid, cards: cardsParam, img } = await searchParams;

  if (rid) {
    const row = await loadReadingById(rid);
    if (!row) return {};

    const spreadType = (row.spread_type as SpreadType) ?? "three_cards";
    const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;
    const cards = normalizeDbCards(row.cards);
    if (cards.length === 0) return {};

    const cardNames = cards.map((d) => {
      const posLabel = config.positionLabels[d.position] || SPREAD_POSITION_LABELS[d.position] || d.position;
      return `${posLabel}: ${getCard(d.cardId)!.nameKo}`;
    });

    const title = `나의 ${config.title} 리딩 결과`;
    const description = cardNames.join(" · ");
    const imagesMap = normalizeDbImages(row.card_images);
    const mainCard = cards[0];
    const ogImageUrl = buildOgImageUrl({
      img: imagesMap[mainCard.cardId],
      mainCardId: mainCard.cardId,
    });

    return {
      title,
      description,
      openGraph: { title, description, images: [ogImageUrl] },
      twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
    };
  }

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
  const ogImageUrl = buildOgImageUrl({ img, mainCardId: mainCard.cardId });

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
  const { rid, cards: cardsParam, q, img, imgs, rd, gm, om } = await searchParams;

  // 완성된 리딩을 id로 직접 불러오는 경로(공유 링크의 표준 형태, 2026-09-19 도입).
  // 카드 구성 매칭 같은 추측이 전혀 필요 없어 예전 "레거시 공유 링크" 크로스 유저 노출
  // 문제가 애초에 발생할 수 없다 — id 하나로 정확히 그 리딩 한 건만 가져온다.
  if (rid) {
    const row = await loadReadingById(rid);
    if (!row) redirect("/draw");

    const spreadType = (row.spread_type as SpreadType) ?? "three_cards";
    const config = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;
    const cards = normalizeDbCards(row.cards);
    if (cards.length === 0) redirect("/draw");

    const [geminiKey, openaiKey] = user
      ? await Promise.all([getUserApiKey(user.id, "gemini"), getUserApiKey(user.id, "openai")])
      : [null, null];

    const initialImages = normalizeDbImages(row.card_images);
    const mainCard = cards[0];
    const initialImageUrl = initialImages[mainCard.cardId] ?? null;
    const initialReading = typeof row.ai_reading === "string" ? row.ai_reading : null;
    const fallbackOgImageUrl = `${SITE_URL}/api/og?present=${mainCard.cardId}`;
    const shareUrlBase = `${SITE_URL}/result?rid=${row.id}`;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-neutral-900 mb-1">{config.title}</h1>
          <p className="text-xs text-neutral-400">{config.subtitle}</p>
        </div>
        <ResultInteractive
          cards={cards}
          spreadType={spreadType}
          cardStyle="watercolor"
          question={row.question ?? undefined}
          hasGeminiKey={!!geminiKey}
          hasOpenaiKey={!!openaiKey}
          initialImageUrl={initialImageUrl}
          initialImages={initialImages}
          initialReading={initialReading}
          initialReadingId={row.id}
          shareUrlBase={shareUrlBase}
          fallbackOgImageUrl={fallbackOgImageUrl}
        />
      </div>
    );
  }

  // 카드를 막 뽑고 넘어온 일반적인 경로(/draw -> /result?cards=...). 아직 tarot_readings에
  // 저장된 행이 없을 수 있어(생성 전이거나 비로그인) 쿼리스트링으로 카드 구성을 받는다.
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

  // 레거시 공유 링크(rid도 imgs/rd도 없이 img 하나만 있던 옛 형식) 복원: 새로 카드를 뽑은
  // 경우(initialImageUrl이 없음)에는 절대 이 블록을 타지 않는다 — user_id 필터 없이 전체
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
