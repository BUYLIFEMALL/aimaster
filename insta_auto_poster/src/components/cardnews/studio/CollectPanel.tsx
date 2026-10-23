"use client";

// 🔍 인기 게시물 수집(v1.50): 계정 이름·해시태그 → 반응도 상위 5개 → 하나를 고르면 이미지·캡션을 떡상 리메이크 재료로 넘긴다.
// 수집 결과는 이 화면에만 두고 저장하지 않는다. 인스타 이미지 주소는 브라우저에서 못 받으므로(CORS) 서버가 줄여서 돌려준다.
import { useEffect, useState } from "react";
import { Heart, Loader2, MessageCircle, Play, Search, Star, X } from "lucide-react";
import { BTN_GHOST, ErrorNote, INPUT } from "./ui";
import { BUNDLE_SIZE, COLLECT_TOP, bundleImageUrls, filterPosts, normalizeUsername, remakeBundleText, remakeSourceText, withTranscript, type CollectedPost, type CollectFilter, type CollectKind, type CollectSource } from "@/lib/cardnews/collect";

export interface GeminiFileRef { name: string; uri: string; mimeType: string }
export interface CollectPick { text: string; images: { name: string; mimeType: string; data: string; preview: string }[]; geminiFile?: GeminiFileRef }

const FILTERS: { id: CollectFilter; label: string }[] = [{ id: "all", label: "전체" }, { id: "video", label: "릴스" }, { id: "carousel", label: "캐러셀" }, { id: "image", label: "사진" }];

const fmt = (n: number) => n.toLocaleString("ko-KR");

