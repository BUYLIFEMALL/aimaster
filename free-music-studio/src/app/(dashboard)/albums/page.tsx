"use client";

// 앨범(v1.35, 2026-11-07 주인님 「음악 앨범 매뉴를 좌측에 만들고 여기서 앨범을 만들거나」「앨범만 만들고 곡은 안만들수 있는 상황이니 별도의 기능」).
// 곡과 따로 앨범 그림을 만들어 모아 두고, 곡 만들기·「모든 음악」에서 골라 표지로 쓴다. 그림은 회원 PC(엔진 0.7.3 Albums/)에만.
// ?title=&art=&track= — 곡을 다 만든 뒤 「앨범 그림 만들기(곡 제목·가사로)」로 열리면 채워 두고, 저장하면 그 곡 표지로도 넣는다.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { songFromAlbumHref } from "@/lib/albumRead";
import { useSearchParams } from "next/navigation";
import { Download, ImageIcon, Images, Music2, Pencil, Trash2, X } from "lucide-react";
import { AlbumArtPanel } from "@/components/songs/AlbumArtPanel";
import { ImageModelPanel } from "@/components/engine/ImageModelPanel";
import { useAlbums, type AlbumItem } from "@/components/albums/useAlbums";
import { deleteAlbumImage, saveAlbumImage, setTrackArt } from "@/lib/engine";
import { ALBUM_SONG_KEY, ALBUM_TITLE_MAX, type AlbumSongContext } from "@/lib/albums";
import type { Track } from "@/lib/tracks";

const field =
  "w-full rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-fuchsia-400 focus:outline-hidden";

