"use client";

// 홈 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)의 홈(「음악이 시작되는 나의 공간」·내 프로젝트 카드·최근 음악 바로 재생·
// 비었을 때 「첫 프로젝트 만들기」)을 옮김(2026-11-06). 프로젝트를 누르면 「모든 음악」의 그 프로젝트로 간다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderClosed, ListMusic, Loader2, Music2, Pause, Play, Plus, Sparkles } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { usePlayer } from "@/components/player/PlayerProvider";
import { CoverThumb } from "@/components/library/CoverThumb";
import { hasCover, hasLibrary, listLibraryFormats } from "@/lib/engine";
import { KIND_LABEL, type Track } from "@/lib/tracks";
import { libraryHref, type Collection } from "@/lib/collections";

const RECENT = 8;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function HomePage() {
  const router = useRouter();
  const engine = useEngine();
  const player = usePlayer();
  const libOk = engine.paired && hasLibrary(engine.status);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [projects, setProjects] = useState<Collection[]>([]);
  const [playlists, setPlaylists] = useState<Collection[]>([]);
  const [onPc, setOnPc] = useState<Set<string> | null>(null);
  const [arts, setArts] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tracks")
      .then((r) => (r.ok ? r.json() : { tracks: [] }))
      .then((d) => setTracks(d.tracks ?? []))
      .catch(() => setTracks([]));
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { projects?: Collection[]; playlists?: Collection[] }) => (setProjects(d.projects ?? []), setPlaylists(d.playlists ?? [])))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!libOk) return;
    listLibraryFormats()
      .then((r) => (setOnPc(r.ids), setArts(r.arts)))
      .catch(() => setOnPc(null));
  }, [libOk]);

  const recent = (tracks ?? []).slice(0, RECENT);
  const playable = recent.filter((t) => onPc?.has(t.id));
  const toPlayer = (t: Track) => ({ key: t.id, title: t.title, subtitle: `${mmss(t.duration_sec)}${KIND_LABEL[t.kind] ? ` · ${KIND_LABEL[t.kind]}` : ""}` });

  const createProject = async () => {
    if (!name.trim()) return;
    setError("");
    const res = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "project", name }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "프로젝트를 만들지 못했습니다.");
    router.push(libraryHref("project", data.collection.id));
  };

  const card = "rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <p className="text-[11px] font-bold tracking-wide text-emerald-300">HOME</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100">🎵 음악이 시작되는 나의 공간</h1>
        <p className="mt-1 text-xs text-slate-400">프로젝트로 곡을 묶고, 최근에 만든 노래를 바로 들어 보세요. 새 곡은 「곡 만들기」에서 시작합니다.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/songs" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110">
            <Sparkles className="h-4 w-4" /> 새 곡 만들기
          </Link>
          <Link href="/library" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-900">
            <Music2 className="h-4 w-4" /> 모든 음악 {tracks ? `${tracks.length}곡` : ""}
          </Link>
        </div>
      </div>

      {/* 내 프로젝트 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-100">📁 내 프로젝트</h2>
          <span className="text-[11px] text-slate-500">{projects.length}개</span>
          <button type="button" onClick={() => setCreating((v) => !v)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-900">
            <Plus className="h-3.5 w-3.5" /> 새 프로젝트
          </button>
        </div>
        {creating && (
          <div className="flex flex-wrap gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && createProject()}
              maxLength={40}
              placeholder="프로젝트 이름 예) 카페 BGM 앨범"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden"
            />
            <button type="button" onClick={createProject} disabled={!name.trim()} className="rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-40">
              만들기
            </button>
          </div>
        )}
        {error && <p className="text-xs font-semibold text-rose-300">{error}</p>}
        {projects.length === 0 && !creating ? (
          <div className={`${card} text-center text-xs text-slate-400`}>
            아직 프로젝트가 없습니다. 앨범·채널별로 곡을 묶어 두면 찾기 쉽습니다.{" "}
            <button type="button" onClick={() => setCreating(true)} className="font-semibold text-emerald-300 underline underline-offset-2">
              첫 프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={libraryHref("project", p.id)} className={`${card} group flex items-center gap-3 hover:border-amber-500/40`}>
                <span className="rounded-xl bg-amber-500/10 p-2.5 text-amber-300">
                  <FolderClosed className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-100 group-hover:text-amber-200">{p.name}</span>
                  <span className="text-[11px] text-slate-500">{p.count}곡</span>
                </span>
              </Link>
            ))}
            {playlists.map((p) => (
              <Link key={p.id} href={libraryHref("playlist", p.id)} className={`${card} group flex items-center gap-3 hover:border-sky-500/40`}>
                <span className="rounded-xl bg-sky-500/10 p-2.5 text-sky-300">
                  <ListMusic className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-100 group-hover:text-sky-200">{p.name}</span>
                  <span className="text-[11px] text-slate-500">플레이리스트 · {p.count}곡</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 최근 음악 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-100">🎧 최근 음악</h2>
          {playable.length > 1 && (
            <button type="button" onClick={() => player?.playList(playable.map(toPlayer))} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/50">
              <Play className="h-3.5 w-3.5" /> 전부 듣기
            </button>
          )}
        </div>
        {tracks === null ? (
          <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…</p>
        ) : recent.length === 0 ? (
          <div className={`${card} text-center text-xs text-slate-400`}>
            아직 만든 노래가 없습니다.{" "}
            <Link href="/songs" className="font-semibold text-emerald-300 underline underline-offset-2">
              곡 만들기
            </Link>
            에서 첫 노래를 만들어 보세요.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recent.map((t) => {
              const here = onPc?.has(t.id);
              const now = player?.current?.key === t.id;
              return (
                <li key={t.id} className={`${card} flex items-center gap-3 p-3`}>
                  {libOk && hasCover(engine.status) && <CoverThumb trackId={t.id} has={arts.has(t.id)} title={t.title} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{t.title}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {mmss(t.duration_sec)}
                      {KIND_LABEL[t.kind] ? ` · ${KIND_LABEL[t.kind]}` : ""} · {new Date(t.created_at).toLocaleDateString("ko-KR")}
                      {here === false ? " · 이 PC에 음원 없음" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!here}
                    onClick={() => player?.playList(playable.map(toPlayer), t.id)}
                    aria-label={now && player?.playing ? "멈춤" : "듣기"}
                    className="rounded-full bg-emerald-600 p-2.5 text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-500 disabled:opacity-30"
                  >
                    {now && player?.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!engine.checking && !libOk && <p className="text-[11px] text-amber-300/80">내 PC 엔진이 꺼져 있거나 연결되지 않아 음원을 들을 수 없습니다. 「내 PC 엔진」 화면에서 켜 주세요.</p>}
      </section>
    </div>
  );
}
