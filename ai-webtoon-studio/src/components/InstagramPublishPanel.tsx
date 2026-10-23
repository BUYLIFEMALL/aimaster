"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Send, Check, ExternalLink, Loader2, CalendarClock, Eye, X } from "lucide-react";
import type { WebtoonProject } from "@/lib/types";
import { MAX_INSTA_CAPTION, MAX_INSTA_PHOTOS, defaultCaption, defaultPicked, slideSources, togglePicked } from "@/lib/instagram/slides";
import { renderSlide, uploadSlides } from "@/lib/instagram/slideRender";
import { formatKst, kstLocalToIso } from "@/lib/instagram/schedule";
import { SchedulePublishingControl } from "./SchedulePublishingControl";
import { EpisodeBatchSchedule } from "./EpisodeBatchSchedule";
import { markCanceled, postTimeLabel, useScheduledPostCancel } from "@/lib/instagram/postsClient";

// v1.15 인스타 자동 포스팅 1차(즉시 게시) — 기준: ai-influencer-studio InstagramPublishPanel(v1.14).
// 웹툰은 「1컷 = 캐러셀 1장」: 흰 4:5 판(1080×1350)에 컷 전체 + 아래 대사 말풍선을 브라우저에서 그려 JPEG로 올린다.
// v1.16 2차: 예약 게시·게시 기록(기준 ai-influencer-studio v1.15) + 올라갈 장 미리보기(게시와 같은 renderSlide). 플랜: docs/PLAN_20261020_INSTA_SCHEDULE.md
// v1.17: 회차 묶음 예약(EpisodeBatchSchedule), 컷이 없어도 게시 기록·예약 대기는 보이게. 그리기·올리기는 lib/instagram/slideRender.ts.
// 인스타 연결은 INSTA 포스팅 자동화에서 한 번 한 값을 그대로 쓴다(공용 insta_accounts). 1차 플랜: docs/PLAN_20261020_INSTA_AUTOPOST.md

