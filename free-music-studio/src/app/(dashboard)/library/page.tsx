"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Library,
  Play,
  Pause,
  Copy,
  Trash2,
  Search,
  AlertCircle,
  HardDrive,
  Loader2,
  FolderOpen,
  X,
  ListPlus,
  PlayCircle,
  Pencil,
  Palette,
} from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { CollectionsNav, type View } from "@/components/library/CollectionsNav";
import { DownloadButtons } from "@/components/engine/DownloadButtons";
import { CoverThumb } from "@/components/library/CoverThumb";
import { TrackOrderList } from "@/components/library/TrackOrderList";
import { TrackDetailPanel } from "@/components/library/TrackDetailPanel";
import { TrackMenu } from "@/components/library/TrackMenu";
import { appendIds, withoutIds } from "@/lib/trackOrder";
import { FILTER_LABEL, SORT_LABEL, filterTracks, sortTracks, type TrackFilter, type TrackSort } from "@/lib/trackFilters";

const STATE_KEY = "fms.libraryView"; // 원본처럼 보던 화면·검색·필터를 탭 안에서 기억(sessionStorage)
import { usePlayer } from "@/components/player/PlayerProvider";
import {
  EngineError,
  deleteFromLibrary,
  hasFolderPicker,
  hasLibrary,
  listLibraryFormats,
  hasCover,
  hasWaveform,
  revealLibraryFolder,
} from "@/lib/engine";
import { COVER_SOURCE_KEY, KIND_LABEL, type CoverSource, type Track } from "@/lib/tracks";
import type { Collection, CollectionKind } from "@/lib/collections";

