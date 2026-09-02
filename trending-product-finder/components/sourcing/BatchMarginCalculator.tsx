"use client";

import { useMemo, useState } from "react";
import { runBatchMarginCalculationAction, type BatchMarginRow, type BatchMarginSkip, type Platform } from "@/lib/actions/batchMargin";

interface WatchlistGroup {
  categoryName: string;
  keywords: string[];
}

interface BatchMarginCalculatorProps {
  watchlistGroups: WatchlistGroup[];
  registeredPlatforms: Platform[];
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "aliexpress", label: "🌏 알리익스프레스" },
  { value: "domeggook", label: "🏠 도매매" },
  { value: "elevenst", label: "🏪 11번가" },
];

const MAX_KEYWORDS = 20;

function toCsv(rows: BatchMarginRow[]): string {
  const platformLabel: Record<Platform, string> = { aliexpress: "알리익스프레스", domeggook: "도매매", elevenst: "11번가" };
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["키워드", "채널", "상품명(최저가 기준)", "원가(원)", "예상판매가(원)", "마진율(%)", "마진(원)", "상품링크"];
  const lines = [header.map(escape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.keyword,
        platformLabel[r.platform],
        r.title,
        r.sourcePriceKrw,
        r.sellingPriceKrw,
        r.marginRatePct,
        r.contributionProfitKrw,
        r.detailUrl,
      ]
        .map(escape)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}

export function BatchMarginCalculator({ watchlistGroups, registeredPlatforms }: BatchMarginCalculatorProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [manualInput, setManualInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set<Platform>(registeredPlatforms.length > 0 ? registeredPlatforms : ["aliexpress"]),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchMarginRow[] | null>(null);
  const [skipped, setSkipped] = useState<BatchMarginSkip[]>([]);

  const manualKeywords = useMemo(
    () =>
      manualInput
        .split(/[,\n]/)
        .map((k) => k.trim())
        .filter(Boolean),
    [manualInput],
  );

  const totalSelected = selectedKeywords.size + manualKeywords.length;

  function toggleKeyword(keyword: string) {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }

  function toggleCategory(keywords: string[]) {
    const allSelected = keywords.every((k) => selectedKeywords.has(k));
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (allSelected) keywords.forEach((k) => next.delete(k));
      else keywords.forEach((k) => next.add(k));
      return next;
    });
  }

  function togglePlatform(p: Platform) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return prev;
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  async function handleRun() {
    const keywords = Array.from(new Set([...Array.from(selectedKeywords), ...manualKeywords]));
    if (keywords.length === 0) {
      setError("키워드를 1개 이상 선택하거나 직접 입력해주세요.");
      return;
    }
    if (keywords.length > MAX_KEYWORDS) {
      setError(`한 번에 최대 ${MAX_KEYWORDS}개 키워드까지 계산할 수 있습니다. 현재 ${keywords.length}개 선택됨.`);
      return;
    }
    setError(null);
    setIsRunning(true);
    setRows(null);
    setSkipped([]);
    try {
      const formData = new FormData();
      formData.set("keywords", JSON.stringify(keywords));
      formData.set("platforms", JSON.stringify(Array.from(selectedPlatforms)));
      const result = await runBatchMarginCalculationAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRows(result.rows ?? []);
      setSkipped(result.skipped ?? []);
    } finally {
      setIsRunning(false);
    }
  }

  function handleDownloadCsv() {
    if (!rows || rows.length === 0) return;
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `상품소싱_일괄마진계산_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-base font-extrabold text-gray-900">📋 관심 키워드 일괄 마진계산</p>
        <p className="mt-1 text-xs text-gray-500">
          선택한 키워드마다 채널별로 검색해 <span className="font-semibold text-gray-700">최저가 상품을 대표값</span>
          으로 마진을 한 번에 계산합니다(예상 판매가는 원가×2.5 기준 추정치). 정확한 최종 결정은
          아래 상세 계산기에서 상품을 직접 골라 다시 확인해주세요.
        </p>
      </div>

      {/* 키워드 선택 */}
      {watchlistGroups.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          등록된 관심 키워드가 없습니다. 아래 직접 입력란에 키워드를 추가해서 계산할 수 있습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {watchlistGroups.map((group) => {
            const allSelected = group.keywords.length > 0 && group.keywords.every((k) => selectedKeywords.has(k));
            return (
              <div key={group.categoryName} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.keywords)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                      allSelected ? "border-sky-500 bg-sky-500 text-white" : "border-gray-300 bg-white text-gray-500 hover:border-sky-300"
                    }`}
                  >
                    {allSelected ? "전체 해제" : "전체 선택"}
                  </button>
                  <p className="text-xs font-bold text-gray-700">{group.categoryName}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.keywords.map((keyword) => {
                    const checked = selectedKeywords.has(keyword);
                    return (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => toggleKeyword(keyword)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          checked ? "border-sky-500 bg-sky-500 text-white" : "border-gray-300 bg-white text-gray-600 hover:border-sky-300"
                        }`}
                      >
                        {keyword}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-gray-700">직접 키워드 추가 (쉼표 또는 줄바꿈으로 구분, 선택)</span>
        <textarea
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          rows={2}
          placeholder="예: 무선청소기, 캠핑의자"
          className="input w-full text-sm"
        />
      </label>

      {/* 채널 선택 */}
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const checked = selectedPlatforms.has(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => togglePlatform(p.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                checked ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-300 bg-white text-gray-500 hover:border-sky-200"
              }`}
            >
              {checked ? "✓ " : ""}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 실행 직전 미리보기 — "선택했던 걸 깜빡 잊고 새 키워드만 검색한 줄 알았는데 다 같이 돌아갔다"는
          혼선을 막기 위해, 체크박스 선택 + 직접입력이 합쳐진 최종 실행 대상을 항상 눈에 보이게 한다. */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-bold text-sky-800">🎯 이번에 계산할 키워드 ({totalSelected}개)</p>
          {totalSelected > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedKeywords(new Set());
                setManualInput("");
              }}
              className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline"
            >
              전체 해제
            </button>
          )}
        </div>
        {totalSelected === 0 ? (
          <p className="text-xs text-gray-400">관심 키워드를 선택하거나 직접 입력하면 여기에 표시됩니다.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedKeywords).map((k) => (
              <span
                key={`w-${k}`}
                className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white"
              >
                {k}
                <button type="button" onClick={() => toggleKeyword(k)} className="hover:text-sky-200" aria-label={`${k} 선택 해제`}>
                  ✕
                </button>
              </span>
            ))}
            {manualKeywords.map((k) => (
              <span
                key={`m-${k}`}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white"
                title="직접 입력한 키워드"
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {isRunning ? "계산 중..." : `일괄 계산 실행 (${totalSelected}개 키워드)`}
        </button>
        {rows && rows.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
          >
            📥 CSV 다운로드
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {skipped.length > 0 && (
        <details className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <summary className="cursor-pointer font-semibold">건너뛴 항목 {skipped.length}건 (펼쳐서 보기)</summary>
          <ul className="mt-1.5 space-y-0.5">
            {skipped.map((s, i) => (
              <li key={i}>
                {s.keyword} · {PLATFORMS.find((p) => p.value === s.platform)?.label} — {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="whitespace-nowrap px-3 py-2 font-semibold">키워드</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">채널</th>
                <th className="px-3 py-2 font-semibold">상품명(최저가)</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">원가</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">예상 판매가</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">마진율</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">마진(수익)</th>
                <th className="px-3 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.keyword}-${r.platform}-${i}`} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{r.keyword}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{PLATFORMS.find((p) => p.value === r.platform)?.label}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-gray-700" title={r.title}>
                    {r.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700">{r.sourcePriceKrw.toLocaleString()}원</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700">{r.sellingPriceKrw.toLocaleString()}원</td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums font-bold ${
                      r.marginRatePct >= 20 ? "text-emerald-600" : r.marginRatePct >= 0 ? "text-amber-600" : "text-red-600"
                    }`}
                  >
                    {r.marginRatePct}%
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700">{r.contributionProfitKrw.toLocaleString()}원</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {r.detailUrl && (
                      <a
                        href={r.detailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                      >
                        🔗 링크
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows && rows.length === 0 && !error && (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">계산된 결과가 없습니다. 위 건너뛴 항목을 확인해주세요.</p>
      )}
    </div>
  );
}
