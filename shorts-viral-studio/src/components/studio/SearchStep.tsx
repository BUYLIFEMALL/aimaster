"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { searchShortsAction } from "@/lib/actions/svs";
import { GRADE_STYLE, formatDuration, formatNumber } from "@/lib/youtube/metrics";
import { useStudio } from "@/components/studio/StudioProvider";
import { Card, ErrorBanner, GhostButton, PrimaryButton, StepHeader } from "@/components/studio/ui";
import type { SearchOrder, ShortVideo } from "@/types/svs";

const MAX_SELECT = 3;

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCsv(videos: ShortVideo[]) {
  const header = ["제목", "채널", "게시일", "길이(초)", "조회수", "구독자", "조회수÷구독자", "채널평균대비", "하루평균조회", "참여율(%)", "떡상점수", "등급", "링크"];
  const rows = videos.map((v) => [
    v.title,
    v.channelName,
    v.publishedAt.slice(0, 10),
    v.durationSec,
    v.views,
    v.subs,
    v.vsRatio === null ? "" : v.vsRatio.toFixed(2),
    v.outlier.toFixed(2),
    Math.round(v.viewsPerDay),
    v.engRate.toFixed(2),
    v.viralScore,
    v.grade,
    `https://www.youtube.com/shorts/${v.id}`,
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `shorts_search_${isoDay(0)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-rose-500 focus:outline-none";

export function SearchStep() {
  const router = useRouter();
  const { hydrated, data, update, saveProject, requireKey } = useStudio();
  const { search, filters, videos, selectedIds } = data;
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기본 게시 기간: 최근 30일
  useEffect(() => {
    if (hydrated && !search.dateFrom && !search.dateTo && videos.length === 0) {
      update((d) => ({ search: { ...d.search, dateFrom: isoDay(-30), dateTo: isoDay(0) } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const filtered = useMemo(() => {
    const from = search.dateFrom ? new Date(`${search.dateFrom}T00:00:00`) : null;
    const to = search.dateTo ? new Date(`${search.dateTo}T23:59:59`) : null;
    const maxDur = filters.maxDuration === "all" ? null : Number(filters.maxDuration);
    const minViews = filters.minViews ? Number(filters.minViews) : null;
    const maxSubs = filters.maxSubs ? Number(filters.maxSubs) : null;

    return videos
      .filter((v) => {
        const at = new Date(v.publishedAt);
        if (from && at < from) return false;
        if (to && at > to) return false;
        if (maxDur !== null && v.durationSec > maxDur) return false;
        if (minViews !== null && v.views < minViews) return false;
        if (maxSubs !== null && (v.subs === null || v.subs > maxSubs)) return false;
        return true;
      })
      .sort((a, b) => b.viralScore - a.viralScore);
  }, [videos, search.dateFrom, search.dateTo, filters]);

  function applyPreset(kind: "viral" | "small" | "trending" | "reset") {
    const base = { ...filters };
    if (kind === "viral") {
      update({
        search: { ...search, dateFrom: isoDay(-7), dateTo: isoDay(0) },
        filters: { ...base, maxDuration: "180", minViews: "50000", maxSubs: "" },
      });
    } else if (kind === "small") {
      update({
        search: { ...search, dateFrom: isoDay(-30), dateTo: isoDay(0) },
        filters: { ...base, maxDuration: "180", minViews: "10000", maxSubs: "50000" },
      });
    } else if (kind === "trending") {
      update({
        search: { ...search, dateFrom: isoDay(-1), dateTo: isoDay(0) },
        filters: { ...base, maxDuration: "180", minViews: "5000", maxSubs: "" },
      });
    } else {
      update({
        search: { ...search, dateFrom: isoDay(-30), dateTo: isoDay(0) },
        filters: { maxDuration: "180", minViews: "", maxSubs: "" },
      });
    }
  }

  async function runSearch() {
    setError(null);
    if (!search.query.trim()) {
      setError("검색어를 입력해 주세요. (예: 다이어트, 재테크, 여행)");
      return;
    }
    setSearching(true);
    const res = await searchShortsAction({
      query: search.query,
      dateFrom: search.dateFrom || undefined,
      dateTo: search.dateTo || undefined,
      order: search.order,
    });
    setSearching(false);
    if (!res.success || !res.data) {
      if (res.needApiKey) requireKey(res.missingProvider);
      setError(res.error ?? "검색에 실패했습니다.");
      return;
    }
    // 새 검색이면 이전 분석 결과와 선택은 초기화합니다.
    update({
      videos: res.data,
      selectedIds: [],
      analysis: null,
      ideas: [],
      selectedIdea: null,
      scenes: [],
      promptsResult: null,
    });
    if (res.data.length === 0) setError("검색 결과가 없습니다. 검색어나 기간을 바꿔 보세요.");
  }

  function toggle(id: string) {
    const has = selectedIds.includes(id);
    if (!has && selectedIds.length >= MAX_SELECT) {
      setError(`분석은 한 번에 최대 ${MAX_SELECT}개까지 선택할 수 있습니다.`);
      return;
    }
    setError(null);
    update({ selectedIds: has ? selectedIds.filter((x) => x !== id) : [...selectedIds, id] });
  }

  async function goAnalyze() {
    await saveProject();
    router.push("/analyze?run=1");
  }

  return (
    <div className="space-y-5">
      <StepHeader
        step={1}
        title="떡상 쇼츠 검색"
        desc="키워드로 쇼츠를 찾고, 구독자 대비 조회수가 터진 영상을 골라 분석합니다."
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search.query}
            onChange={(e) => update({ search: { ...search, query: e.target.value } })}
            onKeyDown={(e) => e.key === "Enter" && !searching && runSearch()}
            placeholder="검색어 (예: 다이어트, 재테크, 여행, 자취)"
            className={`${inputCls} flex-1`}
          />
          <PrimaryButton onClick={runSearch} disabled={searching} className="sm:w-40">
            {searching ? "검색 중…" : "쇼츠 검색"}
          </PrimaryButton>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-xs font-bold text-neutral-500">프리셋</span>
          <button type="button" onClick={() => applyPreset("viral")} className="font-semibold text-rose-600 hover:underline">🔥 지금 떡상</button>
          <span className="text-neutral-300">|</span>
          <button type="button" onClick={() => applyPreset("small")} className="font-semibold text-rose-600 hover:underline">🚀 작은 채널 대박</button>
          <span className="text-neutral-300">|</span>
          <button type="button" onClick={() => applyPreset("trending")} className="font-semibold text-rose-600 hover:underline">⚡ 급상승</button>
          <span className="text-neutral-300">|</span>
          <button type="button" onClick={() => applyPreset("reset")} className="text-xs text-neutral-500 underline">초기화</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-semibold text-neutral-500 lg:col-span-2">
            게시 기간
            <div className="mt-1 flex items-center gap-1.5">
              <input type="date" value={search.dateFrom} onChange={(e) => update({ search: { ...search, dateFrom: e.target.value } })} className={inputCls} />
              <span>~</span>
              <input type="date" value={search.dateTo} onChange={(e) => update({ search: { ...search, dateTo: e.target.value } })} className={inputCls} />
            </div>
          </label>
          <label className="text-xs font-semibold text-neutral-500">
            검색 정렬
            <select value={search.order} onChange={(e) => update({ search: { ...search, order: e.target.value as SearchOrder } })} className={`${inputCls} mt-1`}>
              <option value="viewCount">조회수 높은 순</option>
              <option value="relevance">관련도 순</option>
              <option value="date">최신 순</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-neutral-500">
            영상 길이
            <select value={filters.maxDuration} onChange={(e) => update({ filters: { ...filters, maxDuration: e.target.value } })} className={`${inputCls} mt-1`}>
              <option value="60">1분 이내</option>
              <option value="180">3분 이내 (쇼츠 최대)</option>
              <option value="all">전체</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-neutral-500">
              최소 조회수
              <input type="number" min={0} value={filters.minViews} onChange={(e) => update({ filters: { ...filters, minViews: e.target.value } })} placeholder="10000" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-xs font-semibold text-neutral-500">
              최대 구독자
              <input type="number" min={0} value={filters.maxSubs} onChange={(e) => update({ filters: { ...filters, maxSubs: e.target.value } })} placeholder="50000" className={`${inputCls} mt-1`} />
            </label>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
          💡 검색 1회는 YouTube 할당량 약 100유닛을 사용합니다(기본 하루 1만유닛 ≈ 100회). 필터는 이미 가져온 결과에 바로 적용되며 추가 할당량을 쓰지 않습니다.
        </p>
      </Card>

      <ErrorBanner message={error} />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-neutral-900">
            검색 결과 <span className="text-xs font-normal text-neutral-400">({filtered.length}개 / 전체 {videos.length}개)</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">선택 {selectedIds.length}/{MAX_SELECT}</span>
            <GhostButton onClick={() => exportCsv(filtered)} disabled={filtered.length === 0} className="py-2 text-xs">📥 CSV 내보내기</GhostButton>
            <PrimaryButton onClick={goAnalyze} disabled={selectedIds.length === 0} className="py-2 text-xs">
              선택 영상 분석하기 ➔
            </PrimaryButton>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            {videos.length === 0 ? "아직 검색 결과가 없습니다. 키워드를 입력해 검색해 보세요." : "조건에 맞는 영상이 없습니다. 필터를 조정해 보세요."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="w-8 p-2" />
                  <th className="p-2">영상</th>
                  <th className="p-2">조회수</th>
                  <th className="p-2">구독자</th>
                  <th className="p-2">조회÷구독</th>
                  <th className="p-2">채널평균 대비</th>
                  <th className="p-2">하루 조회</th>
                  <th className="p-2">등급</th>
                  <th className="p-2">점수</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-neutral-100 align-middle hover:bg-neutral-50/70">
                    <td className="p-2">
                      <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggle(v.id)} className="h-4 w-4 accent-rose-600" />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-3">
                        <a href={`https://www.youtube.com/shorts/${v.id}`} target="_blank" rel="noreferrer" className="relative block h-[68px] w-[120px] shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.thumbnail} alt="" className="h-full w-full rounded-lg object-cover" />
                          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-white">{formatDuration(v.durationSec)}</span>
                        </a>
                        <div className="min-w-0">
                          <div className="line-clamp-2 max-w-[280px] text-[13px] font-semibold text-neutral-900" title={v.title}>{v.title}</div>
                          <div className="mt-0.5 text-[11px] text-neutral-500">{v.channelName} · {new Date(v.publishedAt).toLocaleDateString("ko-KR")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 font-semibold">{formatNumber(v.views)}</td>
                    <td className="p-2 text-neutral-500">{formatNumber(v.subs)}</td>
                    <td className="p-2">{v.vsRatio === null ? "-" : `${v.vsRatio.toFixed(1)}배`}</td>
                    <td className="p-2">{v.outlier.toFixed(1)}배</td>
                    <td className="p-2">{formatNumber(Math.round(v.viewsPerDay))}/일</td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${GRADE_STYLE[v.grade]}`}>{v.grade}</span>
                    </td>
                    <td className="p-2 text-xs font-bold text-neutral-700">{v.viralScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-neutral-400">
          등급 기준(조회수÷구독자): 초대박 10배↑ · 대박 5배↑ · 떡상 3배↑ · 양호 1배↑. 구독자 비공개 채널은 판정불가입니다. 점수는 채널평균 대비·구독자 대비·조회 속도·참여율·최신성을 합산한 참고 지표입니다.
        </p>
      </Card>
    </div>
  );
}
