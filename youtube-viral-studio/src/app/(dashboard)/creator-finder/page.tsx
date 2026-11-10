"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertCircle, AtSign, Bookmark, Download, ExternalLink, Globe, Handshake, Key, Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { downloadCsv } from "@/lib/export";
import { errorMessage } from "@/lib/errors";
import type { GoldenPeriod, GoldenRegion } from "@/lib/youtube/goldenEngine";
import type { CreatorItem } from "@/lib/youtube/creatorFinder";
import { SOCIAL_LABEL, type ContactHit } from "@/lib/youtube/contactExtract";
import type { YouTubeChannelItem } from "@/lib/youtube/types";

const AGREE_KEY = "yvs-creator-finder-agreed-v1";
const fmt = (n: number) => n.toLocaleString("ko-KR");
const aboutUrl = (id: string) => `https://www.youtube.com/channel/${id}/about`;
const channelUrl = (c: CreatorItem) => (c.handle ? `https://www.youtube.com/${c.handle.startsWith("@") ? c.handle : `@${c.handle}`}` : `https://www.youtube.com/channel/${c.id}`);
const sourceText = (h: ContactHit) => (h.source === "channel" ? "채널 설명" : `영상 「${h.videoTitle ?? ""}」 설명`);
const selectCls = "w-full p-2.5 bg-yt-raised border border-yt-border rounded-lg text-yt-text font-medium focus:bg-yt-surface focus:outline-hidden focus:ring-1 focus:ring-amber-500";

// 동의 여부는 이 PC 브라우저에만 기억(서버 렌더 때는 「아직 안 함」)
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const readAgreed = () => {
  try {
    return localStorage.getItem(AGREE_KEY) === "1";
  } catch {
    return false;
  }
};

function toFavorite(c: CreatorItem): YouTubeChannelItem {
  return { id: c.id, title: c.title, description: "", customUrl: c.handle, thumbnailUrl: c.thumbnailUrl, publishedAt: "", subscriberCount: c.subscriberCount, videoCount: c.videoCount, viewCount: c.viewCount, averageViews: c.averageViews };
}

