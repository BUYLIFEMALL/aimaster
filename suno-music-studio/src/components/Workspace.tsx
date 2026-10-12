"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Music2,
  Sparkles,
  Download,
  Upload,
  Save,
  Square,
  ExternalLink,
} from "lucide-react";
import { APP_NAME } from "@/lib/version";
import {
  type Brief,
  type Provider,
  type Store,
  type Draft,
  type Track,
  type Album,
} from "@/lib/studio/config";
import { blankStore, storageKey, mergeBackup } from "@/lib/studio/storage";
import {
  validateBrief,
  validateStore,
  styleIssues,
} from "@/lib/studio/validation";
import { BriefControls } from "./BriefControls";
import {
  TrackEditor,
  downloadFile,
  trackText,
  trackProblems,
} from "./TrackEditor";
import { Guide } from "./Guide";
import { StylePalette } from "./StylePalette";
import { automaticExclude, syncStyleControls } from "@/lib/studio/catalog";
import { assertTargets } from "@/lib/studio/generation";
import { AlbumPanel } from "./AlbumPanel";
import { LibraryGallery } from "./LibraryGallery";
import { DanceComposer } from "./DanceComposer";
import { SearchPanel } from "./SearchPanel";
import { StudioStart } from "./StudioStart";
import { LibraryPicker } from "./LibraryPicker";
import { CurrentSelection } from "./CurrentSelection";
import { AIModelPicker } from "./AIModelPicker";
import {
  emptyBuilderTrack,
  insertSkeleton,
  resetBuilder,
  applyBuilderControls,
  importAlbumBackup,
  moveAlbumTrack,
} from "@/lib/studio/builder";
import {
  albumBrief,
  importBuilderSettings,
  emptyAlbumSettings,
  arrangeTracks,
  trackBrief,
  updateAlbumTracks,
} from "@/lib/studio/workflows";
import { type RecordingResult } from "@/lib/studio/recordings";
import { type Research } from "@/lib/studio/research";
import { runLyricQueue } from "@/lib/studio/queue";
const TITLES: Record<string, string> = {
  style: "스타일 선택",
  presets: "프리셋",
  search: "음악 검색",
  dance: "댄스 머신",
  dashboard: "대시보드",
  song: "빌더 · 작사·곡 기획",
  album: "앨범 구성",
  saved: "검수·보관함",
  guide: "연동 & 사용 매뉴얼",
};
export function Workspace({
  userId,
  registered,
}: {
  userId: string;
  registered: Record<Provider, boolean>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const rawSection = params.get("section") || "builder";
  const section =
    rawSection === "song"
      ? "song"
      : rawSection === "builder"
        ? "song"
        : rawSection === "style"
          ? "presets"
          : rawSection;
  const [builderUndo, setBuilderUndo] = useState<{
    brief: Brief;
    song: Track | null;
  } | null>(null);
  const [albumUndo, setAlbumUndo] = useState<{
    album: Album | null;
    brief: Brief;
  } | null>(null);
  const [searchResult, setSearchResult] = useState<Track[]>([]);
  const [recordingResult, setRecordingResult] =
    useState<RecordingResult | null>(null);
  const [research, setResearch] = useState<Research | null>(null);
  const [compactView, setCompactView] = useState(false);
  const [store, setStore] = useState<Store>(blankStore);
  const danceSeed = store.draft.dance?.seed;
  const current = useRef(store);
  const [ready, setReady] = useState(false);
  const canPersist = useRef(true);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const active = useRef<AbortController | null>(null);
  const [, setSuggestions] = useState<Track[]>([]);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      try {
        const raw = localStorage.getItem(storageKey(userId));
        const data = raw ? validateStore(JSON.parse(raw)) : blankStore();
        if (!data.draft.albumBrief)
          data.draft.albumBrief = data.draft.album
            ? structuredClone(data.draft.brief)
            : emptyAlbumSettings(data.draft.brief);
        current.current = data;
        setStore(data);
        setCompactView(
          localStorage.getItem(storageKey(userId) + ":compact") === "true",
        );
      } catch {
        canPersist.current = false;
        setNotice(
          "저장 자료를 읽지 못했습니다. 기존 브라우저 자료는 덮어쓰지 않습니다. 검증된 JSON 백업을 가져와 복구해 주세요.",
        );
      }
      setReady(true);
    });
    return () => {
      live = false;
      active.current?.abort();
    };
  }, [userId]);
  useEffect(() => {
    if (!ready || !canPersist.current) return;
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(store));
    } catch {
      queueMicrotask(() =>
        setNotice(
          "브라우저 저장 공간이 부족하거나 저장이 차단됐습니다. JSON으로 백업해 주세요.",
        ),
      );
    }
  }, [store, ready, userId]);
  function mutate(fn: (s: Store) => Store) {
    const next = fn(current.current);
    current.current = next;
    setStore(next);
  }
  function cancel() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
    setProgress("");
  }
  function changeBrief(brief: Brief) {
    const albumMode = section === "album";
    const previous = albumMode
      ? albumBrief(current.current.draft)
      : current.current.draft.brief;
    try {
      brief = syncStyleControls(previous, brief);
      if (albumMode && current.current.draft.album)
        updateAlbumTracks(current.current.draft.album.tracks, previous, brief);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "설정 반영 실패");
      return;
    }
    cancel();
    mutate((s) => ({
      ...s,
      draft: albumMode
        ? {
            ...s.draft,
            albumBrief: brief,
            album: s.draft.album
              ? {
                  ...s.draft.album,
                  tracks: updateAlbumTracks(
                    s.draft.album.tracks,
                    previous,
                    brief,
                  ),
                }
              : null,
          }
        : {
            ...s.draft,
            brief,
            song: s.draft.song
              ? {
                  ...s.draft.song,
                  ...(brief.style !== s.draft.brief.style
                    ? {
                        style: brief.style,
                        bpm: brief.bpm,
                        exclude: automaticExclude(brief),
                      }
                    : {}),
                  reviewed: false,
                }
              : null,
          },
    }));
  }
  function editBuilder(t: Track) {
    cancel();
    const d = current.current.draft;
    const song = { ...t, id: t.id || crypto.randomUUID() };
    draftChange({
      ...d,
      song,
      brief: {
        ...d.brief,
        style: song.style,
        bpm: song.bpm,
        ...(song.exclude !== (d.song || emptyBuilderTrack(d.brief)).exclude
          ? { exclude: song.exclude }
          : {}),
      },
    });
  }
  function builderReset() {
    const d = current.current.draft;
    setBuilderUndo({
      brief: structuredClone(d.brief),
      song: structuredClone(d.song),
    });
    cancel();
    draftChange(resetBuilder(d));
    setNotice(
      "빌더만 초기화했습니다. 앨범과 보관함은 보존됩니다. 되돌리기로 복원할 수 있습니다.",
    );
  }
  function builderSkeleton() {
    try {
      editBuilder(
        insertSkeleton(
          current.current.draft.song ||
            emptyBuilderTrack(current.current.draft.brief),
          current.current.draft.brief,
        ),
      );
      setNotice(
        "가사 구간 골격을 넣었습니다. 각 구간에 직접 가사를 작성하세요. AI 호출은 없습니다.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "골격 삽입 실패");
    }
  }
  function draftChange(draft: Draft) {
    mutate((s) => ({ ...s, draft }));
  }
  function setDanceSeed(seed: Brief) {
    mutate((s) => ({
      ...s,
      draft: { ...s.draft, dance: { seed, tags: s.draft.dance?.tags || [] } },
    }));
  }
  function setDanceTags(tags: string[]) {
    mutate((s) => ({
      ...s,
      draft: {
        ...s.draft,
        dance: {
          seed: s.draft.dance?.seed || { ...s.draft.brief, style: "" },
          tags,
        },
      },
    }));
  }
  function toggleCompact() {
    const value = !compactView;
    setCompactView(value);
    try {
      localStorage.setItem(storageKey(userId) + ":compact", String(value));
    } catch {
      setNotice("보기 설정을 저장하지 못했습니다. 현재 화면에는 적용됩니다.");
    }
  }
  const b =
    section === "album"
      ? store.draft.albumBrief || emptyAlbumSettings(store.draft.brief)
      : store.draft.brief;
  function begin() {
    cancel();
    const c = new AbortController();
    active.current = c;
    setBusy(true);
    setNotice("");
    return c;
  }
  async function request(
    action: "song" | "album" | "suggest",
    brief: Brief,
    c: AbortController,
    contextTrack: Track | null = null,
  ): Promise<Album | null> {
    const input = validateBrief(brief);
    if (!registered[input.provider])
      throw new Error(
        "선택한 AI의 본인 API 키를 먼저 등록해 주세요. API키등록·플랫폼연동에서 등록할 수 있습니다.",
      );
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, brief: input, contextTrack }),
      signal: c.signal,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "생성 요청 실패");
    if (active.current !== c || c.signal.aborted) return null;
    return data.result;
  }
  function finish(c: AbortController) {
    if (active.current === c) {
      active.current = null;
      setBusy(false);
      setProgress("");
    }
  }
  function failure(e: unknown, c: AbortController) {
    if (active.current === c && !c.signal.aborted)
      setNotice(e instanceof Error ? e.message : "요청을 완료하지 못했습니다.");
  }
  async function generate(action: "song" | "album" | "suggest") {
    const c = begin();
    setProgress(
      action === "album"
        ? `${b.count}곡 앨범을 기획하고 있습니다…`
        : action === "suggest"
          ? "음악 방향을 제안하고 있습니다…"
          : "제목·스타일·가사를 만들고 있습니다…",
    );
    try {
      if (action === "song") assertTargets(b);
      const result = await request(
        action,
        b,
        c,
        action === "song" ? current.current.draft.song : null,
      );
      if (!result) return;
      if (action === "suggest") {
        setSuggestions(result.tracks);
        setNotice(
          "AI가 제안한 음악 방향입니다. 실시간 웹 검색 결과가 아닙니다.",
        );
      } else
        mutate((s) => {
          if (action === "song")
            return {
              ...s,
              draft: {
                ...s.draft,
                brief: {
                  ...s.draft.brief,
                  ...(b.generateStyle
                    ? {
                        style: result.tracks[0].style,
                        bpm: result.tracks[0].bpm,
                        exclude: result.tracks[0].exclude,
                        presetId: "",
                        styleGroup: "",
                      }
                    : {}),
                },
                song: {
                  ...result.tracks[0],
                  id: s.draft.song?.id || crypto.randomUUID(),
                },
              },
            };
          return {
            ...s,
            draft: {
              ...s.draft,
              album: {
                ...result,
                tracks: result.tracks.map((t) => ({
                  ...t,
                  id: crypto.randomUUID(),
                })),
              },
            },
          };
        });
    } catch (e) {
      failure(e, c);
    } finally {
      finish(c);
    }
  }
  function editTrack(t: Track) {
    cancel();
    mutate((s) => ({
      ...s,
      draft: {
        ...s.draft,
        album: s.draft.album
          ? {
              ...s.draft.album,
              tracks: s.draft.album.tracks.map((old) =>
                old.id === t.id ? t : old,
              ),
            }
          : null,
      },
    }));
  }
  async function lyrics(ids: string[], regenerate = false) {
    const c = begin();
    const snapshot = current.current.draft;
    const tracks = (
      snapshot.album?.tracks.filter((t) => ids.includes(t.id)) || []
    ).map((t) => (regenerate ? { ...t, lyrics: "" } : t));
    try {
      await runLyricQueue(
        tracks,
        c.signal,
        async (t, index, total) => {
          if (active.current !== c) return null;
          setProgress(`${index + 1}/${total} · ${t.title} 작사 중…`);
          const result = await request(
            "song",
            {
              ...trackBrief(albumBrief(snapshot), t),
              concept: t.summary,
              intent:
                `앨범: ${albumBrief(snapshot).concept}\n${albumBrief(snapshot).intent}\n곡 제목: ${t.title}\n핵심 구절: ${t.hook}`.slice(
                  0,
                  1500,
                ),
              style: t.style,
              locked: true,
              bpm: t.bpm,
              generateTitle: false,
              generateStyle: false,
              generateLyrics: true,
            },
            c,
            t,
          );
          return result?.tracks[0].lyrics ?? null;
        },
        (t, lyrics) => {
          mutate((s) => ({
            ...s,
            draft: {
              ...s.draft,
              album: s.draft.album
                ? {
                    ...s.draft.album,
                    tracks: s.draft.album.tracks.map((old) =>
                      old.id === t.id
                        ? { ...old, lyrics, reviewed: false }
                        : old,
                    ),
                  }
                : null,
            },
          }));
        },
      );
      if (active.current === c && !c.signal.aborted)
        setNotice("요청한 작사를 마쳤습니다. 곡별 내용을 확인해 주세요.");
    } catch (e) {
      failure(e, c);
    } finally {
      finish(c);
    }
  }
  function saveDraft() {
    try {
      const s = current.current;
      if (
        (section === "album" && !s.draft.album) ||
        (section === "song" && !s.draft.song) ||
        (!s.draft.song && !s.draft.album)
      )
        throw new Error("먼저 곡 또는 앨범을 만들어 주세요.");
      if (s.saved.length >= 100)
        throw new Error("보관함은 100개까지입니다. JSON으로 백업해 주세요.");
      mutate((v) => ({
        ...v,
        saved: [
          {
            id: crypto.randomUUID(),
            name:
              section === "album"
                ? v.draft.album?.title || "앨범"
                : v.draft.song?.title || v.draft.album?.title || "음악 기획",
            savedAt: new Date().toISOString(),
            draft: structuredClone(
              section === "album"
                ? { ...v.draft, song: null }
                : section === "song"
                  ? { ...v.draft, album: null }
                  : v.draft,
            ),
          },
          ...v.saved,
        ],
      }));
      setNotice("보관함에 현재 곡·앨범과 설정을 함께 저장했습니다.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "저장 실패");
    }
  }
  function saveStyle(name: string) {
    if (current.current.styles.length >= 100) {
      setNotice("내 Style은 100개까지입니다. JSON으로 백업해 주세요.");
      return;
    }
    if (styleIssues(b.style).length) {
      setNotice(styleIssues(b.style).join(" "));
      return;
    }
    mutate((s) => ({
      ...s,
      styles: [
        {
          id: crypto.randomUUID(),
          name,
          style: b.style,
          exclude: b.exclude,
          bpm: b.bpm,
          savedAt: new Date().toISOString(),
        },
        ...s.styles,
      ],
    }));
    setNotice(
      "현재 Style을 내 프리셋에 저장했습니다. 곡과 앨범에서 다시 사용할 수 있습니다.",
    );
  }
  async function importFile(file: File) {
    try {
      if (file.size > 1_000_000)
        throw new Error("백업은 1MB 이내로 가져와 주세요.");
      const parsed = JSON.parse(await file.text());
      const next = mergeBackup(current.current, parsed);
      cancel();
      canPersist.current = true;
      current.current = next;
      setStore(next);
      setNotice(
        "백업을 검증하여 보관함에 합쳤습니다. 작업 초안도 가져온 백업으로 변경했습니다.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "백업을 읽지 못했습니다.");
    }
  }
  function saveSearchStyle(t: Track) {
    if (current.current.styles.length >= 100) {
      setNotice("내 Style은 100개까지입니다.");
      return;
    }
    if (styleIssues(t.style).length) {
      setNotice(styleIssues(t.style).join(" "));
      return;
    }
    mutate((s) => ({
      ...s,
      styles: [
        {
          id: crypto.randomUUID(),
          name: t.title.slice(0, 100),
          style: t.style,
          exclude: t.exclude,
          bpm: t.bpm,
          savedAt: new Date().toISOString(),
        },
        ...s.styles,
      ],
    }));
    setNotice("검색 결과의 음악 Style을 내 프리셋에 저장했습니다.");
  }
  function applySearchAlbum(t: Track) {
    cancel();
    mutate((s) => ({
      ...s,
      draft: {
        ...s.draft,
        albumBrief: {
          ...albumBrief(s.draft),
          style: t.style,
          bpm: t.bpm,
          exclude: t.exclude,
          locked: true,
          generateStyle: false,
          presetId: "",
          styleGroup: "",
        },
      },
    }));
    router.push("/?section=album");
    setNotice(
      "앨범의 참고 Style에 적용했습니다. 컨셉·기존 트랙·가사는 보존됩니다. 새 앨범 기획에 사용할 수 있습니다.",
    );
  }
  async function importAlbumFile(file: File) {
    try {
      if (file.size > 1_000_000)
        throw new Error("백업은 1MB 이내로 가져와 주세요.");
      const raw = JSON.parse(await file.text());
      const next = importAlbumBackup(current.current, raw);
      cancel();
      canPersist.current = true;
      current.current = next;
      setStore(next);
      setNotice(
        "앨범 JSON을 복원하고 보관함을 합쳤습니다. 빌더와 댄스 조합은 보존됩니다.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "앨범 JSON 복원 실패");
    }
  }
  function applyStyle(t: Track) {
    changeBrief({
      ...b,
      genre: b.genre,
      style: t.style,
      bpm: t.bpm,
      exclude: t.exclude,
      presetId: "",
      styleGroup: "",
      generateStyle: false,
      locked: true,
    });
    setNotice("선택한 Style을 기준으로 적용하고 잠갔습니다.");
    router.push("/?section=song");
  }
  async function copyProduction() {
    const d = current.current.draft;
    const tracks = d.album?.tracks || (d.song ? [d.song] : []);
    if (!tracks.length) {
      setNotice("먼저 곡을 만들어 주세요.");
      return;
    }
    if (
      tracks.some(
        (t) =>
          !t.reviewed ||
          trackProblems(t, (d.album ? albumBrief(d) : d.brief).instrumental)
            .length,
      )
    ) {
      setNotice("전달할 곡의 최종 가사·스타일을 모두 확인해 주세요.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        tracks.map((t) => `${t.summary}\n${trackText(t)}`).join("\n---\n"),
      );
      setNotice(
        "제작 요청용 설명을 복사했습니다. 음악(SUNO)자동화의 곡 설명에 붙여 넣어 주세요. 기존 앱에서 별도로 기획하며 가사는 자동 전송되지 않습니다.",
      );
    } catch {
      setNotice("클립보드 권한을 확인하거나 TXT를 저장해 주세요.");
    }
  }
  async function search(
    query: string,
    useWeb: boolean,
    mode: "planning" | "recordings" = "planning",
  ) {
    const c = begin();
    setProgress(
      useWeb
        ? "웹 참고 정보와 음악 방향을 검색하고 있습니다…"
        : "음악 방향 6가지를 제안하고 있습니다…",
    );
    try {
      if (!registered[b.provider])
        throw new Error("선택 AI의 본인 API 키를 먼저 등록해 주세요.");
      const r = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, useWeb, mode, brief: b }),
        signal: c.signal,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "검색 실패");
      if (active.current !== c || c.signal.aborted) return;
      setSearchResult(data.result.tracks);
      setRecordingResult(data.recordingResult || null);
      setResearch(data.research);
      setNotice(
        data.recordingResult
          ? "웹 출처에 연결된 곡 후보입니다. 링크에서 곡 정보를 확인하고 AI 음악 분석은 참고로 사용하세요."
          : data.usedWeb
            ? "출처가 확인된 웹 참고 정보와 자체 음악 기획 예시입니다."
            : "웹 검색 없이 생성한 음악 방향 제안입니다.",
      );
    } catch (e) {
      failure(e, c);
    } finally {
      finish(c);
    }
  }
  function loadAlbum(item: Store["saved"][number]) {
    cancel();
    const saved = item.draft;
    mutate((s) => ({
      ...s,
      draft: {
        ...s.draft,
        album: structuredClone(saved.album),
        albumBrief: structuredClone(albumBrief(saved)),
      },
    }));
    setNotice("저장된 앨범을 불러왔습니다. 빌더 초안은 유지됩니다.");
  }
  function applyGallery(brief: Brief) {
    changeBrief(brief);
    router.push("/?section=builder");
    setNotice("선택 Style을 빌더에 적용했습니다. 기존 제목·가사는 유지됩니다.");
  }
  return (
    <div className={`studio-view ${compactView ? "compact" : ""}`}>
      <header className="page-heading">
        <div className="heading-top">
          <span className="eyebrow">
            <Music2 size={18} /> AI로 준비하는 음악 제작
          </span>
          <div className="actions">
            <button aria-pressed={compactView} onClick={toggleCompact}>
              컴팩트 보기 {compactView ? "ON" : "OFF"}
            </button>
            <button
              className="download"
              disabled={!ready || busy}
              onClick={() =>
                downloadFile(
                  JSON.stringify(current.current, null, 2),
                  "aimaster-music-backup.json",
                  "application/json",
                )
              }
            >
              <Download size={16} />
              JSON 백업
            </button>
            <label className={`button import-button ${busy ? "disabled" : ""}`}>
              <Upload size={16} />
              JSON 가져오기
              <input
                className="file-input"
                type="file"
                accept=".json,application/json"
                disabled={!ready || busy}
                onChange={(e) => {
                  if (e.target.files?.[0]) void importFile(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <h1>{TITLES[section] || TITLES.song}</h1>
        <p>
          {APP_NAME} · 스타일과 가사부터 앨범의 흐름까지 한곳에서 설계하세요.
        </p>
        <div className="actions">
          <span className="pill">
            {registered[b.provider]
              ? "선택 AI의 본인 키 등록됨"
              : "본인 API 키 등록 필요"}
          </span>
          <span className="pill">{b.model}</span>
          <span className="muted">
            가사 한글 {100 - b.englishPct}% · 랩 {b.rapPct}%
          </span>
          <Link href="/settings">연동 설정</Link>
          <span className="muted">생성 버튼을 누를 때만 AI를 호출합니다.</span>
        </div>
      </header>
      <StudioStart />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {busy && (
        <div className="generation-progress" role="status">
          <Sparkles size={18} />
          <span>{progress}</span>
          <button
            onClick={() => {
              cancel();
              setNotice("중지했습니다. 완료된 곡과 기존 결과는 유지됩니다.");
            }}
          >
            <Square size={14} />
            중지
          </button>
        </div>
      )}
      {!ready ? (
        <section className="card">회원 작업 자료를 불러오고 있습니다…</section>
      ) : section === "guide" ? (
        <Guide
          brief={b}
          onChange={changeBrief}
          busy={busy}
          notice={setNotice}
        />
      ) : section === "dashboard" ? (
        <section className="card">
          <h2>음악 기획 작업</h2>
          <div className="gallery-cards">
            {[
              [
                "builder",
                "한 곡 빌더",
                "Style·Lyrics를 직접 작성하거나 본인 AI로 생성",
              ],
              ["album", "앨범 기획", "독립된 컨셉으로 3~12곡 기획·곡별 작사"],
              ["presets", "프리셋", "461개 참고 항목·시대·그룹 검색"],
              ["dance", "댄스 머신", "200개 그루브·태그 조합"],
              ["search", "음악 검색", "내장 목록 또는 출처 있는 웹·AI 제안"],
              [
                "saved",
                "저장됨",
                `${store.saved.length}개 보관 · ${store.styles.length}개 내 Style`,
              ],
            ].map(([id, title, desc]) => (
              <Link className="gallery-card" key={id} href={`/?section=${id}`}>
                <h3>{title}</h3>
                <p>{desc}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : section === "presets" ? (
        <section className="card">
          <LibraryGallery
            brief={b}
            busy={busy}
            onApply={applyGallery}
            notice={setNotice}
          />
        </section>
      ) : section === "search" ? (
        <SearchPanel
          brief={b}
          busy={busy}
          onChange={changeBrief}
          onSearch={search}
          onApplyBrief={applyGallery}
          result={searchResult}
          research={research}
          recordingResult={recordingResult}
          onApply={applyStyle}
          onApplyAlbum={applySearchAlbum}
          onSaveStyle={saveSearchStyle}
          notice={setNotice}
        />
      ) : section === "dance" ? (
        <div className="dance-layout">
          <section className="card">
            <LibraryGallery
              brief={b}
              busy={busy}
              dance
              onApply={applyGallery}
              onSeed={setDanceSeed}
              notice={setNotice}
            />
          </section>
          <DanceComposer
            brief={b}
            seed={danceSeed || { ...b, style: "" }}
            onSeed={setDanceSeed}
            picked={store.draft.dance?.tags || []}
            onPicked={setDanceTags}
            busy={busy}
            onApply={applyGallery}
            notice={setNotice}
          />
        </div>
      ) : section === "album" ? (
        <AlbumPanel
          brief={b}
          album={store.draft.album}
          busy={busy}
          onChange={changeBrief}
          onGenerate={() => generate("album")}
          onLyrics={lyrics}
          onTrack={editTrack}
          onImportAlbum={importAlbumFile}
          onAlbumChange={(album) => {
            cancel();
            mutate((s) => ({ ...s, draft: { ...s.draft, album } }));
          }}
          onMove={(id, offset) => {
            cancel();
            mutate((s) => ({
              ...s,
              draft: {
                ...s.draft,
                album: s.draft.album
                  ? {
                      ...s.draft.album,
                      tracks: moveAlbumTrack(s.draft.album.tracks, id, offset),
                    }
                  : null,
              },
            }));
          }}
          onSave={saveDraft}
          styles={store.styles}
          saved={store.saved}
          onLoad={loadAlbum}
          notice={setNotice}
          onImportBuilder={() => {
            changeBrief(importBuilderSettings(current.current.draft));
            setNotice(
              "빌더의 음악 설정을 가져왔습니다. 앨범 컨셉·의도·흐름·곡 수는 유지됩니다.",
            );
          }}
          onApplyStyle={(p) =>
            changeBrief({
              ...b,
              style: p.style,
              exclude: p.exclude,
              bpm: p.bpm,
              locked: true,
              generateStyle: false,
              presetId: "",
              styleGroup: "",
            })
          }
          onArrange={() => {
            try {
              const album = current.current.draft.album;
              if (album) {
                const tracks = arrangeTracks(album.tracks, b);
                mutate((s) => ({
                  ...s,
                  draft: { ...s.draft, album: { ...album, tracks } },
                }));
                setNotice(
                  "선택 편곡을 모든 곡에 적용했습니다. 제목·가사는 유지됩니다.",
                );
              }
            } catch (e) {
              setNotice(e instanceof Error ? e.message : "편곡 적용 실패");
            }
          }}
          onReset={() => {
            setAlbumUndo({
              album: structuredClone(current.current.draft.album),
              brief: structuredClone(b),
            });
            cancel();
            mutate((s) => ({
              ...s,
              draft: {
                ...s.draft,
                album: null,
                albumBrief: emptyAlbumSettings(b),
              },
            }));
            setNotice(
              "현재 앨범을 초기화했습니다. 되돌리기로 복원할 수 있습니다. 보관함은 유지됩니다.",
            );
          }}
          canUndo={Boolean(albumUndo)}
          onUndo={() => {
            if (albumUndo) {
              mutate((s) => ({
                ...s,
                draft: {
                  ...s.draft,
                  album: albumUndo.album,
                  albumBrief: albumUndo.brief,
                },
              }));
              setAlbumUndo(null);
            }
          }}
        />
      ) : section === "song" ? (
        <>
          <div className="builder-layout">
            <div className="builder-main">
              <TrackEditor
                track={store.draft.song || emptyBuilderTrack(b)}
                busy={busy}
                instrumental={b.instrumental}
                notice={setNotice}
                onChange={editBuilder}
                builder
                onSkeleton={builderSkeleton}
                onReset={builderReset}
                onUndo={
                  builderUndo
                    ? () => {
                        cancel();
                        mutate((s) => ({
                          ...s,
                          draft: { ...s.draft, ...builderUndo },
                        }));
                        setBuilderUndo(null);
                        setNotice("빌더를 초기화 전 상태로 복원했습니다.");
                      }
                    : undefined
                }
              />
              <section className="card">
                <div className="section-title">
                  <h2>AI 기획·작사</h2>
                </div>
                <AIModelPicker brief={b} onChange={changeBrief} busy={busy} />
                <label>
                  곡 설명
                  <textarea
                    aria-label="곡 설명"
                    rows={5}
                    maxLength={1500}
                    value={b.concept}
                    disabled={busy}
                    onChange={(e) =>
                      changeBrief({ ...b, concept: e.target.value })
                    }
                    placeholder="주제·장면·감정·전하고 싶은 메시지를 적어 주세요."
                  />
                </label>
                <label>
                  꼭 반영할 내용
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={b.intent}
                    disabled={busy}
                    onChange={(e) =>
                      changeBrief({ ...b, intent: e.target.value })
                    }
                    placeholder="예: 마지막에는 희망으로 끝내기, 특정 단어 제외, 편지 형식"
                  />
                </label>
                <div className="actions">
                  <span className="pill">한글 {100 - b.englishPct}%</span>
                  <span className="pill">비유 {b.metaphorPct}%</span>
                  <span className="pill">
                    보컬 {100 - b.rapPct}% · 랩 {b.rapPct}%
                  </span>
                  {b.locked && <span className="pill">Style 보호 중</span>}
                </div>
                <p className="info">
                  선택한 항목만 생성합니다. 선택하지 않은 제목·Style·가사는
                  그대로 유지됩니다.
                </p>
                {section === "song" && (
                  <fieldset disabled={busy} className="generation-selection">
                    <legend>AI가 만들 항목</legend>
                    <div className="actions">
                      {(
                        [
                          ["generateTitle", "제목"],
                          ["generateStyle", "Style"],
                          ["generateLyrics", "가사"],
                        ] as const
                      ).map(([key, label]) => (
                        <label className="toggle" key={key}>
                          <input
                            type="checkbox"
                            checked={b[key]}
                            disabled={
                              key === "generateLyrics" && b.instrumental
                            }
                            onChange={(e) =>
                              changeBrief({ ...b, [key]: e.target.checked })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={b.useContext}
                        onChange={(e) =>
                          changeBrief({ ...b, useContext: e.target.checked })
                        }
                      />
                      현재 곡의 내용 참고
                    </label>
                  </fieldset>
                )}
                <button
                  className="primary full"
                  disabled={
                    busy ||
                    !b.concept.trim() ||
                    (section === "song" &&
                      !b.generateTitle &&
                      !b.generateStyle &&
                      (!b.generateLyrics || b.instrumental))
                  }
                  onClick={() => generate("song")}
                >
                  <Sparkles size={17} />
                  선택한 항목 생성
                </button>
              </section>
            </div>
            <div className="builder-controls">
              <section className="card">
                <h2>시작점 · 참고 프리셋</h2>
                <LibraryPicker
                  compact
                  brief={b}
                  onChange={changeBrief}
                  busy={busy}
                />
              </section>
              <CurrentSelection brief={b} />
              <section className="card">
                <h2>제어 · 생성 세부 설정</h2>
                <BriefControls
                  brief={b}
                  onChange={changeBrief}
                  busy={busy}
                  album={false}
                  showReference={false}
                  showModel={false}
                />
                <button
                  className="primary full"
                  disabled={busy}
                  onClick={() => {
                    try {
                      draftChange(applyBuilderControls(current.current.draft));
                      setNotice(
                        "현재 제어 설정을 빌더 Style에 적용했습니다. 제목과 가사는 보존됩니다.",
                      );
                    } catch (e) {
                      setNotice(
                        e instanceof Error ? e.message : "제어 적용 실패",
                      );
                    }
                  }}
                >
                  빌더에 제어 설정 적용
                </button>
              </section>
              <section className="card">
                <StylePalette
                  brief={b}
                  onChange={changeBrief}
                  busy={busy}
                  styles={store.styles}
                  onSave={saveStyle}
                  notice={setNotice}
                />
              </section>
            </div>
          </div>
          <div className="actions bottom-actions">
            <button disabled={busy || !store.draft.song} onClick={saveDraft}>
              <Save size={16} />
              현재 작업 보관
            </button>
            <button
              disabled={busy}
              className="primary"
              onClick={() => router.push("/?section=saved")}
            >
              다음: 검수·보관함 →
            </button>
          </div>
        </>
      ) : (
        <>
          <section className="card">
            <h2>최종 확인과 전달</h2>
            <p>
              작사·곡 기획 또는 앨범 구성에서 곡별로 내용을 수정하고 최종 확인을
              체크하세요.
            </p>
            <div className="actions">
              <button disabled={busy} onClick={saveDraft}>
                <Save size={16} />
                현재 작업 보관
              </button>
              <button disabled={busy} onClick={copyProduction}>
                제작 요청용 설명 복사
              </button>
              <a
                className="button primary"
                href="https://suno.com/create"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
                Suno Custom 열기
              </a>
              <a
                className="button"
                href="https://music-rho-virid-22.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                음악(SUNO)자동화 열기 ↗
              </a>
              <button
                className="download"
                onClick={() => {
                  const d = current.current.draft;
                  downloadFile(
                    (d.album?.tracks || (d.song ? [d.song] : []))
                      .map(trackText)
                      .join("\n---\n"),
                    "suno-music-plans.txt",
                  );
                }}
                disabled={!store.draft.song && !store.draft.album}
              >
                <Download size={16} />
                전체 TXT 저장
              </button>
            </div>
            <p className="muted">
              Suno에서는 본인 계정으로 최종 음악 생성 버튼을 직접 누릅니다. 실제
              음악 생성에는 별도 서비스 비용이 발생할 수 있습니다.
            </p>
          </section>
          {store.draft.song && (
            <TrackEditor
              track={store.draft.song}
              busy={busy}
              instrumental={b.instrumental}
              notice={setNotice}
              onChange={(t) =>
                draftChange({
                  ...current.current.draft,
                  song: t,
                  brief: {
                    ...current.current.draft.brief,
                    style: t.style,
                    bpm: t.bpm,
                    ...(t.exclude !== current.current.draft.song?.exclude
                      ? { exclude: t.exclude }
                      : {}),
                  },
                })
              }
            />
          )}
          <section className="card">
            <h2>
              내 보관함 <span className="muted">{store.saved.length}/100</span>
            </h2>
            {!!store.styles.length && (
              <details className="advanced-settings">
                <summary>내 Style 프리셋 ({store.styles.length}/100)</summary>
                {store.styles.map((s) => (
                  <div className="saved-row" key={s.id}>
                    <div>
                      <strong>{s.name}</strong>
                      <p className="mono">{s.style}</p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => {
                        changeBrief({
                          ...b,
                          style: s.style,
                          exclude: s.exclude,
                          bpm: s.bpm,
                          locked: true,
                          generateStyle: false,
                          presetId: "",
                          styleGroup: "",
                        });
                        setNotice(
                          "저장 Style을 적용했습니다. 기존 가사는 유지됩니다.",
                        );
                        router.push("/?section=song");
                      }}
                    >
                      Style 적용
                    </button>
                  </div>
                ))}
              </details>
            )}
            <p className="muted">
              이 회원의 이 브라우저 자료입니다. 사이트 데이터를 지우기 전 JSON
              백업을 내려받으세요.
            </p>
            {store.saved.length === 0 ? (
              <div className="empty-state">
                <Music2 size={28} />
                <p>보관한 곡이나 앨범이 없습니다.</p>
              </div>
            ) : (
              store.saved.map((s) => (
                <div className="saved-row" key={s.id}>
                  <div>
                    <strong>{s.name}</strong>
                    <small>
                      {new Date(s.savedAt).toLocaleString("ko-KR")} ·{" "}
                      {s.draft.album?.tracks.length || 1}곡
                    </small>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => {
                      cancel();
                      if (s.draft.album) loadAlbum(s);
                      else
                        mutate((v) => ({
                          ...v,
                          draft: {
                            ...v.draft,
                            brief: structuredClone(s.draft.brief),
                            song: structuredClone(s.draft.song),
                          },
                        }));
                      setNotice("저장한 작업을 불러왔습니다.");
                      router.push(
                        `/?section=${s.draft.album ? "album" : "song"}`,
                      );
                    }}
                  >
                    불러오기
                  </button>
                  <button
                    className="download"
                    onClick={() =>
                      downloadFile(
                        JSON.stringify(
                          { schema: 1, draft: s.draft, saved: [s] },
                          null,
                          2,
                        ),
                        "suno-saved-project.json",
                        "application/json",
                      )
                    }
                  >
                    JSON 저장
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      )}
      <footer className="workspace-footer">
        개인 AI로 음악을 기획하고, 본인 Suno 계정에서 완성하세요.{" "}
        <Link href="/?section=guide">사용 방법</Link>
      </footer>
    </div>
  );
}
