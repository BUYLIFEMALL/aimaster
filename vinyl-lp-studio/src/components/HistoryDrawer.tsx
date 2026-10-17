"use client";

import { X, Trash2, Disc, Play, Download, Clock } from "lucide-react";
import type { HistoryItem } from "@/types/vinyl";

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#141620] h-full shadow-2xl flex flex-col border-l border-[#272b3f] animate-in slide-in-from-right duration-300 text-slate-200">
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-[#272b3f] bg-[#0c0d12] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Disc className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">작업 히스토리</h3>
              <p className="text-[10px] text-slate-400">총 {items.length}개의 앨범 저장됨</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1b1e2c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 목록 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Disc className="w-10 h-10 stroke-1 text-slate-600 animate-spin-disc" />
              <p className="text-xs font-medium text-slate-300">저장된 히스토리가 없습니다.</p>
              <p className="text-[11px] text-slate-500">새로운 앨범을 디자인하고 영상을 제작해보세요.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group p-3 rounded-xl border border-[#272b3f] bg-[#0c0d12] hover:bg-[#1b1e2c] hover:border-amber-500/50 hover:shadow-xs transition-all relative space-y-2"
              >
                <div className="flex gap-3">
                  {/* 썸네일 */}
                  <div
                    onClick={() => onSelect(item)}
                    className="w-16 h-16 rounded-lg bg-black overflow-hidden shrink-0 cursor-pointer border border-[#272b3f] shadow-2xs relative flex items-center justify-center group-hover:scale-105 transition-transform"
                  >
                    <img
                      src={`data:image/png;base64,${item.imageThumbnail}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  {/* 메타데이터 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        {item.mediaType}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.speed} RPM
                      </span>
                    </div>
                    <p
                      onClick={() => onSelect(item)}
                      className="text-xs font-bold text-white truncate mt-0.5 cursor-pointer hover:text-amber-400"
                    >
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{item.artist}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* 하단 액션 버튼 */}
                <div className="flex items-center justify-between pt-1 border-t border-[#272b3f]">
                  <button
                    onClick={() => onSelect(item)}
                    className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                  >
                    스튜디오에 불러오기
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-slate-400 hover:text-rose-400 p-1 rounded-md transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        {items.length > 0 && (
          <div className="p-3 border-t border-[#272b3f] bg-[#0c0d12] shrink-0">
            <button
              onClick={onClearAll}
              className="w-full py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
            >
              전체 히스토리 비우기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