function ContactLine({ icon: Icon, label, hits, href }: { icon: typeof Mail; label: string; hits: ContactHit[]; href?: (h: ContactHit) => string | undefined }) {
  if (hits.length === 0) return null;
  return (
    <div className="flex items-start gap-2 text-xs min-w-0">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" aria-hidden />
      <span className="shrink-0 font-semibold text-yt-muted w-14">{label}</span>
      <ul className="min-w-0 flex-1 space-y-0.5">
        {hits.map((h) => {
          const link = href?.(h);
          return (
            <li key={h.value} className="min-w-0 break-all text-yt-text">
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">{h.value}</a>
              ) : (
                <span className="select-all">{h.value}</span>
              )}
              <span className="ml-1.5 text-[10px] text-yt-muted">· {sourceText(h)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CreatorRow({ c }: { c: CreatorItem }) {
  const favorites = useFavorites();
  const saved = favorites ? favorites.has("channel", c.id) : false;
  const busy = !!favorites && (favorites.loading || !!favorites.error || favorites.pending.has("channel:" + c.id));
  const k = c.contacts;
  const none = k.emails.length + k.phones.length + k.socials.length + k.addresses.length + k.websites.length === 0;
  return (
    <div className="bg-yt-surface rounded-2xl border border-yt-border p-4 sm:p-5 shadow-xs space-y-3 min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube 썸네일 원본 주소 */}
        <img src={c.thumbnailUrl} alt="" className="w-12 h-12 rounded-full bg-yt-raised shrink-0 object-cover" />
        <div className="min-w-0 flex-1">
          <a href={channelUrl(c)} target="_blank" rel="noopener noreferrer" className="block font-bold text-yt-text truncate hover:underline">{c.title}</a>
          <div className="text-xs text-yt-muted truncate">{c.handle ?? c.id}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-yt-muted">
            <span>구독자 <b className="text-yt-text">{fmt(c.subscriberCount)}</b></span>
            <span>평균 조회 <b className="text-yt-text">{fmt(c.averageViews)}</b></span>
            <span>영상 {fmt(c.videoCount)}개</span>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => favorites && void favorites.toggle("channel", toFavorite(c))}
          aria-label={saved ? "즐겨찾기에서 빼기" : "즐겨찾기에 담기"}
          className={`shrink-0 p-2 rounded-lg border transition-colors disabled:opacity-50 ${saved ? "bg-amber-500 border-amber-500 text-white" : "border-yt-border text-yt-muted hover:bg-yt-hover"}`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-white" : ""}`} />
        </button>
      </div>

      <a href={`https://www.youtube.com/watch?v=${c.bestVideo.id}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-yt-muted truncate hover:underline">
        ▶ 대표 영상: {c.bestVideo.title} · 조회 {fmt(c.bestVideo.viewCount)}
      </a>

      <div className="rounded-xl bg-yt-raised p-3 space-y-1.5">
        <ContactLine icon={Mail} label="이메일" hits={k.emails} href={(h) => `mailto:${h.value}`} />
        <ContactLine icon={Phone} label="전화" hits={k.phones} />
        <ContactLine icon={AtSign} label="SNS" hits={k.socials.map((s) => ({ ...s, value: `${SOCIAL_LABEL[s.platform]} ${s.value}` }))} href={(h) => k.socials.find((s) => `${SOCIAL_LABEL[s.platform]} ${s.value}` === h.value)?.url} />
        <ContactLine icon={MapPin} label="주소" hits={k.addresses} />
        <ContactLine icon={Globe} label="웹사이트" hits={k.websites} href={(h) => (h.value.startsWith("http") ? h.value : `https://${h.value}`)} />
        {none && <p className="text-xs text-yt-muted">설명 글에 공개된 연락처가 없습니다.</p>}
      </div>

      <a href={aboutUrl(c.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline">
        <ExternalLink className="w-3.5 h-3.5" />
        채널 정보에서 비즈니스 이메일 직접 보기
      </a>
    </div>
  );
}

export default function CreatorFinderPage() {
  const [keyword, setKeyword] = useState("캠핑");
  const [minSubscribers, setMinSubscribers] = useState(1000);
  const [maxSubscribers, setMaxSubscribers] = useState(100000);
  const [period, setPeriod] = useState<GoldenPeriod>("90d");
  const [shortVideosOnly, setShortVideosOnly] = useState(false);
  const [region, setRegion] = useState<GoldenRegion>("kr");
  const [pages, setPages] = useState<1 | 2>(1);
  const [contactOnly, setContactOnly] = useState(true);
  const storedAgreed = useSyncExternalStore(subscribeStorage, readAgreed, () => false);
  const [agreeOverride, setAgreeOverride] = useState<boolean | null>(null);
  const agreed = agreeOverride ?? storedAgreed;
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CreatorItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [info, setInfo] = useState<{ quotaUsed: number; scannedChannels: number; withoutContactExcluded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needApiKey, setNeedApiKey] = useState(false);

  const onAgree = (v: boolean) => {
    setAgreeOverride(v);
    try {
      if (v) localStorage.setItem(AGREE_KEY, "1");
      else localStorage.removeItem(AGREE_KEY);
    } catch {
      /* 무시 */
    }
  };

  const search = async () => {
    if (!agreed) {
      setError("아래 「공개 연락처 사용 안내」를 읽고 동의해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setNeedApiKey(false);
    try {
      const res = await fetch("/api/youtube/creator-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, minSubscribers, maxSubscribers, period, shortVideosOnly, region, pages, contactOnly, agreed: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needApiKey) setNeedApiKey(true);
        setError(data.error || "협업 크리에이터 찾기 중 오류가 발생했습니다.");
        setItems([]);
        return;
      }
      setItems(data.items || []);
      setInfo({ quotaUsed: data.quotaUsed, scannedChannels: data.scannedChannels, withoutContactExcluded: data.withoutContactExcluded });
      setSearched(true);
    } catch (err: unknown) {
      setError(errorMessage(err) || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const join = (hits: ContactHit[]) => hits.map((h) => h.value).join(" / ");
    const rows = items.map((c) => [
      c.title,
      c.handle ?? "",
      channelUrl(c),
      c.subscriberCount,
      c.averageViews,
      c.videoCount,
      join(c.contacts.emails),
      join(c.contacts.phones),
      c.contacts.socials.map((s) => `${SOCIAL_LABEL[s.platform]} ${s.url}`).join(" / "),
      join(c.contacts.addresses),
      join(c.contacts.websites),
      aboutUrl(c.id),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`협업크리에이터_${keyword.replace(/[\\/:*?"<>|\s]+/g, "_")}_${stamp}.csv`, ["채널", "핸들", "채널 주소", "구독자", "평균 조회", "영상 수", "이메일", "전화", "SNS", "주소", "웹사이트", "채널 정보(직접 보기)"], rows);
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-yt-warn/10 text-yt-warn rounded-lg">
            <Handshake className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-yt-text">🤝 협업 크리에이터 찾기</h1>
        </div>
        <p className="text-sm text-yt-muted mt-1">
          키워드로 함께 일할 유튜버를 찾고, 채널 운영자가 채널·영상 설명에 직접 공개해 둔 이메일·전화·SNS·주소·웹사이트를 한 번에 모아 봅니다. 연락은 회원님이 직접 합니다.
        </p>
      </div>

      {needApiKey && (
        <div className="p-5 rounded-2xl bg-yt-warn/10 border border-yt-warn/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yt-warn/10 text-yt-warn rounded-xl shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-yt-warn">본인의 YouTube Data API v3 키를 먼저 등록해주세요</h3>
              <p className="text-xs text-yt-warn mt-0.5 leading-relaxed">모든 회원은 본인의 Google Cloud 콘솔에서 무료로 발급받은 API 키를 직접 연동해 사용합니다.</p>
            </div>
          </div>
          <Link href="/settings" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shrink-0 shadow-xs">
            <span>API 키 등록하러 가기</span>
            <span>&rarr;</span>
          </Link>
        </div>
      )}

      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-yt-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="협업할 분야 키워드 (예: 캠핑, 홈카페, 육아템, 뷰티 리뷰)"
              className="w-full pl-11 pr-4 py-3 bg-yt-raised border border-yt-border rounded-xl text-sm font-medium text-yt-text focus:bg-yt-surface focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
          <button type="submit" disabled={loading} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>찾는 중...</span>
              </>
            ) : (
              <>
                <Handshake className="w-4 h-4" />
                <span>크리에이터 찾기</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-yt-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-yt-muted font-semibold mb-1.5">최소 구독자 수</label>
            <select value={minSubscribers} onChange={(e) => setMinSubscribers(parseInt(e.target.value, 10))} className={selectCls}>
              <option value="0">제한 없음</option>
              <option value="1000">1천명 이상 (추천)</option>
              <option value="10000">1만명 이상</option>
              <option value="50000">5만명 이상</option>
              <option value="100000">10만명 이상</option>
            </select>
          </div>
          <div>
            <label className="block text-yt-muted font-semibold mb-1.5">최대 구독자 수</label>
            <select value={maxSubscribers} onChange={(e) => setMaxSubscribers(parseInt(e.target.value, 10))} className={selectCls}>
              <option value="10000">1만명 이하</option>
              <option value="50000">5만명 이하</option>
              <option value="100000">10만명 이하 (추천)</option>
              <option value="500000">50만명 이하</option>
              <option value="1000000">100만명 이하</option>
              <option value="10000000">제한 없음</option>
            </select>
          </div>
          <div>
            <label className="block text-yt-muted font-semibold mb-1.5">국가·언어</label>
            <select value={region} onChange={(e) => setRegion(e.target.value as GoldenRegion)} className={selectCls}>
              <option value="kr">한국 (한국어) (추천)</option>
              <option value="all">전체</option>
              <option value="global">해외 (미국·영어)</option>
            </select>
          </div>
          <div>
            <label className="block text-yt-muted font-semibold mb-1.5">활동 기간 (영상 업로드 시점)</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as GoldenPeriod)} className={selectCls}>
              <option value="30d">최근 30일</option>
              <option value="90d">최근 90일 (추천)</option>
              <option value="365d">최근 1년</option>
            </select>
          </div>
          <div>
            <label className="block text-yt-muted font-semibold mb-1.5">영상 길이</label>
            <select value={shortVideosOnly ? "short" : "all"} onChange={(e) => setShortVideosOnly(e.target.value === "short")} className={selectCls}>
              <option value="all">모든 길이 영상</option>
              <option value="short">쇼츠·짧은 영상만 (4분 미만)</option>
            </select>
          </div>
          <div>
            <label className="block text-yt-muted font-semibold mb-1.5">검색 깊이 (할당량)</label>
            <select value={pages} onChange={(e) => setPages(e.target.value === "2" ? 2 : 1)} className={selectCls}>
              <option value="1">영상 50개 검색 (약 102유닛)</option>
              <option value="2">영상 100개 검색 (약 204유닛)</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-yt-text cursor-pointer">
          <input type="checkbox" checked={contactOnly} onChange={(e) => setContactOnly(e.target.checked)} className="accent-amber-500 w-4 h-4" />
          연락처가 공개된 채널만 보기
        </label>

        <div className="rounded-xl border border-yt-warn/40 bg-yt-warn/10 p-3 text-xs leading-relaxed text-yt-text">
          <p className="font-bold text-yt-warn mb-1">⚠️ 공개 연락처 사용 안내</p>
          <p>이 기능은 YouTube 공식 API로 채널 운영자가 <b>연락 받을 목적으로 직접 공개한</b> 연락처만 보여 줍니다. 결과는 저장하지 않으며 회원님 PC로만 내려받습니다. 협업·광고 제안 외의 용도(대량 스팸·재판매·명단 공유)로 쓰지 말고, 연락은 회원님이 직접 정중하게 해 주세요. 사용 책임은 회원님께 있습니다.</p>
          <label className="mt-2 flex items-center gap-2 font-semibold cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => onAgree(e.target.checked)} className="accent-amber-500 w-4 h-4" />
            위 안내를 읽었고 동의합니다
          </label>
        </div>
      </div>

      {error && !needApiKey && (
        <div className="p-4 rounded-xl bg-yt-red/10 border border-yt-red/40 text-yt-danger text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-yt-text">찾은 크리에이터</h2>
          {items.length > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yt-warn/10 text-yt-warn">{items.length}개</span>}
          {info && <span className="text-xs text-yt-muted">채널 {info.scannedChannels}개 확인 · 할당량 약 {info.quotaUsed}유닛{contactOnly && info.withoutContactExcluded > 0 ? ` · 연락처 없는 ${info.withoutContactExcluded}개 제외` : ""}</span>}
        </div>
        {items.length > 0 && (
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-yt-border bg-yt-surface text-yt-text hover:bg-yt-hover">
            <Download className="w-4 h-4" />
            CSV 내려받기
          </button>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-yt-surface rounded-2xl border border-yt-border p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yt-raised" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-yt-raised rounded w-2/3" />
                  <div className="h-3 bg-yt-raised rounded w-1/3" />
                </div>
              </div>
              <div className="h-20 bg-yt-raised rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((c) => (
            <CreatorRow key={c.id} c={c} />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="bg-yt-surface rounded-2xl border border-dashed border-yt-border p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-yt-raised text-yt-muted flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-yt-text mb-1">{searched ? "조건에 맞는 크리에이터를 찾지 못했습니다" : "키워드를 넣고 「크리에이터 찾기」를 눌러 주세요"}</h3>
          <p className="text-xs text-yt-muted max-w-sm mx-auto">
            {searched ? "구독자 범위를 넓히거나, 기간을 늘리거나, 「연락처가 공개된 채널만 보기」를 끄고 다시 찾아보세요." : "회원님 본인의 YouTube API 무료 할당량만 사용하며, 유료 AI 호출은 없습니다."}
          </p>
        </div>
      )}
    </div>
  );
}
