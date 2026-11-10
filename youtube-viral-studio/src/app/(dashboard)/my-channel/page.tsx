"use client";

// V6 「내 채널 진짜 지표」(v1.27, 2026-11-11) — 회원 본인 구글 앱으로 연결한 내 채널의 유튜브 분석 지표(시청 시간·시청 비율·유입·시청자).
// 숫자를 늘려 주는 기능이 아니라, 채널 주인만 보는 진짜 지표를 보여 준다. 지표는 저장하지 않고 열 때마다 불러온다.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, Key, LineChart, Loader2, Plug, RefreshCw } from "lucide-react";
import { BarChart, ShareChart } from "@/components/analysis/Charts";
import { PERIODS, type DayPoint, type Share, type Summary, type TopVideo } from "@/lib/youtube/analytics";

type Status = { state: "no_app" | "not_connected" | "missing_scopes" | "reconnect" | "ok"; channelTitle?: string | null };
type Data = {
  status: Status;
  period?: { days: number; startDate: string; endDate: string };
  summary?: Summary; daily?: DayPoint[]; top?: TopVideo[]; traffic?: Share[];
  demographics?: { ages: Share[]; genders: Share[] }; countries?: Share[]; contentTypes?: Share[]; hints?: string[];
};

const fmt = (n: number) => n.toLocaleString("ko-KR");
const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#64748b"];
const shareItems = (s: Share[] | undefined) => (s ?? []).slice(0, 8).map((x, i) => ({ label: x.label, value: x.value, color: COLORS[i % COLORS.length] }));
const mmss = (sec: number) => `${Math.floor(sec / 60)}분 ${sec % 60}초`;
const ERRORS: Record<string, string> = {
  no_app: "구글 OAuth 클라이언트 ID·보안 비밀을 먼저 등록해 주세요.",
  denied: "구글 동의 화면에서 허용하지 않아 연결되지 않았습니다.",
  state: "연결 확인 값이 맞지 않아 멈췄습니다. 다시 눌러 주세요.",
  reconnect: "구글이 토큰 발급을 거절했습니다. 구글 앱에 아래 리디렉션 주소가 등록돼 있는지 확인해 주세요.",
  google: "구글 응답에 문제가 있어 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  no_access: "이 프로그램 이용 권한이 없습니다.",
};
const REDIRECT = "https://youtube-viral-studio.buylife.xyz/api/youtube/my-channel/callback";

