"use client";

// 곡 만들기의 앨범 그림 칸(v1.35) — 예전 「앨범 그림 만들기」 자리. 그림 만들기는 좌측 「앨범」 메뉴로 옮겼고(주인님 「별도의 기능」),
// 여기서는 만들어 둔 앨범에서 이 곡에 어울리는 그림을 골라 「곡 제목.png」로 노래 폴더에 넣는다 → 곡이 완성되면 표지가 된다(엔진 0.6.8 같은 이름 규칙).
// v1.36 앨범 2단계: 「이 그림으로 곡 만들기」 — 회원 AI 키로 그림을 한 번 읽어 곡 칸(제목·주제·장르·분위기·스타일)을 채우고, 그 그림을 표지로 넣는다.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, Images, Loader2, Plus, Wand2 } from "lucide-react";
import { AlbumPicker } from "@/components/albums/AlbumPicker";
import { useEngine } from "@/components/engine/useEngine";
import { blobToBase64, fetchAlbumImage, hasAlbums, hasArt, saveArtToLibrary } from "@/lib/engine";
import { ALBUM_SONG_KEY, albumsHref } from "@/lib/albums";
import type { AlbumRead } from "@/lib/albumRead";

/** AI에 보낼 그림 — 긴 변 768px JPEG로 줄인다(요청 크기·AI 비용을 줄임) */
async function shrinkForAi(image: Blob): Promise<string> {
  const bmp = await createImageBitmap(image);
  const scale = Math.min(1, 768 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const jpeg = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("그림을 줄이지 못했습니다."))), "image/jpeg", 0.85));
  return blobToBase64(jpeg);
}

type Props = {
  title: string;
  art: string;
  /** 앨범 화면으로 넘길 곡 스타일·가사(그 곡에 맞는 그림을 앨범 화면에서 만들도록, v1.38) */
  style: string;
  lyrics: string;
  /** 곡 만들기 화면에서 고른 AI(가사와 같은 제공자·모델) */
  ai: { provider: string; model: string };
  /** 그림에서 읽은 값으로 곡 칸 채우기 */
  onRead: (r: AlbumRead) => void;
  /** 앨범 화면 「이 그림으로 곡 만들기」로 왔을 때 그 앨범(주소 ?album=&name=) */
  start?: { id: string; name: string } | null;
};

