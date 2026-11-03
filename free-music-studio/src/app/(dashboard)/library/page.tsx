"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Library,
  Play,
  Trash2,
  Search,
  AlertCircle,
  HardDrive,
  Loader2,
  ChevronDown,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  X,
  ListPlus,
  PlayCircle,
  Pencil,
} from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { CollectionsNav, type View } from "@/components/library/CollectionsNav";
import { DownloadButtons } from "@/components/engine/DownloadButtons";
import {
  EngineError,
  deleteFromLibrary,
  fetchLibraryAudio,
  hasFolderPicker,
  hasLibrary,
  listLibraryFormats,
  revealLibraryFolder,
} from "@/lib/engine";
import { KIND_LABEL, type Track } from "@/lib/tracks";
import type { Collection, CollectionKind } from "@/lib/collections";

const DEVICE_LABEL: Record<string, string> = { cuda: "그래픽카드", mps: "Apple 맥", cpu: "CPU" };
const durationLabel = (s: number) => (s < 60 ? `${s}초` : s % 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s / 60}분`);
const smallSelect =
  "rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-300 focus:border-emerald-400 focus:outline-hidden disabled:opacity-40";

export default function LibraryPage() {
  const engine = useEngine();
  const libOk = engine.paired && hasLibrary(engine.status);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [projects, setProjects] = useState<Collection[]>([]);
  const [playlists, setPlaylists] = useState<Collection[]>([]);
  const [view, setView] = useState<View>({ type: "all" });
  const [order, setOrder] = useState<string[]>([]); // 지금 보는 플레이리스트의 곡 순서
  const [loading, setLoading] = useState(true);
  const [onPc, setOnPc] = useState<Set<string> | null>(null);
  const [formats, setFormats] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [audio, setAudio] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [queue, setQueue] = useState<{ ids: string[]; index: number } | null>(null); // 이어 듣기
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const loadCollections = useCallback(async () => {
    const res = await fetch("/api/collections").catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setProjects(data.projects ?? []);
    setPlaylists(data.playlists ?? []);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tracks");
      const data = await res.json();
      if (res.ok) setTracks(data.tracks ?? []);
      else setMessage(data.error || "목록을 불러오지 못했습니다.");
    } catch {
      setMessage("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadCollections();
  }, [load, loadCollections]);

  // 엔진이 연결되면 이 PC 보관함에 어떤 곡이 있는지 한 번 확인한다.
  useEffect(() => {
    if (!libOk) return;
    listLibraryFormats()
      .then((r) => {
        setOnPc(r.ids);
        setFormats(r.formats);
      })
      .catch(() => setOnPc(null));
  }, [libOk, tracks.length]);

  // 플레이리스트를 고르면 곡 순서를 불러온다.
  useEffect(() => {
    if (view.type !== "playlist") return;
    setOrder([]);
    fetch(`/api/collections/${view.id}/items`)
      .then((r) => (r.ok ? r.json() : { track_ids: [] }))
      .then((d) => setOrder(d.track_ids ?? []))
      .catch(() => setOrder([]));
  }, [view]);

  const current: Collection | null =
    view.type === "project" ? projects.find((p) => p.id === view.id) ?? null : view.type === "playlist" ? playlists.find((p) => p.id === view.id) ?? null : null;

  const shown = useMemo(() => {
    let list: Track[];
    if (view.type === "project") list = tracks.filter((t) => t.project_id === view.id);
    else if (view.type === "playlist") {
      const byId = new Map(tracks.map((t) => [t.id, t]));
      list = order.map((id) => byId.get(id)).filter((t): t is Track => !!t);
    } else list = tracks;
    const q = query.trim().toLowerCase();
    return q ? list.filter((t) => `${t.title} ${t.style_prompt} ${t.lyrics}`.toLowerCase().includes(q)) : list;
  }, [tracks, view, order, query]);

  const loadAudio = async (id: string) => {
    if (audio[id]) return audio[id];
    setBusy(id);
    setMessage(null);
    try {
      const url = await fetchLibraryAudio(id);
      urls.current.push(url);
      setAudio((a) => ({ ...a, [id]: url }));
      return url;
    } catch (e) {
      setMessage(e instanceof EngineError ? e.message : "음원을 불러오지 못했습니다.");
      return null;
    } finally {
      setBusy(null);
    }
  };


  const remove = async (t: Track) => {
    const here = onPc?.has(t.id);
    if (!confirm(here ? `「${t.title}」을 목록과 이 PC 보관함에서 지울까요? 되돌릴 수 없습니다.` : `「${t.title}」을 목록에서 지울까요?`)) return;
    setBusy(t.id);
    setMessage(null);
    try {
      if (here) await deleteFromLibrary(t.id);
      const res = await fetch(`/api/tracks/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTracks((list) => list.filter((x) => x.id !== t.id));
      setOrder((o) => o.filter((x) => x !== t.id));
      loadCollections();
    } catch (e) {
      setMessage(e instanceof EngineError ? e.message : "지우지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  // ── 프로젝트·플레이리스트 ─────────────────────────────

  const createCollection = async (kind: CollectionKind, name: string) => {
    const res = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "만들지 못했습니다.");
      return false;
    }
    await loadCollections();
    setView({ type: kind, id: data.collection.id });
    return true;
  };

  const renameCurrent = async (name: string) => {
    if (!current) return;
    const res = await fetch(`/api/collections/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (!res.ok) setMessage((await res.json().catch(() => ({}))).error || "이름을 바꾸지 못했습니다.");
    setRenaming(null);
    loadCollections();
  };

  const deleteCurrent = async () => {
    if (!current) return;
    const what = current.kind === "project" ? "프로젝트를 지울까요? 곡은 지워지지 않고 묶음만 풀립니다." : "플레이리스트를 지울까요? 곡은 지워지지 않습니다.";
    if (!confirm(`「${current.name}」 ${what}`)) return;
    const res = await fetch(`/api/collections/${current.id}`, { method: "DELETE" });
    if (!res.ok) return setMessage("지우지 못했습니다.");
    if (current.kind === "project") setTracks((list) => list.map((t) => (t.project_id === current.id ? { ...t, project_id: null } : t)));
    setView({ type: "all" });
    loadCollections();
  };

  const setProject = async (t: Track, projectId: string | null) => {
    const res = await fetch(`/api/tracks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId }) });
    if (!res.ok) return setMessage((await res.json().catch(() => ({}))).error || "프로젝트를 바꾸지 못했습니다.");
    setTracks((list) => list.map((x) => (x.id === t.id ? { ...x, project_id: projectId } : x)));
    loadCollections();
  };

  const saveOrder = async (playlistId: string, ids: string[]) => {
    const res = await fetch(`/api/collections/${playlistId}/items`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track_ids: ids }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "플레이리스트를 저장하지 못했습니다.");
      return null;
    }
    loadCollections();
    return data.track_ids as string[];
  };

  const addToPlaylist = async (t: Track, playlistId: string) => {
    const cur = await fetch(`/api/collections/${playlistId}/items`).then((r) => (r.ok ? r.json() : { track_ids: [] }));
    const ids: string[] = cur.track_ids ?? [];
    if (ids.includes(t.id)) return setMessage("이미 담긴 곡입니다.");
    const saved = await saveOrder(playlistId, [...ids, t.id]);
    if (saved) setMessage(null);
  };

  const moveInPlaylist = async (id: string, dir: -1 | 1 | 0) => {
    if (view.type !== "playlist") return;
    const ids = [...order];
    const i = ids.indexOf(id);
    if (dir === 0) ids.splice(i, 1);
    else {
      const j = i + dir;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setOrder(ids);
    const saved = await saveOrder(view.id, ids);
    if (saved) setOrder(saved);
  };

  // ── 이어 듣기 ───────────────────────────────────────
  const playable = shown.filter((t) => libOk && onPc?.has(t.id));
  const startQueue = async () => {
    if (!playable.length) return;
    const ids = playable.map((t) => t.id);
    setQueue({ ids, index: 0 });
    await loadAudio(ids[0]);
  };
  const nextInQueue = async () => {
    if (!queue) return;
    const index = queue.index + 1;
    if (index >= queue.ids.length) return setQueue(null);
    setQueue({ ...queue, index });
    await loadAudio(queue.ids[index]);
  };
  const queueId = queue ? queue.ids[queue.index] : null;
  const queueTrack = queueId ? tracks.find((t) => t.id === queueId) : null;

  const btn = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Library className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🎧 모든 음악</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              내 PC 엔진으로 만든 노래가 모두 모입니다. 프로젝트로 묶고, 플레이리스트에 담아 이어 들을 수 있습니다. 음원 파일은 회원님 PC에 있고, 곡 기록은 30일 동안 보관됩니다.
            </p>
          </div>
          <span className="text-xs text-slate-400">총 {tracks.length}곡</span>
        </div>
      </div>

      {!engine.checking && !libOk && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-200">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {!engine.online
              ? "내 PC 엔진이 꺼져 있어 음원을 들을 수 없습니다. 엔진을 켜면 바로 들을 수 있습니다."
              : !engine.paired
                ? "이 브라우저를 엔진과 연결해야 음원을 들을 수 있습니다."
                : "지금 엔진은 보관함이 없는 옛 버전입니다. 엔진을 새로 받아 실행해 주세요."}{" "}
            <Link href="/engine" className="font-semibold underline underline-offset-2">
              내 PC 엔진 화면
            </Link>
          </span>
        </p>
      )}
      {libOk && engine.status?.libraryDir && (
        <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          💾 저장 폴더: <span className="break-all font-mono">{engine.status.libraryDir}</span>
          {hasFolderPicker(engine.status) && (
            <button
              type="button"
              onClick={() => revealLibraryFolder().catch(() => setMessage("폴더를 열지 못했습니다."))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:bg-slate-900"
            >
              <FolderOpen className="h-3.5 w-3.5" /> 폴더 열기
            </button>
          )}
          <Link href="/engine" className="underline underline-offset-2">
            폴더 바꾸기
          </Link>
        </p>
      )}

      {message && (
        <p className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-semibold text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" /> {message}
          <button type="button" onClick={() => setMessage(null)} className="ml-auto" aria-label="닫기">
            <X className="h-3.5 w-3.5" />
          </button>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <CollectionsNav
          total={tracks.length}
          projects={projects}
          playlists={playlists}
          view={view}
          onView={(v) => {
            setView(v);
            setRenaming(null);
            setQueue(null);
          }}
          onCreate={createCollection}
        />

        <div className="min-w-0 space-y-4">
          {/* 지금 보는 묶음 머리 */}
          <div className="flex flex-wrap items-center gap-2">
            {renaming !== null && current ? (
              <>
                <input
                  autoFocus
                  value={renaming}
                  onChange={(e) => setRenaming(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && renameCurrent(renaming)}
                  maxLength={40}
                  className="w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-hidden"
                />
                <button type="button" onClick={() => renameCurrent(renaming)} className={`${btn} border-emerald-500/40 text-emerald-300`}>
                  저장
                </button>
                <button type="button" onClick={() => setRenaming(null)} className={`${btn} border-slate-700 text-slate-400`}>
                  취소
                </button>
              </>
            ) : (
              <h2 className="text-sm font-bold text-slate-100">
                {current ? `${current.kind === "project" ? "📁" : "🎶"} ${current.name}` : "🎧 모든 음악"}{" "}
                <span className="font-normal text-slate-500">{shown.length}곡</span>
              </h2>
            )}
            <div className="ml-auto flex flex-wrap gap-1.5">
              {playable.length > 1 && (
                <button type="button" onClick={startQueue} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}>
                  <PlayCircle className="h-3.5 w-3.5" /> 전체 이어 듣기
                </button>
              )}
              {current && renaming === null && (
                <>
                  <button type="button" onClick={() => setRenaming(current.name)} className={`${btn} border-slate-700 text-slate-300 hover:bg-slate-900`}>
                    <Pencil className="h-3.5 w-3.5" /> 이름 바꾸기
                  </button>
                  <button type="button" onClick={deleteCurrent} className={`${btn} border-rose-500/30 text-rose-300 hover:bg-rose-950/50`}>
                    <Trash2 className="h-3.5 w-3.5" /> {current.kind === "project" ? "프로젝트" : "플레이리스트"} 지우기
                  </button>
                </>
              )}
            </div>
          </div>

          {queue && queueTrack && audio[queueTrack.id] && (
            <div className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <p className="flex items-center gap-2 text-xs text-emerald-200">
                <PlayCircle className="h-4 w-4" /> 이어 듣기 {queue.index + 1}/{queue.ids.length} — <span className="font-semibold">{queueTrack.title}</span>
                <button type="button" onClick={() => setQueue(null)} className="ml-auto text-slate-400 hover:text-slate-200" aria-label="이어 듣기 끄기">
                  <X className="h-4 w-4" />
                </button>
              </p>
              <audio key={queueTrack.id} controls autoPlay src={audio[queueTrack.id]} onEnded={nextInQueue} className="w-full" />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·스타일·가사로 찾기"
              className="w-full bg-transparent py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
            />
          </div>

          {loading ? (
            <p className="text-xs text-slate-500">불러오는 중…</p>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-8 text-center text-xs text-slate-400">
              {tracks.length === 0 ? (
                <>
                  아직 만든 노래가 없습니다.{" "}
                  <Link href="/songs" className="font-semibold text-emerald-300 underline underline-offset-2">
                    곡 만들기
                  </Link>
                  에서 첫 노래를 만들어 보세요.
                </>
              ) : view.type === "project" ? (
                "이 프로젝트에 넣은 곡이 없습니다. 「모든 음악」에서 곡의 「프로젝트」 칸을 바꿔 넣으세요."
              ) : view.type === "playlist" ? (
                "이 플레이리스트에 담은 곡이 없습니다. 「모든 음악」에서 곡의 「플레이리스트에 담기」로 넣으세요."
              ) : (
                "찾는 노래가 없습니다."
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {shown.map((t, i) => {
                const here = onPc ? onPc.has(t.id) : null;
                const inPlaylist = view.type === "playlist";
                return (
                  <li key={t.id} className="space-y-2 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {inPlaylist && <span className="mr-1.5 text-slate-500">{i + 1}.</span>}
                          {t.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {KIND_LABEL[t.kind] && <span className="mr-1 rounded bg-sky-900/60 px-1.5 py-0.5 text-sky-200">{KIND_LABEL[t.kind]}</span>}
                          {durationLabel(t.duration_sec)} · {DEVICE_LABEL[t.device] ?? t.device} · {new Date(t.created_at).toLocaleString("ko-KR")}
                          {here === false && <span className="text-amber-300/80"> · 이 PC에 음원 없음(다른 PC에서 만들었거나 지운 곡)</span>}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => loadAudio(t.id)}
                          disabled={!libOk || here === false || busy === t.id}
                          className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}
                        >
                          {busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} 듣기
                        </button>
                        {libOk && here !== false && (
                          <DownloadButtons trackId={t.id} title={t.title} ext={formats[t.id] ?? "mp3"} ffmpeg={!!engine.status?.quality?.ffmpeg} onError={setMessage} />
                        )}
                        {inPlaylist ? (
                          <>
                            <button type="button" onClick={() => moveInPlaylist(t.id, -1)} disabled={i === 0} className={`${btn} border-slate-700 text-slate-400`} aria-label="위로">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => moveInPlaylist(t.id, 1)} disabled={i === shown.length - 1} className={`${btn} border-slate-700 text-slate-400`} aria-label="아래로">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => moveInPlaylist(t.id, 0)} className={`${btn} border-slate-700 text-slate-400`}>
                              <X className="h-3.5 w-3.5" /> 빼기
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => remove(t)}
                            disabled={busy === t.id}
                            className={`${btn} border-rose-500/30 text-rose-300 hover:bg-rose-950/50`}
                            aria-label="지우기"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpen(open === t.id ? null : t.id)}
                          className={`${btn} border-slate-700 text-slate-400 hover:bg-slate-900`}
                          aria-label="가사·스타일 보기"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open === t.id ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* 묶기: 프로젝트 지정 · 플레이리스트에 담기 */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <label className="flex items-center gap-1.5">
                        📁 프로젝트
                        <select value={t.project_id ?? ""} onChange={(e) => setProject(t, e.target.value || null)} className={smallSelect}>
                          <option value="">없음</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {playlists.length > 0 && (
                        <label className="flex items-center gap-1.5">
                          <ListPlus className="h-3.5 w-3.5" /> 플레이리스트에 담기
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) addToPlaylist(t, e.target.value);
                              e.target.value = "";
                            }}
                            className={smallSelect}
                          >
                            <option value="">고르기</option>
                            {playlists.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>

                    {audio[t.id] && queueId !== t.id && <audio controls autoPlay src={audio[t.id]} className="w-full" />}
                    {open === t.id && (
                      <div className="space-y-1 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">
                        {t.style_prompt && <p className="font-mono text-[11px] text-teal-300/80">{t.style_prompt}</p>}
                        <p className="whitespace-pre-wrap leading-relaxed">{t.lyrics || "(가사 없음)"}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
