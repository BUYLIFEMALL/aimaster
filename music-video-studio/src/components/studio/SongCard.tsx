"use client";

import { useEffect, useRef, useState } from "react";
import { Disc3, Loader2, Music2, Trash2, Upload, X } from "lucide-react";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote } from "@/components/studio/ui";
import { audioDuration, deleteLocalSong, loadLocalSong, saveLocalSong } from "@/lib/music/localSong";
import type { SongRef } from "@/lib/music/types";

// v1.13 이 뮤직비디오의 곡: ① AI 음악 스튜디오에서 내가 만든 곡 가져오기 ② 내 PC 음악 파일 올리기(이 브라우저에만 보관).
// 가져온 곡은 제목·스타일·가사를 프로젝트에 채워 다음 단계(스토리보드)가 그 가사로 장면을 나눈다.
const AMS_URL = "https://ai-music-studio.buylife.xyz";
const MAX_FILE = 50 * 1024 * 1024;

interface AmsSongItem { ref: string; title: string; model: string; durationS: number | null; instrumental: boolean; createdAt: string; style: string; lyrics: string; audioUrl: string | null }

const mmss = (s: number | null | undefined) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");

export function SongCard() {
  const { project, update } = useStudio();
  const song = project.song;
  // 주소로 들어온 곡을 비동기로 넣을 때도 「지금 가사」를 정확히 비교하려고 최신 프로젝트를 기억해 둔다
  const latest = useRef(project);
  latest.current = project;
  const [src, setSrc] = useState<string | null>(null);
  const [srcNote, setSrcNote] = useState("");
  const [list, setList] = useState<AmsSongItem[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  const setObjectUrl = (url: string | null) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = url;
  };
  useEffect(() => () => setObjectUrl(null), []);

  // 곡이 바뀌면(또는 프로젝트를 다시 열면) 듣기 주소를 다시 준비한다
  useEffect(() => {
    let alive = true;
    setSrc(null); setSrcNote("");
    if (!song) return;
    if (song.source === "ams" && song.ref) {
      fetch(`/api/music/ams?ref=${encodeURIComponent(song.ref)}`, { cache: "no-store" })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => { if (alive) ok ? setSrc(d.audioUrl) : setSrcNote(d.error || "곡을 불러오지 못했습니다."); })
        .catch(() => alive && setSrcNote("곡을 불러오지 못했습니다. 네트워크를 확인해주세요."));
    } else if (song.source === "file") {
      loadLocalSong().then((blob) => {
        if (!alive) return;
        if (!blob) { setSrcNote("이 브라우저에 보관된 파일이 없습니다(다른 PC·브라우저이거나 사이트 데이터가 지워짐). 파일을 다시 올려 주세요."); return; }
        const url = URL.createObjectURL(blob); setObjectUrl(url); setSrc(url);
      });
    }
    return () => { alive = false; };
  }, [song?.source, song?.ref, song?.fileName]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSong = (next: SongRef | null, fill?: { title: string; style: string; lyrics: string }) => {
    update((p) => {
      if (!fill) return { ...p, song: next };
      const lyricsChanged = !!fill.lyrics && fill.lyrics !== p.lyrics;
      return {
        ...p,
        song: next,
        title: fill.title.slice(0, 60) || p.title,
        sunoStyle: fill.style || p.sunoStyle,
        ...(lyricsChanged ? { lyrics: fill.lyrics, scenes: [], mood: "" } : {}),
      };
    });
  };

  const openList = async () => {
    if (list) { setList(null); return; }
    setBusy("list"); setError("");
    try {
      const res = await fetch("/api/music/ams", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "곡 목록을 불러오지 못했습니다.");
      setList(d.songs);
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };

  const pick = (s: AmsSongItem) => {
    const current = latest.current;
    const willReplace = !!s.lyrics && !!current.lyrics.trim() && s.lyrics !== current.lyrics;
    if (willReplace && !window.confirm("지금 가사와 만들어 둔 스토리보드가 이 곡의 가사로 바뀝니다. 가져올까요?")) return;
    setObjectUrl(null);
    setSong({ source: "ams", title: s.title, ref: s.ref, durationS: s.durationS, model: s.model }, { title: s.title.replace(/ \(\d+\)$/, ""), style: s.style, lyrics: s.lyrics });
    setList(null); setError("");
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(file.name)) { setError("mp3·m4a·wav·ogg·aac·flac 음악 파일만 올릴 수 있습니다."); return; }
    if (file.size > MAX_FILE) { setError("음악 파일은 50MB 이하만 올릴 수 있습니다."); return; }
    setBusy("file");
    try {
      const url = URL.createObjectURL(file);
      const durationS = await audioDuration(url);
      const saved = await saveLocalSong(file);
      setObjectUrl(url);
      setSong({ source: "file", title: file.name.replace(/\.[^.]+$/, "").slice(0, 80), fileName: file.name.slice(0, 120), durationS });
      if (!saved) setError("이 브라우저에 파일을 보관하지 못했습니다(시크릿 창 등). 지금은 들을 수 있지만 새로고침하면 다시 올려야 합니다.");
    } finally { setBusy(""); }
  };

  const remove = async () => {
    if (song?.source === "file") await deleteLocalSong();
    setObjectUrl(null);
    setSong(null);
  };

  // v1.14 AI 음악 스튜디오 곡 카드 링크(/music?ams=<생성 번호>:<곡 순서>)로 들어오면 그 곡을 바로 가져온다(한 번만, 주소에서 값 지움)
  const linked = useRef(false);
  useEffect(() => {
    if (linked.current) return;
    linked.current = true;
    const ref = new URLSearchParams(window.location.search).get("ams");
    if (!ref || !/^[0-9a-f-]{36}:\d{1,2}$/i.test(ref)) return;
    window.history.replaceState(null, "", window.location.pathname);
    setBusy("list"); setError("");
    fetch("/api/music/ams", { cache: "no-store" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "곡 목록을 불러오지 못했습니다.");
        const s = (d.songs as AmsSongItem[]).find((x) => x.ref === ref);
        if (!s) throw new Error("보낸 곡을 찾지 못했습니다. 내 곡이 아니거나 AI 음악 스튜디오 보관 기간(30일)이 지났을 수 있습니다.");
        pick(s);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(""));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sceneTotal = project.sceneCount * project.video.length;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
        <Disc3 size={16} className="text-pink-400" />
        <h2 className="text-sm font-bold text-white">이 뮤직비디오의 곡</h2>
        <span className="text-[11px] text-slate-400">선택 — 이미 만든 곡이 있으면 먼저 넣어 두세요</span>
      </div>

      {song ? (
        <div className="space-y-2.5 rounded-xl border border-[#1e293b] bg-[#080c14] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">🎵 {song.title}</p>
              <p className="text-[11px] text-slate-400">
                {song.source === "ams" ? `AI 음악 스튜디오${song.model ? ` · ${song.model}` : ""}` : `내 파일 · ${song.fileName ?? ""} · 이 브라우저에만 보관`}
                {song.durationS ? ` · ${mmss(song.durationS)}` : ""}
              </p>
            </div>
            <button type="button" className={BTN_GHOST} onClick={() => void remove()}>
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span>곡 빼기</span>
            </button>
          </div>
          {src ? <audio controls preload="metadata" src={src} className="w-full" /> : srcNote ? <p className="text-xs text-amber-300">⚠️ {srcNote}</p> : <p className="text-xs text-slate-400">곡을 불러오는 중…</p>}
          {song.durationS ? (
            <p className="text-[11px] text-slate-300">
              ⏱️ 곡 길이 {mmss(song.durationS)} · 지금 설정한 장면 {project.sceneCount}개 × {project.video.length}초 = {mmss(sceneTotal)}
              {sceneTotal < song.durationS ? ` — 곡 전체를 덮으려면 장면을 반복하거나 장면 수를 늘리세요(약 ${Math.ceil(song.durationS / project.video.length)}개).` : " — 장면이 곡보다 깁니다."}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-400">AI 음악 스튜디오에서 만든 곡을 가져오면 제목·스타일·가사가 아래 칸에 채워지고, 다음 단계에서 그 가사로 장면을 나눕니다. 내 PC의 음악 파일도 올릴 수 있습니다.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN_PRIMARY} disabled={!!busy} onClick={() => void openList()}>
          {busy === "list" ? <Loader2 className="h-4 w-4 animate-spin" /> : list ? <X className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
          <span>{list ? "곡 목록 닫기" : "AI 음악 스튜디오에서 가져오기"}</span>
        </button>
        <button type="button" className={BTN_GHOST} disabled={!!busy} onClick={() => fileRef.current?.click()}>
          {busy === "file" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-cyan-400" />}
          <span>내 음악 파일 올리기</span>
        </button>
        <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void upload(f); }} />
      </div>

      {list && (list.length ? (
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {list.map((s) => (
            <div key={s.ref} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#1e293b] bg-[#080c14] p-2.5">
              <div className="min-w-0 flex-1 basis-52">
                <p className="truncate text-xs font-bold text-white">{s.instrumental ? "🎼" : "🎤"} {s.title}</p>
                <p className="text-[11px] text-slate-400">{s.model}{s.durationS ? ` · ${mmss(s.durationS)}` : ""}{s.instrumental ? " · 연주곡" : " · 가사 있음"}</p>
              </div>
              {s.audioUrl && <audio controls preload="none" src={s.audioUrl} className="h-8 max-w-full" />}
              <button type="button" className={BTN_GHOST} onClick={() => pick(s)}>이 곡 쓰기</button>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">AI 음악 스튜디오에서 만든 완성곡(최근 40개 생성)입니다. 곡 파일은 AI 음악 스튜디오에 30일 동안 보관됩니다.</p>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          아직 AI 음악 스튜디오에서 만든 완성곡이 없습니다.{" "}
          <a href={AMS_URL} target="_blank" rel="noreferrer" className="text-cyan-300 underline">AI 음악 스튜디오</a>에서 곡을 만든 뒤 다시 열어 주세요.
        </p>
      ))}

      {error && <ErrorNote message={error} />}
      <p className="text-[11px] text-slate-400 border-t border-[#1e293b]/60 pt-2.5">🔒 내 곡만 보이고, 직접 올린 파일은 서버로 보내지 않고 이 브라우저에만 보관합니다.</p>
    </Card>
  );
}
