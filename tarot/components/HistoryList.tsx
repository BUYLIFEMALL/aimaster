"use client";

import { useState } from "react";
import Link from "next/link";
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

            {/* 카드 확장 영역 */}
            {isExpanded && (
              <div className="p-5 pt-0 border-t border-neutral-100 bg-neutral-50/50">
                {/* 뽑힌 카드 썸네일 리스트 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 my-4">
                  {item.cards.map((c, idx) => {
                    const imgUrl = item.card_images?.[c.cardId];
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-neutral-200 bg-white p-2 text-center shadow-2xs"
                      >
                        <span className="inline-block text-[10px] font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full mb-1.5">
                          {c.positionLabel || c.position}
                        </span>
                        <div className="w-full aspect-[2/3] rounded-lg bg-gradient-to-br from-indigo-950 to-purple-900 overflow-hidden mb-2 flex items-center justify-center">
                          {imgUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgUrl}
                              alt={c.nameKo || c.cardId}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">🔮</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-neutral-900 line-clamp-1">
                          {c.nameKo || c.cardId}
                        </p>
                        <span className="text-[10px] text-neutral-500 font-medium">
                          {c.orientation === "upright" ? "정방향" : "역방향"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* AI 종합 해석 영역 */}
                {item.ai_reading && (
                  <div className="mt-4 rounded-xl bg-white border border-neutral-200 p-4">
                    <h4 className="text-xs font-bold text-neutral-900 mb-2">✍️ AI 종합 해석</h4>
                    <div className="space-y-2 text-xs text-neutral-700 leading-relaxed">
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
