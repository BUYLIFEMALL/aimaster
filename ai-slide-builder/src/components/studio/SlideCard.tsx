"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Sparkles, Loader2, Plus, Info } from "lucide-react";
import { BaseSlide } from "@/lib/types";

interface SlideCardProps {
  index: number;
  slide: BaseSlide;
  onUpdate: (index: number, updatedSlide: BaseSlide) => void;
  onDelete: (index: number) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onRegenerate: (index: number, userRequest: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isRegenerating: boolean;
  isBulkUpdating: boolean;
}

export default function SlideCard({
  index,
  slide,
  onUpdate,
  onDelete,
  onMove,
  onRegenerate,
  isFirst,
  isLast,
  isRegenerating,
  isBulkUpdating,
}: SlideCardProps) {
  const [userRequest, setUserRequest] = useState("");
  const isDisabled = isRegenerating || isBulkUpdating;

  const handleFieldChange = (field: string, value: any) => {
    onUpdate(index, { ...slide, [field]: value });
  };

  const handleArrayChange = (field: string, itemIndex: number, value: string) => {
    const newArray = [...(slide[field] || [])];
    newArray[itemIndex] = value;
    handleFieldChange(field, newArray);
  };

  const handleArrayItemAdd = (field: string, defaultValue: any = "새 항목") => {
    const newArray = [...(slide[field] || []), defaultValue];
    handleFieldChange(field, newArray);
  };

  const handleArrayItemDelete = (field: string, itemIndex: number) => {
    const newArray = (slide[field] || []).filter((_: any, i: number) => i !== itemIndex);
    handleFieldChange(field, newArray);
  };

  const handleComplexArrayChange = (
    field: string,
    itemIndex: number,
    subField: string,
    value: any
  ) => {
    const newArray = [...(slide[field] || [])];
    newArray[itemIndex] = { ...newArray[itemIndex], [subField]: value };
    handleFieldChange(field, newArray);
  };

  const renderField = (
    label: string,
    field: string,
    type: "text" | "textarea" | "number" = "text",
    placeholder?: string,
    description?: string
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={slide[field] || ""}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 transition"
          rows={2}
          disabled={isDisabled}
        />
      ) : (
        <input
          type={type}
          value={slide[field] || ""}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 transition"
          disabled={isDisabled}
        />
      )}
      {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
    </div>
  );

