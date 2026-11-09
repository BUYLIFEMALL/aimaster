"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
  Music2,
  Undo2,
  SlidersHorizontal,
  Layers,
  Clapperboard,
  Disc3,
  ImagePlus,
  Images,
  MonitorPlay,
  Film,
  Star,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { CollectionsNav, type View } from "@/components/library/CollectionsNav";
import { DownloadButtons } from "@/components/engine/DownloadButtons";
import { CoverThumb } from "@/components/library/CoverThumb";
import { TrackOrderList } from "@/components/library/TrackOrderList";
import { TrackDetailPanel } from "@/components/library/TrackDetailPanel";
import { TrackMenu, type MenuItem } from "@/components/library/TrackMenu";
import { MasteringDialog } from "@/components/library/MasteringDialog";
import { StemDialog } from "@/components/library/StemDialog";
import { appendIds, withoutIds } from "@/lib/trackOrder";
import { FILTER_LABEL, SORT_LABEL, filterTracks, sortTracks, type TrackFilter, type TrackSort } from "@/lib/trackFilters";
import { daysLeft } from "@/lib/trash";

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
  hasMastering,
  enqueueMaster,
  hasStems,
  hasAlbums,
  setTrackArt,
  enqueueStems,
  revealLibraryFolder,
} from "@/lib/engine";
import { COVER_SOURCE_KEY, KIND_LABEL, type CoverSource, type Track } from "@/lib/tracks";
import { openLyricVideo } from "@/lib/lyricVideoHandoff";
import { openVideoWithSongs, PLAYLIST_MAX } from "@/lib/videoHandoff";
import { AlbumPicker } from "@/components/albums/AlbumPicker";
import { albumsHref } from "@/lib/albums";
import { COLLECTIONS_CHANGED, TRACK_DRAG_TYPE, TRACKS_DROPPED, type Collection, type CollectionKind, type TracksDropped } from "@/lib/collections";

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
  // 보기 방식(2026-11-08 주인님 「앨범 이미지가 크게 보는 방식도」 — 원본 boks-music 카드 격자) — 이 브라우저에 기억
  const [layout, setLayoutState] = useState<"list" | "grid">("list");
  useEffect(() => {
    try {
      if (localStorage.getItem("fms:library-layout") === "grid") setLayoutState("grid");
    } catch {}
  }, []);
  const setLayout = (v: "list" | "grid") => {
    setLayoutState(v);
    try {
      localStorage.setItem("fms:library-layout", v);
    } catch {}
  };
  const [selected, setSelected] = useState<Set<string>>(new Set()); // 여러 곡 고르기(원본 전체 선택 → 빼기·옮기기)
  const [detailId, setDetailId] = useState<string | null>(null); // 오른쪽 곡 상세 패널
  const [mastering, setMastering] = useState<Track | null>(null); // 마스터링 설정 창
  const [stemFor, setStemFor] = useState<Track | null>(null); // Stem 분리 창
  const [coverFor, setCoverFor] = useState<Track | null>(null); // 앨범에서 표지 고르기(v1.35)
  const [artVersion, setArtVersion] = useState<Record<string, number>>({}); // 표지를 바꾼 곡은 작은 그림도 다시 받는다
  const [filter, setFilter] = useState<TrackFilter>("all");
  const [sort, setSort] = useState<TrackSort>("newest");
  const restored = useRef(false);

  // 보던 화면 되살리기 → 바뀔 때마다 기억
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null");
      if (s?.view?.type === "all" || s?.view?.type === "trash" || ((s?.view?.type === "project" || s?.view?.type === "playlist") && typeof s.view.id === "string")) setView(s.view);
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
    setSort("manual");
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
    setTrashCount(data.trashCount ?? 0);
    setCollectionsLoaded(true);
  }, []);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  // 휴지통(원본 boks-music trash.mjs, MIT) — 휴지통 화면을 열 때 읽는다
  const [trash, setTrash] = useState<Track[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const loadTrash = useCallback(async () => {
    const res = await fetch("/api/tracks?trash=1").catch(() => null);
    if (res?.ok) setTrash((await res.json()).tracks ?? []);
  }, []);
  useEffect(() => {
    if (view.type === "trash") void loadTrash();
  }, [view, loadTrash]);

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
  // 프로젝트·플레이리스트 순서를 바꾸면(이 화면 왼쪽·좌측 메뉴) 다시 읽는다(v1.31)
  useEffect(() => {
    const reload = () => void loadCollections();
    window.addEventListener(COLLECTIONS_CHANGED, reload);
    return () => window.removeEventListener(COLLECTIONS_CHANGED, reload);
  }, [loadCollections]);

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

  // 플레이리스트·프로젝트(v1.31)를 고르면 곡 순서를 불러온다.
  useEffect(() => {
    if (view.type !== "playlist" && view.type !== "project") return;
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
    if (collectionsLoaded && (view.type === "project" || view.type === "playlist") && !current) setView({ type: "all" });
  }, [collectionsLoaded, view, current]);

  const shown = useMemo(() => {
    let list: Track[];
    if (view.type === "project") {
      // 정한 순서대로, 아직 자리가 없는 곡(방금 넣은 곡)은 맨 위에
      const pos = new Map(order.map((id, i) => [id, i]));
      list = tracks.filter((t) => t.project_id === view.id).sort((a, b) => (pos.get(a.id) ?? -1) - (pos.get(b.id) ?? -1));
    } else if (view.type === "playlist") {
      const byId = new Map(tracks.map((t) => [t.id, t]));
      list = order.map((id) => byId.get(id)).filter((t): t is Track => !!t);
    } else if (view.type === "trash") list = trash;
    else if (view.type === "favorites") list = tracks.filter((t) => t.favorite);
    else list = tracks;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((t) => `${t.title} ${t.style_prompt} ${t.lyrics}`.toLowerCase().includes(q));
    list = filterTracks(list, filter, (id) => arts.has(id));
    if (view.type === "trash" && sort === "newest") return list; // 휴지통은 넣은 순서(최근 넣은 것부터) 그대로
    const ordered = view.type === "playlist" || view.type === "project";
    return sortTracks(list, ordered || sort !== "manual" ? sort : "newest");
  }, [tracks, trash, view, order, query, filter, sort, arts]);
  // 플레이리스트·프로젝트는 「직접 정한 순서」로 보고 걸러 내지 않을 때만 끌어서 순서를 바꿀 수 있다
  const canReorder = (view.type === "playlist" || view.type === "project") && sort === "manual" && filter === "all" && !query.trim();
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


  // 지우기 = 휴지통으로(되살릴 수 있음, 30일 뒤 자동 비움 — 관리자·시험 계정 제외). 완전 삭제는 휴지통에서.
  const moveToTrash = async (ids: string[]) => {
    setMessage(null);
    const res = await fetch("/api/tracks/trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error || "휴지통으로 옮기지 못했습니다.");
    const gone = new Set(ids);
    setTracks((list) => list.filter((x) => !gone.has(x.id)));
    setSelected(new Set());
    if (detailId && gone.has(detailId)) setDetailId(null);
    setNotice(`${data.trashed}곡을 휴지통으로 옮겼습니다. 휴지통에서 되살릴 수 있고, ${exempt ? "이 계정은 자동으로 비우지 않습니다" : "30일 뒤 자동으로 비워집니다"}.`);
    loadCollections();
  };
  const remove = (t: Track) => moveToTrash([t.id]);

  const restoreFromTrash = async (ids: string[], projectId: string | null = null) => {
    setMessage(null);
    const res = await fetch("/api/tracks/trash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, restore: true, project_id: projectId }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error || "되살리지 못했습니다.");
    setTrash((list) => list.filter((x) => !ids.includes(x.id)));
    setSelected(new Set());
    setNotice(`${data.restored}곡을 되살렸습니다.${projectId ? ` 원래 프로젝트가 없던 곡은 「${projects.find((p) => p.id === projectId)?.name ?? ""}」에 넣었습니다.` : ""}`);
    load();
    loadCollections();
  };

  // 완전 삭제 — 곡 기록을 지우고, 이 PC에 음원이 있으면 엔진이 보관함 안의 파일만 지운다(0.6.9 안전 규칙)
  const purge = async (ids: string[]) => {
    const list = trash.filter((t) => ids.includes(t.id));
    const onThisPc = list.filter((t) => libOk && onPc?.has(t.id)).length;
    if (!confirm(`${list.length}곡을 완전히 지울까요? 되돌릴 수 없습니다.${onThisPc ? ` 이 PC 보관함의 음원 ${onThisPc}개도 함께 지웁니다.` : ""}`)) return;
    setMessage(null);
    const kept: string[] = [];
    let done = 0;
    for (const t of list) {
      setBusy(t.id);
      try {
        if (libOk && onPc?.has(t.id)) kept.push(...(await deleteFromLibrary(t.id)).skipped);
        const res = await fetch(`/api/tracks/${t.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        done++;
      } catch (e) {
        setMessage(e instanceof EngineError ? e.message : `「${t.title}」을 지우지 못했습니다.`);
        break;
      }
    }
    setBusy(null);
    const removedIds = new Set(list.slice(0, done).map((t) => t.id));
    setTrash((l) => l.filter((x) => !removedIds.has(x.id)));
    setSelected(new Set());
    setNotice(`${done}곡을 완전히 지웠습니다.${kept.length ? ` 보관함 폴더 밖 파일은 안전을 위해 남겼습니다: ${kept.join(", ")}` : ""}`);
    loadCollections();
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
    const what = current.kind === "project" ? "프로젝트를 지울까요? 이 프로젝트의 곡은 휴지통으로 옮겨집니다(휴지통에서 되살릴 수 있음)." : "플레이리스트를 지울까요? 곡은 지워지지 않습니다.";
    if (!confirm(`「${current.name}」 ${what}`)) return;
    const res = await fetch(`/api/collections/${current.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error || "지우지 못했습니다.");
    if (current.kind === "project") {
      setTracks((list) => list.filter((t) => t.project_id !== current.id));
      setNotice(`「${current.name}」 프로젝트를 지우고 ${data.trashed ?? 0}곡을 휴지통으로 옮겼습니다.`);
    }
    setView({ type: "all" });
    loadCollections();
  };

  // 즐겨찾기(2026-11-08 주인님 「곡마다 찾기가 힘들어」) — 바로 바꿔 보여 주고, 저장에 실패하면 되돌린다
  const toggleFavorite = async (t: Track) => {
    const next = !t.favorite;
    setTracks((list) => list.map((x) => (x.id === t.id ? { ...x, favorite: next } : x)));
    const res = await fetch(`/api/tracks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite: next }) }).catch(() => null);
    if (!res?.ok) {
      setTracks((list) => list.map((x) => (x.id === t.id ? { ...x, favorite: !next } : x)));
      setMessage((await res?.json().catch(() => ({})))?.error || "즐겨찾기를 바꾸지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
    }
  };

  // 고른 곡 여러 개를 한 번에 즐겨찾기에 넣기/빼기(2026-11-08 — 고른 곡 도구 줄에서 찾으셔서)
  const setFavoriteMany = async (ids: string[], value: boolean) => {
    const targets = tracks.filter((t) => ids.includes(t.id) && !!t.favorite !== value);
    if (!targets.length) return setNotice(value ? "고른 곡이 이미 모두 즐겨찾기에 있습니다." : "고른 곡 중 즐겨찾기한 곡이 없습니다.");
    setTracks((list) => list.map((x) => (targets.some((t) => t.id === x.id) ? { ...x, favorite: value } : x)));
    const results = await Promise.all(
      targets.map((t) => fetch(`/api/tracks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite: value }) }).then((r) => r.ok, () => false)),
    );
    const failed = targets.filter((_, i) => !results[i]);
    if (failed.length) {
      setTracks((list) => list.map((x) => (failed.some((t) => t.id === x.id) ? { ...x, favorite: !value } : x)));
      setMessage(`${failed.length}곡은 즐겨찾기를 바꾸지 못했습니다. 잠시 뒤 다시 해 주세요.`);
    } else setNotice(value ? `${targets.length}곡을 즐겨찾기에 넣었습니다. 왼쪽 「즐겨찾기」에서 모아 볼 수 있습니다.` : `${targets.length}곡을 즐겨찾기에서 뺐습니다.`);
  };

  const setProject = async (t: Track, projectId: string | null) => {
    const res = await fetch(`/api/tracks/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId }) });
    if (!res.ok) return setMessage((await res.json().catch(() => ({}))).error || "프로젝트를 바꾸지 못했습니다.");
    setTracks((list) => list.map((x) => (x.id === t.id ? { ...x, project_id: projectId } : x)));
    // 이 화면 왼쪽 목록과 좌측 메뉴 곡 수를 함께 다시 읽는다(v1.35 — 좌측 메뉴 숫자가 그대로이던 문제)
    window.dispatchEvent(new Event(COLLECTIONS_CHANGED));
  };

  const saveOrder = async (playlistId: string, ids: string[]) => {
    const res = await fetch(`/api/collections/${playlistId}/items`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track_ids: ids }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "플레이리스트를 저장하지 못했습니다.");
      return null;
    }
    window.dispatchEvent(new Event(COLLECTIONS_CHANGED));
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
    if (view.type !== "playlist" && view.type !== "project") return false;
    const saved = await saveOrder(view.id, ids);
    if (!saved) return false;
    setOrder(saved);
    return true;
  };

  // 곡 줄을 왼쪽 프로젝트·플레이리스트로 끌어 놓기(v1.32, 주인님 「여기에도 프로젝트 이동, 플레이리스트 추가 기능 넣어줘」)
  // 고른 곡 가운데 하나를 끌면 고른 곡 모두, 아니면 그 곡 하나.
  const rowDragStart = (e: DragEvent<HTMLLIElement>, t: Track) => {
    const ids = selected.has(t.id) && selected.size > 1 ? [...selected] : [t.id];
    e.dataTransfer.setData(TRACK_DRAG_TYPE, JSON.stringify(ids));
    e.dataTransfer.setData("text/plain", ids.length > 1 ? `${ids.length}곡` : t.title);
    e.dataTransfer.effectAllowed = "copyMove";
  };
  const dropTracks = async (kind: CollectionKind, id: string, ids: string[]) => {
    if (kind === "playlist") return addToPlaylist(ids, id);
    const list = tracks.filter((t) => ids.includes(t.id) && t.project_id !== id);
    for (const t of list) await setProject(t, id);
    const name = projects.find((p) => p.id === id)?.name ?? "프로젝트";
    if (list.length) setNotice(`${list.length}곡을 「${name}」 프로젝트로 옮겼습니다.`);
    else setNotice(`이미 「${name}」 프로젝트에 있는 곡입니다.`);
  };
  // 좌측 메뉴(화면 맨 왼쪽)의 프로젝트·플레이리스트에 놓은 곡도 같은 방법으로 옮기거나 담는다(v1.35)
  const dropRef = useRef(dropTracks);
  dropRef.current = dropTracks;
  useEffect(() => {
    if (view.type === "trash") return;
    const onDropped = (e: Event) => {
      const d = (e as CustomEvent<TracksDropped>).detail;
      if (d?.ids?.length) void dropRef.current(d.kind, d.id, d.ids);
    };
    window.addEventListener(TRACKS_DROPPED, onDropped);
    return () => window.removeEventListener(TRACKS_DROPPED, onDropped);
  }, [view.type]);

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
  // 고른 곡 → 플레이리스트 영상(D-1 나머지): 목록 순서대로 최대 20곡, 음원은 이 창이 엔진에서 받아 건넴
  const playlistVideoChosen = () => {
    const list = playable.filter((t) => selected.has(t.id));
    if (openVideoWithSongs("playlist", list.map((t) => ({ id: t.id, title: t.title })), setMessage))
      setNotice(`플레이리스트 영상 창을 열었습니다. 곡 ${Math.min(list.length, PLAYLIST_MAX)}개와 맞춰 둔 가사 시간이 함께 들어갑니다${list.length > PLAYLIST_MAX ? ` (앞 ${PLAYLIST_MAX}곡만)` : ""}.`);
  };
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const btn = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40";

  // 곡 메뉴(…) 항목 — 한 줄 보기와 카드 보기가 함께 쓴다(2026-11-08 카드 보기 추가 때 한 줄 보기 안에서 옮김, 동작 같음)
  const menuFor = (t: Track, here: boolean | null): MenuItem[] => {
    const inPlaylist = view.type === "playlist";
    return view.type === "trash" ? [
                            { label: "되살리기", icon: <Undo2 className="h-3.5 w-3.5" />, onClick: () => void restoreFromTrash([t.id]) },
                            { label: "완전 삭제", icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, disabled: busy === t.id ? "지우는 중입니다" : false, onClick: () => void purge([t.id]) },
                          ] : [
                            { label: t.favorite ? "즐겨찾기에서 빼기" : "즐겨찾기에 넣기", icon: <Star className={`h-3.5 w-3.5 ${t.favorite ? "" : "fill-amber-300 text-amber-300"}`} />, onClick: () => void toggleFavorite(t) },
                            { label: "곡 상세 · 제목/가사 수정", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => setDetailId(t.id) },
                            { label: "가사 시간 조정 · LRC/SRT 불러오기", icon: <Pencil className="h-3.5 w-3.5" />, hidden: !t.lyrics.trim(),onClick: () => setDetailId(t.id) },
                            { label: "표지 올리기 · 내 PC 그림", icon: <ImagePlus className="h-3.5 w-3.5" />, onClick: () => setDetailId(t.id) },
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
                            {
                              // 만든 곡 → 가사 영상(D-1): 제목·가사·가사 시간은 가사 영상이 DB에서, 음원은 이 창이 엔진에서 받아 건넴
                              label: "가사 영상 만들기",
                              icon: <Clapperboard className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : !t.lyrics.trim() ? "가사 없는 곡입니다" : false,
                              onClick: () => {
                                if (openLyricVideo({ id: t.id, title: t.title }, setMessage))
                                  setNotice(t.lyric_timing ? "가사 영상 창을 열었습니다. 맞춰 둔 가사 시간과 음악 파일이 함께 들어갑니다." : "가사 영상 창을 열었습니다. 가사 시간은 그 화면 「가사 싱크」에서 맞추거나, 먼저 곡 상세 「가사 시간」에서 맞춰 두면 바로 들어갑니다.");
                              },
                            },
                            // 만든 곡 → 플레이리스트 영상·뮤직비디오(D-1 나머지, 2026-11-08)
                            {
                              label: "플레이리스트 영상 만들기",
                              icon: <MonitorPlay className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : false,
                              onClick: () => {
                                if (openVideoWithSongs("playlist", [{ id: t.id, title: t.title }], setMessage))
                                  setNotice("플레이리스트 영상 창을 열었습니다. 여러 곡을 넣으려면 곡 왼쪽 칸을 골라 「고른 곡으로 플레이리스트 영상」을 눌러 주세요.");
                              },
                            },
                            {
                              label: "뮤직비디오 만들기",
                              icon: <Film className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : false,
                              onClick: () => {
                                if (openVideoWithSongs("musicVideo", [{ id: t.id, title: t.title }], setMessage))
                                  setNotice("뮤직비디오 창을 열었습니다. 곡 제목·스타일·가사(맞춰 둔 가사 시간 포함)와 음악 파일이 함께 들어갑니다.");
                              },
                            },
                            // 백로그 D-5(2026-11-09): LP 턴테이블 영상으로 — 음원(MP3)·표지 그림·제목을 함께
                            {
                              label: "LP 턴테이블 영상으로",
                              icon: <Disc3 className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : false,
                              onClick: () => {
                                if (openVideoWithSongs("lp", [{ id: t.id, title: t.title }], setMessage))
                                  setNotice("LP 턴테이블 창을 열었습니다. 표지 그림은 LP 커버로, 음악은 배경 음악으로 들어갑니다 — 그 창에서 「음악 포함 MP4」를 만드세요.");
                              },
                            },
                            // 백로그 D-4(2026-11-09): 쇼츠 원스톱 배경음악으로 — MP3 320k를 브라우저 안에서 건넴(받는 쪽 v1.46)
                            {
                              label: "쇼츠 배경음악으로",
                              icon: <Clapperboard className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : false,
                              onClick: () => {
                                if (openVideoWithSongs("shorts", [{ id: t.id, title: t.title }], setMessage))
                                  setNotice("AI 쇼츠 원스톱 창을 열었습니다. MP3로 바꿔 배경음악으로 넣습니다(대본이 여러 개면 그 창에서 넣을 대본을 고르세요).");
                              },
                            },
                            // 앨범(v1.35, 주인님 「곡을 다 만들고 곡제목,가사를 베이스로 이미지 앨범을 만들게 하거나 이미 만들어놓은 앨범이미지에서 선택해서 사용」)
                            {
                              label: "앨범 그림 만들기 · 곡 제목·가사로",
                              icon: <ImagePlus className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 표지로 넣을 수 있습니다" : false,
                              onClick: () => router.push(albumsHref({ track: t.id })),
                            },
                            {
                              label: "앨범에서 표지 고르기",
                              icon: <Images className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : !hasAlbums(engine.status) ? "엔진 0.7.3 이상이 필요합니다" : false,
                              onClick: () => setCoverFor(t),
                            },
                            {
                              label: "마스터링",
                              icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : !hasMastering(engine.status) ? "엔진 0.6.9 이상(ffmpeg 포함)이 필요합니다" : false,
                              onClick: () => setMastering(t),
                            },
                            {
                              label: "Stem 분리 · 보컬/반주·악기별",
                              icon: <Layers className="h-3.5 w-3.5" />,
                              disabled: !libOk || here === false ? "이 PC에 음원이 있어야 합니다" : !hasStems(engine.status) ? "엔진 0.6.9 이상(윈도우)이 필요합니다" : false,
                              onClick: () => setStemFor(t),
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
                            { label: "휴지통으로", icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, hidden: inPlaylist, disabled: busy === t.id ? "지우는 중입니다" : false, onClick: () => void remove(t) },
                          ];
  };

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
        // 안내는 화면 아래에 떠서 보인다 — 아래로 내려 끌어 놓아도 결과가 보이게(v1.32)
        <p role="alert" className="fixed bottom-24 left-1/2 z-50 flex w-[min(36rem,90vw)] -translate-x-1/2 items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/95 p-3 text-xs font-semibold text-rose-200 shadow-xl">
          <AlertCircle className="h-4 w-4 shrink-0" /> {message}
          <button type="button" onClick={() => setMessage(null)} className="ml-auto" aria-label="닫기">
            <X className="h-3.5 w-3.5" />
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="fixed bottom-24 left-1/2 z-50 flex w-[min(36rem,90vw)] -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/95 p-3 text-xs font-semibold text-emerald-200 shadow-xl">
          ✅ {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto" aria-label="닫기">
            <X className="h-3.5 w-3.5" />
          </button>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <CollectionsNav
          total={tracks.length}
          trashCount={trashCount}
          favoriteCount={tracks.filter((t) => t.favorite).length}
          projects={projects}
          playlists={playlists}
          view={view}
          onView={(v) => {
            setView(v);
            setRenaming(null);
            setSelected(new Set());
            // 플레이리스트·프로젝트는 직접 정한 순서가 기본, 다른 화면에는 그 순서가 없다
            if (v.type === "playlist" || v.type === "project") setSort("manual");
            else if (sort === "manual") setSort("newest");
          }}
          onCreate={createCollection}
          onDropTracks={view.type === "trash" ? undefined : dropTracks}
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
                {current ? `${current.kind === "project" ? "📁" : "🎶"} ${current.name}` : view.type === "trash" ? "🗑 휴지통" : view.type === "favorites" ? "⭐ 즐겨찾기" : "🎧 모든 음악"}{" "}
                <span className="font-normal text-slate-500">{shown.length}곡</span>
              </h2>
            )}
            <div className="ml-auto flex flex-wrap gap-1.5">
              <div className="flex overflow-hidden rounded-lg border border-slate-700" role="group" aria-label="보기 방식">
                <button type="button" onClick={() => setLayout("list")} className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold ${layout === "list" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`} aria-pressed={layout === "list"}>
                  <ListIcon className="h-3.5 w-3.5" /> 목록
                </button>
                <button type="button" onClick={() => setLayout("grid")} className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold ${layout === "grid" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`} aria-pressed={layout === "grid"}>
                  <LayoutGrid className="h-3.5 w-3.5" /> 카드
                </button>
              </div>
              {playable.length > 1 && (
                <button type="button" onClick={startQueue} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}>
                  <PlayCircle className="h-3.5 w-3.5" /> 전체 이어 듣기
                </button>
              )}
              {current?.kind === "project" && (
                <Link href={`/songs?project=${current.id}`} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}>
                  <Music2 className="h-3.5 w-3.5" /> 이 프로젝트에서 새 곡 만들기
                </Link>
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
                  .filter((s) => s !== "manual" || view.type === "playlist" || view.type === "project")
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
              {tracks.length === 0 && view.type !== "trash" ? (
                <>
                  아직 만든 노래가 없습니다.{" "}
                  <Link href="/songs" className="font-semibold text-emerald-300 underline underline-offset-2">
                    곡 만들기
                  </Link>
                  에서 첫 노래를 만들어 보세요.
                </>
              ) : view.type === "trash" && !narrowed ? (
                `휴지통이 비었습니다. 지운 곡은 여기로 와서 ${exempt ? "직접 비울 때까지" : "30일 동안"} 되살릴 수 있습니다.`
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
              <span>{view.type === "trash" ? (chosen.length ? `${chosen.length}곡 고름` : "곡 왼쪽 칸을 눌러 고르면 「고른 곡 완전 삭제」·「되살리기」를 할 수 있습니다.") : chosen.length ? `${chosen.length}곡 고름 · 고른 곡 하나를 끌어 왼쪽 프로젝트·플레이리스트에 놓으면 모두 옮겨집니다` : "곡 왼쪽 칸을 눌러 여러 곡을 고를 수 있습니다. 곡 줄을 끌어 왼쪽 프로젝트·플레이리스트에 놓으면 옮기거나 담습니다."}</span>
              {/* 휴지통 비우기(2026-11-08 주인님 「휴지통에 있는 곡 전체 지우기 기능과 선택 지우기 기능」) — 곡을 고르지 않아도 늘 보인다. 확인 창은 purge가 띄운다 */}
              {view.type === "trash" && chosen.length === 0 && trash.length > 0 && (
                <button type="button" onClick={() => purge(trash.map((t) => t.id))} disabled={!!busy} className={`${btn} ml-auto border-rose-500/40 text-rose-300 hover:bg-rose-950/50`}>
                  <Trash2 className="h-3.5 w-3.5" /> 휴지통 비우기 (전체 {trash.length}곡)
                </button>
              )}
              {chosen.length > 0 && view.type === "trash" && (
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => restoreFromTrash(chosen)} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}>
                    <Undo2 className="h-3.5 w-3.5" /> 되살리기
                  </button>
                  {/* 원래 프로젝트가 지워진 곡은 되살릴 프로젝트를 고를 수 있다(원본 「복원할 프로젝트」) */}
                  {projects.length > 0 && trash.some((t) => selected.has(t.id) && !t.project_id) && (
                    <select value="" onChange={(e) => e.target.value && restoreFromTrash(chosen, e.target.value)} className={smallSelect} aria-label="되살려서 넣을 프로젝트">
                      <option value="">📁 되살려서 프로젝트에 넣기</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button type="button" onClick={() => purge(chosen)} disabled={!!busy} className={`${btn} border-rose-500/40 text-rose-300 hover:bg-rose-950/50`}>
                    <Trash2 className="h-3.5 w-3.5" /> 고른 곡 완전 삭제 ({chosen.length}곡)
                  </button>
                  <button type="button" onClick={() => setSelected(new Set())} className={`${btn} border-slate-700 text-slate-400`}>
                    고르기 취소
                  </button>
                </div>
              )}
              {chosen.length > 0 && view.type !== "trash" && (
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {playable.some((t) => selected.has(t.id)) && (
                    <button type="button" onClick={playChosen} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50`}>
                      <PlayCircle className="h-3.5 w-3.5" /> 고른 곡 듣기
                    </button>
                  )}
                  {playable.some((t) => selected.has(t.id)) && (
                    <button type="button" onClick={playlistVideoChosen} className={`${btn} border-sky-500/40 text-sky-300 hover:bg-sky-950/50`}>
                      <MonitorPlay className="h-3.5 w-3.5" /> 고른 곡으로 플레이리스트 영상
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
                  {chosen.some((id) => !tracks.find((t) => t.id === id)?.favorite) && (
                    <button type="button" onClick={() => void setFavoriteMany(chosen, true)} className={`${btn} border-amber-400/40 text-amber-200 hover:bg-amber-950/40`}>
                      <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> 즐겨찾기에 넣기
                    </button>
                  )}
                  {chosen.some((id) => tracks.find((t) => t.id === id)?.favorite) && (
                    <button type="button" onClick={() => void setFavoriteMany(chosen, false)} className={`${btn} border-slate-600 text-slate-300 hover:bg-slate-900`}>
                      <Star className="h-3.5 w-3.5" /> 즐겨찾기에서 빼기
                    </button>
                  )}
                  <button type="button" onClick={() => moveToTrash(chosen)} className={`${btn} border-rose-500/30 text-rose-300 hover:bg-rose-950/50`}>
                    <Trash2 className="h-3.5 w-3.5" /> 휴지통으로
                  </button>
                  <button type="button" onClick={() => setSelected(new Set())} className={`${btn} border-slate-700 text-slate-400`}>
                    고르기 취소
                  </button>
                </div>
              )}
            </div>
            {(view.type === "playlist" || view.type === "project") && !canReorder && shown.length > 1 && (
              <p className="text-[11px] text-slate-500">검색·보기 조건을 지우고 정렬을 「직접 정한 순서」로 두면 끌어서 순서를 바꿀 수 있습니다.</p>
            )}
            {layout === "grid" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {shown.map((t) => {
                  const here = onPc ? onPc.has(t.id) : null;
                  const playing = player?.current?.key === t.id;
                  const canPlay = libOk && here !== false;
                  return (
                    <div key={t.id} className={`group rounded-2xl border transition-colors ${playing && player?.playing ? "bg-emerald-950/50 shadow-[0_0_20px_rgba(52,211,153,0.25)]" : "bg-[#0a0f1d]"} ${selected.has(t.id) ? "border-emerald-400/70" : playing ? (player?.playing ? "border-emerald-400/80" : "border-emerald-500/50") : "border-slate-800 hover:border-slate-600"}`}>
                      <div className="relative overflow-hidden rounded-t-2xl">{/* 2026-11-08 카드 전체에 overflow-hidden이 있어 「…」 메뉴 창이 잘려 안 보이던 것 — 표지만 자른다 */}
                        <CoverThumb trackId={t.id} has={showCovers && arts.has(t.id)} title={t.title} version={artVersion[t.id] ?? 0} large />
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleOne(t.id)}
                          aria-label={`${t.title} 고르기`}
                          className="absolute left-2 top-2 h-4 w-4 accent-emerald-500"
                        />
                        {!t.trashed_at && (
                          <button
                            type="button"
                            onClick={() => void toggleFavorite(t)}
                            className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 backdrop-blur hover:bg-black/70"
                            title={t.favorite ? "즐겨찾기에서 빼기" : "즐겨찾기"}
                            aria-label={t.favorite ? "즐겨찾기에서 빼기" : "즐겨찾기"}
                            aria-pressed={!!t.favorite}
                          >
                            <Star className={`h-4 w-4 ${t.favorite ? "fill-amber-300 text-amber-300" : "text-white/80"}`} />
                          </button>
                        )}
                        {canPlay && (
                          <button
                            type="button"
                            onClick={() => playOne(t)}
                            className={`absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-opacity hover:bg-emerald-600 ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
                            aria-label={`${t.title} 듣기`}
                          >
                            <PlayCircle className="h-7 w-7" />
                          </button>
                        )}
                        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                          {KIND_LABEL[t.kind] || "원곡"}
                        </span>
                        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{durationLabel(t.duration_sec)}</span>
                      </div>
                      <div className="space-y-1.5 p-3">
                        <button type="button" onClick={() => setDetailId(t.id)} className="block w-full truncate text-left text-sm font-bold text-slate-100 hover:text-emerald-300" title="곡 상세 보기">
                          {t.title}
                        </button>
                        <p className="truncate text-[11px] text-slate-500" title={t.style_prompt}>{t.style_prompt || "스타일 없음"}</p>
                        <p className="truncate text-[10px] text-slate-600">
                          {t.license === "noncommercial" && <span className="mr-1 rounded bg-amber-500/15 px-1 font-semibold text-amber-200">비상업용</span>}
                          {here === false ? <span className="text-amber-300/80">이 PC에 음원 없음 · </span> : null}
                          생성 {new Date(t.created_at).toLocaleDateString("ko-KR")}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          {t.trashed_at ? <span className="text-[10px] text-rose-300/80">휴지통</span> : <span />}
                          <TrackMenu label={t.title} items={menuFor(t, here)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {layout === "list" && (
            <TrackOrderList
              items={shown}
              editable={canReorder}
              onOrder={reorderPlaylist}
              onRowDragStart={view.type === "trash" ? undefined : rowDragStart}
              // 2026-11-09 주인님 「곡 재생 중일 때는 배경 색을 바꿔줘 — 어떤 게 플레이 중인지 쉽게 확인」: 재생 중 = 초록 배경·테두리, 멈춘 현재 곡 = 초록 테두리만
              rowClassName={(t) =>
                `space-y-2 rounded-2xl border p-4 transition-colors ${
                  player?.current?.key === t.id
                    ? player.playing
                      ? "border-emerald-400/80 bg-emerald-950/50 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                      : "border-emerald-500/50 bg-[#0a0f1d]"
                    : "border-slate-800 bg-[#0a0f1d]"
                }`
              }
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
                      {!t.trashed_at && (
                        <button
                          type="button"
                          onClick={() => void toggleFavorite(t)}
                          className={`shrink-0 rounded-lg border p-1.5 transition-colors ${t.favorite ? "border-amber-400/50 bg-amber-950/40" : "border-slate-700 hover:border-amber-400/50 hover:bg-amber-950/30"}`}
                          title={t.favorite ? "즐겨찾기에서 빼기" : "즐겨찾기 — 왼쪽 「즐겨찾기」에 모아 봅니다"}
                          aria-label={t.favorite ? "즐겨찾기에서 빼기" : "즐겨찾기"}
                          aria-pressed={!!t.favorite}
                        >
                          <Star className={`h-5 w-5 ${t.favorite ? "fill-amber-300 text-amber-300" : "text-amber-200/70"}`} />
                        </button>
                      )}
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
                          {t.trashed_at && (
                            <span className="text-rose-300/80">
                              {" "}
                              · 휴지통에 넣음 {new Date(t.trashed_at).toLocaleDateString("ko-KR")}
                              {exempt ? "" : ` · ${daysLeft(t.trashed_at)}일 뒤 자동 비움`}
                            </span>
                          )}
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
                          items={menuFor(t, here)}
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
            )}
            </>
          )}
          {mastering && (
            <MasteringDialog
              title={mastering.title}
              onClose={() => setMastering(null)}
              onStart={async (o) => {
                try {
                  await enqueueMaster(mastering, o);
                  setMastering(null);
                  setNotice(`「${mastering.title}」 마스터링을 대기열에 넣었습니다. 끝나면 「${mastering.title} (마스터링)」 새 곡으로 이 목록에 들어옵니다(작업 대기열 화면에서 진행 확인).`);
                } catch (e) {
                  setMessage(e instanceof EngineError ? e.message : "마스터링을 시작하지 못했습니다.");
                  setMastering(null);
                }
              }}
            />
          )}
          {coverFor && (
            <AlbumPicker
              title={`「${coverFor.title}」 표지로 쓸 앨범 그림 고르기`}
              onClose={() => setCoverFor(null)}
              onPick={async (album, image) => {
                const t = coverFor;
                await setTrackArt(t.id, image);
                setArts((s) => new Set(s).add(t.id));
                setArtVersion((v) => ({ ...v, [t.id]: (v[t.id] ?? 0) + 1 }));
                setNotice(`「${album.title}」 그림을 「${t.title}」 표지로 넣었습니다. MP3로 받으면 표지가 들어갑니다.`);
                setCoverFor(null);
              }}
            />
          )}
          {stemFor && (
            <StemDialog
              track={stemFor}
              onClose={() => setStemFor(null)}
              onStart={async (mode) => {
                await enqueueStems(stemFor, mode);
                setNotice(`「${stemFor.title}」 Stem 분리를 대기열에 넣었습니다. 끝나면 이 곡 「…」 → 「Stem 분리」에서 듣고 내려받을 수 있습니다(작업 대기열 화면에서 진행 확인).`);
                setStemFor(null);
              }}
            />
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
