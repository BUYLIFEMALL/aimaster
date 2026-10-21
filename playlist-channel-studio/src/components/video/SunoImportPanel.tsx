"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Music2, RefreshCw } from "lucide-react";
import type { Track } from "@/types/playlist";
import type { LyricLine } from "@/lib/lyrics";

// v1.19 음악(SUNO) 자동화에서 만든 내 곡 여러 개를 골라 플레이리스트 곡 목록에 한 번에 추가한다.
// 음악은 비공개 저장소의 1시간 서명 주소로 받고(서버에 새로 올리지 않음), 「시간 가사도 받기」를 켜면
// 보컬 곡마다 회원 본인 Suno 키로 1번씩 시간 가사를 받아 그 곡의 가사 층(v1.17)에 바로 연결한다.
// v1.20 곡 커버로 배경 만들기(흐린 확대 커버 + 가운데 원본, 1920×1080) · 전체/보컬만/해제 · /video?suno=id1,id2 미리 선택
const MUSIC_APP_URL = "https://music-automation.buylife.xyz";
const MAX_PICK = 20;
const UUID = /^[0-9a-f-]{36}$/i;
type Variant = { id: string; duration: number | null; canTime: boolean };
type SunoTrack = { id: string; title: string; mode: "vocal" | "instrumental"; createdAt: string; variants: Variant[] };
type VariantInfo = { audioUrl: string; coverUrl: string | null };
type BgMedia = { type: "image" | "video"; url: string; name?: string };

// 이번 접속에서 이미 받은 시간 가사 — 같은 곡을 다시 넣어도 Suno를 다시 부르지 않는다
const timedCache = new Map<string, LyricLine[]>();

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(url, { cache: "no-store", ...init }); } catch { throw new Error("서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw Object.assign(new Error(data.error ?? `요청을 처리하지 못했습니다(${res.status}).`), { needSunoKey: !!data.needSunoKey });
  return data as T;
}
const fmt = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

/** 정사각 커버를 16:9 배경으로 — 늘이면 찌그러지므로 흐리게 키운 커버 위에 원본 커버를 가운데 놓는다(세로 영상에서도 가운데가 남음) */
async function coverBackdrop(coverUrl: string, title: string): Promise<BgMedia> {
  const res = await fetch(coverUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`커버를 받지 못했습니다(${res.status}).`);
  const img = await createImageBitmap(await res.blob());
  const W = 1920, H = 1080, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const big = Math.max(W / img.width, H / img.height) * 1.15;
  ctx.filter = "blur(48px) brightness(0.55) saturate(1.2)";
  ctx.drawImage(img, (W - img.width * big) / 2, (H - img.height * big) / 2, img.width * big, img.height * big);
  ctx.filter = "none";
  const side = Math.round(H * 0.72), x = (W - side) / 2, y = (H - side) / 2;
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 18;
  ctx.drawImage(img, x, y, side, side);
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.92));
  if (!blob) throw new Error("배경 그림을 만들지 못했습니다.");
  return { type: "image", url: URL.createObjectURL(blob), name: `${title.slice(0, 40)} 커버 배경.jpg` };
}

