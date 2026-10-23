"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/api";
import { useConfirm } from "@/components/ui/Confirm";
import { Message } from "@/components/ui/Message";
import type { Msg } from "@/components/ui/api";
import { useStudio } from "./StudioContext";
import { newId, parseLyrics, type LyricLine } from "@/lib/lyrics";
import { plainSunoLyrics } from "@/lib/sunoAlign";
import type { AmsTimedLine } from "@/lib/amsLyrics";

// v1.10 AI 음악 스튜디오 곡 카드의 「가사 영상 만들기」(/source?ams=<생성 번호>&i=<곡 순서>)로 들어오면 한 번만 가져온다.
// 음악은 저장소 서명 주소에서 받아 이 브라우저에서만 쓰고, Lyria 시간 가사가 있으면 그 시간을 그대로 넣는다(외부 AI 호출 없음).
type Song = { id: string; title: string; lyrics: string; audioUrl: string; timedLines: AmsTimedLine[] | null; instrumental: boolean };
const AMS_APP_URL = "https://ai-music-studio.buylife.xyz";
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 60) || "ai-music";

export function AmsImportCard({ request }: { request: { id: string; index: number } | null }) {
  const s = useStudio();
  const ask = useConfirm();
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!request || done.current) return;
    done.current = true;
    void (async () => {
      if ((s.audio || s.lines.length) && !(await ask("AI 음악 스튜디오에서 보낸 곡으로 지금 작업을 바꿀까요? 넣어 둔 음악·가사가 바뀝니다.", { ok: "바꾸기" }))) return;
      try {
        setBusy("곡 정보를 확인하는 중…");
        const { song } = await api<{ song: Song }>(`/api/ams/song?id=${request.id}&i=${request.index}`);
        setBusy("음악 파일을 받는 중…");
        const res = await fetch(song.audioUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`음악 파일을 받지 못했습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
        const blob = await res.blob();
        const type = blob.type && blob.type !== "application/octet-stream" ? blob.type : "audio/mpeg";
        const ext = /wav/.test(type) ? "wav" : /ogg/.test(type) ? "ogg" : /mp4|m4a|aac/.test(type) ? "m4a" : "mp3";
        await s.loadAudio(new File([blob], `${safeName(song.title)}.${ext}`, { type }), null);
        s.clearCover();
        s.setTitle(song.title);
        let note: string;
        if (song.timedLines?.length) {
          s.setLines(song.timedLines.map((l): LyricLine => ({ id: newId(), start: l.start, end: l.end, text: l.text })));
          note = `시간이 맞춰진 가사 ${song.timedLines.length}줄이 들어갔습니다 — 「가사 싱크」에서 재생해 보고 어긋난 줄만 고치면 됩니다.`;
        } else if (song.lyrics.trim()) {
          s.setLines(parseLyrics(plainSunoLyrics(song.lyrics)).lines);
          note = "가사 글이 들어갔습니다 — 다음 단계 「가사 싱크」에서 시간을 맞춰 주세요.";
        } else {
          s.setLines([]);
          note = song.instrumental ? "연주곡이라 가사가 없습니다. 필요하면 가사를 직접 넣어 주세요." : "가사가 없는 곡입니다. 가사를 직접 넣어 주세요.";
        }
        setMsg({ ok: true, text: `AI 음악 스튜디오의 「${song.title}」을 가져왔습니다. ${note}` });
      } catch (e) {
        setMsg({ text: e instanceof Error ? e.message : "곡을 가져오지 못했습니다." });
      } finally { setBusy(""); }
    })();
  }, [request, s, ask]);

  if (!request) return null;
  return (
    <section className="card stack">
      <h2>🎧 AI 음악 스튜디오에서 보낸 곡</h2>
      {busy && <div className="notice">{busy}</div>}
      <Message msg={msg} />
      <a className="link-button" href={`${AMS_APP_URL}/library`} target="_blank" rel="noreferrer">AI 음악 스튜디오 보관함 열기 ↗</a>
    </section>
  );
}
