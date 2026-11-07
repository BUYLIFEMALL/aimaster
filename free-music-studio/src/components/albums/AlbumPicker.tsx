"use client";

// 만들어 둔 앨범 그림에서 하나 고르기(v1.35, 주인님 「이미 만들어놓은 앨범이미지에서 선택해서 사용」).
// 곡 만들기(이 곡 표지로)와 「모든 음악」 곡 메뉴(표지 고르기)가 함께 쓴다. 고르면 그 그림 파일(Blob)을 넘긴다.
import Link from "next/link";
import { useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { fetchAlbumImage } from "@/lib/engine";
import { useAlbums, type AlbumItem } from "@/components/albums/useAlbums";

export function AlbumPicker({ onPick, onClose, title = "앨범 그림 고르기" }: { onPick: (album: AlbumItem, image: Blob) => Promise<void> | void; onClose: () => void; title?: string }) {
  const { ok, engine, albums, thumbs, loading, error } = useAlbums();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const usable = albums.filter((a) => a.onPc);

  const pick = async (a: AlbumItem) => {
    setBusy(a.id);
    setMsg("");
    try {
      await onPick(a, await fetchAlbumImage(a.id));
    } catch (e) {
      setMsg(e instanceof Error && e.message ? e.message : "그림을 쓰지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-fuchsia-500/30 bg-[#0a0f1d] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-fuchsia-300" />
          <h2 className="flex-1 text-sm font-bold text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
        {!engine.checking && !ok ? (
          <p className="text-xs leading-relaxed text-amber-200">앨범 그림은 내 PC에 있습니다. 내 PC 엔진 0.7.3 이상을 켜고 연결해 주세요(「내 PC 엔진」 화면).</p>
        ) : loading ? (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 앨범을 읽는 중…
          </p>
        ) : usable.length === 0 ? (
          <p className="text-xs text-slate-400">
            이 PC에 만들어 둔 앨범 그림이 없습니다.{" "}
            <Link href="/albums" className="text-fuchsia-300 underline underline-offset-2">
              앨범 화면에서 만들기
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {usable.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => void pick(a)} disabled={!!busy} className="group w-full text-left disabled:opacity-50">
                  <span className="relative block aspect-square overflow-hidden rounded-xl border border-slate-700 group-hover:border-fuchsia-400">
                    {thumbs[a.id] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[a.id]} alt={a.title} className="h-full w-full object-cover" />
                    )}
                    {busy === a.id && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-300">{a.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {(msg || error) && <p className="mt-3 text-[11px] text-rose-300">{msg || error}</p>}
      </div>
    </div>
  );
}