export function SunoImportPanel({ setTracks, hasBg, setBgMedia }: {
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  hasBg: boolean;
  setBgMedia: (media: BgMedia | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SunoTrack[] | null>(null), [listError, setListError] = useState("");
  const [picked, setPicked] = useState<string[]>([]), [withTime, setWithTime] = useState(true), [coverAsBg, setCoverAsBg] = useState(true);
  const [busy, setBusy] = useState(""), [report, setReport] = useState<{ text: string; ok: boolean; needKey?: boolean } | null>(null);
  const [incoming, setIncoming] = useState(0);

  async function load() {
    setListError("");
    try { setList((await getJson<{ tracks: SunoTrack[] }>("/api/suno/tracks")).tracks); }
    catch (e) { setList([]); setListError(e instanceof Error ? e.message : "곡 목록을 불러오지 못했습니다."); }
  }
  useEffect(() => { if (open && list === null) void load(); }, [open, list]);

  // 음악(SUNO) 자동화 「플레이리스트 영상 만들기 →」로 들어온 경우 — 곡을 미리 선택만 한다(Suno 조회 비용이 생길 수 있어 자동 추가하지 않음)
  useEffect(() => {
    const ids = (new URLSearchParams(window.location.search).get("suno") ?? "").split(",").map((x) => x.trim()).filter((x) => UUID.test(x));
    if (!ids.length) return;
    const uniq = Array.from(new Set(ids)).slice(0, MAX_PICK);
    setPicked(uniq); setIncoming(uniq.length); setOpen(true);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const all = (list ?? []).flatMap((t) => t.variants.map((v, i) => ({ t, v, i })));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PICK ? p : [...p, id]));
  const pickWhere = (fn: (t: SunoTrack) => boolean) => setPicked(all.filter((a) => fn(a.t)).map((a) => a.v.id).slice(0, MAX_PICK));
  const pickedHere = all.filter((a) => picked.includes(a.v.id));
  const timeCalls = withTime ? pickedHere.filter((a) => a.v.canTime && !timedCache.has(a.v.id)).length : 0;

  async function useCover(t: SunoTrack) {
    if (busy) return;
    setReport(null); setBusy(`「${t.title}」 커버로 배경을 만드는 중…`);
    try {
      const { variant } = await getJson<{ variant: VariantInfo }>(`/api/suno/tracks?variant=${t.variants[0].id}`);
      if (!variant.coverUrl) throw new Error("이 곡에는 커버 이미지가 없습니다.");
      setBgMedia(await coverBackdrop(variant.coverUrl, t.title));
      setReport({ ok: true, text: `「${t.title}」 커버로 배경을 만들었습니다(흐린 확대 커버 + 가운데 원본, 1920×1080).` });
    } catch (e) { setReport({ ok: false, text: e instanceof Error ? e.message : "배경을 만들지 못했습니다." }); }
    finally { setBusy(""); }
  }

  async function addPicked() {
    if (!pickedHere.length || busy) return;
    setReport(null);
    const added: Track[] = [], problems: string[] = [];
    let needKey = false, timedCount = 0, firstCover: { url: string; title: string } | null = null, bgDone = "";
    for (const [n, { t, v, i }] of pickedHere.entries()) { // 화면 순서대로 추가
      const label = `${t.title}${t.variants.length > 1 ? ` (변주 ${i + 1})` : ""}`;
      try {
        setBusy(`${n + 1}/${pickedHere.length} 「${label}」 음악을 받는 중…`);
        const { variant } = await getJson<{ variant: VariantInfo }>(`/api/suno/tracks?variant=${v.id}`);
        if (!firstCover && variant.coverUrl) firstCover = { url: variant.coverUrl, title: t.title };
        const res = await fetch(variant.audioUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`음악 파일을 받지 못했습니다(${res.status}).`);
        const blob = await res.blob();
        const type = blob.type && blob.type !== "application/octet-stream" ? blob.type : "audio/mpeg";
        const file = new File([blob], `${label.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)}.mp3`, { type });
        const url = URL.createObjectURL(file);
        const duration = await new Promise<number>((ok) => { const a = new Audio(url); a.onloadedmetadata = () => ok(a.duration || v.duration || 180); a.onerror = () => ok(v.duration || 180); });

        let lyrics: LyricLine[] | undefined;
        if (withTime && v.canTime) {
          lyrics = timedCache.get(v.id);
          if (!lyrics) {
            setBusy(`${n + 1}/${pickedHere.length} 「${label}」 Suno 시간 가사를 받는 중…`);
            try {
              lyrics = (await getJson<{ lines: LyricLine[] }>("/api/suno/timed-lyrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: v.id }) })).lines;
              timedCache.set(v.id, lyrics);
            } catch (e) {
              lyrics = undefined;
              needKey ||= !!(e as { needSunoKey?: boolean }).needSunoKey;
              problems.push(`「${label}」 시간 가사: ${e instanceof Error ? e.message : "받지 못함"}`);
            }
          }
          if (lyrics) timedCount++;
        }
        added.push({ id: Math.random().toString(36).substring(2, 9), name: label, duration, url, file, size: file.size, ...(lyrics?.length ? { lyrics: lyrics.map((l) => ({ ...l })), lyricsName: "Suno 시간 가사" } : {}) });
      } catch (e) {
        problems.push(`「${label}」: ${e instanceof Error ? e.message : "가져오지 못함"}`);
      }
    }
    if (added.length) setTracks((prev) => [...prev, ...added]);
    if (added.length && coverAsBg && !hasBg && firstCover) {
      setBusy("첫 곡 커버로 배경을 만드는 중…");
      try { setBgMedia(await coverBackdrop(firstCover.url, firstCover.title)); bgDone = ` 배경은 「${firstCover.title}」 커버로 만들었습니다.`; }
      catch (e) { problems.push(`배경: ${e instanceof Error ? e.message : "만들지 못함"}`); }
    }
    setBusy(""); setPicked([]); setIncoming(0);
    setReport({ ok: problems.length === 0, needKey, text: `곡 ${added.length}개를 목록 끝에 추가했습니다${timedCount ? ` (시간 가사 ${timedCount}곡)` : ""}.${bgDone}${problems.length ? ` 확인할 것: ${problems.join(" / ")}` : ""}` });
  }

  const chip = "text-[11px] px-2 py-1 rounded-lg border border-[#333] text-[#ccc] hover:text-white hover:border-[#555] disabled:opacity-40";
  return (
    <div className="bg-[#181818] border border-[#272727] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white"><Music2 className="w-4 h-4 text-[#ff0000]" />🎼 음악(SUNO) 자동화 곡 가져오기</div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-[#aaa] hover:text-white" aria-expanded={open}>{open ? "접기" : "내 곡 보기"}</button>
      </div>
      <p className="text-[11px] text-[#aaa] leading-relaxed">음악(SUNO) 자동화에서 만든 곡을 여러 개 골라 한 번에 추가합니다. 「시간 가사도 받기」를 켜면 보컬 곡마다 <strong className="text-white">본인 Suno API 키로 1번씩</strong> 시간 가사를 받아 영상 가사 층에 바로 연결합니다(이번 접속에서 받은 곡은 다시 부르지 않음). 곡 커버로 배경도 만들 수 있습니다.</p>
      {open && (
        <div className="space-y-3">
          {incoming > 0 && <div className="text-xs rounded-xl px-3 py-2 bg-[#1d2a3a] text-sky-200">음악(SUNO) 자동화에서 고른 곡 {incoming}개를 선택해 두었습니다. 확인한 뒤 「선택한 곡 추가」를 눌러 주세요.</div>}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <label className="flex items-center gap-2 text-xs text-[#ddd]"><input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} />Suno 시간 가사도 받기<span className="text-[#888]">— 끄면 음악만 추가</span></label>
            <label className="flex items-center gap-2 text-xs text-[#ddd]"><input type="checkbox" checked={coverAsBg} onChange={(e) => setCoverAsBg(e.target.checked)} />배경이 없으면 첫 곡 커버를 배경으로</label>
          </div>
          {listError && <div className="text-xs text-red-400">{listError}</div>}
          {list === null && <div className="text-xs text-[#aaa] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />곡 목록을 불러오는 중…</div>}
          {list && !list.length && !listError && (
            <div className="text-xs text-[#aaa]">아직 가져올 곡이 없습니다. <a className="underline text-white inline-flex items-center gap-1" href={`${MUSIC_APP_URL}/plannings`} target="_blank" rel="noreferrer">음악(SUNO) 자동화에서 곡 만들기 <ExternalLink className="w-3 h-3" /></a></div>
          )}
          {!!list?.length && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={chip} disabled={!!busy} onClick={() => pickWhere(() => true)}>전체 선택</button>
                <button type="button" className={chip} disabled={!!busy} onClick={() => pickWhere((t) => t.mode === "vocal")}>보컬만</button>
                <button type="button" className={chip} disabled={!!busy} onClick={() => pickWhere((t) => t.mode === "instrumental")}>연주곡만</button>
                <button type="button" className={chip} disabled={!!busy || !picked.length} onClick={() => setPicked([])}>선택 해제</button>
                <span className="text-[11px] text-[#888] self-center">최대 {MAX_PICK}곡</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {list.map((t) => (
                  <div key={t.id} className="bg-[#212121] rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-white font-semibold min-w-0 truncate">{t.title} <span className="text-[#888] font-normal">· {t.mode === "vocal" ? "보컬" : "연주곡"}</span></span>
                    <span className="flex flex-wrap gap-1.5">
                      {t.variants.map((v, i) => (
                        <label key={v.id} className={`text-[11px] px-2 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${picked.includes(v.id) ? "border-[#ff0000] bg-[#3a1212] text-white" : "border-[#333] text-[#ccc]"}`}>
                          <input type="checkbox" className="w-3 h-3" checked={picked.includes(v.id)} onChange={() => toggle(v.id)} disabled={!!busy} />
                          변주 {i + 1}{v.duration ? ` · ${fmt(v.duration)}` : ""}{timedCache.has(v.id) ? " · ✓ 가사 받음" : ""}
                        </label>
                      ))}
                      <button type="button" className={chip} disabled={!!busy} onClick={() => void useCover(t)} title="이 곡 커버로 1920×1080 배경을 만듭니다(지금 배경을 바꿉니다)">🖼 배경으로</button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void addPicked()} disabled={!pickedHere.length || !!busy} className="px-3 py-2 rounded-xl text-xs font-bold bg-[#ff0000] text-white disabled:opacity-40">
              {busy ? "가져오는 중…" : `선택한 곡 추가 (${pickedHere.length})`}
            </button>
            {withTime && timeCalls > 0 && !busy && <span className="text-[11px] text-[#aaa]">Suno 시간 가사 조회 {timeCalls}회(본인 키)</span>}
            <button type="button" onClick={() => void load()} disabled={!!busy} className="text-[11px] text-[#aaa] hover:text-white inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />새로고침</button>
          </div>
          {busy && <div className="text-xs text-[#ddd] flex items-center gap-1" aria-live="polite"><Loader2 className="w-3 h-3 animate-spin" />{busy}</div>}
          {report && (
            <div role="status" className={`text-xs rounded-xl px-3 py-2 ${report.ok ? "bg-[#12301c] text-green-300" : "bg-[#3a2a12] text-amber-200"}`}>
              {report.text}
              {report.needKey && <> <a className="underline font-bold" href={`${MUSIC_APP_URL}/settings`} target="_blank" rel="noreferrer">🔑 음악(SUNO) 자동화에서 키 등록 →</a></>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