export function SongAlbumChooser({ title, art, style, lyrics, ai, onRead, start }: Props) {
  const { paired, status } = useEngine(10000);
  const canSave = paired && hasArt(status);
  const [open, setOpen] = useState<"" | "cover" | "read">("");
  const [reading, setReading] = useState(false);
  const [picked, setPicked] = useState<{ name: string; url: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; needKey?: boolean } | null>(null);
  useEffect(() => () => void (picked && URL.revokeObjectURL(picked.url)), [picked]);

  const putCover = async (name: string, songTitle: string, image: Blob) => {
    const where = await saveArtToLibrary(songTitle, await blobToBase64(image), image.type || "image/png");
    setPicked({ name, url: URL.createObjectURL(image) });
    return where;
  };

  const pick = async (album: { title: string }, image: Blob) => {
    if (!title.trim()) throw new Error("곡 제목을 먼저 적어 주세요. 그림은 「곡 제목.png」로 저장되어 표지가 됩니다.");
    const where = await putCover(album.title, title.trim(), image);
    setMsg({ ok: true, text: `「${album.title}」 그림을 이 곡 표지로 넣었습니다${where ? `(${where})` : ""}. 곡이 완성되면 「모든 음악」과 MP3에 표지로 보입니다.` });
    setOpen("");
  };

  // 그림 → 글(회원 AI 1번) → 곡 칸 채우기 → 같은 그림을 표지로
  const readAndFill = async (album: { title: string }, image: Blob) => {
    setReading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/albums/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ai, image: await shrinkForAi(image), mime: "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "그림을 읽지 못했습니다.", needKey: !!data.needApiKey });
        setOpen("");
        return;
      }
      const r = data as AlbumRead;
      onRead(r);
      const songTitle = title.trim() || r.title;
      let cover = "";
      if (songTitle) {
        try {
          const where = await putCover(album.title, songTitle, image);
          cover = ` 그림은 「${songTitle}」 표지로 넣었습니다${where ? `(${where})` : ""}.`;
        } catch {
          cover = " 표지는 넣지 못했습니다 — 곡 제목을 정한 뒤 「만들어 둔 앨범에서 고르기」로 다시 넣어 주세요.";
        }
      }
      setMsg({ ok: true, text: `「${album.title}」 그림을 읽어 곡 칸(주제·장르·분위기·스타일)을 채웠습니다.${cover} 위에서 확인한 뒤 [가사 채우기]를 눌러 주세요.` });
      setOpen("");
    } catch {
      setMsg({ ok: false, text: "그림을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setReading(false);
    }
  };

  // 앨범 화면에서 「이 그림으로 곡 만들기」로 왔으면 엔진이 연결되는 대로 한 번만 읽는다
  const started = useRef(false);
  useEffect(() => {
    if (!start || started.current || !paired || !hasAlbums(status)) return;
    started.current = true;
    void fetchAlbumImage(start.id)
      .then((image) => readAndFill({ title: start.name }, image))
      .catch(() => setMsg({ ok: false, text: "그 앨범 그림을 내 PC에서 찾지 못했습니다. 「그림으로 곡 만들기」에서 다시 골라 주세요." }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, paired, status]);

  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <ImageIcon className="h-4 w-4 text-fuchsia-300" /> 앨범 그림(표지) <span className="text-[11px] font-normal text-slate-400">(선택)</span>
      </h2>
      <p className="text-[11px] leading-relaxed text-slate-400">
        그림은 좌측 「앨범」 화면에서 만듭니다. 만들어 둔 앨범에서 고르면 곡 표지가 되고, 「앨범 화면에서 이 곡 그림 만들기」는 이 곡 제목·가사·스타일을 앨범 화면으로 보냅니다. 「그림으로 곡 만들기」를 누르면 AI가 그림을 보고 곡 주제·장르·분위기·스타일을 채웁니다(위에서 고른 AI 키로 1번 호출).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen("read")}
          disabled={!canSave || reading}
          title={canSave ? undefined : "내 PC 엔진을 연결해야 앨범 그림을 읽을 수 있습니다"}
          className="inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-600 px-4 py-2 text-xs font-bold text-white hover:bg-fuchsia-500 disabled:opacity-40"
        >
          {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} {reading ? "그림 읽는 중…" : "그림으로 곡 만들기"}
        </button>
        <button
          type="button"
          onClick={() => setOpen("cover")}
          disabled={!canSave || reading}
          title={canSave ? undefined : "내 PC 엔진을 연결해야 노래 폴더에 표지를 넣을 수 있습니다"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/40 px-4 py-2 text-xs font-bold text-fuchsia-200 hover:bg-fuchsia-900/50 disabled:opacity-40"
        >
          <Images className="h-3.5 w-3.5" /> 만들어 둔 앨범에서 고르기
        </button>
        <Link
          href={albumsHref({ title, art, fromSong: true })}
          onClick={() => {
            try {
              sessionStorage.setItem(ALBUM_SONG_KEY, JSON.stringify({ style, lyrics }));
            } catch {}
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900">
          <Plus className="h-3.5 w-3.5" /> 앨범 화면에서 이 곡 그림 만들기
        </Link>
        {picked && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picked.url} alt={picked.name} className="h-12 w-12 rounded-lg border border-slate-700 object-cover" />
        )}
      </div>
      {!canSave && <p className="text-[11px] text-slate-500">내 PC 엔진을 연결하면 고를 수 있습니다.</p>}
      {msg && (
        <p className={`text-[11px] ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {msg.text}
          {msg.needKey && (
            <>
              {" "}
              <Link href="/settings" className="underline underline-offset-2">
                API 키 등록하기
              </Link>
            </>
          )}
        </p>
      )}
      {open === "cover" && <AlbumPicker title="이 곡에 어울리는 앨범 그림 고르기" onPick={pick} onClose={() => setOpen("")} />}
      {open === "read" && <AlbumPicker title="곡으로 만들 앨범 그림 고르기 — AI가 그림을 보고 곡 칸을 채웁니다" onPick={readAndFill} onClose={() => setOpen("")} />}
    </section>
  );
}
