"use client";

// 곡 만들기의 앨범 그림 칸(v1.35) — 예전 「앨범 그림 만들기」 자리. 그림 만들기는 좌측 「앨범」 메뉴로 옮겼고(주인님 「별도의 기능」),
// 여기서는 만들어 둔 앨범에서 이 곡에 어울리는 그림을 골라 「곡 제목.png」로 노래 폴더에 넣는다 → 곡이 완성되면 표지가 된다(엔진 0.6.8 같은 이름 규칙).
import Link from "next/link";
import { useEffect, useState } from "react";
import { ImageIcon, Images, Plus } from "lucide-react";
import { AlbumPicker } from "@/components/albums/AlbumPicker";
import { useEngine } from "@/components/engine/useEngine";
import { blobToBase64, hasArt, saveArtToLibrary } from "@/lib/engine";
import { albumsHref } from "@/lib/albums";

export function SongAlbumChooser({ title, art }: { title: string; art: string }) {
  const { paired, status } = useEngine(10000);
  const canSave = paired && hasArt(status);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ name: string; url: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.url)), [picked]);

  const pick = async (album: { title: string }, image: Blob) => {
    if (!title.trim()) throw new Error("곡 제목을 먼저 적어 주세요. 그림은 「곡 제목.png」로 저장되어 표지가 됩니다.");
    const where = await saveArtToLibrary(title.trim(), await blobToBase64(image), image.type || "image/png");
    setPicked({ name: album.title, url: URL.createObjectURL(image) });
    setMsg({ ok: true, text: `「${album.title}」 그림을 이 곡 표지로 넣었습니다${where ? `(${where})` : ""}. 곡이 완성되면 「모든 음악」과 MP3에 표지로 보입니다.` });
    setOpen(false);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <ImageIcon className="h-4 w-4 text-fuchsia-300" /> 앨범 그림(표지) <span className="text-[11px] font-normal text-slate-400">(선택)</span>
      </h2>
      <p className="text-[11px] leading-relaxed text-slate-400">
        좌측 「앨범」에서 만들어 둔 그림 가운데 이 곡에 어울리는 것을 고르면 곡 표지가 됩니다. 곡을 다 만든 뒤 「모든 음악」 곡 메뉴에서 골라도 됩니다.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!canSave}
          title={canSave ? undefined : "내 PC 엔진을 연결해야 노래 폴더에 표지를 넣을 수 있습니다"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/40 px-4 py-2 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-900/50 disabled:opacity-40"
        >
          <Images className="h-3.5 w-3.5" /> 만들어 둔 앨범에서 고르기
        </button>
        <Link href={albumsHref({ title, art })} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900">
          <Plus className="h-3.5 w-3.5" /> 새 앨범 그림 만들기{art.trim() ? "(이 곡 그림 설명으로)" : ""}
        </Link>
        {picked && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picked.url} alt={picked.name} className="h-12 w-12 rounded-lg border border-slate-700 object-cover" />
        )}
      </div>
      {!canSave && <p className="text-[11px] text-slate-500">내 PC 엔진을 연결하면 고를 수 있습니다.</p>}
      {msg && <p className={`text-[11px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
      {open && <AlbumPicker title="이 곡에 어울리는 앨범 그림 고르기" onPick={pick} onClose={() => setOpen(false)} />}
    </section>
  );
}
