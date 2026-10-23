"use client";

// 📤 인스타그램 게시(v1.18 즉시 · v1.19 예약 + 게시 기록) — 회원 본인 계정(INSTA 포스팅 자동화에서 한 번 연결한 값을 그대로 사용).
// 카드를 브라우저에서 JPEG로 그려 회원 폴더에 올리고, 서버가 회원 본인 토큰으로 게시한다(즉시: 바로 게시 후 삭제, 예약: 예약 시각에 게시 후 삭제).
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Camera, ExternalLink, Loader2, Send, X } from "lucide-react";
import { useStudio } from "./ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, INPUT } from "./ui";
import { renderCardToJpegBlob } from "@/lib/cardnews/renderClient";
import { createClient } from "@/lib/cardnews/supabase/client";
import { formatKst, kstLocalToIso } from "@/lib/cardnews/schedule";
import { SchedulePublishingControl } from "./SchedulePublishingControl";
import { markCanceled, postTimeLabel, useScheduledPostCancel } from "@/lib/cardnews/instagram/postsClient";

interface Status {
  connected: boolean;
  username: string;
  expired: boolean;
  connectUrl: string;
}

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
  const d = new Date(Date.now() + 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function InstagramPublishPanel() {
  const { project, projectId } = useStudio();
  const { pages, style, plan, caption, title } = project;
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState(caption?.fullCaption ?? "");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState(defaultLocal);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);

  const loadPosts = useCallback(async () => {
    if (!projectId) return setPosts([]);
    try {
      const r = await fetch(`/api/cardnews/instagram/posts?projectId=${projectId}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setPosts(d.posts ?? []);
    } catch {
      /* 기록을 못 불러와도 게시는 할 수 있다 */
    }
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    fetch("/api/cardnews/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: "/settings" }));
    void loadPosts();
    return () => {
      alive = false;
    };
  }, [loadPosts]);

  // 캡션을 새로 만들면 게시 문구 칸도 따라 바꾼다(직접 고친 뒤에는 그대로 둠)
  useEffect(() => {
    if (caption?.fullCaption && !text) setText(caption.fullCaption);
  }, [caption?.fullCaption]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = status?.connected && !status.expired;
  const count = pages.length;
  const lastPublished = posts.find((p) => p.status === "published");
  const pending = posts.filter((p) => p.status === "scheduled");

  /** 카드를 JPEG로 그려 회원 폴더에 올리고 경로를 돌려준다 */
  async function uploadCards(): Promise<string[]> {
    setBusy(`카드 ${count}장을 JPEG로 만드는 중…`);
    const blobs: Blob[] = [];
    for (const p of pages) blobs.push(await renderCardToJpegBlob(p, style, plan.ratio, p.imageUrl));
    setBusy("이미지를 올리는 중…");
    const up = await fetch("/api/cardnews/instagram/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count }) });
    const upData = await up.json().catch(() => ({}));
    if (!up.ok) throw new Error(upData.error || "이미지를 올릴 준비를 하지 못했습니다.");
    const supabase = createClient();
    const uploads = upData.uploads as { path: string; token: string }[];
    for (let i = 0; i < uploads.length; i++) {
      const { error: e } = await supabase.storage.from("cardnews-images").uploadToSignedUrl(uploads[i].path, uploads[i].token, blobs[i], { contentType: "image/jpeg" });
      if (e) throw new Error("이미지를 올리지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.");
    }
    return uploads.map((u) => u.path);
  }

  async function submit() {
    setError(null);
    setDone(null);
    const scheduledAt = mode === "schedule" ? kstLocalToIso(when) : null;
    if (mode === "schedule" && !scheduledAt) return setError("예약 날짜와 시간을 정해 주세요.");
    try {
      const paths = await uploadCards();
      setBusy(mode === "now" ? "인스타그램에 게시하는 중…(장수가 많으면 1~2분 걸릴 수 있어요)" : "예약을 저장하는 중…");
      const res = await fetch(mode === "now" ? "/api/cardnews/instagram/publish" : "/api/cardnews/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths, caption: text, projectId, title, ...(scheduledAt ? { scheduledAt } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "처리하지 못했습니다.");
      setDone(mode === "now" ? (data.alreadyPosted ? `응답이 늦었지만 @${data.username} 계정에 이미 올라간 것을 확인했습니다. 다시 게시하지 않아도 됩니다.` : `@${data.username} 계정에 게시했습니다.`) : `${formatKst(data.scheduledAt)}에 @${data.username} 계정으로 게시되도록 예약했습니다(예약 시각 후 5분 안에, 「내 cron-job.org」 방식은 1분 안에 올라갑니다).`);
      setAgree(false);
      void loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  // 예약 취소(취소 중 다른 버튼 막기·성공 즉시 「취소」 표시) — 공용 postsClient
  const { canceling, cancel } = useScheduledPostCancel("/api/cardnews/instagram/posts", { onCanceled: (id) => setPosts((cur) => markCanceled(cur, id)), onError: (m) => setError(m || null), onSettled: () => void loadPosts() });

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100"><Camera className="h-4 w-4 text-pink-400" /> 인스타그램에 올리기</h2>
        {status && (
          ready ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">연결됨 · @{status.username}</span>
          ) : (
            <a href={status.connectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              {status.expired ? "연결 만료 — 다시 연결" : "연결 필요"} <ExternalLink className="h-3 w-3" />
            </a>
          )
        )}
      </div>
      <p className="text-[11px] text-slate-400">
        「API키등록·플랫폼연동」에서 내 인스타그램 계정을 <b className="text-slate-200">한 번만 연결</b>하면 피드 글과 카드뉴스 모두 바로 씁니다. 비즈니스·크리에이터 계정만 게시할 수 있고, {count === 1 ? "1장은 피드 1장으로" : `${count}장은 캐러셀(카드뉴스)로`} 올라갑니다.
      </p>

      {lastPublished && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          ⚠️ 이 카드뉴스는 {formatKst(lastPublished.published_at)}에 이미 게시했습니다. 같은 내용을 다시 올리는지 확인해 주세요.
          {lastPublished.permalink && <> <a href={lastPublished.permalink} target="_blank" rel="noreferrer" className="font-bold underline">게시물 보기</a></>}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#262c3d] bg-[#0d0f17] p-1" role="group" aria-label="게시 방식">
        {([["now", "지금 게시", Send], ["schedule", "예약 게시", CalendarClock]] as const).map(([v, label, Icon]) => (
          <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)} className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold ${mode === v ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-[#1e2230]"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      {mode === "schedule" && (
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-300">예약 날짜·시간 (한국 시간 · 10분 뒤~60일 안)</span>
          <input type="datetime-local" className={`${INPUT} max-w-64`} value={when} onChange={(e) => setWhen(e.target.value)} aria-label="예약 날짜와 시간" />
        </label>
      )}
      {mode === "schedule" && <SchedulePublishingControl refreshKey={pending.length} />}

      <label className="block">
        <span className="mb-1 flex justify-between text-xs font-bold text-slate-300">게시 문구(캡션) <span className={text.length > 2200 ? "text-red-400" : "text-slate-500"}>{text.length}/2200</span></span>
        <textarea className={`${INPUT} min-h-28`} value={text} maxLength={2200} placeholder="위에서 인스타 캡션을 생성하면 여기에 채워집니다. 직접 써도 됩니다." onChange={(e) => setText(e.target.value)} />
      </label>

      <label className="flex items-start gap-2 text-xs text-slate-300">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>내 인스타그램 계정{status?.username ? ` @${status.username}` : ""}에 이 카드뉴스가 {mode === "now" ? <b>바로 공개 게시</b> : <b>예약 시각에 공개 게시</b>}되는 것을 확인했습니다.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void submit()} disabled={!ready || !agree || !!busy || count === 0 || !text.trim()} className={BTN_PRIMARY}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "now" ? <Send className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />} {mode === "now" ? "인스타그램에 게시" : "예약하기"}
        </button>
        {busy && <span className="text-xs text-slate-400">{busy}</span>}
      </div>
      {error && <ErrorNote message={error} />}
      {done && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{done}</p>}

      {posts.length > 0 && (
        <div className="border-t border-[#262c3d] pt-3">
          <p className="mb-2 text-xs font-bold text-slate-300">이 카드뉴스의 게시 기록 {pending.length > 0 && <span className="text-sky-300">(예약 {pending.length}건 대기)</span>}</p>
          <ul className="space-y-1.5">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#0d0f17] px-3 py-2 text-[11px] text-slate-300">
                <span className={`rounded-full px-2 py-0.5 font-bold ${STATUS_LABEL[p.status].cls}`}>{STATUS_LABEL[p.status].text}</span>
                <span>{postTimeLabel(p)}</span>
                <span className="text-slate-500">· {p.page_count}장{p.ig_username ? ` · @${p.ig_username}` : ""}</span>
                {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="font-bold text-pink-300 underline">게시물 보기</a>}
                {p.status === "failed" && p.error_message && <span className="w-full text-red-300">{p.error_message}</span>}
                {p.status === "scheduled" && p.error_message && <span className="w-full text-amber-300">{p.error_message}</span>}
                {p.status === "published" && p.error_message && <span className="w-full text-slate-400">ℹ️ {p.error_message}</span>}
                {p.status === "scheduled" && (
                  <button type="button" disabled={!!canceling} onClick={() => void cancel(p.id)} className={`${BTN_GHOST} ml-auto px-2 py-1 text-[11px]`}><X className="h-3 w-3" /> {canceling === p.id ? "취소하는 중..." : "예약 취소"}</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