export default function MyChannelPage() {
  const [days, setDays] = useState<number>(28);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/my-channel?days=${d}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "지표를 불러오지 못했습니다.");
      setData(j as Data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "지표를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("connected")) setNotice("내 유튜브 채널을 연결했습니다.");
    const e = q.get("error");
    if (e) setError(ERRORS[e] ?? "연결하지 못했습니다.");
    if (q.toString()) window.history.replaceState(null, "", "/my-channel");
    void load(28);
  }, [load]);

  const st = data?.status;
  const s = data?.summary;

  return (
    <div className="space-y-6 min-w-0">
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-yt-warn/10 text-yt-warn rounded-lg"><LineChart className="w-5 h-5" /></span>
          <h1 className="text-2xl font-bold tracking-tight text-yt-text">📈 내 채널 진짜 지표</h1>
        </div>
        <p className="text-sm text-yt-muted mt-1">
          내 유튜브 채널을 내 구글 앱으로 연결하면, 채널 주인만 볼 수 있는 시청 시간·평균 시청 비율·구독 증감·유입 경로·시청자 정보를 기간별로 보여 줍니다. 숫자를 바꾸거나 늘리는 기능은 없습니다.
        </p>
      </div>

      {notice && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center gap-2 text-sm text-yt-muted"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…</div>
      )}

      {st && st.state !== "ok" && (
        <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs space-y-4">
          <h2 className="text-base font-bold text-yt-text">
            {st.state === "no_app" && "1단계 — 내 구글 앱(OAuth 클라이언트)을 먼저 등록해 주세요"}
            {st.state === "not_connected" && "내 유튜브 채널을 연결해 주세요"}
            {st.state === "missing_scopes" && `「${st.channelTitle ?? "내 채널"}」 연결에 분석 권한이 없습니다 — 한 번 더 연결해 주세요`}
            {st.state === "reconnect" && `「${st.channelTitle ?? "내 채널"}」 연결이 만료됐습니다 — 다시 연결해 주세요`}
          </h2>
          <ol className="list-decimal list-inside space-y-2 rounded-xl bg-yt-raised p-4 text-sm text-yt-text leading-relaxed">
            <li>
              <a href="https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-400 underline inline-flex items-center gap-1">
                구글 클라우드에서 「YouTube Analytics API」 사용 설정 <ExternalLink className="w-3 h-3" />
              </a>
              (YouTube Data API v3도 켜져 있어야 합니다)
            </li>
            <li>
              구글 클라우드 「사용자 인증 정보」의 내 OAuth 클라이언트(웹 애플리케이션) → 승인된 리디렉션 URI에 아래 주소 추가
              <code className="mt-1 block break-all rounded bg-yt-surface px-2 py-1 text-xs text-amber-300">{REDIRECT}</code>
            </li>
            <li>
              <Link href="/settings" className="font-bold text-amber-400 underline">API키등록·플랫폼연동</Link>에 그 클라이언트의 ID·보안 비밀 저장(유튜브 댓글·shots에 이미 등록했다면 그대로 씁니다)
            </li>
            <li>아래 「내 유튜브 채널 연결」 → 구글 동의 화면에서 허용</li>
          </ol>
          <p className="text-xs text-yt-muted">
            구글 앱이 「테스트」 상태면 구글 정책상 7일마다 다시 연결해야 합니다. 한 번 연결하면 유튜브 댓글 자동화·shots 업로드도 같은 연결을 함께 씁니다.
          </p>
          {st.state === "no_app" ? (
            <Link href="/settings" className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl">
              <Key className="w-4 h-4" /> 구글 앱 키 등록하러 가기
            </Link>
          ) : (
            <a href="/api/youtube/my-channel/connect" className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl">
              <Plug className="w-4 h-4" /> 내 유튜브 채널 연결
            </a>
          )}
        </div>
      )}

      {st?.state === "ok" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-yt-muted">
              <b className="text-yt-text">{st.channelTitle ?? "내 채널"}</b>
              {data?.period && ` · ${data.period.startDate} ~ ${data.period.endDate}`}
            </p>
            <div className="flex items-center gap-2">
              {PERIODS.map((d) => (
                <button key={d} type="button" onClick={() => { setDays(d); void load(d); }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${days === d ? "border-red-500 bg-red-500/15 text-red-300" : "border-yt-border text-yt-muted hover:text-yt-text"}`}>
                  최근 {d}일
                </button>
              ))}
              <button type="button" onClick={() => void load(days)} className="rounded-lg border border-yt-border p-1.5 text-yt-muted hover:text-yt-text" aria-label="새로고침">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {s && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["조회수", fmt(s.views)],
                ["시청 시간", `${fmt(s.watchHours)}시간`],
                ["평균 시청 길이", mmss(s.avgViewSeconds)],
                ["평균 시청 비율", `${s.avgViewPercent}%`],
                ["구독자 순증", `${s.subscribersNet >= 0 ? "+" : ""}${fmt(s.subscribersNet)}`, `얻음 ${fmt(s.subscribersGained)} · 잃음 ${fmt(s.subscribersLost)}`],
                ["좋아요", fmt(s.likes)],
                ["댓글", fmt(s.comments)],
                ["공유", fmt(s.shares)],
              ].map(([label, value, sub]) => (
                <div key={label} className="rounded-2xl border border-yt-border bg-yt-surface p-4">
                  <p className="text-xs text-yt-muted">{label}</p>
                  <p className="mt-1 text-xl font-black text-yt-text">{value}</p>
                  {sub && <p className="mt-0.5 text-[11px] text-yt-muted">{sub}</p>}
                </div>
              ))}
            </div>
          )}

          {!!data?.hints?.length && (
            <div className="rounded-2xl border border-yt-warn/40 bg-yt-warn/10 p-4 space-y-1.5">
              <p className="text-sm font-bold text-yt-warn">💡 다음 할 일 힌트(숫자 기준, AI 사용 안 함)</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-yt-text">{data.hints.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}

          <div className="bg-yt-surface p-5 rounded-2xl border border-yt-border space-y-3">
            <h2 className="text-sm font-bold text-yt-text">날짜별 조회수</h2>
            <BarChart
              items={(data?.daily ?? []).map((d) => ({ label: d.day.slice(5), value: d.views, title: `${d.day} · 조회수 ${fmt(d.views)} · 시청 ${d.watchHours}시간 · 구독 ${d.subscribersNet >= 0 ? "+" : ""}${d.subscribersNet}` }))}
              formatValue={fmt}
            />
            <p className="text-[11px] text-yt-muted">유튜브 분석 숫자는 하루 이틀 늦게 들어와 최근 날짜는 비어 있을 수 있습니다.</p>
          </div>

          <div className="bg-yt-surface p-5 rounded-2xl border border-yt-border space-y-3">
            <h2 className="text-sm font-bold text-yt-text">잘 된 영상 10개</h2>
            {data?.top?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-yt-muted"><th className="py-1.5 pr-2">영상</th><th className="py-1.5 pr-2 text-right">조회수</th><th className="py-1.5 pr-2 text-right">시청 시간</th><th className="py-1.5 text-right">평균 시청 비율</th></tr></thead>
                  <tbody>
                    {data.top.map((v) => (
                      <tr key={v.videoId} className="border-t border-yt-border">
                        <td className="py-2 pr-2"><a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" className="text-yt-text hover:underline line-clamp-1">{v.title ?? v.videoId}</a></td>
                        <td className="py-2 pr-2 text-right text-yt-text">{fmt(v.views)}</td>
                        <td className="py-2 pr-2 text-right text-yt-muted">{fmt(v.watchHours)}시간</td>
                        <td className={`py-2 text-right font-bold ${v.avgViewPercent < 30 ? "text-red-400" : "text-emerald-400"}`}>{v.avgViewPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="py-6 text-center text-sm text-yt-muted">표시할 데이터가 없습니다.</p>}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-yt-surface p-5 rounded-2xl border border-yt-border space-y-3">
              <h2 className="text-sm font-bold text-yt-text">유입 경로(조회수 기준)</h2>
              <ShareChart items={shareItems(data?.traffic)} formatValue={fmt} />
            </div>
            <div className="bg-yt-surface p-5 rounded-2xl border border-yt-border space-y-3">
              <h2 className="text-sm font-bold text-yt-text">쇼츠 · 일반 영상 · 라이브</h2>
              <ShareChart items={shareItems(data?.contentTypes)} formatValue={fmt} />
            </div>
            <div className="bg-yt-surface p-5 rounded-2xl border border-yt-border space-y-3">
              <h2 className="text-sm font-bold text-yt-text">시청자 나이(%)</h2>
              <ShareChart items={shareItems(data?.demographics?.ages)} formatValue={(n) => `${n}%`} />
            </div>
            <div className="bg-yt-surface p-5 rounded-2xl border border-yt-border space-y-3">
              <h2 className="text-sm font-bold text-yt-text">시청자 성별(%) · 국가 상위</h2>
              <ShareChart items={shareItems(data?.demographics?.genders)} formatValue={(n) => `${n}%`} />
              <ShareChart items={shareItems(data?.countries)} formatValue={fmt} />
            </div>
          </div>

          <p className="text-xs text-yt-muted">
            노출수·노출 클릭률(CTR)은 유튜브 분석 API가 제공하지 않아 유튜브 스튜디오에서만 볼 수 있습니다. 시청자 나이·성별은 로그인한 시청자 기준이며, 데이터가 적으면 비어 있을 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
