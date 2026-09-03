"use client";

import { useState } from "react";
import {
  deleteWatchlistAction,
  toggleWatchlistActiveAction,
  updateWatchlistKeywordsAction,
  type WatchlistEntry,
} from "@/lib/actions/watchlist";
import { generateReportAction } from "@/lib/actions/reports";
import { SourcingAlertControls } from "./SourcingAlertControls";

interface WatchlistRowProps {
  entry: WatchlistEntry;
  onUpdated: (entry: WatchlistEntry) => void;
  onDeleted: (id: string) => void;
}

export function WatchlistRow({ entry, onUpdated, onDeleted }: WatchlistRowProps) {
  const { id, categoryName, keywords, isActive } = entry;
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editKeywords, setEditKeywords] = useState<string[]>(keywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  function startEditingKeywords() {
    setEditKeywords(keywords);
    setNewKeyword("");
    setKeywordsError(null);
    setIsEditingKeywords(true);
  }

  function removeEditKeyword(target: string) {
    setEditKeywords((prev) => prev.filter((k) => k !== target));
  }

  function addEditKeyword() {
    const value = newKeyword.trim();
    if (!value) return;
    if (editKeywords.includes(value)) {
      setNewKeyword("");
      return;
    }
    setEditKeywords((prev) => [...prev, value]);
    setNewKeyword("");
  }

  async function saveEditKeywords() {
    setKeywordsError(null);
    if (editKeywords.length === 0) {
      setKeywordsError("키워드가 1개 이상 있어야 해요. 전부 지우려면 이 카테고리 자체를 삭제해주세요.");
      return;
    }
    setIsSavingKeywords(true);
    try {
      const formData = new FormData();
      formData.set("id", id);
      editKeywords.forEach((k) => formData.append("keywords", k));
      const result = await updateWatchlistKeywordsAction(formData);
      if (result.error) {
        setKeywordsError(result.error);
      } else if (result.entry) {
        onUpdated(result.entry);
        setIsEditingKeywords(false);
      }
    } finally {
      setIsSavingKeywords(false);
    }
  }

  async function handleGenerate() {
    setGenError(null);
    setGenSuccess(false);
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.set("watchlistId", id);
      const result = await generateReportAction(formData);
      if (result?.error) {
        setGenError(result.error);
      } else {
        setGenSuccess(true);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleToggle() {
    setRowError(null);
    setIsToggling(true);
    try {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("nextActive", (!isActive).toString());
      const result = await toggleWatchlistActiveAction(formData);
      if (result.error) {
        setRowError(result.error);
      } else if (result.entry) {
        onUpdated(result.entry);
      }
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    setRowError(null);
    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deleteWatchlistAction(formData);
      if (result.error) {
        setRowError(result.error);
        setIsDeleting(false);
      } else {
        onDeleted(id);
      }
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{categoryName}</p>
          {!isEditingKeywords && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <p className="text-xs text-gray-500">{keywords.join(", ")}</p>
              <button
                onClick={startEditingKeywords}
                className="shrink-0 text-[11px] text-sky-600 hover:text-sky-800"
              >
                ✏️ 키워드 수정
              </button>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`rounded-full px-3 py-1 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
              isActive ? "bg-sky-600 hover:bg-sky-700" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isActive ? "ON" : "OFF"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>

      {isEditingKeywords && (
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-3">
          <div className="flex flex-wrap gap-1.5">
            {editKeywords.map((k) => (
              <span
                key={k}
                className="flex items-center gap-1 rounded-full border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700"
              >
                {k}
                <button
                  type="button"
                  onClick={() => removeEditKeyword(k)}
                  className="text-sky-400 hover:text-red-500"
                  aria-label={`${k} 삭제`}
                >
                  ×
                </button>
              </span>
            ))}
            {editKeywords.length === 0 && <p className="text-[11px] text-gray-400">키워드가 없습니다. 추가해주세요.</p>}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEditKeyword();
                }
              }}
              placeholder="추가할 키워드 입력 후 Enter"
              disabled={editKeywords.length >= 10}
              className="input-sm flex-1 text-xs"
            />
            <button
              type="button"
              onClick={addEditKeyword}
              disabled={editKeywords.length >= 10}
              className="shrink-0 rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
            >
              추가
            </button>
          </div>
          {editKeywords.length >= 10 && <p className="mt-1 text-[11px] text-amber-600">최대 10개까지 등록할 수 있어요.</p>}
          {keywordsError && <p className="mt-1 text-[11px] text-red-600">{keywordsError}</p>}
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={saveEditKeywords}
              disabled={isSavingKeywords}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {isSavingKeywords ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingKeywords(false)}
              disabled={isSavingKeywords}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              취소
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
        >
          {isGenerating ? "리포트 생성 중..." : "지금 리포트 생성"}
        </button>
        {genSuccess && <span className="text-xs text-emerald-600">완료! 리포트 페이지에서 확인하세요.</span>}
      </div>
      {genError && <p className="text-xs text-red-600">{genError}</p>}
      {rowError && <p className="text-xs text-red-600">{rowError}</p>}

      <SourcingAlertControls entry={entry} onUpdated={onUpdated} />
    </div>
  );
}
