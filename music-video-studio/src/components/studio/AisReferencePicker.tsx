"use client";

// v1.24 AI 이미지 스튜디오에서 만든 내 이미지를 참고 이미지로 가져오기. 고르면 브라우저가 받아 기존 「추가」와 같은 줄이기(JPEG)를 거친다.
import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { AIS_APP_URL } from "@/lib/music/aisPath";
import { BTN_GHOST } from "@/components/studio/ui";

interface AisImage { id: string; prompt: string; createdAt: string; url: string }

export function AisReferencePicker({ room, onPick }: { room: number; onPick: (file: File) => Promise<void> }) {
  const [list, setList] = useState<AisImage[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const toggle = async () => {
    if (list) { setList(null); return; }
    setBusy("list"); setError("");
    try {
      const res = await fetch("/api/music/ais-images", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "이미지 목록을 불러오지 못했습니다.");
      setList(d.images);
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };

  const pick = async (img: AisImage) => {
    if (room <= 0 || busy) return;
    setBusy(img.id); setError("");
    try {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      await onPick(new File([blob], `ai-image-studio-${img.id.slice(0, 8)}.${blob.type.includes("png") ? "png" : "jpg"}`, { type: blob.type || "image/jpeg" }));
    } catch { setError("이미지를 가져오지 못했습니다. 목록을 닫았다가 다시 열어 주세요(주소는 1시간 동안만 열립니다)."); } finally { setBusy(""); }
  };

  return (
    <div className="mt-2 space-y-2">
      <button type="button" className={BTN_GHOST} disabled={busy === "list"} onClick={() => void toggle()}>
        {busy === "list" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />}
        <span>{list ? "AI 이미지 목록 닫기" : "AI 이미지 스튜디오에서 가져오기"}</span>
      </button>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {list && (
        list.length === 0 ? (
          <p className="text-xs text-slate-400">
            최근 30일 동안 AI 이미지 스튜디오에서 만든 이미지가 없습니다. <a href={AIS_APP_URL} target="_blank" rel="noreferrer" className="text-cyan-300 underline">AI 이미지 스튜디오</a>에서 먼저 만들어 주세요.
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[11px] text-slate-400">{room > 0 ? `눌러서 참고 이미지에 추가합니다(${room}장 더 넣을 수 있음).` : "참고 이미지가 3장으로 가득 찼습니다. 하나를 지운 뒤 고르세요."}</p>
            <ul className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {list.map((img) => (
                <li key={img.id}>
                  <button type="button" disabled={room <= 0 || !!busy} onClick={() => void pick(img)} title={img.prompt}
                    className="relative block aspect-square w-full overflow-hidden rounded-lg border border-slate-800 bg-black hover:border-cyan-400 disabled:opacity-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.prompt ? `AI 이미지: ${img.prompt.slice(0, 40)}` : "AI 이미지"} className="h-full w-full object-cover" loading="lazy" />
                    {busy === img.id && <span className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" aria-hidden="true" /></span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
