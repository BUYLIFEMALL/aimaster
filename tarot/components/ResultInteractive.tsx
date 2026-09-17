"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getCard, type Orientation } from "@/lib/cards";
import {
  SPREAD_CONFIGS,
  CARD_STYLES,
  type SpreadType,
  type CardStyle,
  type SpreadPosition,
} from "@/lib/deck";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { ShareButtons } from "@/components/ShareButtons";
import { createClient } from "@/lib/supabase/client";

interface DrawnCardInput {
  cardId: string;
  position: SpreadPosition;
  orientation: Orientation;
}

export function ResultInteractive({
  cards,
  spreadType = "three_cards",
  cardStyle = "watercolor",
  geminiModel,
  openaiModel,
  question,
  hasGeminiKey,
  hasOpenaiKey,
  initialImageUrl,
  shareUrlBase,
  fallbackOgImageUrl,
}: {
  cards: DrawnCardInput[];
  spreadType?: SpreadType;
  cardStyle?: CardStyle;
  geminiModel?: string;
  openaiModel?: string;
  question?: string;
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
  initialImageUrl: string | null;
  shareUrlBase: string;
  fallbackOgImageUrl: string;
}) {
  const spreadConfig = SPREAD_CONFIGS[spreadType] ?? SPREAD_CONFIGS.three_cards;
  const styleConfig = CARD_STYLES[cardStyle] ?? CARD_STYLES.watercolor;

  const mainCard = cards[0] || { cardId: "major-00", position: "present", orientation: "upright" };

  const [images, setImages] = useState<Record<string, string>>(
    initialImageUrl ? { [mainCard.cardId]: initialImageUrl } : {},
  );
  const [loadingCardIds, setLoadingCardIds] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [reading, setReading] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [modalProvider, setModalProvider] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);

  const hasAttemptedSave = useRef(false);

  async function generateImage(card: DrawnCardInput) {
    setLoadingCardIds((prev) => new Set(prev).add(card.cardId));
    try {
      const res = await fetch("/api/generate-card-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.cardId,
          orientation: card.orientation,
          style: cardStyle,
          model: geminiModel,
        }),
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
        body: JSON.stringify({ cards, question, spreadType, model: openaiModel }),
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

  useEffect(() => {
    if (hasGeminiKey && cards.length > 0) {
      const firstCard = cards[0];
      if (!images[firstCard.cardId]) {
        generateImage(firstCard);
      }
    }
    if (hasOpenaiKey) {
      generateReading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 리딩 결과 및 카드 이미지가 일부 준비되었을 때 Supabase 내 보관함 DB에 자동 저장
  useEffect(() => {
    async function saveReadingHistory() {
      if (hasAttemptedSave.current) return;
      hasAttemptedSave.current = true;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const cardsPayload = cards.map((c) => {
          const info = getCard(c.cardId);
          return {
            cardId: c.cardId,
            position: c.position,
            positionLabel: spreadConfig.positionLabels[c.position] || c.position,
            orientation: c.orientation,
            nameKo: info?.nameKo,
            nameEn: info?.nameEn,
          };
        });

        const { error } = await supabase.from("tarot_readings").insert({
          user_id: user.id,
          spread_type: spreadType,
          question: question || null,
          cards: cardsPayload,
          ai_reading: reading || null,
          card_images: images,
        });

        if (!error) {
          setSavedToDb(true);
        }
      } catch (err) {
        console.error("Tarot reading DB save error:", err);
      }
    }

    if (reading || Object.keys(images).length > 0) {
      saveReadingHistory();
    }
  }, [reading, images, cards, spreadType, question, spreadConfig]);

  const mainImageUrl = images[mainCard.cardId] ?? null;
  const shareImageUrl = mainImageUrl ?? fallbackOgImageUrl;
  const shareUrl = mainImageUrl
    ? `${shareUrlBase}&img=${encodeURIComponent(mainImageUrl)}`
    : shareUrlBase;

  // 카드 수에 따른 Responsive Grid 스타일
  const gridColsClass =
    cards.length === 1
      ? "max-w-xs mx-auto"
      : cards.length === 5
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
      : "grid-cols-1 sm:grid-cols-3";

  return (
    <>
      {modalProvider && (
        <ApiKeyRequiredModal providerLabel={modalProvider} onClose={() => setModalProvider(null)} />
      )}

      {/* 스프레드 & 화풍 정보 배지 및 인터랙티브 안내 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 bg-neutral-900 text-white rounded-2xl px-5 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black">{spreadConfig.title}</span>
          <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
            {spreadConfig.badge}
          </span>
        </div>
        <div className="text-xs text-purple-300 font-medium">
          화풍: <span className="text-white font-bold">{styleConfig.name}</span> ({styleConfig.badge})
        </div>
      </div>

      {question && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 mb-4">
          <p className="text-xs text-indigo-400 font-bold mb-1">오늘의 질문 / 고민</p>
          <p className="text-sm text-indigo-900 font-medium">{question}</p>
        </div>
      )}

      {/* 게임적 상호작용 안내 및 전체 연성 버튼 */}
      {hasGeminiKey && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900 text-white rounded-2xl px-5 py-3.5 border border-purple-500/30 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-base animate-bounce">🔮</span>
            <span>
              <strong className="text-amber-300 font-bold">카드를 하나씩 클릭해보세요!</strong> 각 카드의 AI 일러스트가 마법 연출과 함께 생성됩니다.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              cards.forEach((c) => {
                if (!images[c.cardId] && !loadingCardIds.has(c.cardId)) {
                  generateImage(c);
                }
              });
            }}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-amber-400 text-neutral-950 hover:bg-amber-300 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <span>🪄</span> 전체 카드 한 번에 연성하기
          </button>
        </div>
      )}

      {savedToDb && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            ✅ 이 타로 리딩은 회원님의 개인 보관함(/history)에 자동 저장되었습니다.
          </span>
        </div>
      )}

      {/* 카드 리스트 그리드 (인터랙티브 1-by-1 클릭 생성 & 마법 효과) */}
      <div className={`grid gap-4 mb-8 ${gridColsClass}`}>
        {cards.map((drawn) => {
          const card = getCard(drawn.cardId)!;
          const meaning = drawn.orientation === "upright" ? card.upright : card.reversed;
          const imageUrl = images[card.id];
          const isLoading = loadingCardIds.has(card.id);
          const error = imageErrors[card.id];
          const posLabel = spreadConfig.positionLabels[drawn.position] || drawn.position;

          const handleCardClick = () => {
            if (imageUrl || isLoading) return;
            if (!hasGeminiKey) {
              setModalProvider("Google Gemini");
              return;
            }
            generateImage(drawn);
          };

          return (
            <div
              key={`${drawn.cardId}-${drawn.position}`}
              className="rounded-2xl overflow-hidden border border-neutral-200 bg-white flex flex-col shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="px-3 pt-3 text-center flex items-center justify-between">
                <span className="inline-block px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[11px] font-bold">
                  {posLabel}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    drawn.orientation === "upright"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {drawn.orientation === "upright" ? "정방향" : "역방향"}
                </span>
              </div>

              <div className="px-4 py-3 flex flex-col items-center">
                {/* 카드 프레임 (마법 연출 & 1개씩 클릭 연성) */}
                <div
                  onClick={handleCardClick}
                  className={`w-full aspect-[2/3] rounded-xl overflow-hidden relative mb-3 flex flex-col items-center justify-center transition-all duration-500 ${
                    imageUrl
                      ? "bg-gradient-to-br from-indigo-950 via-purple-900 to-black border border-amber-400/40 shadow-inner group"
                      : isLoading
                      ? "bg-gradient-to-br from-purple-950 via-indigo-900 to-black magic-glow-anim border-2 border-purple-400"
                      : "bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 border-2 border-dashed border-amber-400/50 hover:border-amber-400 cursor-pointer group hover:scale-[1.02] shadow-sm hover:shadow-amber-500/20"
                  }`}
                  style={imageUrl && drawn.orientation === "reversed" ? { transform: "rotate(180deg)" } : undefined}
                >
                  {imageUrl ? (
                    <>
                      {/* 카드 빛 한 바퀴 쓱 지나가는 액센트 효과 */}
                      <div className="card-shine-effect" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={card.nameKo}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    </>
                  ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                      <span className="text-3xl animate-spin inline-block mb-1">🔮</span>
                      <p className="text-[11px] font-bold text-amber-300 animate-pulse">
                        ✨ {styleConfig.name} 일러스트 연성 중...
                      </p>
                      <div className="w-16 h-1 bg-purple-900/60 rounded-full overflow-hidden mt-1">
                        <div className="w-full h-full bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                      <span className="text-4xl group-hover:scale-125 transition-transform duration-300">🃏</span>
                      <span className="text-[11px] font-bold text-amber-300 bg-black/60 px-3 py-1.5 rounded-full border border-amber-400/40 group-hover:bg-amber-400 group-hover:text-neutral-950 transition-colors shadow-sm flex items-center gap-1">
                        <span>✨</span> 카드 연성하기
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-sm font-bold text-neutral-900">{card.nameKo}</p>
                <p className="text-[11px] text-neutral-400 mb-2">{card.nameEn}</p>

                {error && <p className="text-[11px] text-red-500 mb-1">{error}</p>}
                <p className="text-xs text-neutral-600 leading-relaxed text-center">{meaning}</p>
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
            className="underline font-bold hover:text-neutral-600"
          >
            Gemini API 키를 등록
          </button>
          하면 고유한 AI 타로 일러스트를 자동 생성해 보관할 수 있어요.
        </p>
      )}

      {/* AI 종합 해석 박스 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-8 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900 mb-3">✍️ AI 종합 심층 해석</h2>
        {hasOpenaiKey ? (
          readingLoading ? (
            <p className="text-xs text-neutral-400 animate-pulse">
              뽑힌 카드들을 종합해 깊이 있는 타로 해석을 작성하는 중입니다... (최대 45초)
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
              각 카드의 기본 의미는 카드 아래에서 확인할 수 있습니다. 질문과 카드 전체를 종합한
              AI 심층 타로 리딩을 경험하려면 OpenAI API 키를 등록해주세요.
            </p>
            <button
              type="button"
              onClick={() => setModalProvider("OpenAI")}
              className="text-xs font-semibold text-neutral-900 underline"
            >
              🔑 OpenAI 키 등록하고 AI 종합 해석 보기
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        <ShareButtons
          shareUrl={shareUrl}
          shareText={`나의 ${spreadConfig.title} 타로 결과를 확인해보세요!`}
          shareDescription={`${cards.map((c) => getCard(c.cardId)!.nameKo).join(" / ")}`}
          imageUrl={shareImageUrl}
        />
        <div className="flex items-center gap-4 text-xs font-medium">
          <Link href="/history" className="text-purple-700 font-bold hover:underline">
            📖 내 타로 보관함 바로가기
          </Link>

          <Link href="/draw" className="text-neutral-400 hover:text-neutral-700 underline">
            다시 카드 뽑기
          </Link>
        </div>
      </div>
    </>
  );
}
