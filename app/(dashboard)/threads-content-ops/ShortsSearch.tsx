"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, ExternalLink, Play, Search } from "lucide-react";
import { saveShortAsViralCandidate, searchViralShorts } from "./web-actions";

type Video = {
  id: string;
  title: string;
  channelName: string;
  thumbnail: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  subs: number | null;
  vsRatio: number | null;
  viewsPerDay: number;
  outlier: number;
  viralScore: number;
  grade: string;
};

const GRADE_TONE: Record<string, string> = {
  초대박: "bg-rose-600 text-[#ffffff]",
  대박: "bg-orange-500 text-[#ffffff]",
  떡상: "bg-amber-300 text-amber-950",
  양호: "bg-emerald-100 text-emerald-800",
  보통: "bg-neutral-100 text-neutral-600",
  판정불가: "bg-neutral-100 text-neutral-400",
};

const inputClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400";

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

function formatNumber(value: number | null): string {
  if (value === null) return "비공개";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}만`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}천`;
  return value.toLocaleString("ko-KR");
}

function formatDuration(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(Math.round(totalSeconds % 60)).padStart(2, "0")}`;
}

export default function ShortsSearch({ hasYoutubeKey, savedSources }: { hasYoutubeKey: boolean; savedSources: string[] }) {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState(() => isoDay(-30));
  const [dateTo, setDateTo] = useState(() => isoDay(0));
  const [order, setOrder] = useState("viewCount");
  const [maxDuration, setMaxDuration] = useState("180");
  const [minViews, setMinViews] = useState("");
  const [maxSubs, setMaxSubs] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedNow, setSavedNow] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const saved = useMemo(() => new Set([...savedSources, ...savedNow.map((id) => `https://www.youtube.com/shorts/${id}`)]), [savedSources, savedNow]);

  const filtered = useMemo(() => {
    const maxSeconds = maxDuration === "all" ? null : Number(maxDuration);
    const viewsFloor = minViews ? Number(minViews) : null;
    const subsCeiling = maxSubs ? Number(maxSubs) : null;
    return videos
      .filter((video) => {
        if (maxSeconds !== null && video.durationSec > maxSeconds) return false;
        if (viewsFloor !== null && video.views < viewsFloor) return false;
        if (subsCeiling !== null && (video.subs === null || video.subs > subsCeiling)) return false;
        return true;
      })
      .sort((a, b) => b.viralScore - a.viralScore);
  }, [videos, maxDuration, minViews, maxSubs]);

  const preset = (kind: "viral" | "small" | "trending") => {
    setMaxDuration("180");
    if (kind === "viral") { setDateFrom(isoDay(-7)); setMinViews("50000"); setMaxSubs(""); }
    if (kind === "small") { setDateFrom(isoDay(-30)); setMinViews("10000"); setMaxSubs("50000"); }
    if (kind === "trending") { setDateFrom(isoDay(-1)); setMinViews("5000"); setMaxSubs(""); }
    setDateTo(isoDay(0));
  };

  const search = async () => {
    if (searching) return;
    setSearching(true);
    setMessage(null);
    try {
      const result = await searchViralShorts({ query, dateFrom, dateTo, order });
      if (result.ok) {
        setVideos(result.videos);
        setSearchedQuery(query.trim());
        if (!result.videos.length) setMessage({ ok: false, text: "검색 결과가 없습니다. 검색어나 기간을 바꿔 보세요." });
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "검색 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setSearching(false);
    }
  };

  const save = async (video: Video) => {
    setSavingId(video.id);
    setMessage(null);
    try {
      const result = await saveShortAsViralCandidate({
        id: video.id, title: video.title, channelName: video.channelName, views: video.views, subs: video.subs,
        vsRatio: video.vsRatio, grade: video.grade, publishedAt: video.publishedAt, searchQuery: searchedQuery,
      });
      if (result.ok) {
        setSavedNow((current) => [...current, video.id]);
        setMessage({ ok: true, text: "글감으로 저장했습니다. 아래 '수집한 글감' 목록에서 이 글감으로 작성할 수 있습니다." });
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "글감을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setSavingId(null);
    }
  };

  return <section className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-5 shadow-sm">
    <h3 className="flex items-center gap-2 font-bold text-neutral-900"><Play size={18} className="text-gold" />유튜브 쇼츠 검색</h3>
    <p className="mt-2 text-sm leading-relaxed text-neutral-600">키워드로 쇼츠를 찾고, 구독자 대비 조회수가 크게 터진 영상을 골라 글감으로 저장합니다. 영상의 내용을 가져오는 것이 아니라 제목·조회수 같은 수치와 링크만 남기며, 글은 내 말투로 새로 쓰도록 안내합니다.</p>
    {!hasYoutubeKey && <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span>YouTube Data API 키가 등록되지 않았습니다. <Link className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동</Link>에서 본인 키를 저장해 주세요.</span></p>}

    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input className={inputClass} maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && query.trim() && hasYoutubeKey) void search(); }} placeholder="검색어 (예: 다이어트, 재테크, 여행, 자취)" aria-label="쇼츠 검색어" />
      <button type="button" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={searching || !hasYoutubeKey || !query.trim()} onClick={() => void search()}><Search size={16} />{searching ? "검색 중…" : "쇼츠 검색"}</button>
    </div>

    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-xs font-bold text-neutral-500">프리셋</span>
      <button type="button" onClick={() => preset("viral")} className="font-semibold text-rose-600 hover:underline">🔥 지금 떡상</button>
      <span className="text-neutral-300">|</span>
      <button type="button" onClick={() => preset("small")} className="font-semibold text-rose-600 hover:underline">🚀 작은 채널 대박</button>
      <span className="text-neutral-300">|</span>
      <button type="button" onClick={() => preset("trending")} className="font-semibold text-rose-600 hover:underline">⚡ 급상승</button>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-semibold text-neutral-500 lg:col-span-2">게시 기간
        <div className="mt-1 flex items-center gap-1.5"><input type="date" className={inputClass} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><span>~</span><input type="date" className={inputClass} value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div>
      </label>
      <label className="text-xs font-semibold text-neutral-500">검색 정렬
        <select className={`${inputClass} mt-1`} value={order} onChange={(event) => setOrder(event.target.value)}><option value="viewCount">조회수 높은 순</option><option value="relevance">관련도 순</option><option value="date">최신 순</option></select>
      </label>
      <label className="text-xs font-semibold text-neutral-500">영상 길이
        <select className={`${inputClass} mt-1`} value={maxDuration} onChange={(event) => setMaxDuration(event.target.value)}><option value="60">1분 이내</option><option value="180">3분 이내</option><option value="all">전체</option></select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-neutral-500">최소 조회수<input type="number" min={0} className={`${inputClass} mt-1`} value={minViews} onChange={(event) => setMinViews(event.target.value)} placeholder="10000" /></label>
        <label className="text-xs font-semibold text-neutral-500">최대 구독자<input type="number" min={0} className={`${inputClass} mt-1`} value={maxSubs} onChange={(event) => setMaxSubs(event.target.value)} placeholder="50000" /></label>
      </div>
    </div>
    <p className="mt-3 text-xs text-neutral-500">검색 1회는 회원님의 YouTube 할당량 약 100유닛을 사용합니다(기본 하루 1만유닛 ≈ 100회). 길이·조회수·구독자 필터는 이미 가져온 결과에 바로 적용되며 추가 할당량을 쓰지 않습니다.</p>

    {message && <p className="mt-3 flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800" role="status">{message.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />}{message.text}</p>}

    {videos.length > 0 && <div className="mt-4">
      <p className="text-sm font-semibold text-neutral-900">검색 결과 <span className="text-xs font-normal text-neutral-500">({filtered.length}개 / 전체 {videos.length}개)</span></p>
      {!filtered.length ? <p className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">조건에 맞는 영상이 없습니다. 필터를 조정해 보세요.</p> : <ul className="mt-3 space-y-3">{filtered.map((video) => {
        const isSaved = saved.has(`https://www.youtube.com/shorts/${video.id}`);
        return <li key={video.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3 sm:flex-row sm:items-center">
          <a href={`https://www.youtube.com/shorts/${video.id}`} target="_blank" rel="noopener noreferrer" className="relative block h-[68px] w-[120px] shrink-0" aria-label="유튜브에서 영상 보기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {video.thumbnail ? <img src={video.thumbnail} alt="" className="h-full w-full rounded-lg object-cover" /> : <span className="block h-full w-full rounded-lg bg-neutral-100" />}
            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-[#ffffff]">{formatDuration(video.durationSec)}</span>
          </a>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${GRADE_TONE[video.grade] ?? GRADE_TONE.보통}`}>{video.grade}</span><span className="text-xs text-neutral-500">점수 {video.viralScore}</span></div>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-900" title={video.title}>{video.title}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{video.channelName} · {new Date(video.publishedAt).toLocaleDateString("ko-KR")}</p>
            <p className="mt-1 text-xs text-neutral-600">조회수 <b>{formatNumber(video.views)}</b> · 구독자 {formatNumber(video.subs)} · 조회÷구독 {video.vsRatio === null ? "-" : `${video.vsRatio.toFixed(1)}배`} · 채널평균 대비 {video.outlier.toFixed(1)}배 · 하루 {formatNumber(Math.round(video.viewsPerDay))}회</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <a href={`https://www.youtube.com/shorts/${video.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"><ExternalLink size={14} />영상 보기</a>
            <button type="button" disabled={isSaved || savingId !== null} onClick={() => void save(video)} className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300">{isSaved ? "저장됨" : savingId === video.id ? "저장 중…" : "글감으로 저장"}</button>
          </div>
        </li>;
      })}</ul>}
      <p className="mt-3 text-xs text-neutral-500">등급 기준(조회수÷구독자): 초대박 10배↑ · 대박 5배↑ · 떡상 3배↑ · 양호 1배↑. 구독자 비공개 채널은 판정불가입니다. 점수는 채널평균 대비·구독자 대비·조회 속도·참여율·최신성을 합산한 참고 지표입니다.</p>
    </div>}
  </section>;
}
