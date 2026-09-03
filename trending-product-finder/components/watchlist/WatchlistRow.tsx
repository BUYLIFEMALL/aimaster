"use client";

import { useState } from "react";
import { deleteWatchlistAction, toggleWatchlistActiveAction, type WatchlistEntry } from "@/lib/actions/watchlist";
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
        <div>
          <p className="text-sm font-bold text-gray-900">{categoryName}</p>
          <p className="text-xs text-gray-500">{keywords.join(", ")}</p>
        </div>
        <div className="flex items-center gap-2">
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
