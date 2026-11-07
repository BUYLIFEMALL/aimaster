"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/components/ui/api";
import { useConfirm } from "@/components/ui/Confirm";
import { Message } from "@/components/ui/Message";
import type { Msg } from "@/components/ui/api";
import { useStudio } from "./StudioContext";
import { newId, parseLyrics, type LyricLine } from "@/lib/lyrics";
import { plainSunoLyrics } from "@/lib/sunoAlign";
import type { FmsTimedLine } from "@/lib/fmsLyrics";

// v1.13 AI 무료음악 자동화 「모든 음악」 곡 메뉴의 「가사 영상 만들기」(/source?fms=<곡 번호>)로 들어오면 한 번만 가져온다.
// 제목·가사·가사 시간은 서버(공용 DB, 회원 본인 곡만)에서, 음원은 회원 PC 엔진에만 있으므로 이 창을 연 무료음악 창이
// 브라우저 안에서 건네준다(postMessage — 서버로 올리지 않음). 순서: 이 창 → 「lvs-ready」 → 무료음악 창 → 「fms-audio」(파일).
type Song = { id: string; title: string; lyrics: string; timedLines: FmsTimedLine[] | null; instrumental: boolean };
const FMS_ORIGINS = ["https://free-music-studio.buylife.xyz", "https://free-music-studio.vercel.app"];
const FMS_APP_URL = FMS_ORIGINS[0];
const WAIT_MS = 30_000;

export function FmsImportCard({ trackId }: { trackId: string | null }) {
  const s = useStudio();
  const ask = useConfirm();
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null), [audioMsg, setAudioMsg] = useState<Msg>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!trackId || done.current) return;
    done.current = true;
    let title = "";
    // 음원 받기 — 무료음악 창이 보내 주기를 기다린다
    const onMessage = async (e: MessageEvent) => {
      if (!FMS_ORIGINS.includes(e.origin) || e.source !== window.opener) return;
      const d = e.data as { type?: string; id?: string; name?: string; blob?: Blob } | null;
      if (d?.type !== "fms-audio" || d.id !== trackId || !(d.blob instanceof Blob)) return;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      try {
        const type = d.blob.type && d.blob.type !== "application/octet-stream" ? d.blob.type : "audio/mpeg";
        await s.loadAudio(new File([d.blob], d.name || `${title || "free-music"}.mp3`, { type }), null);
        setAudioMsg({ ok: true, text: `내 PC 엔진에서 음악 파일을 받았습니다: ${d.name}` });
      } catch (err) {
        setAudioMsg({ text: err instanceof Error ? err.message : "음악 파일을 읽지 못했습니다. 아래 「음악 파일」 칸에 직접 넣어 주세요." });
      }
    };
    window.addEventListener("message", onMessage);
    let timer = 0; // 「준비됨」을 보낸 뒤부터 센다(확인 창에서 기다린 시간은 빼고)

    void (async () => {
      if ((s.audio || s.lines.length) && !(await ask("AI 무료음악 자동화에서 보낸 곡으로 지금 작업을 바꿀까요? 넣어 둔 음악·가사가 바뀝니다.", { ok: "바꾸기" }))) {
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timer);
        return;
      }
      try {
        setBusy("곡 정보를 확인하는 중…");
        const { song } = await api<{ song: Song }>(`/api/fms/song?id=${trackId}`);
        title = song.title;
        s.clearCover();
        s.setTitle(song.title);
        let note: string;
        if (song.timedLines?.length) {
          s.setLines(song.timedLines.map((l): LyricLine => ({ id: newId(), start: l.start, end: l.end, text: l.text })));
          note = `가사 시간이 맞춰진 ${song.timedLines.length}줄이 들어갔습니다 — 「가사 싱크」에서 재생해 보고 어긋난 줄만 고치면 됩니다.`;
        } else if (song.lyrics) {
          s.setLines(parseLyrics(plainSunoLyrics(song.lyrics)).lines);
          note = "가사 글이 들어갔습니다 — 다음 단계 「가사 싱크」에서 시간을 맞춰 주세요(무료음악 「가사 시간」에서 먼저 맞춰 두면 바로 들어옵니다).";
        } else {
          s.setLines([]);
          note = song.instrumental ? "연주곡이라 가사가 없습니다. 필요하면 가사를 직접 넣어 주세요." : "가사가 없는 곡입니다. 가사를 직접 넣어 주세요.";
        }
        setMsg({ ok: true, text: `AI 무료음악 자동화의 「${song.title}」을 가져왔습니다. ${note}` });
        // 무료음악 창에 「준비됨」을 알려 음원을 보내게 한다(이 창이 그 창에서 열렸을 때만)
        if (window.opener) {
          setAudioMsg({ text: "내 PC 엔진에서 음악 파일을 받는 중…" });
          timer = window.setTimeout(() => {
            window.removeEventListener("message", onMessage);
            setAudioMsg({ text: `음악 파일이 오지 않았습니다. 내 PC 「노래 저장 폴더」의 「${song.title}」 파일을 아래 「음악 파일」 칸에 직접 넣어 주세요.` });
          }, WAIT_MS);
          for (const o of FMS_ORIGINS) window.opener.postMessage({ type: "lvs-ready", id: trackId }, o);
        } else setAudioMsg({ text: `이 창이 무료음악 화면에서 열리지 않아 음악 파일을 받을 수 없습니다. 내 PC 「노래 저장 폴더」의 「${song.title}」 파일을 아래에 직접 넣어 주세요.` });
      } catch (e) {
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timer);
        setMsg({ text: e instanceof Error ? e.message : "곡을 가져오지 못했습니다." });
      } finally { setBusy(""); }
    })();
  }, [trackId, s, ask]);

  if (!trackId) return null;
  return (
    <section className="card stack">
      <h2>🎵 AI 무료음악 자동화에서 보낸 곡</h2>
      {busy && <div className="notice">{busy}</div>}
      <Message msg={msg} />
      <Message msg={audioMsg} />
      <a className="link-button" href={`${FMS_APP_URL}/library`} target="_blank" rel="noreferrer">AI 무료음악 「모든 음악」 열기 ↗</a>
    </section>
  );
}