export default function AlbumsPage() {
  const params = useSearchParams();
  const { engine, ok, albums, thumbs, loading, error, reload, forget } = useAlbums();
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [art, setArt] = useState(params.get("art") ?? "");
  const trackId = params.get("track");
  const [track, setTrack] = useState<Track | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [panelKey, setPanelKey] = useState(0);
  // 썸네일을 누르면 크게 보기(2026-11-08 주인님 「클릭하면 확대해서 보여줄수 있도록」) — Esc·바깥 누르면 닫힘
  const [zoom, setZoom] = useState<string | null>(null);
  // 내 앨범 페이지(2026-11-08 주인님 「스크롤바 만들지 말고 그냥 죽 나열」「많아지면 페이지 번호를 넘겨 1 / 2 / 3 …」) — 한 페이지 12개(한 줄 4 × 3줄)
  const ALBUM_PAGE = 12;
  const [albumPage, setAlbumPage] = useState(1);
  const albumPages = Math.max(1, Math.ceil(albums.length / ALBUM_PAGE));
  useEffect(() => {
    if (albumPage > albumPages) setAlbumPage(albumPages);
  }, [albumPage, albumPages]);
  const pageAlbums = albums.slice((albumPage - 1) * ALBUM_PAGE, albumPage * ALBUM_PAGE);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);
  // 곡 만들기 「앨범 화면에서 이 곡 그림 만들기」로 왔을 때(?from=song) — 그 곡 스타일·가사(v1.38)
  const [songCtx, setSongCtx] = useState<AlbumSongContext | null>(null);
  useEffect(() => {
    if (params.get("from") !== "song") return;
    try {
      const v = JSON.parse(sessionStorage.getItem(ALBUM_SONG_KEY) ?? "null") as AlbumSongContext | null;
      if (v && (v.style || v.lyrics)) setSongCtx({ style: String(v.style ?? ""), lyrics: String(v.lyrics ?? "") });
    } catch {}
  }, [params]);

  // 곡을 다 만든 뒤 들어온 경우 — 그 곡의 제목·가사로 채운다
  useEffect(() => {
    if (!trackId) return;
    fetch("/api/tracks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { tracks?: Track[] } | null) => {
        const t = d?.tracks?.find((x) => x.id === trackId) ?? null;
        setTrack(t);
        if (t && !params.get("title")) setTitle(t.title.slice(0, ALBUM_TITLE_MAX));
      })
      .catch(() => {});
  }, [trackId, params]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

  // [앨범에 저장] — DB 기록을 만들고 그림을 내 PC Albums/에. 그림 저장이 실패하면 기록도 지운다.
  const saveAlbum = async (img: { base64: string; mimeType: string }): Promise<string> => {
    const name = title.trim();
    if (!name) throw new Error("앨범 이름을 먼저 적어 주세요.");
    const res = await fetch("/api/albums", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: name, art_prompt: art }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "앨범을 만들지 못했습니다.");
    const id: string = data.album.id;
    try {
      await saveAlbumImage(id, img.base64, img.mimeType);
    } catch (e) {
      await fetch(`/api/albums/${id}`, { method: "DELETE" }).catch(() => {});
      throw e;
    }
    let cover = "";
    if (track) {
      try {
        const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
        await setTrackArt(track.id, new Blob([bytes], { type: img.mimeType }));
        cover = ` 「${track.title}」 표지로도 넣었습니다.`;
      } catch (e) {
        cover = ` 곡 표지는 넣지 못했습니다(${e instanceof Error ? e.message : "오류"}).`;
      }
    }
    await reload();
    return `「${name}」 앨범에 저장했습니다.${cover} 곡 만들기·「모든 음악」에서 골라 표지로 쓸 수 있습니다.`;
  };

  const rename = async (a: AlbumItem) => {
    const name = window.prompt("새 앨범 이름", a.title)?.trim();
    if (!name || name === a.title) return;
    const res = await fetch(`/api/albums/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: name }) });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok ? { ok: true, text: `이름을 「${name}」으로 바꿨습니다.` } : { ok: false, text: data.error || "이름을 바꾸지 못했습니다." });
    if (res.ok) await reload();
  };

  const remove = async (a: AlbumItem) => {
    if (!confirm(`「${a.title}」 앨범을 지울까요? 이 PC의 앨범 그림도 지웁니다(이미 곡 표지로 넣은 그림은 그대로 남습니다).`)) return;
    if (!a.orphan) {
      const res = await fetch(`/api/albums/${a.id}`, { method: "DELETE" });
      if (!res.ok) return setNotice({ ok: false, text: "앨범을 지우지 못했습니다." });
    }
    if (a.onPc) await deleteAlbumImage(a.id).catch(() => {});
    forget(a.id);
    setNotice({ ok: true, text: `「${a.title}」 앨범을 지웠습니다.` });
    await reload();
  };

  const saveAction = useMemo(
    () => ({
      label: track ? "앨범에 저장 · 이 곡 표지로" : "앨범에 저장",
      ready: ok && !!title.trim(),
      notReady: !ok ? "앨범 그림은 내 PC에 보관합니다. 내 PC 엔진 0.7.3 이상을 켜고 연결해 주세요." : "위 「앨범 이름」을 적으면 저장할 수 있습니다.",
      run: saveAlbum,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ok, title, art, track]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#170b1d] to-[#070b14] p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-2 text-fuchsia-300">
            <Images className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🖼 음악앨범</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              앨범 그림만 전문으로 만드는 곳입니다. AI 그림(Gemini·OpenAI·Replicate) 또는 내 PC(무료)로 그려 모아 두고, 곡 만들기·「모든 음악」에서 골라 표지로 씁니다. 그림 파일은 회원님 PC 노래 저장 폴더 안 「Albums」에만 있습니다(서버로 올리지 않음).
            </p>
          </div>
          <span className="text-xs text-slate-400">앨범 {albums.length}개</span>
        </div>
      </div>

      {!engine.checking && !ok && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-200">
          {!engine.online ? "내 PC 엔진이 꺼져 있어 앨범 그림을 보거나 저장할 수 없습니다." : "앨범 그림을 보관하려면 내 PC 엔진 0.7.3 이상이 필요합니다."}{" "}
          <Link href="/engine" className="underline underline-offset-2">
            내 PC 엔진
          </Link>
        </p>
      )}

      <div className="space-y-5">
      {/* 1. 그림 만들기 — 영상 만들기 화면처럼 번호 단계 두 칸(2026-11-08 주인님 「영상 만들기 메뉴처럼」) */}
      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h2 className="text-sm font-bold text-slate-100">1. 앨범 그림 만들기</h2>
        {songCtx && !track && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">
            <Music2 className="h-4 w-4" /> 곡 만들기에서 보낸 {title ? `「${title}」의 ` : ""}가사·스타일로 그림 설명을 만듭니다. 저장하면 곡 만들기 「만들어 둔 앨범에서 고르기」로 표지에 넣을 수 있습니다.
          </p>
        )}
        {track && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">
            <Music2 className="h-4 w-4" /> 「{track.title}」의 제목·가사로 앨범 그림을 만듭니다. 저장하면 이 곡 표지로도 들어갑니다.
          </p>
        )}
        <AlbumArtPanel
          key={panelKey}
          split
          beforePrompt={
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-300">앨범 이름</span>
              <input className={field} value={title} maxLength={ALBUM_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="예: 가을 기차 여행" />
            </label>
          }
          heading="새 앨범 그림 만들기"
          title={title}
          style={track?.style_prompt ?? songCtx?.style ?? ""}
          lyrics={track?.lyrics ?? songCtx?.lyrics ?? ""}
          songId={track?.id ?? null}
          art={art}
          onArtChange={setArt}
          saveAction={saveAction}
          onReset={
            title || art || songCtx
              ? () => {
                  setTitle("");
                  setArt("");
                  setSongCtx(null);
                  setPanelKey((k) => k + 1);
                }
              : undefined
          }
        />
      </section>

      {/* 2. 내 앨범 */}
      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          2. 내 앨범 <span className="text-[11px] font-normal text-slate-400">받기 · 이름 · 지우기 · 이 그림으로 곡 만들기</span>
        </h2>
        {notice && <p className={`text-xs ${notice.ok ? "text-emerald-300" : "text-rose-300"}`}>{notice.text}</p>}
        {error && <p className="text-xs text-rose-300">{error}</p>}
        {loading ? (
          <p className="text-xs text-slate-500">앨범을 읽는 중…</p>
        ) : albums.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">아직 앨범이 없습니다. 위에서 그림을 만들고 [앨범에 저장]을 눌러 주세요.</p>
        ) : (
          <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {pageAlbums.map((a) => (
              <li key={a.id} className="space-y-2 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-3">
                <div className="aspect-square overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                  {thumbs[a.id] ? (
                    <button type="button" onClick={() => setZoom(a.id)} className="block h-full w-full cursor-zoom-in" title="크게 보기">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbs[a.id]} alt={a.title} className="h-full w-full object-cover transition-transform duration-200 hover:scale-105" />
                    </button>
                  ) : (
                    <span className="flex h-full items-center justify-center p-3 text-center text-[11px] text-slate-500">
                      {a.onPc === false ? "이 PC에 그림이 없습니다(다른 PC에서 만들었거나 지움)" : "그림을 읽는 중…"}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs font-semibold text-slate-100" title={a.title}>
                  {a.title}
                </p>
                {a.orphan && <p className="text-[10px] text-slate-500">기록이 30일 정리로 지워진 그림입니다.</p>}
                {/* 2026-11-08 주인님 그림 표시 — 좁은 썸네일 카드에서 받기·이름·지우기가 세로로 쌓이던 것 → 곡 만들기 한 줄 + 아이콘 한 줄 */}
                {a.onPc && (
                  <Link
                    href={songFromAlbumHref(a.id, a.title)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-fuchsia-600 px-2 py-2 text-xs font-bold text-white hover:bg-fuchsia-500"
                    title="AI가 이 그림을 보고 곡 주제·장르·분위기·스타일을 채우고, 그림은 그 곡 표지가 됩니다"
                  >
                    <Music2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">이 그림으로 곡 만들기</span>
                  </Link>
                )}
                <div className="flex items-center justify-between gap-1">
                  {thumbs[a.id] ? (
                    <a href={thumbs[a.id]} download={`${a.title.replace(/[\\/:*?"<>|]/g, "_")}.png`} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-700 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900" title="그림 받기" aria-label={`${a.title} 그림 받기`}>
                      <Download className="h-3.5 w-3.5" /> 받기
                    </a>
                  ) : (
                    <span className="flex-1" />
                  )}
                  {!a.orphan && (
                    <button type="button" onClick={() => void rename(a)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-700 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900" title="이름 바꾸기" aria-label={`${a.title} 이름 바꾸기`}>
                      <Pencil className="h-3.5 w-3.5" /> 이름
                    </button>
                  )}
                  <button type="button" onClick={() => void remove(a)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-500/30 py-1.5 text-[11px] text-rose-300 hover:bg-rose-950/40" title="지우기" aria-label={`${a.title} 지우기`}>
                    <Trash2 className="h-3.5 w-3.5" /> 지우기
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {albumPages > 1 && (
            <nav aria-label="내 앨범 페이지" className="flex flex-wrap items-center justify-center gap-1 pt-2">
              <button type="button" disabled={albumPage === 1} onClick={() => setAlbumPage((p) => p - 1)} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-900 disabled:opacity-30">
                ‹ 이전
              </button>
              {Array.from({ length: albumPages }, (_, k) => k + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAlbumPage(n)}
                  aria-current={n === albumPage ? "page" : undefined}
                  className={`min-w-8 rounded-lg px-2.5 py-1 text-xs font-bold ${n === albumPage ? "bg-fuchsia-600 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-900"}`}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={albumPage === albumPages} onClick={() => setAlbumPage((p) => p + 1)} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-900 disabled:opacity-30">
                다음 ›
              </button>
              <span className="ml-2 text-[11px] text-slate-500">
                {albums.length}개 중 {(albumPage - 1) * ALBUM_PAGE + 1}~{Math.min(albumPage * ALBUM_PAGE, albums.length)}
              </span>
            </nav>
          )}
          </>
        )}
      </section>
      </div>

      {zoom && thumbs[zoom] && (() => {
        const z = albums.find((a) => a.id === zoom);
        return (
          <div role="dialog" aria-modal="true" aria-label="앨범 그림 크게 보기" onClick={() => setZoom(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-3xl space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbs[zoom]} alt={z?.title ?? "앨범 그림"} className="max-h-[80vh] w-full rounded-2xl border border-slate-700 object-contain" />
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto truncate text-sm font-bold text-slate-100">{z?.title}</p>
                {z?.onPc && (
                  <Link href={songFromAlbumHref(z.id, z.title)} className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-500">
                    <Music2 className="h-3.5 w-3.5" /> 이 그림으로 곡 만들기
                  </Link>
                )}
                <a href={thumbs[zoom]} download={`${(z?.title ?? "앨범").replace(/[\\/:*?"<>|]/g, "_")}.png`} className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900">
                  <Download className="h-3.5 w-3.5" /> 받기
                </a>
                <button type="button" onClick={() => setZoom(null)} className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900">
                  <X className="h-3.5 w-3.5" /> 닫기
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 내 PC 그림 모델 — 「내 PC 엔진」 화면 「이미지용」에서 옮김(2026-11-08 주인님 「앨범 만들기 좌측으로 따로 빼기로 한거 마저」) */}
      <section id="image-models" className="scroll-mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <ImageIcon className="h-4 w-4 text-fuchsia-300" /> 3. 내 PC 그림 모델 <span className="text-[11px] font-normal text-slate-400">「내 PC (무료)」로 그릴 때 쓰는 모델 · 음악 모델과 다른 폴더</span>
        </h2>
        {engine.paired ? (
          <ImageModelPanel status={engine.status} />
        ) : (
          <p className="rounded-xl border border-slate-800 bg-[#0a0f1d] px-4 py-3 text-xs text-slate-500">
            「내 PC 엔진」 화면에서 엔진 연결을 마치면 그림 모델을 고르고 받을 수 있습니다.{" "}
            <Link href="/engine" className="text-fuchsia-300 underline underline-offset-2">
              내 PC 엔진으로 가기
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