interface Status { connected: boolean; username: string; expired: boolean; connectUrl: string }
interface PostRow {
  id: string;
  title: string;
  page_count: number;
  status: "scheduled" | "publishing" | "published" | "failed" | "canceled";
  scheduled_at: string | null;
  published_at: string | null;
  permalink: string | null;
  ig_username: string | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<PostRow["status"], { text: string; cls: string }> = {
  scheduled: { text: "예약됨", cls: "bg-sky-500/15 text-sky-300" },
  publishing: { text: "게시 중", cls: "bg-amber-500/15 text-amber-300" },
  published: { text: "게시됨", cls: "bg-emerald-500/15 text-emerald-300" },
  failed: { text: "실패", cls: "bg-red-500/15 text-red-300" },
  canceled: { text: "취소", cls: "bg-slate-500/15 text-slate-400" },
};

/** 지금부터 1시간 뒤(한국 시간)를 datetime-local 기본값으로 */
function defaultLocal(): string {
  return new Date(Date.now() + 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

const FALLBACK_CONNECT = "https://auto-instagram-posting.buylife.xyz/settings";
export function InstagramPublishPanel({ project, onOpenSettings }: { project: WebtoonProject; onOpenSettings?: () => void }) {
  const sources = useMemo(() => slideSources(project), [project]);
  const sourceKey = sources.map((s) => `${s.id}:${s.src.length}`).join("|");
  const [status, setStatus] = useState<Status | null>(null);
  const [picked, setPicked] = useState<string[]>(() => defaultPicked(sources));
  const [text, setText] = useState(() => defaultCaption(project.title, project.synopsis));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ text: string; permalink: string } | null>(null);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState(defaultLocal);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [preview, setPreview] = useState<{ urls: string[]; index: number } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const r = await fetch("/api/instagram/posts", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setPosts(d.posts ?? []);
    } catch {
      /* 기록을 못 불러와도 게시는 할 수 있다 */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: FALLBACK_CONNECT }));
    void loadPosts();
    return () => { alive = false; };
  }, [loadPosts]);
  // 컷이 새로 생기거나 바뀌면 고르기를 처음 상태로
  useEffect(() => { setPicked(defaultPicked(sources)); setDone(null); setConfirmed(false); }, [sourceKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // 고른 장이 바뀌면 미리보기를 닫는다(그려 둔 그림 주소는 아래 정리 효과가 지움)
  const pickedKey = picked.join("|");
  useEffect(() => { setPreview(null); }, [pickedKey, sourceKey]);
  // 장을 넘길 때는 같은 그림 목록(urls)을 그대로 쓰므로, 목록이 바뀌거나 닫힐 때만 지운다
  const previewUrls = preview?.urls;
  useEffect(() => () => { previewUrls?.forEach((u) => URL.revokeObjectURL(u)); }, [previewUrls]);

  const chosen = sources.filter((s) => picked.includes(s.id));
  const pending = posts.filter((p) => p.status === "scheduled");

  async function showPreview() {
    setError("");
    setPreviewBusy(true);
    try {
      const urls: string[] = [];
      for (const s of chosen) urls.push(URL.createObjectURL(await renderSlide(s)));
      setPreview({ urls, index: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "미리보기를 만들지 못했습니다.");
    } finally {
      setPreviewBusy(false);
    }
  }

  // 예약 취소(취소 중 다른 버튼 막기·성공 즉시 「취소」 표시) — 공용 postsClient
  const { canceling, cancel } = useScheduledPostCancel("/api/instagram/posts", { onCanceled: (id) => setPosts((cur) => markCanceled(cur, id)), onError: setError, onSettled: () => void loadPosts() });

  async function publish() {
    setError(""); setDone(null);
    const scheduledAt = mode === "schedule" ? kstLocalToIso(when) : null;
    if (mode === "schedule" && !scheduledAt) return setError("예약 날짜와 시간을 정해 주세요.");
    try {
      const paths = await uploadSlides(chosen, setBusy);
      setBusy(mode === "now" ? "인스타그램에 게시하는 중... (장수가 많으면 1~2분)" : "예약을 저장하는 중...");
      const res = await fetch(mode === "now" ? "/api/instagram/publish" : "/api/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths, caption: text, ...(scheduledAt ? { scheduledAt } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (mode === "now" ? "인스타그램 게시에 실패했습니다." : "예약하지 못했습니다."));
      setDone(mode === "now"
        ? { text: data.alreadyPosted ? `응답이 늦었지만 @${data.username} 계정에 이미 올라간 것을 확인했어요. 다시 게시하지 않아도 됩니다.` : "게시했어요.", permalink: data.permalink || "" }
        : { text: `${formatKst(data.scheduledAt)}에 @${data.username} 계정으로 게시되도록 예약했어요(예약 시각 후 5분 안에, 「내 cron-job.org」 방식은 1분 안에 올라갑니다).`, permalink: "" });
      setConfirmed(false);
      void loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "인스타그램 게시에 실패했습니다.");
    } finally {
      setBusy("");
    }
  }

  const ready = status?.connected && !status.expired;
  return (
    <div id="insta-publish" className="bg-[#121620] rounded-2xl border border-[#232b3e] p-5 shadow-sm space-y-3 scroll-mt-20">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-black text-white">📤 인스타그램에 게시 (컷 캐러셀)</h3>
        {status && ready && <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">연결됨 · @{status.username}</span>}
      </div>
      <p className="text-[11px] text-slate-400">
        컷 하나가 인스타 한 장(4:5)이 됩니다. 흰 판에 컷 그림 전체를 넣고 아래에 대사 말풍선을 붙여, 넘겨 보는 웹툰으로 올라갑니다. 최대 {MAX_INSTA_PHOTOS}장, 순서는 원고 순서입니다.
      </p>

      {!status ? (
        <p className="text-[11px] text-slate-400">연결 상태를 확인하고 있어요...</p>
      ) : !ready ? (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            {status.expired ? "인스타그램 연결이 만료되었어요." : "아직 연결된 인스타그램 계정이 없어요."} INSTA 포스팅 자동화에서 한 번 연결하면 여기서도 바로 게시할 수 있어요.
          </p>
          <a href={status.connectUrl || FALLBACK_CONNECT} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-bold text-white">
            <ExternalLink className="w-3 h-3" />INSTA에서 연결하기
          </a>
        </div>
      ) : (
        <>
          {sources.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#232b3e] px-3 py-2.5 text-[11px] text-slate-400">
              이 원고에는 아직 그림이 있는 컷이 없어요. 위에서 표지·컷을 만들면 여기서 바로 게시하거나 예약할 수 있어요. 지난 예약은 아래 게시 기록에서 확인·취소할 수 있습니다.
            </p>
          ) : (
          <>
          <div>
            <p className="mb-1.5 text-[11px] text-slate-400">올릴 장 ({chosen.length}/{MAX_INSTA_PHOTOS}장 · 누르면 빼거나 넣기){sources.length > MAX_INSTA_PHOTOS && " — 10장이 넘어 뒤쪽 컷은 빠져 있어요. 다른 컷을 빼고 넣어 주세요."}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {sources.map((s) => {
                const order = chosen.findIndex((c) => c.id === s.id);
                return (
                  <button key={s.id} type="button" disabled={!!busy} onClick={() => setPicked((cur) => togglePicked(sources, cur, s.id))} title={s.label} aria-pressed={order >= 0}
                    className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${order >= 0 ? "border-pink-500" : "border-[#232b3e] opacity-50"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={s.label} className="h-full w-full object-contain" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] font-bold text-white">{s.label}</span>
                    {order >= 0 && <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">{order + 1}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <button type="button" onClick={() => void showPreview()} disabled={previewBusy || !!busy || chosen.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#232b3e] bg-[#181d2a] px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-[#232b3e] disabled:opacity-50">
              {previewBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} 올라갈 장 미리보기 ({chosen.length}장)
            </button>
            {preview && (
              <div className="rounded-xl border border-[#232b3e] bg-[#0a0d14] p-3" aria-label="인스타 장 미리보기">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{preview.index + 1} / {preview.urls.length}장 · 인스타에서 넘겨 보는 모양 그대로(4:5)</span>
                  <button type="button" onClick={() => setPreview(null)} className="inline-flex items-center gap-0.5 hover:text-slate-200"><X className="w-3 h-3" />닫기</button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="이전 장" disabled={preview.index === 0} onClick={() => setPreview({ ...preview, index: preview.index - 1 })} className="rounded-lg border border-[#232b3e] px-2 py-6 text-slate-300 disabled:opacity-30">&lsaquo;</button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.urls[preview.index]} alt={`미리보기 ${preview.index + 1}장`} className="mx-auto aspect-[4/5] w-full max-w-72 rounded-lg bg-white object-contain" />
                  <button type="button" aria-label="다음 장" disabled={preview.index >= preview.urls.length - 1} onClick={() => setPreview({ ...preview, index: preview.index + 1 })} className="rounded-lg border border-[#232b3e] px-2 py-6 text-slate-300 disabled:opacity-30">&rsaquo;</button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#232b3e] bg-[#0a0d14] p-1" role="group" aria-label="게시 방식">
            {([["now", "지금 게시", Send], ["schedule", "예약 게시", CalendarClock]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" aria-pressed={mode === v} disabled={!!busy} onClick={() => setMode(v)}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold ${mode === v ? "bg-pink-500 text-white" : "text-slate-400 hover:bg-[#181d2a]"}`}>
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
          {mode === "schedule" && (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-300">예약 날짜·시간 (한국 시간 · 10분 뒤~60일 안)</span>
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={!!busy} aria-label="예약 날짜와 시간"
                  className="w-full max-w-64 rounded-xl border border-[#232b3e] bg-[#0a0d14] px-3 py-1.5 text-xs text-slate-100 focus:border-pink-500 focus:outline-hidden" />
              </label>
              <SchedulePublishingControl refreshKey={pending.length} onOpenSettings={onOpenSettings} />
            </>
          )}

          <label className="block">
            <span className="mb-1 flex justify-between text-[11px] font-bold text-slate-300">게시 문구(캡션) <span className="font-normal text-slate-500">{text.length}/{MAX_INSTA_CAPTION}</span></span>
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_INSTA_CAPTION))} rows={4} disabled={!!busy} aria-label="인스타 게시 캡션"
              className="w-full rounded-xl border border-[#232b3e] bg-[#0a0d14] px-3 py-2 text-xs text-slate-100 focus:border-pink-500 focus:outline-hidden" />
          </label>
          <label className="flex items-start gap-1.5 text-[11px] text-slate-300">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} className="mt-0.5" />
            <span>@{status.username} 계정에 이 웹툰이 {mode === "now" ? "바로 공개 게시" : "예약 시각에 공개 게시"}되는 것을 확인했어요.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void publish()} disabled={!confirmed || !!busy || chosen.length === 0 || (mode === "schedule" && !text.trim())}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "now" ? <Send className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
              <span>{mode === "now" ? `인스타그램에 게시 (${chosen.length}장)` : `예약하기 (${chosen.length}장)`}</span>
            </button>
            {busy && <span className="text-[11px] text-slate-400">{busy}</span>}
          </div>
          </>
          )}
          <EpisodeBatchSchedule username={status.username} pendingCount={pending.length} disabled={!!busy} onScheduled={() => void loadPosts()} />
        </>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {done && (
        <p className="flex items-center gap-1 text-[11px] text-emerald-400" role="status">
          <Check className="w-3 h-3" />{done.text}
          {done.permalink && <a href={done.permalink} target="_blank" rel="noopener noreferrer" className="underline">게시물 보기</a>}
        </p>
      )}

      {posts.length > 0 && (
        <div className="border-t border-[#232b3e] pt-3">
          <p className="mb-1.5 text-[11px] font-bold text-slate-300">최근 인스타 게시 기록 (30일) {pending.length > 0 && <span className="text-sky-300">· 예약 {pending.length}건 대기</span>}</p>
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#0a0d14] px-2.5 py-1.5 text-[11px] text-slate-200">
                <span className={`rounded-full px-1.5 py-0.5 font-bold ${STATUS_LABEL[p.status].cls}`}>{STATUS_LABEL[p.status].text}</span>
                <span>{postTimeLabel(p)}</span>
                <span className="text-slate-500">· {p.page_count}장{p.ig_username ? ` · @${p.ig_username}` : ""}</span>
                {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="font-bold text-pink-300 underline">게시물 보기</a>}
                {p.status === "scheduled" && (
                  <button type="button" disabled={!!canceling} onClick={() => void cancel(p.id)} className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-[#232b3e] px-1.5 py-0.5 text-slate-400 hover:text-slate-100"><X className="w-3 h-3" /> {canceling === p.id ? "취소하는 중..." : "예약 취소"}</button>
                )}
                {p.title && <span className="w-full truncate text-slate-500">{p.title}</span>}
                {p.status === "failed" && p.error_message && <span className="w-full text-red-300">{p.error_message}</span>}
                {p.status === "scheduled" && p.error_message && <span className="w-full text-amber-300">{p.error_message}</span>}
                {p.status === "published" && p.error_message && <span className="w-full text-slate-400">ℹ️ {p.error_message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
