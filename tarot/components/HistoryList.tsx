"use client";

import { useState } from "react";
import Link from "next/link";
import { getCard } from "@/lib/cards";
import { SPREAD_CONFIGS, type SpreadType } from "@/lib/deck";
import { deleteReadingAction } from "@/lib/actions/history";
import { DeleteReadingButton } from "@/components/history/DeleteReadingButton";

interface TarotReadingItem {
  id: string;
  spread_type: SpreadType;
  question: string | null;
  cards: Array<{
    cardId: string;
    position: string;
    positionLabel?: string;
    orientation: "upright" | "reversed";
    nameKo?: string;
    nameEn?: string;
  }>;
  ai_reading: string | null;
  card_images: Record<string, string> | null;
  created_at: string;
}

export function HistoryList({ readings }: { readings: TarotReadingItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(readings[0]?.id || null);
  // /result의 "클릭하여 확대 보기" 라이트박스와 동일한 패턴 — 썸네일을 누르면 원본
  // 이미지 크기로 크게 보여준다(2026-09-19, 사용자 요청).
  const [zoomedCard, setZoomedCard] = useState<{
    imageUrl: string;
    cardNameKo: string;
    cardNameEn: string;
    orientation: "upright" | "reversed";
    positionLabel: string;
    meaning: string;
  } | null>(null);

  if (readings.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-neutral-200">
        <div className="text-5xl mb-4">🔮</div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">저장된 타로 리딩이 없습니다</h3>
        <p className="text-xs text-neutral-500 mb-6">
          마음 속 고민을 담아 나만의 AI 타로 카드를 뽑아보세요!
        </p>
        <Link
          href="/draw"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800 transition-all"
        >
          🃏 카드 뽑으러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 카드 고화질 이미지 확대 모달 — ResultInteractive와 동일한 UI */}
      {zoomedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedCard(null)}
        >
          <div
            className="relative max-w-sm w-full bg-neutral-900 border border-amber-400/40 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedCard(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-sm bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-400/30">
                {zoomedCard.positionLabel}
              </span>
              <span className="text-xs bg-white/10 text-neutral-300 font-semibold px-2.5 py-1 rounded-full">
                {zoomedCard.orientation === "upright" ? "정방향" : "역방향"}
              </span>
            </div>

            <div
              className="w-full aspect-[2/3] rounded-2xl overflow-hidden border border-amber-400/50 shadow-2xl relative"
              style={zoomedCard.orientation === "reversed" ? { transform: "rotate(180deg)" } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedCard.imageUrl}
                alt={zoomedCard.cardNameKo}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-amber-300">{zoomedCard.cardNameKo}</h3>
              <p className="text-xs text-neutral-400 mb-2">{zoomedCard.cardNameEn}</p>
              {zoomedCard.meaning && (
                <p className="text-xs text-neutral-300 leading-relaxed max-w-xs">{zoomedCard.meaning}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {readings.map((item) => {
        const config = SPREAD_CONFIGS[item.spread_type] ?? SPREAD_CONFIGS.three_cards;
        const isExpanded = expandedId === item.id;
        const dateStr = new Date(item.created_at).toLocaleString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm transition-all"
          >
            {/* 상단 카드 헤더 */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-50 transition-colors">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="flex-1 min-w-0 text-left p-5"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold bg-neutral-900 text-white px-2.5 py-0.5 rounded-full">
                    {config.badge}
                  </span>
                  <span className="text-xs text-neutral-400">{dateStr}</span>
                </div>
                <h3 className="font-bold text-sm text-neutral-900 truncate">
                  {item.question ? `"${item.question}"` : config.title}
                </h3>
              </button>
              <div className="flex items-center gap-2 pr-5">
                <form action={deleteReadingAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <DeleteReadingButton />
                </form>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="text-xs font-bold text-neutral-500"
                >
                  {isExpanded ? "접기 ▲" : "상세보기 ▼"}
                </button>
              </div>
            </div>

            {/* 카드 확장 영역 — /result(최초 생성 화면)와 동일한 크기 체계를 쓴다.
                카드 수가 적을수록(1~3장) 이미지가 더 크게 보이도록 그리드 열 수를
                ResultInteractive의 gridColsClass 로직 그대로 맞췄다(2026-09-19,
                사용자 지적: "최초 생성시 보여지는 크기로 보여지게 해줘"). */}
            {isExpanded && (
              <div className="p-5 pt-0 border-t border-neutral-100 bg-neutral-50/50">
                {/* 뽑힌 카드 썸네일 리스트 */}
                <div
                  className={`grid gap-4 my-4 ${
                    item.cards.length === 1 ? "max-w-xs mx-auto" : "grid-cols-1 sm:grid-cols-3"
                  }`}
                >
                  {item.cards.map((c, idx) => {
                    const imgUrl = item.card_images?.[c.cardId];
                    const cardInfo = getCard(c.cardId);
                    const posLabel = c.positionLabel || c.position;
                    const meaning = cardInfo
                      ? c.orientation === "upright"
                        ? cardInfo.upright
                        : cardInfo.reversed
                      : "";

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm"
                      >
                        <span className="inline-block text-[11px] font-bold bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full mb-2">
                          {posLabel}
                        </span>
                        <div
                          onClick={() =>
                            imgUrl &&
                            setZoomedCard({
                              imageUrl: imgUrl,
                              cardNameKo: c.nameKo || cardInfo?.nameKo || c.cardId,
                              cardNameEn: c.nameEn || cardInfo?.nameEn || "",
                              orientation: c.orientation,
                              positionLabel: posLabel,
                              meaning,
                            })
                          }
                          className={`w-full aspect-[2/3] rounded-xl bg-gradient-to-br from-indigo-950 to-purple-900 overflow-hidden mb-3 flex items-center justify-center ${
                            imgUrl ? "cursor-pointer group relative" : ""
                          }`}
                        >
                          {imgUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt={c.nameKo || c.cardId}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2 text-center pointer-events-none">
                                <span className="text-[11px] font-bold text-white bg-black/75 px-3 py-1.5 rounded-full border border-white/30 backdrop-blur-sm">
                                  🔍 클릭하여 확대 보기
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-3xl">🔮</span>
                          )}
                        </div>
                        <p className="text-sm font-black text-neutral-900 line-clamp-1">
                          {c.nameKo || c.cardId}
                        </p>
                        <span className="text-xs text-neutral-500 font-medium">
                          {c.orientation === "upright" ? "정방향" : "역방향"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* AI 종합 해석 영역 */}
                {item.ai_reading && (
                  <div className="mt-4 rounded-xl bg-white border border-neutral-200 p-5">
                    <h4 className="text-sm font-bold text-neutral-900 mb-3">✍️ AI 종합 해석</h4>
                    <div className="space-y-3 text-sm text-neutral-700 leading-relaxed">
                      {item.ai_reading.split(/\n{2,}/).map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
