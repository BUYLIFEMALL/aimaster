"use client";

import { X, Trash2, Download, Copy, Calendar, Sparkles } from "lucide-react";
import type { HistoryItem } from "@/types/influencer";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  items,
  onSelect,
  onDelete,
  onClearAll,
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border-l border-slate-200 w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              작업 히스토리 ({items.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
              >
                전체 삭제
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 히스토리 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Sparkles className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">저장된 히스토리가 없습니다</p>
              <p className="text-[11px] text-slate-400 max-w-[200px]">
                새로운 인플루언서 사진을 생성하면 이곳에 자동으로 기록됩니다.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group p-3 rounded-xl border border-slate-200 bg-white hover:border-pink-300 hover:shadow-xs transition-all flex gap-3 relative cursor-pointer"
                onClick={() => onSelect(item)}
              >
                {/* 썸네일 */}
                <div className="w-20 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src={item.imageUrl}
                    alt="인플루언서 썸네일"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                      <Calendar className="w-3 h-3" />
                      <span>{item.timestamp}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {item.summary || "AI 인플루언서 화보"}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {item.captions[0] || "캡션 생성됨"}
                    </p>
                  </div>

                  {/* 뱃지 및 액션 */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                    <span className="text-pink-600 font-medium">
                      {item.config.aspectRatio || "9:16"} · {item.config.quality || "1K"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
