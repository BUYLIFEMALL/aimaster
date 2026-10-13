"use client";

import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, MessageSquare, Download, Layers } from "lucide-react";
import { BaseSlide } from "@/lib/types";

interface SlidePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: BaseSlide[];
  onExportPptx: () => void;
}

export default function SlidePreviewModal({
  isOpen,
  onClose,
  slides,
  onExportPptx,
}: SlidePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  const renderSlideContent = (slide: BaseSlide) => {
    switch (slide.type) {
      case "title":
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50">
            <h1 className="text-3xl font-extrabold text-blue-700 tracking-tight max-w-2xl">
              {slide.title || "프레젠테이션 제목"}
            </h1>
            {slide.subhead && (
              <p className="text-base text-slate-600 mt-4 max-w-xl font-medium">
                {slide.subhead}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-8 font-mono">
              {slide.date || new Date().toISOString().split("T")[0].replace(/-/g, ".")}
            </p>
          </div>
        );

      case "section":
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-900 text-white relative">
            <span className="text-7xl font-extrabold text-slate-800 absolute opacity-50 select-none">
              {slide.sectionNo ? `0${slide.sectionNo}` : "SECTION"}
            </span>
            <h2 className="text-3xl font-bold z-10">{slide.title || "섹션 제목"}</h2>
          </div>
        );

      case "closing":
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-900 text-white">
            <h2 className="text-4xl font-bold">감사합니다</h2>
            <p className="text-base text-slate-400 mt-3 font-mono">Thank You for Listening</p>
          </div>
        );

      case "compare":
        return (
          <div className="h-full p-8 flex flex-col bg-white">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-blue-700">{slide.title}</h2>
              {slide.subhead && <p className="text-xs text-slate-600 mt-1">{slide.subhead}</p>}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h3 className="font-bold text-sm text-slate-800 mb-2">{slide.leftTitle || "비교 A"}</h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
                  {(slide.leftItems || []).map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                <h3 className="font-bold text-sm text-blue-700 mb-2">{slide.rightTitle || "비교 B"}</h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
                  {(slide.rightItems || []).map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case "kpi":
        return (
          <div className="h-full p-8 flex flex-col bg-white">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-blue-700">{slide.title}</h2>
              {slide.subhead && <p className="text-xs text-slate-600 mt-1">{slide.subhead}</p>}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 items-center">
              {(slide.items || []).map((kpi: any, i: number) => (
                <div key={i} className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-center">
                  <p className="text-xs font-bold text-blue-600">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-900 my-1">{kpi.value || "-"}</p>
                  {kpi.change && (
                    <p
                      className={`text-[11px] font-bold ${
                        kpi.status === "good" ? "text-emerald-600" : kpi.status === "bad" ? "text-red-600" : "text-slate-500"
                      }`}
                    >
                      {kpi.change}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default: {
        const points =
          slide.points ||
          slide.items?.map((it: any) => (typeof it === "string" ? it : `${it.title || ""}: ${it.desc || ""}`)) ||
          slide.steps ||
          [];

        return (
          <div className="h-full p-8 flex flex-col bg-white">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-blue-700">{slide.title}</h2>
              {slide.subhead && <p className="text-xs text-slate-600 mt-1 font-medium">{slide.subhead}</p>}
            </div>
            <div className="flex-1 p-5 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto custom-scrollbar">
              <ul className="space-y-2 text-xs text-slate-700">
                {points.map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 툴바 */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs bg-blue-600 px-2.5 py-0.5 rounded-full">
              {currentIndex + 1} / {slides.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              [{currentSlide.type}] {currentSlide.title || "슬라이드"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotes((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                showNotes ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              <MessageSquare size={13} />
              <span>스피커 노트</span>
            </button>

            <button
              type="button"
              onClick={onExportPptx}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <Download size={13} />
              <span>PPTX 다운로드</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 16:9 슬라이드 화면 뷰어 */}
        <div className="p-6 flex flex-col items-center justify-center">
          <div className="w-full aspect-[16/9] max-h-[460px] rounded-xl overflow-hidden shadow-xl border border-slate-700 relative bg-white">
            {renderSlideContent(currentSlide)}

            {/* 좌/우 슬라이드 네비게이션 버튼 */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-xs transition"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-xs transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 스피커 노트 창 (토글 시) */}
          {showNotes && currentSlide.notes && (
            <div className="mt-3 w-full p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200">
              <div className="flex items-center gap-1 font-bold text-amber-400 mb-1">
                <MessageSquare size={12} />
                <span>발표자 스피커 노트 초안</span>
              </div>
              <p className="leading-relaxed">{currentSlide.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
