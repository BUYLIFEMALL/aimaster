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
    <div className="bg-mx-surface border border-mx-border rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-mx-text">{categoryName}</p>
          {!isEditingKeywords && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <p className="text-xs text-mx-muted">{keywords.join(", ")}</p>
              <button
                onClick={startEditingKeywords}
                className="shrink-0 text-[11px] text-mx-link hover:text-mx-text"
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
              isActive ? "bg-mx-primary hover:bg-[#1d4ed8]" : "bg-mx-danger hover:bg-[#e11d48]"
            }`}
          >
            {isActive ? "ON" : "OFF"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-mx-danger hover:text-mx-danger disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>

      {isEditingKeywords && (
        <div className="rounded-xl border-2 border-mx-primary/40 bg-mx-primary/10 p-3">
          <div className="flex flex-wrap gap-1.5">
            {editKeywords.map((k) => (
              <span
                key={k}
                className="flex items-center gap-1 rounded-full border border-mx-primary/40 bg-mx-surface px-2.5 py-1 text-xs font-semibold text-mx-link"
              >
                {k}
                <button
                  type="button"
                  onClick={() => removeEditKeyword(k)}
                  className="text-mx-link hover:text-mx-danger"
                  aria-label={`${k} 삭제`}
                >
                  ×
                </button>
              </span>
            ))}
            {editKeywords.length === 0 && <p className="text-[11px] text-mx-muted">키워드가 없습니다. 추가해주세요.</p>}
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
              className="shrink-0 rounded-lg border border-mx-primary/40 bg-mx-surface px-2.5 py-1 text-xs font-bold text-mx-link hover:bg-mx-primary/20 disabled:opacity-50"
            >
              추가
            </button>
          </div>
          {editKeywords.length >= 10 && <p className="mt-1 text-[11px] text-mx-accent">최대 10개까지 등록할 수 있어요.</p>}
          {keywordsError && <p className="mt-1 text-[11px] text-mx-danger">{keywordsError}</p>}
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={saveEditKeywords}
              disabled={isSavingKeywords}
              className="rounded-lg bg-mx-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {isSavingKeywords ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingKeywords(false)}
              disabled={isSavingKeywords}
              className="rounded-lg border border-mx-border bg-mx-surface px-3 py-1.5 text-xs font-bold text-mx-muted hover:bg-[#262c3a] disabled:opacity-60"
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
          className="rounded-lg bg-mx-success/10 px-3 py-1.5 text-xs font-bold text-mx-success hover:bg-mx-success/20 disabled:opacity-60"
        >
          {isGenerating ? "리포트 생성 중..." : "지금 리포트 생성"}
        </button>
        {genSuccess && <span className="text-xs text-mx-success">완료! 리포트 페이지에서 확인하세요.</span>}
      </div>
      {genError && <p className="text-xs text-mx-danger">{genError}</p>}
      {rowError && <p className="text-xs text-mx-danger">{rowError}</p>}

      <SourcingAlertControls entry={entry} onUpdated={onUpdated} />
    </div>
  );
}
