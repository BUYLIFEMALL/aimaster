"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Play, AlertCircle, FileQuestion } from "lucide-react";
import { BaseSlide } from "@/lib/types";
import SlideCard from "./SlideCard";

interface SlideEditorProps {
  slideData: string;
  setSlideData: (data: string) => void;
  onOpenPreview: () => void;
}

export default function SlideEditor({
  slideData,
  setSlideData,
  onOpenPreview,
}: SlideEditorProps) {
  const [slides, setSlides] = useState<BaseSlide[]>([]);
  const slidesJsonRef = useRef<string>("");
  const [parseError, setParseError] = useState("");
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regenerateError, setRegenerateError] = useState("");
  const [globalUserRequest, setGlobalUserRequest] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkUpdateProgress, setBulkUpdateProgress] = useState({ current: 0, total: 0 });

  const ensureSlideIds = (inputSlides: any[]): BaseSlide[] => {
    return inputSlides.map((slide, index) =>
      slide.id ? slide : { ...slide, id: `slide-${Date.now()}-${index}-${Math.random()}` }
    );
  };

  useEffect(() => {
    if (slideData === slidesJsonRef.current) return;

    if (!slideData.trim()) {
      setSlides([]);
      slidesJsonRef.current = "";
      setParseError("");
      return;
    }

    try {
      const parsedData = JSON.parse(slideData);
      if (Array.isArray(parsedData)) {
        setSlides(ensureSlideIds(parsedData));
        slidesJsonRef.current = slideData;
        setParseError("");
      } else {
        setParseError("JSON 데이터가 배열([]) 형식이 아닙니다.");
        setSlides([]);
        slidesJsonRef.current = "";
      }
    } catch {
      setParseError("JSON 파싱에 실패했습니다. 형식을 확인해주세요.");
    }
  }, [slideData]);

  const updateSlidesAndParent = (updatedSlides: BaseSlide[]) => {
    setSlides(updatedSlides);
    try {
      const slidesToSave = updatedSlides.map(({ id, ...rest }) => rest);
      const newJson = JSON.stringify(slidesToSave, null, 2);
      slidesJsonRef.current = newJson;
      setSlideData(newJson);
    } catch (err) {
      console.error("Failed to stringify updated slides:", err);
    }
  };

  const handleSlideUpdate = (index: number, updatedSlide: BaseSlide) => {
    const newSlides = [...slides];
    newSlides[index] = updatedSlide;
    updateSlidesAndParent(newSlides);
  };

  const handleSlideDelete = (index: number) => {
    const newSlides = slides.filter((_, i) => i !== index);
    updateSlidesAndParent(newSlides);
  };

  const handleSlideMove = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === slides.length - 1) return;

    const newSlides = [...slides];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];

    updateSlidesAndParent(newSlides);
  };

  const handleSlideRegenerate = async (index: number, userRequest: string) => {
    if (regeneratingIndex !== null || isBulkUpdating) return;

    setRegeneratingIndex(index);
    setRegenerateError("");
    try {
      const { id, ...originalSlide } = slides[index];
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide: originalSlide, userRequest }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "슬라이드 수정 실패");
      }

      const newSlides = [...slides];
      newSlides[index] = { ...data.slide, id };
      updateSlidesAndParent(newSlides);
    } catch (err: any) {
      setRegenerateError(`슬라이드 #${index + 1} 수정 실패: ${err.message}`);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleBulkUpdate = async () => {
    if (!globalUserRequest.trim() || isBulkUpdating || slides.length === 0) return;

    setIsBulkUpdating(true);
    setBulkUpdateProgress({ current: 0, total: slides.length });
    setRegenerateError("");

    const updatedSlides = [...slides];

    for (let i = 0; i < slides.length; i++) {
      setBulkUpdateProgress({ current: i + 1, total: slides.length });
      try {
        const { id, ...originalSlide } = slides[i];
        const res = await fetch("/api/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide: originalSlide, userRequest: globalUserRequest }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "일괄 수정 처리 오류");
        }

        updatedSlides[i] = { ...data.slide, id };
      } catch (err: any) {
        setRegenerateError(`일괄 수정 중 슬라이드 #${i + 1} 처리 실패: ${err.message}.`);
        setIsBulkUpdating(false);
        return;
      }
    }

    updateSlidesAndParent(updatedSlides);
    setIsBulkUpdating(false);
    setGlobalUserRequest("");
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* 패널 타이틀 */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white flex items-center justify-between">
        <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-white text-teal-600 flex items-center justify-center text-xs font-bold">
            2
          </span>
          <span>슬라이드별 스크립트 편집</span>
        </h2>
        {slides.length > 0 && (
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition"
          >
            <Play size={13} />
            <span>16:9 슬라이드쇼 미리보기</span>
          </button>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
        {/* 전체 일괄 AI 수정 박스 */}
        {slides.length > 0 && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-indigo-900">모든 슬라이드에 일괄 적용</h3>
            </div>
            <p className="text-[11px] text-indigo-800/80 leading-relaxed">
              모든 슬라이드에 공통적인 수정 요청을 입력하면 AI가 순차적으로 적용합니다. (예: &apos;모든 슬라이드의 스피커 노트를 핵심만 요약해줘&apos;)
            </p>
            <textarea
              value={globalUserRequest}
              onChange={(e) => setGlobalUserRequest(e.target.value)}
              placeholder="일괄 수정 요청 사항 입력..."
              className="w-full text-xs p-2.5 border border-indigo-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              disabled={isBulkUpdating}
            />
            <button
              type="button"
              onClick={handleBulkUpdate}
              disabled={!globalUserRequest.trim() || isBulkUpdating}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              {isBulkUpdating ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>
                    일괄 적용 중... ({bulkUpdateProgress.current}/{bulkUpdateProgress.total})
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>✨ AI로 전체 슬라이드 일괄 수정하기</span>
                </>
              )}
            </button>
          </div>
        )}

        {parseError && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {regenerateError && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{regenerateError}</span>
          </div>
        )}

        {!parseError && slides.length === 0 && (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileQuestion size={24} />
            </div>
            <p className="font-bold text-slate-600 text-xs">슬라이드 미리보기</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              좌측에서 스크립트를 생성하거나 JSON을 입력하면 각 슬라이드별 시각적 편집 카드가 여기에 실시간 표시됩니다.
            </p>
          </div>
        )}

        {slides.map((slide, index) => (
          <SlideCard
            key={slide.id}
            index={index}
            slide={slide}
            onUpdate={handleSlideUpdate}
            onDelete={handleSlideDelete}
            onMove={handleSlideMove}
            onRegenerate={handleSlideRegenerate}
            isFirst={index === 0}
            isLast={index === slides.length - 1}
            isRegenerating={regeneratingIndex === index}
            isBulkUpdating={isBulkUpdating}
          />
        ))}
      </div>
    </div>
  );
}