export function CollectPanel({ maxImages, isGemini, onPick }: { maxImages: number; isGemini: boolean; onPick: (p: CollectPick) => void }) {
  const [kind, setKind] = useState<CollectKind>("account");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<CollectedPost[] | null>(null);
  const [source, setSource] = useState<CollectSource | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  // v1.54 유형 필터(서버는 가져온 20개를 반응도순으로 모두 주고, 화면이 거른 뒤 상위 5개를 보여 줌)
  const [filter, setFilter] = useState<CollectFilter>("all");
  const shown = posts ? filterPosts(posts, filter).slice(0, COLLECT_TOP) : null;
  // v1.52 경쟁 계정 즐겨찾기(회원별 DB 표 member_watch_accounts — 계정 이름만)
  const [watch, setWatch] = useState<string[]>([]);
  const [watchBusy, setWatchBusy] = useState(false);
  const handle = kind === "account" ? normalizeUsername(query) : null;
  const starred = !!handle && watch.includes(handle);

  async function watchCall(action: "watch_list" | "watch_add" | "watch_remove", h?: string) {
    setWatchBusy(true);
    try {
      const res = await fetch("/api/cardnews/remake/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, handle: h }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { if (action !== "watch_list") setError({ message: d.error || "즐겨찾기를 바꾸지 못했습니다." }); return; }
      setWatch(d.watch ?? []);
    } catch { /* 목록을 못 불러와도 수집은 그대로 */ } finally { setWatchBusy(false); }
  }
  useEffect(() => { void watchCall("watch_list"); }, []);

  async function search(over?: { kind: CollectKind; query: string }) {
    const k = over?.kind ?? kind, q = over?.query ?? query;
    setBusy(true); setError(null); setPosts(null); setFilter("all");
    try {
      const res = await fetch("/api/cardnews/remake/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", kind: k, query: q }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError({ message: d.error || "가져오지 못했습니다.", needKey: d.needApiKey }); return; }
      setPosts(d.posts ?? []); setSource(d.source ?? null);
    } catch {
      setError({ message: "네트워크 오류로 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally { setBusy(false); }
  }

  async function pick(p: CollectedPost | CollectedPost[], withVideo = false) {
    const list = Array.isArray(p) ? p : [p];
    setPicking(Array.isArray(p) ? "bundle" : withVideo ? `${p.id}:video` : p.id); setError(null);
    try {
      // v1.54 「🎬 영상까지 분석」 — 서버가 릴스 영상을 회원 본인 Gemini 키로 Gemini 파일에 올리고 참조만 받는다(저장 안 함)
      // v1.55 Gemini가 아니면 회원 본인 OpenAI 키로 말소리만 받아써 원문에 붙인다
      let geminiFile: GeminiFileRef | undefined;
      let transcript = "";
      if (withVideo && !Array.isArray(p) && p.videoUrl) {
        const vr = await fetch("/api/cardnews/remake/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reel_video", videoUrl: p.videoUrl, mode: isGemini ? "gemini" : "transcribe" }) });
        const vd = await vr.json().catch(() => ({}));
        if (!vr.ok) { setError({ message: vd.error || "릴스 영상을 준비하지 못했습니다.", needKey: vd.needApiKey }); return; }
        if (isGemini) geminiFile = vd.file; else transcript = String(vd.transcript ?? "");
      }
      const urls = Array.isArray(p) ? bundleImageUrls(list, Math.max(1, maxImages)) : p.images.slice(0, Math.max(1, maxImages));
      const res = await fetch("/api/cardnews/remake/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "images", urls }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError({ message: d.error || "게시물 이미지를 받지 못했습니다." }); return; }
      const images = (d.images as { mimeType: string; data: string }[]).map((img, i) => ({ ...img, name: `@${list[0].owner} ${i + 1}`, preview: `data:${img.mimeType};base64,${img.data}` }));
      const baseText = Array.isArray(p) ? remakeBundleText(list) : remakeSourceText(p);
      onPick({ text: transcript ? withTranscript(baseText, transcript) : baseText, images, geminiFile });
    } catch {
      setError({ message: "네트워크 오류로 이미지를 받지 못했습니다." });
    } finally { setPicking(null); }
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3">
      <p className="text-xs font-bold text-slate-300">🔍 인기 게시물 수집 <span className="font-normal text-slate-400">— 다른 계정·해시태그에서 반응 좋은 게시물을 가져와 바로 분석</span></p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-[#262c3d] text-xs">
          {(["account", "hashtag"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`whitespace-nowrap px-3 py-1.5 ${kind === k ? "bg-purple-600 text-white" : "text-slate-300 hover:bg-[#161922]"}`}>
              {k === "account" ? "@ 계정" : "# 해시태그"}
            </button>
          ))}
        </div>
        <input className={`${INPUT} min-w-0 flex-1`} value={query} maxLength={80} placeholder={kind === "account" ? "계정 이름 (예: nasa)" : "해시태그 (예: 재테크)"} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && query.trim() && !busy) void search(); }} />
        {kind === "account" && (
          <button type="button" onClick={() => handle && void watchCall(starred ? "watch_remove" : "watch_add", handle)} disabled={!handle || watchBusy} title={starred ? "즐겨찾기에서 빼기" : "즐겨찾기에 추가"} aria-pressed={starred} className={`${BTN_GHOST} shrink-0 whitespace-nowrap`}>
            <Star className={`h-4 w-4 ${starred ? "fill-yellow-400 text-yellow-400" : ""}`} /> {starred ? "즐겨찾기됨" : "즐겨찾기"}
          </button>
        )}
        <button type="button" onClick={() => void search()} disabled={busy || !query.trim()} className={`${BTN_GHOST} shrink-0 whitespace-nowrap`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 가져오기
        </button>
      </div>
      {watch.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">★ 즐겨찾는 계정</span>
          {watch.map((h) => (
            <span key={h} className="inline-flex items-center overflow-hidden rounded-full border border-[#262c3d] text-[11px]">
              <button type="button" disabled={busy} onClick={() => { setKind("account"); setQuery(h); void search({ kind: "account", query: h }); }} className="whitespace-nowrap px-2 py-0.5 text-slate-200 hover:bg-[#161922]">@{h}</button>
              <button type="button" aria-label={`@${h} 즐겨찾기 빼기`} disabled={watchBusy} onClick={() => void watchCall("watch_remove", h)} className="px-1 py-0.5 text-slate-500 hover:text-slate-200"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400">파란 버튼(Facebook 페이지 방식)으로 연결했다면 계정 수집은 인스타 공식 API(무료), 그 밖에는 본인 Apify 토큰을 씁니다(최근 20개 중 좋아요+댓글×3+조회수×0.05 상위 5개). 공개 게시물만, 결과는 저장하지 않습니다.</p>
      {busy && <p className="text-[11px] text-slate-400">가져오는 중입니다(Apify는 30초~2분 걸릴 수 있어요)…</p>}
      {error && <ErrorNote message={error.message} needKey={error.needKey} />}
      {posts && posts.length === 0 && <p className="text-xs text-slate-400">가져올 게시물이 없습니다. 공개 프로페셔널 계정인지, 해시태그 철자를 확인해 주세요.</p>}
      {posts && posts.length > 0 && shown && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const n = filterPosts(posts, f.id).length;
              return (
                <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} disabled={n === 0} className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] disabled:opacity-40 ${filter === f.id ? "border-purple-500 bg-purple-600 text-white" : "border-[#262c3d] text-slate-300 hover:bg-[#161922]"}`}>
                  {f.label} {n}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">{source === "official" ? "인스타 공식 API" : "Apify"}로 가져온 {posts.length}개 중 반응도 상위 {shown.length}개</p>
            {shown.length >= 2 && (
              <button type="button" onClick={() => void pick(shown.slice(0, BUNDLE_SIZE))} disabled={!!picking} className="whitespace-nowrap rounded-lg border border-orange-400/50 px-2.5 py-1 text-xs font-bold text-orange-300 hover:bg-orange-500/10 disabled:opacity-50">
                {picking === "bundle" ? "이미지 받는 중…" : `🔥 상위 ${Math.min(BUNDLE_SIZE, shown.length)}개 묶어 분석`}
              </button>
            )}
          </div>
          {shown.map((p, i) => (
            <div key={p.id} className="flex gap-3 rounded-lg border border-[#262c3d] p-2">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt={`@${p.owner} 게시물`} referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                {p.type === "video" && <Play className="absolute right-1 top-1 h-3.5 w-3.5 text-white drop-shadow" />}
                {p.type === "carousel" && <span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[9px] text-white">{p.images.length}장</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-400">{i + 1}위 · @{p.owner} · <Heart className="inline h-3 w-3" /> {fmt(p.likes)} · <MessageCircle className="inline h-3 w-3" /> {fmt(p.comments)}{p.views ? ` · ▶ ${fmt(p.views)}` : ""}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-200">{p.caption || "(캡션 없음)"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void pick(p)} disabled={!!picking} className="whitespace-nowrap text-xs font-bold text-orange-300 hover:text-orange-200 disabled:opacity-50">
                    {picking === p.id ? "이미지 받는 중…" : "🔥 이 게시물로 분석"}
                  </button>
                  {p.type === "video" && p.videoUrl && (
                    <button type="button" onClick={() => void pick(p, true)} disabled={!!picking} title={isGemini ? "영상(화면+소리)을 Gemini가 직접 봅니다" : "본인 OpenAI 키로 말소리를 받아써 함께 분석합니다(25MB까지)"} className="whitespace-nowrap text-xs font-bold text-sky-300 hover:text-sky-200 disabled:opacity-50">
                      {picking === `${p.id}:video` ? (isGemini ? "영상 준비 중(최대 1~2분)…" : "말소리 받아쓰는 중…") : isGemini ? "🎬 영상까지 분석" : "🎙 말소리까지 분석"}
                    </button>
                  )}
                  <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-[11px] text-slate-400 underline">인스타에서 보기</a>
                </div>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">릴스(▶)는 「🔥 이 게시물로 분석」이면 표지·캡션만, 「🎬 영상까지 분석」이면 분석 AI가 Gemini일 때 영상의 화면과 소리까지 보고, 다른 AI면 「🎙 말소리까지 분석」으로 본인 OpenAI 키가 말소리를 받아씁니다(영상은 분석용으로 잠깐 받아 본인 Gemini에 올리고, 분석 직후 지움 — 우리 서버에 저장하지 않음. 공개 게시물만, 본인 책임).</p>
        </div>
      )}
    </div>
  );
}
