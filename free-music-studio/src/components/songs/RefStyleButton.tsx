"use client";

// 참고곡 → 음악 스타일 칸(백로그 D-9, 2026-11-09). 파일은 이 브라우저에서 60초 조각으로 줄여 회원 Gemini 키로 한 번 보낸다(저장 안 함).
import { useRef, useState } from "react";
import { Headphones, Loader2 } from "lucide-react";
import { extractRefAudio } from "@/lib/refAudio";

export function RefStyleButton({ instrumental, model, style, onStyle }: { instrumental: boolean; model: string; style: string; onStyle: (s: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (file: File) => {
    setNote(null);
    try {
      setBusy("참고곡을 줄이는 중…");
      const cut = await extractRefAudio(file);
      setBusy(`Gemini가 ${cut.seconds}초 조각을 듣는 중…`);
      const res = await fetch("/api/style-from-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: cut.data, instrumental, model }),
      });
      const d = (await res.json().catch(() => ({}))) as { style?: string; bpm?: number | null; hasVocals?: boolean; error?: string };
      if (!res.ok || !d.style) throw new Error(d.error || "참고곡 스타일을 읽지 못했습니다.");
      if (style.trim() && style.trim() !== d.style && !confirm(`음악 스타일 칸을 참고곡에서 읽은 스타일로 바꿀까요?\n\n${d.style}`)) {
        setNote({ ok: true, text: "읽은 스타일을 넣지 않았습니다." });
        return;
      }
      onStyle(d.style);
      setNote({ ok: true, text: `「${file.name}」에서 스타일을 읽어 넣었습니다${d.bpm ? ` · 약 ${d.bpm} BPM` : ""}${instrumental ? "" : d.hasVocals ? " · 보컬 있음" : " · 보컬은 확실하지 않아 넣지 않음"}. 멜로디·가사는 가져오지 않습니다.` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "참고곡 스타일을 읽지 못했습니다." });
    } finally {
      setBusy("");
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={!!busy}
        onClick={() => input.current?.click()}
        title="참고곡 파일의 60초 조각을 회원님 Gemini 키로 한 번 들려주고, 비슷한 스타일 태그를 받아 아래 칸에 넣습니다(파일은 저장하지 않음)"
        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 px-2 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-950/40 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Headphones className="h-3.5 w-3.5" />} {busy || "참고곡으로 스타일 만들기"}
      </button>
      <input
        ref={input}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void run(f);
        }}
      />
      {note && <span className={`text-[11px] ${note.ok ? "text-emerald-300" : "text-rose-300"}`}>{note.text}</span>}
      {!note && !busy && <span className="text-[11px] text-slate-500">Gemini 키 1번 · 파일 저장 안 함</span>}
    </span>
  );
}