  const renderArrayField = (label: string, field: string) => (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <div className="space-y-1.5">
        {(slide[field] || []).map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={typeof item === "object" ? JSON.stringify(item) : item}
              onChange={(e) => handleArrayChange(field, i, e.target.value)}
              className="flex-1 text-xs p-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              disabled={isDisabled}
            />
            <button
              type="button"
              onClick={() => handleArrayItemDelete(field, i)}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 disabled:text-slate-300 transition"
              disabled={isDisabled}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleArrayItemAdd(field)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 mt-1 disabled:text-slate-400"
          disabled={isDisabled}
        >
          <Plus size={12} />
          <span>항목 추가</span>
        </button>
      </div>
    </div>
  );

  const renderObjectArrayField = (
    label: string,
    field: string,
    schema: { key: string; label: string; type?: "text" | "textarea" | "number" | "select"; options?: string[] }[],
    newItem: any
  ) => {
    const items = slide[field] || [];
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
        <div className="space-y-2">
          {items.map((item: any, itemIndex: number) => (
            <div key={itemIndex} className="p-2.5 border border-slate-200 rounded-lg bg-slate-50 space-y-1.5 relative">
              <button
                type="button"
                onClick={() => handleArrayItemDelete(field, itemIndex)}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-600 disabled:text-slate-300"
                disabled={isDisabled}
              >
                <Trash2 size={13} />
              </button>
              {schema.map(({ key, label: sLabel, type = "text", options }) => (
                <div key={key}>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">{sLabel}</label>
                  {type === "textarea" ? (
                    <textarea
                      value={item[key] || ""}
                      onChange={(e) => handleComplexArrayChange(field, itemIndex, key, e.target.value)}
                      rows={2}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-md bg-white disabled:bg-slate-100"
                      disabled={isDisabled}
                    />
                  ) : type === "select" ? (
                    <select
                      value={item[key] || ""}
                      onChange={(e) => handleComplexArrayChange(field, itemIndex, key, e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-md bg-white disabled:bg-slate-100"
                      disabled={isDisabled}
                    >
                      <option value="">선택...</option>
                      {options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={item[key] || ""}
                      onChange={(e) => handleComplexArrayChange(field, itemIndex, key, e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-md bg-white disabled:bg-slate-100"
                      disabled={isDisabled}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleArrayItemAdd(field, newItem)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:text-slate-400"
            disabled={isDisabled}
          >
            <Plus size={12} />
            <span>+ {label} 추가</span>
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const commonFields = (
      <div className="space-y-2">
        {renderField("슬라이드 제목", "title")}
        {renderField("핵심 메시지 (소제목 / So What?)", "subhead", "text", "핵심 결론 및 시사점")}
      </div>
    );

    switch (slide.type) {
      case "title":
        return (
          <div className="space-y-2">
            {renderField("프레젠테이션 제목", "title")}
            {renderField("부제목", "subhead")}
            {renderField("발표 일자", "date", "text", "YYYY.MM.DD")}
          </div>
        );
      case "section":
        return (
          <div className="space-y-2">
            {renderField("섹션 제목", "title")}
            {renderField("섹션 번호", "sectionNo", "number")}
          </div>
        );
      case "closing":
        return <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">맺음말 슬라이드</div>;
      case "content":
        return (
          <div className="space-y-2">
            {commonFields}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`twoCol-${index}`}
                checked={!!slide.twoColumn}
                onChange={(e) => handleFieldChange("twoColumn", e.target.checked)}
                disabled={isDisabled}
                className="h-3.5 w-3.5 text-blue-600 rounded"
              />
              <label htmlFor={`twoCol-${index}`} className="text-xs text-slate-700">
                2단 컬럼 레이아웃
              </label>
            </div>
            {slide.twoColumn
              ? renderField("컬럼 JSON", "columns", "textarea", '[["col1-1", "col1-2"], ["col2-1"]]')
              : renderArrayField("핵심 포인트 목록", "points")}
          </div>
        );
      case "agenda":
      case "process":
      case "processList":
        return (
          <div className="space-y-2">
            {commonFields}
            {renderArrayField(slide.type === "agenda" ? "아젠다 항목" : "단계별 프로세스", slide.type === "agenda" ? "items" : "steps")}
          </div>
        );
      case "compare":
        return (
          <div className="space-y-2">
            {commonFields}
            {renderField("왼쪽 영역 제목", "leftTitle")}
            {renderArrayField("왼쪽 항목들", "leftItems")}
            {renderField("오른쪽 영역 제목", "rightTitle")}
            {renderArrayField("오른쪽 항목들", "rightItems")}
          </div>
        );
      case "timeline":
        return (
          <div className="space-y-2">
            {commonFields}
            {renderObjectArrayField(
              "타임라인 마일스톤",
              "milestones",
              [
                { key: "label", label: "단계/내용" },
                { key: "date", label: "일정/기간" },
                { key: "state", label: "진행 상태", type: "select", options: ["done", "next", "todo"] },
              ],
              { label: "", date: "", state: "todo" }
            )}
          </div>
        );
      case "cards":
      case "headerCards":
        return (
          <div className="space-y-2">
            {commonFields}
            {renderField("컬럼 수 (2 또는 3)", "columns", "number")}
            {renderObjectArrayField(
              "카드 목록",
              "items",
              [
                { key: "title", label: "카드 제목" },
                { key: "desc", label: "상세 설명", type: "textarea" },
              ],
              { title: "", desc: "" }
            )}
          </div>
        );
      case "kpi":
        return (
          <div className="space-y-2">
            {commonFields}
            {renderObjectArrayField(
              "KPI 지표 카드",
              "items",
              [
                { key: "label", label: "지표명" },
                { key: "value", label: "측정 수치" },
                { key: "change", label: "변화율/달성도" },
                { key: "status", label: "상태", type: "select", options: ["good", "bad", "neutral"] },
              ],
              { label: "", value: "", change: "", status: "neutral" }
            )}
          </div>
        );
      case "barCompare":
      case "statsCompare":
        return (
          <div className="space-y-2">
            {commonFields}
            {renderField("왼쪽 제목 (As-Is)", "leftTitle")}
            {renderField("오른쪽 제목 (To-Be)", "rightTitle")}
            {renderObjectArrayField(
              "비교 통계 지표",
              "stats",
              [
                { key: "label", label: "비교 항목" },
                { key: "leftValue", label: "As-Is 수치" },
                { key: "rightValue", label: "To-Be 수치" },
                { key: "trend", label: "추세", type: "select", options: ["up", "down", "neutral"] },
              ],
              { label: "", leftValue: "", rightValue: "", trend: "neutral" }
            )}
          </div>
        );
      case "table":
        return (
          <div className="space-y-2">
            {commonFields}
            {renderArrayField("테이블 헤더", "headers")}
            {renderField("행 데이터 (JSON 2차원 배열)", "rows", "textarea", '[["값1", "값2"], ["값3", "값4"]]')}
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            {commonFields}
            {slide.points && renderArrayField("포인트 목록", "points")}
            {slide.items && renderArrayField("항목 목록", "items")}
          </div>
        );
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-xs hover:shadow-md transition-shadow overflow-hidden">
      {/* 카드 상단 바 */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-slate-100/80 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-slate-800">#{index + 1}</span>
          <span className="font-mono text-[11px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-blue-700">
            {slide.type}
          </span>
          <span className="text-xs text-slate-500 font-medium truncate max-w-[180px]">
            {slide.title || "제목 없음"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(index, "up")}
            disabled={isFirst || isDisabled}
            title="위로 이동"
            className="p-1 text-slate-600 hover:text-slate-900 disabled:text-slate-300 rounded hover:bg-slate-200 transition"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, "down")}
            disabled={isLast || isDisabled}
            title="아래로 이동"
            className="p-1 text-slate-600 hover:text-slate-900 disabled:text-slate-300 rounded hover:bg-slate-200 transition"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(index)}
            disabled={isDisabled}
            title="슬라이드 삭제"
            className="p-1 text-slate-400 hover:text-red-600 disabled:text-slate-300 rounded hover:bg-red-50 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 카드 본문 폼 */}
      <div className="p-4 space-y-3.5">
        {renderContent()}

        {slide.type !== "closing" && (
          <div className="pt-2 border-t border-slate-100">
            {renderField("자료 출처 (Source)", "source", "text", "[자료출처: OOO 보고서]")}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          {renderField("발표자 스피커 노트 (Notes)", "notes", "textarea", "발표자가 말해야 할 원고 내용 초안")}
        </div>

        {/* AI 개별 수정 패널 */}
        <div className="pt-3 border-t border-slate-100 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
          <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1">
            <Sparkles size={12} className="text-blue-600" />
            AI에게 이 슬라이드 수정 요청하기
          </label>
          <textarea
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            placeholder="예: 핵심 메시지를 더 임팩트 있게 바꾸고 포인트를 3개로 압축해줘."
            className="w-full text-xs p-2 border border-blue-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            rows={2}
            disabled={isDisabled}
          />
          <button
            type="button"
            onClick={() => onRegenerate(index, userRequest)}
            disabled={!userRequest.trim() || isDisabled}
            className="mt-2 w-full py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-md transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {isRegenerating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>AI 수정 반영 중...</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                <span>🤖 AI로 이 카드 수정하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
