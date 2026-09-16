import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCard } from "@/lib/cards";
import { deserializeDraw, SPREAD_POSITION_LABELS } from "@/lib/deck";
import { requireProgramAccess } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { ResultInteractive } from "@/components/ResultInteractive";

// 로그인 여부(쿠키)에 따라 접근이 달라지고, 뽑힌 카드도 매번 다른 쿼리스트링으로 오므로
// 빌드 타임에 정적 생성할 수 없다 — mbti-character/app/result/[type]와 동일한 이유로 완전히
// 동적 렌더링한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tarot.vercel.app";

// 공유 링크(?img=...)로 넘어온 이미지 URL이 실제로 우리 Supabase Storage 버킷 것인지
// 검증한다 — 검증 없이 그대로 og:image에 반영하면 조작된 img 파라미터로 임의 이미지를
// 우리 공유 미리보기에 끼워넣을 수 있다(mbti-character와 동일한 방어 패턴).
const TRUSTED_IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tarot-card-images/`;

function getTrustedImageUrl(img: string | undefined): string | null {
  if (!img) return null;
  return img.startsWith(TRUSTED_IMAGE_PREFIX) ? img : null;
}

type SearchParams = { cards?: string; q?: string; img?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { cards: cardsParam, img } = await searchParams;
  const drawn = deserializeDraw(cardsParam);
  if (!drawn) return {};

  const cardNames = drawn.map((d) => `${SPREAD_POSITION_LABELS[d.position]}: ${getCard(d.cardId)!.nameKo}`);
  const title = "나의 타로 3카드 리딩 결과";
  const description = cardNames.join(" · ");
  const presentCard = drawn.find((d) => d.position === "present")!;
  const ogImageUrl = getTrustedImageUrl(img) ?? `${SITE_URL}/api/og?present=${presentCard.cardId}`;

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
  const user = await requireProgramAccess();

  const { cards: cardsParam, q, img } = await searchParams;
  const drawn = deserializeDraw(cardsParam);
  if (!drawn) redirect("/draw");

  const [geminiKey, openaiKey] = await Promise.all([
    getUserApiKey(user.id, "gemini"),
    getUserApiKey(user.id, "openai"),
  ]);

  const params = new URLSearchParams();
  params.set("cards", cardsParam!);
  if (q) params.set("q", q);
  const shareUrlBase = `${SITE_URL}/result?${params.toString()}`;
  const presentCard = drawn.find((d) => d.position === "present")!;
  const fallbackOgImageUrl = `${SITE_URL}/api/og?present=${presentCard.cardId}`;
  const initialImageUrl = getTrustedImageUrl(img);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-xl font-black text-neutral-900 mb-1">나의 타로 3카드 리딩</h1>
        <p className="text-xs text-neutral-400">과거 · 현재 · 미래</p>
      </div>
      <ResultInteractive
        cards={drawn}
        question={q}
        hasGeminiKey={!!geminiKey}
        hasOpenaiKey={!!openaiKey}
        initialImageUrl={initialImageUrl}
        shareUrlBase={shareUrlBase}
        fallbackOgImageUrl={fallbackOgImageUrl}
      />
    </div>
  );
}
