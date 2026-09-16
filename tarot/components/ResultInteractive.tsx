"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCard, type Orientation } from "@/lib/cards";
import { SPREAD_POSITION_LABELS, type SpreadPosition } from "@/lib/deck";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { ShareButtons } from "@/components/ShareButtons";

interface DrawnCardInput {
  cardId: string;
  position: SpreadPosition;
  orientation: Orientation;
}

/**
 * 결과 화면의 동적인 부분(카드별 AI 일러스트, AI 종합 해석, 공유)을 전부 이 클라이언트
 * 컴포넌트가 담당한다 — mbti-character/components/ResultInteractive.tsx와 동일한 설계 원칙:
 * "결과 화면에 도달하면 자동으로 생성되고, 공유하면 그 결과가 그대로 반영된다."
 *
 * 카드 이미지(Gemini)와 종합 해석(OpenAI)은 서로 다른 provider라 각각 독립적으로
 * 자동 생성을 시도한다 — 한쪽 키만 등록해도 등록한 기능은 정상 동작해야 하기 때문이다.
 */
export function ResultInteractive({
  cards,
  question,
  hasGeminiKey,
  hasOpenaiKey,
  initialImageUrl,
  shareUrlBase,
  fallbackOgImageUrl,
}: {
  cards: DrawnCardInput[];
  question?: string;
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
  /** 공유 링크(?img=...)로 들어왔을 때, 검증을 마친 "현재" 카드의 대표 이미지 URL */
  initialImageUrl: string | null;
  shareUrlBase: string;
  fallbackOgImageUrl: string;
}) {
  const presentCard = cards.find((c) => c.position === "present")!;

  const [images, setImages] = useState<Record<string, string>>(
    initialImageUrl ? { [presentCard.cardId]: initialImageUrl } : {},
  );
  const [loadingCardIds, setLoadingCardIds] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [reading, setReading] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [modalProvider, setModalProvider] = useState<string | null>(null);

  async function generateImage(card: DrawnCardInput) {
    setLoadingCardIds((prev) => new Set(prev).add(card.cardId));
    try {
      const res = await fetch("/api/generate-card-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.cardId, orientation: card.orientation }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code !== "NO_API_KEY") {
          setImageErrors((prev) => ({ ...prev, [card.cardId]: json.error ?? "이미지 생성 실패" }));
        }
        return;
      }
      setImages((prev) => ({ ...prev, [card.cardId]: json.imageUrl }));
    } catch {
      setImageErrors((prev) => ({ ...prev, [card.cardId]: "네트워크 오류가 발생했습니다." }));
    } finally {
      setLoadingCardIds((prev) => {
        const next = new Set(prev);
        next.delete(card.cardId);
        return next;
      });
    }
  }

  async function generateReading() {
    setReadingLoading(true);
    setReadingError(null);
    try {
      const res = await fetch("/api/generate-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, question }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "NO_API_KEY") return;
        throw new Error(json.error ?? "해석 생성에 실패했습니다.");
      }
      setReading(json.reading);
    } catch (e) {
      setReadingError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setReadingLoading(false);
    }
  }

  // 결과 화면 진입 시(최초 1회) 등록된 키가 있으면 자동으로 생성을 시작한다 —
  // mbti-character와 동일하게 "결과가 곧 카드 이미지/해석"이 되도록 하는 설계.
  useEffect(() => {
    if (hasGeminiKey) {
      cards.forEach((c) => {
        if (!images[c.cardId]) generateImage(c);
      });
    }
    if (hasOpenaiKey) {
      generateReading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presentImageUrl = images[presentCard.cardId] ?? null;
  const shareImageUrl = presentImageUrl ?? fallbackOgImageUrl;
  const shareUrl = presentImageUrl
    ? `${shareUrlBase}&img=${encodeURIComponent(presentImageUrl)}`
    : shareUrlBase;

  return (
    <>
      {modalProvider && (
        <ApiKeyRequiredModal providerLabel={modalProvider} onClose={() => setModalProvider(null)} />
      )}

      {question && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 mb-6">
          <p className="text-xs text-indigo-400 mb-1">오늘의 질문</p>
          <p className="text-sm text-indigo-900 font-medium">{question}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((drawn) => {
          const card = getCard(drawn.cardId)!;
          const meaning = drawn.orientation === "upright" ? card.upright : card.reversed;
          const imageUrl = images[card.id];
          const isLoading = loadingCardIds.has(card.id);
          const error = imageErrors[card.id];

          return (
            <div
              key={drawn.position}
              className="rounded-2xl overflow-hidden border border-neutral-200 bg-white flex flex-col"
            >
              <div className="px-4 pt-3">
                <span className="inline-block px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[11px] font-bold">
                  {SPREAD_POSITION_LABELS[drawn.position]}
                </span>
              </div>
              <div className="px-4 py-3 flex flex-col items-center">
                <div
                  className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-800 flex items-center justify-center mb-3"
                  style={drawn.orientation === "reversed" ? { transform: "rotate(180deg)" } : undefined}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage 공개 URL
                    <img src={imageUrl} alt={card.nameKo} className="w-full h-full object-cover" />
                  ) : isLoading ? (
                    <span className="text-3xl animate-pulse">✨</span>
                  ) : (
                    <span className="text-3xl">🌙</span>
                  )}
                </div>
                <p className="text-sm font-bold text-neutral-900">{card.nameKo}</p>
                <p className="text-[11px] text-neutral-400 mb-1">{card.nameEn}</p>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 ${
                    drawn.orientation === "upright"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {drawn.orientation === "upright" ? "정방향" : "역방향"}
                </span>
                {error && <p className="text-[11px] text-red-500 mb-1">{error}</p>}
                <p className="text-xs text-neutral-500 leading-relaxed text-center">{meaning}</p>
              </div>
            </div>
          );
        })}
      </div>

      {!hasGeminiKey && (
        <p className="text-center text-xs text-neutral-400 mb-8">
          <button
            type="button"
            onClick={() => setModalProvider("Google Gemini")}
            className="underline hover:text-neutral-600"
          >
            Gemini API 키를 등록
          </button>
          하면 카드마다 AI가 그린 일러스트를 볼 수 있어요.
        </p>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-8">
        <h2 className="text-sm font-bold text-neutral-900 mb-3">✍️ AI 종합 해석</h2>
        {hasOpenaiKey ? (
          readingLoading ? (
            <p className="text-xs text-neutral-400 animate-pulse">
              세 장의 카드를 엮어 해석을 쓰는 중이에요... (최대 45초)
            </p>
          ) : readingError ? (
            <p className="text-xs text-red-500">{readingError}</p>
          ) : reading ? (
            <div className="space-y-3">
              {reading.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="text-sm text-neutral-700 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">잠시 후 해석이 표시됩니다.</p>
          )
        ) : (
          <div>
            <p className="text-xs text-neutral-500 leading-relaxed mb-3">
              위 세 카드의 기본 의미는 각 카드 아래에서 확인할 수 있어요. 질문과 세 카드를 하나로
              엮은 AI 종합 해석을 보려면 OpenAI API 키를 등록해주세요.
            </p>
            <button
              type="button"
              onClick={() => setModalProvider("OpenAI")}
              className="text-xs font-semibold text-neutral-900 underline"
            >
              🔑 OpenAI 키 등록하고 AI 해석 보기
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        <ShareButtons
          shareUrl={shareUrl}
          shareText="나의 타로 3카드 리딩 결과를 확인해보세요"
          shareDescription={`과거 · 현재 · 미래 — ${cards
            .map((c) => getCard(c.cardId)!.nameKo)
            .join(" / ")}`}
          imageUrl={shareImageUrl}
        />
        <Link href="/draw" className="text-sm text-neutral-400 hover:text-neutral-700 underline">
          다시 카드 뽑기
        </Link>
      </div>
    </>
  );
}