const DEVICE_LABEL: Record<string, string> = { cuda: "그래픽카드", mps: "Apple 맥", cpu: "CPU" };
const durationLabel = (s: number) => (s < 60 ? `${s}초` : s % 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s / 60}분`);
const smallSelect =
  "rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-300 focus:border-emerald-400 focus:outline-hidden disabled:opacity-40";

export default function LibraryPage() {
  const engine = useEngine();
  const libOk = engine.paired && hasLibrary(engine.status);
  const showCovers = libOk && hasCover(engine.status);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [projects, setProjects] = useState<Collection[]>([]);
  const [playlists, setPlaylists] = useState<Collection[]>([]);
  const [view, setView] = useState<View>({ type: "all" });
  const [order, setOrder] = useState<string[]>([]); // 지금 보는 플레이리스트의 곡 순서
  const [loading, setLoading] = useState(true);
  const [exempt, setExempt] = useState(false);
  const [onPc, setOnPc] = useState<Set<string> | null>(null);
  const [formats, setFormats] = useState<Record<string, string>>({});
  const [arts, setArts] = useState<Set<string>>(new Set()); // 표지가 있는 곡(엔진 0.6.8+)
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null); // 잘 된 일 안내(초록)
  const [renaming, setRenaming] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // 여러 곡 고르기(원본 전체 선택 → 빼기·옮기기)
  const [detailId, setDetailId] = useState<string | null>(null); // 오른쪽 곡 상세 패널
  const [artVersion, setArtVersion] = useState<Record<string, number>>({}); // 표지를 바꾼 곡은 작은 그림도 다시 받는다
  const [filter, setFilter] = useState<TrackFilter>("all");
  const [sort, setSort] = useState<TrackSort>("newest");
  const restored = useRef(false);

  // 보던 화면 되살리기 → 바뀔 때마다 기억
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null");
      if (s?.view?.type === "all" || ((s?.view?.type === "project" || s?.view?.type === "playlist") && typeof s.view.id === "string")) setView(s.view);
      if (typeof s?.query === "string") setQuery(s.query);
      if (s?.filter in FILTER_LABEL) setFilter(s.filter);
      if (s?.sort in SORT_LABEL) setSort(s.sort);
    } catch {}
    restored.current = true;
  }, []);
  // 홈·좌측 메뉴에서 넘어온 프로젝트·플레이리스트(?view=project:<id>)는 기억해 둔 화면보다 먼저 연다(이미 이 화면에 있어도)
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const linked = /^(project|playlist):([0-9a-f-]{36})$/.exec(params.get("view") ?? "");
    if (!linked) return;
    setView({ type: linked[1] as "project" | "playlist", id: linked[2] });
    setSort(linked[1] === "playlist" ? "manual" : "newest");
    setQuery("");
    setFilter("all");
    setSelected(new Set());
    router.replace("/library");
  }, [params, router]);
  useEffect(() => {
    if (!restored.current) return;
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ view, query, filter, sort }));
    } catch {}
  }, [view, query, filter, sort]);

  // 잘 된 일 안내는 잠깐 보이고 사라진다(원본 3초, 긴 안내는 조금 더)
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), notice.length > 60 ? 8000 : 3000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const loadCollections = useCallback(async () => {
    const res = await fetch("/api/collections").catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setProjects(data.projects ?? []);
    setPlaylists(data.playlists ?? []);
    setCollectionsLoaded(true);
  }, []);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tracks");
      const data = await res.json();
      if (res.ok) {
        setTracks(data.tracks ?? []);
        setExempt(!!data.retentionExempt);
      }
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
        setArts(r.arts);
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
  // 기억해 둔 프로젝트·플레이리스트가 그사이 지워졌으면 「모든 음악」으로
  useEffect(() => {
    if (collectionsLoaded && view.type !== "all" && !current) setView({ type: "all" });
  }, [collectionsLoaded, view, current]);

  const shown = useMemo(() => {
    let list: Track[];
    if (view.type === "project") list = tracks.filter((t) => t.project_id === view.id);
    else if (view.type === "playlist") {
      const byId = new Map(tracks.map((t) => [t.id, t]));
      list = order.map((id) => byId.get(id)).filter((t): t is Track => !!t);
    } else list = tracks;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((t) => `${t.title} ${t.style_prompt} ${t.lyrics}`.toLowerCase().includes(q));
    list = filterTracks(list, filter, (id) => arts.has(id));
    return sortTracks(list, view.type === "playlist" || sort !== "manual" ? sort : "newest");
  }, [tracks, view, order, query, filter, sort, arts]);
  // 플레이리스트는 「플레이리스트 순서」로 보고 걸러 내지 않을 때만 끌어서 순서를 바꿀 수 있다
  const canReorder = view.type === "playlist" && sort === "manual" && filter === "all" && !query.trim();
  const narrowed = !!query.trim() || filter !== "all";

  // 듣기는 화면 아래 재생바 하나로 — 지금 보이는(이 PC에 있는) 곡 순서가 재생 목록이 된다.
  const player = usePlayer();
  const toPlayer = (t: Track) => ({ key: t.id, title: t.title, subtitle: `${durationLabel(t.duration_sec)}${KIND_LABEL[t.kind] ? ` · ${KIND_LABEL[t.kind]}` : ""}${t.license === "noncommercial" ? " · 비상업용" : ""}` });
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${what}을 복사했습니다.`);
    } catch {
      setMessage("복사하지 못했습니다. 글자를 직접 선택해 복사해 주세요.");
    }
  };


  const remove = async (t: Track) => {
    const here = onPc?.has(t.id);
    if (!confirm(here ? `「${t.title}」을 목록과 이 PC 보관함에서 지울까요? 되돌릴 수 없습니다.` : `「${t.title}」을 목록에서 지울까요?`)) return;
    setBusy(t.id);
    setMessage(null);
    try {
      const kept = here ? (await deleteFromLibrary(t.id)).skipped : [];
      const res = await fetch(`/api/tracks/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (kept.length) setNotice(`목록에서 지웠습니다. 보관함 폴더 밖에 있는 파일이라 안전을 위해 PC에서는 지우지 않았습니다: ${kept.join(", ")}`);
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

  // 플레이리스트에 담기 — 이미 담긴 곡은 건너뛰고 뒤에 덧붙인다. 지금 보는 플레이리스트면 화면 순서도 바로 바꾼다.
  const addToPlaylist = async (trackIds: string[], playlistId: string) => {
    const cur = await fetch(`/api/collections/${playlistId}/items`).then((r) => (r.ok ? r.json() : { track_ids: [] }));
    const ids: string[] = cur.track_ids ?? [];
    const next = appendIds(ids, trackIds);
    const name = playlists.find((p) => p.id === playlistId)?.name ?? "플레이리스트";
    if (next.length === ids.length) return setMessage(trackIds.length > 1 ? "고른 곡이 모두 이미 담겨 있습니다." : "이미 담긴 곡입니다.");
    const saved = await saveOrder(playlistId, next);
    if (!saved) return;
    if (view.type === "playlist" && view.id === playlistId) setOrder(saved);
    setNotice(`「${name}」에 ${next.length - ids.length}곡을 담았습니다.`);
  };

  // 원본 「플레이리스트 추가」 창의 「새로 만들어 추가」 — 이름만 묻고 바로 담는다(화면은 그대로).
  const addToNewPlaylist = async (trackIds: string[]) => {
    const name = window.prompt("새 플레이리스트 이름", "")?.trim();
    if (!name) return;
    const res = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "playlist", name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error || "만들지 못했습니다.");
    const saved = await saveOrder(data.collection.id, trackIds);
    if (saved) setNotice(`새 플레이리스트 「${name}」에 ${saved.length}곡을 담았습니다.`);
  };

  const pickPlaylist = (value: string, trackIds: string[]) => {
    if (value === "__new") void addToNewPlaylist(trackIds);
    else if (value) void addToPlaylist(trackIds, value);
  };

  const removeFromPlaylist = async (trackIds: string[]) => {
    if (view.type !== "playlist") return;
    const ids = withoutIds(order, trackIds);
    setOrder(ids);
    const saved = await saveOrder(view.id, ids);
    if (saved) setOrder(saved);
    setSelected(new Set());
  };

  const reorderPlaylist = async (ids: string[]) => {
    if (view.type !== "playlist") return false;
    const saved = await saveOrder(view.id, ids);
    if (!saved) return false;
    setOrder(saved);
    return true;
  };

  const moveSelectedToProject = async (projectId: string | null) => {
    const list = tracks.filter((t) => selected.has(t.id) && t.project_id !== projectId);
    for (const t of list) await setProject(t, projectId);
    const name = projectId ? projects.find((p) => p.id === projectId)?.name : null;
    (list.length ? setNotice : setMessage)(list.length ? `${list.length}곡을 ${name ? `「${name}」 프로젝트로 옮겼습니다` : "프로젝트에서 뺐습니다"}.` : "옮길 곡이 없습니다.");
  };

  // ── 이어 듣기(재생바) ─────────────────────────────────
  const playable = shown.filter((t) => libOk && onPc?.has(t.id));
  const startQueue = () => player?.playList(playable.map(toPlayer));
  const playOne = (t: Track) => player?.playList(playable.map(toPlayer), t.id);
  const shownIds = shown.map((t) => t.id);
  const chosen = shownIds.filter((id) => selected.has(id));
  const allChosen = shownIds.length > 0 && chosen.length === shownIds.length;
  const playChosen = () => player?.playList(playable.filter((t) => selected.has(t.id)).map(toPlayer));
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
              내 PC 엔진으로 만든 노래가 모두 모입니다. 프로젝트로 묶고, 플레이리스트에 담아 이어 들을 수 있습니다. 음원 파일은 회원님 PC에 있고, 곡 기록은 {exempt ? "기한 없이 보관됩니다(관리자·시험 계정)" : "30일 동안 보관됩니다"}.
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
      {notice && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-200">
          ✅ {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto" aria-label="닫기">
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
            setSelected(new Set());
            // 플레이리스트는 담은 순서가 기본, 다른 화면에는 그 순서가 없다
            if (v.type === "playlist") setSort("manual");
            else if (sort === "manual") setSort("newest");
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

          <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·스타일·가사로 찾기"
              className="w-full bg-transparent py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기" className="text-slate-500 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <label className="flex items-center gap-1.5">
              보기
              <select value={filter} onChange={(e) => setFilter(e.target.value as TrackFilter)} className={smallSelect}>
                {(Object.keys(FILTER_LABEL) as TrackFilter[])
                  .filter((f) => f !== "noArt" || showCovers)
                  .map((f) => (
                    <option key={f} value={f}>
                      {FILTER_LABEL[f]}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              정렬
              <select value={sort} onChange={(e) => setSort(e.target.value as TrackSort)} className={smallSelect}>
                {(Object.keys(SORT_LABEL) as TrackSort[])
                  .filter((s) => s !== "manual" || view.type === "playlist")
                  .map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABEL[s]}
                    </option>
                  ))}
              </select>
            </label>
            {narrowed && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="underline underline-offset-2 hover:text-slate-300"
              >
                조건 지우기
              </button>
            )}
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
              ) : narrowed ? (
                "조건에 맞는 노래가 없습니다. 검색어나 「보기」를 바꿔 보세요."
              ) : view.type === "project" ? (
                "이 프로젝트에 넣은 곡이 없습니다. 「모든 음악」에서 곡의 「프로젝트」 칸을 바꿔 넣으세요."
              ) : view.type === "playlist" ? (
                "이 플레이리스트에 담은 곡이 없습니다. 「모든 음악」에서 곡의 「플레이리스트에 담기」로 넣으세요."
              ) : (
                "찾는 노래가 없습니다."
              )}
            </div>
          ) : (
            <>
            {/* 여러 곡 고르기 — 원본 「전체 선택 → 목록에서 빼기·프로젝트로 옮기기」, 「선택 재생」 */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400">
              <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={allChosen}
                  onChange={() => setSelected(allChosen ? new Set() : new Set(shownIds))}
                  className="h-4 w-4 accent-emerald-500"
                />
                전체 선택
              </label>
              <span>{chosen.length ? `${chosen.length}곡 고름` : "곡 왼쪽 칸을 눌러 여러 곡을 고를 수 있습니다."}</span>
              {chosen.length > 0 && (
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {playable.some((t) => selected.has(t.id)) && (
                    <button type="button" onClick={playChosen} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}>
                      <PlayCircle className="h-3.5 w-3.5" /> 고른 곡 듣기
                    </button>
                  )}
                  <select value="" onChange={(e) => pickPlaylist(e.target.value, chosen)} className={smallSelect} aria-label="고른 곡을 플레이리스트에 담기">
                    <option value="">🎶 플레이리스트에 담기</option>
                    {playlists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="__new">＋ 새 플레이리스트 만들어 담기</option>
                  </select>
                  <select
                    value=""
                    onChange={(e) => e.target.value && moveSelectedToProject(e.target.value === "__none" ? null : e.target.value)}
                    className={smallSelect}
                    aria-label="고른 곡을 프로젝트로 옮기기"
                  >
                    <option value="">📁 프로젝트로 옮기기</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="__none">프로젝트에서 빼기</option>
                  </select>
                  {view.type === "playlist" && (
                    <button type="button" onClick={() => removeFromPlaylist(chosen)} className={`${btn} border-rose-500/30 text-rose-300 hover:bg-rose-950/50`}>
                      <X className="h-3.5 w-3.5" /> 이 플레이리스트에서 빼기
                    </button>
                  )}
                  <button type="button" onClick={() => setSelected(new Set())} className={`${btn} border-slate-700 text-slate-400`}>
                    고르기 취소
                  </button>
                </div>
              )}
            </div>
            {view.type === "playlist" && !canReorder && shown.length > 1 && (
              <p className="text-[11px] text-slate-500">검색·보기 조건을 지우고 정렬을 「플레이리스트 순서」로 두면 끌어서 순서를 바꿀 수 있습니다.</p>
            )}
            <TrackOrderList
              items={shown}
              editable={canReorder}
              onOrder={reorderPlaylist}
              rowClassName="space-y-2 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4"
              renderRow={(t, i, tools) => {
                const here = onPc ? onPc.has(t.id) : null;
                const inPlaylist = view.type === "playlist";
                return (
                  <>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleOne(t.id)}
                        aria-label={`${t.title} 고르기`}
                        className="h-4 w-4 shrink-0 accent-emerald-500"
                      />
                      {tools.grip}
                      {tools.badge}
                      {showCovers && <CoverThumb trackId={t.id} has={arts.has(t.id)} title={t.title} version={artVersion[t.id] ?? 0} />}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setDetailId(t.id)}
                          className={`block max-w-full truncate text-left text-sm font-semibold hover:text-emerald-300 hover:underline ${detailId === t.id ? "text-emerald-300" : "text-slate-100"}`}
                          title="곡 상세 보기"
                        >
                          {inPlaylist && !tools.badge && <span className="mr-1.5 text-slate-500">{i + 1}.</span>}
                          {t.title}
                        </button>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {KIND_LABEL[t.kind] && <span className="mr-1 rounded bg-sky-900/60 px-1.5 py-0.5 text-sky-200">{KIND_LABEL[t.kind]}</span>}
                          {t.license === "noncommercial" && (
                            <span className="mr-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-200" title="개인용 엔진(YuE2·LeVo 2 등)으로 만든 곡 — 수익 영상·판매에 쓸 수 없습니다">
                              비상업용
                            </span>
                          )}
                          {durationLabel(t.duration_sec)} · {DEVICE_LABEL[t.device] ?? t.device} · {new Date(t.created_at).toLocaleString("ko-KR")}
                          {here === false && <span className="text-amber-300/80"> · 이 PC에 음원 없음(다른 PC에서 만들었거나 지운 곡)</span>}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => playOne(t)}
                          disabled={!libOk || here === false || busy === t.id}
                          className={`${btn} ${player?.current?.key === t.id ? "border-emerald-400 bg-emerald-950/60 text-emerald-200" : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50"}`}
                        >
                          {player?.current?.key === t.id && player.loading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : player?.current?.key === t.id && player.playing ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}{" "}
                          {player?.current?.key === t.id && player.playing ? "멈춤" : "듣기"}
                        </button>
                        {libOk && here !== false && (
                          <DownloadButtons trackId={t.id} title={t.title} ext={formats[t.id] ?? "mp3"} ffmpeg={!!engine.status?.quality?.ffmpeg} cover={arts.has(t.id)} onError={setMessage} />
                        )}
                        <TrackMenu
                          label={t.title}
                          items={[
                            { label: "곡 상세 · 제목/가사 수정", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => setDetailId(t.id) },
                            {
                              label: "이 곡으로 커버 만들기",
                              icon: <Palette className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : t.license === "noncommercial" ? "개인용 엔진 곡은 커버를 만들 수 없습니다" : false,
                              onClick: () => {
                                const src: CoverSource = { id: t.id, title: t.title, style_prompt: t.style_prompt, lyrics: t.lyrics, kind: t.kind };
                                try {
                                  sessionStorage.setItem(COVER_SOURCE_KEY, JSON.stringify(src));
                                } catch {}
                                router.push(`/import?from=${t.id}`);
                              },
                            },
                            { label: "스타일 복사", icon: <Copy className="h-3.5 w-3.5" />, disabled: t.style_prompt ? false : "스타일이 없습니다", onClick: () => copy(t.style_prompt, "스타일") },
                            { label: "가사 복사", icon: <Copy className="h-3.5 w-3.5" />, disabled: t.lyrics.trim() ? false : "가사 없는 곡입니다", onClick: () => copy(t.lyrics, "가사") },
                            {
                              label: "저장 폴더 열기",
                              icon: <FolderOpen className="h-3.5 w-3.5" />,
                              hidden: !libOk || !hasFolderPicker(engine.status),
                              onClick: () => void revealLibraryFolder().catch(() => setMessage("폴더를 열지 못했습니다.")),
                            },
                            { label: "이 플레이리스트에서 빼기", icon: <X className="h-3.5 w-3.5" />, hidden: !inPlaylist, onClick: () => void removeFromPlaylist([t.id]) },
                            { label: "곡 지우기", icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, hidden: inPlaylist, disabled: busy === t.id ? "지우는 중입니다" : false, onClick: () => void remove(t) },
                          ]}
                        />
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
                      <label className="flex items-center gap-1.5">
                        <ListPlus className="h-3.5 w-3.5" /> 플레이리스트에 담기
                        <select value="" onChange={(e) => pickPlaylist(e.target.value, [t.id])} className={smallSelect}>
                          <option value="">고르기</option>
                          {playlists.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                          <option value="__new">＋ 새로 만들어 담기</option>
                        </select>
                      </label>
                    </div>

                  </>
                );
              }}
            />
            </>
          )}
          {(() => {
            const d = detailId ? tracks.find((t) => t.id === detailId) : null;
            if (!d) return null;
            return (
              <TrackDetailPanel
                track={d}
                parentTitle={d.parent_id ? tracks.find((t) => t.id === d.parent_id)?.title ?? null : null}
                hasArt={arts.has(d.id)}
                artVersion={artVersion[d.id] ?? 0}
                onPc={!!libOk && !!onPc?.has(d.id)}
                canWave={hasWaveform(engine.status)}
                canSetArt={hasWaveform(engine.status)}
                onClose={() => setDetailId(null)}
                onPlay={() => playOne(d)}
                onSaved={(u) => setTracks((list) => list.map((x) => (x.id === u.id ? u : x)))}
                onArtChanged={() => {
                  setArts((s) => new Set(s).add(d.id));
                  setArtVersion((v) => ({ ...v, [d.id]: (v[d.id] ?? 0) + 1 }));
                }}
                onCopy={copy}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}
