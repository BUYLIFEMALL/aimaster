"use client";
import { useState } from "react";
import Link from "next/link";
import { useStudio } from "@/components/studio/StudioContext";
import { FileDrop, StudioBar } from "@/components/studio/parts";
import { Message } from "@/components/ui/Message";
import { useConfirm } from "@/components/ui/Confirm";
import type { Msg } from "@/components/ui/api";
import { allSynced, formatTime, isSynced, parseLyrics, type ParseResult } from "@/lib/lyrics";

const SOURCE_LABEL: Record<ParseResult["source"], string> = { srt: "자막 파일(.srt)", lrc: "가사 시간 파일(.lrc)", text: "가사 글" };

export function SourceView() {
  const s = useStudio();
  const ask = useConfirm();
  const [text, setText] = useState(""), [msg, setMsg] = useState<Msg>(null), [lyricMsg, setLyricMsg] = useState<Msg>(null);
  const synced = s.lines.filter(isSynced).length;

  async function onAudio(f: File) {
    setMsg(null);
    if (!/^audio\//.test(f.type) && !/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm)$/i.test(f.name)) { setMsg({ text: "음악 파일(mp3·wav·m4a·ogg·flac)을 넣어 주세요." }); return; }
    if (f.size > 200 * 1024 * 1024) { setMsg({ text: "음악 파일이 너무 큽니다(200MB 이하)." }); return; }
    try { await s.loadAudio(f); setMsg({ text: `음악을 넣었습니다: ${f.name}`, ok: true }); } catch (e) { setMsg({ text: e instanceof Error ? e.message : "음악 파일을 읽지 못했습니다." }); }
  }
  async function onCover(f: File) {
    setMsg(null);
    if (!/^image\//.test(f.type)) { setMsg({ text: "이미지 파일(jpg·png·webp)을 넣어 주세요." }); return; }
    try { await s.loadCover(f); } catch (e) { setMsg({ text: e instanceof Error ? e.message : "이미지를 읽지 못했습니다." }); }
  }
  async function apply(raw: string, name = "") {
    const replace = s.lines.length > 0;
    if (replace && !(await ask("지금 가사를 새 가사로 바꿀까요? 맞춰 둔 시간도 바뀝니다.", { ok: "바꾸기" }))) return;
    const r = parseLyrics(raw, name);
    if (!r.lines.length) { setLyricMsg({ text: "가사를 한 줄도 읽지 못했습니다. 파일이 비어 있거나 형식이 다릅니다." }); return; }
    s.setLines(r.lines);
    const timed = r.lines.every(isSynced);
    setLyricMsg({ ok: true, text: `${SOURCE_LABEL[r.source]}에서 ${r.lines.length}줄을 읽었습니다${r.skipped ? ` (읽지 못한 부분 ${r.skipped}곳은 건너뜀)` : ""}. ${timed ? "시간이 들어 있어 바로 디자인으로 가도 됩니다." : "다음 단계 「가사 싱크」에서 시간을 맞춰 주세요."}` });
  }
  async function onLyricFile(f: File) {
    if (f.size > 512 * 1024) { setLyricMsg({ text: "가사 파일이 너무 큽니다(512KB 이하)." }); return; }
    const buf = await f.arrayBuffer();
    let raw = new TextDecoder("utf-8").decode(buf);
    if (raw.includes("�")) { try { raw = new TextDecoder("euc-kr").decode(buf); } catch { /* 그대로 */ } } // 메모장 옛 저장(ANSI) 대비
    await apply(raw, f.name);
  }

  return (
    <div className="stack">
      <StudioBar />
      <div className="page-heading"><p className="eyebrow">STEP 1</p><h1>🎵 음악·가사 넣기</h1><p>음악 파일과 가사를 넣습니다. 파일은 이 컴퓨터 브라우저에서만 쓰이고 서버로 올라가지 않습니다.</p></div>
      <div className="grid2">
        <section className="card stack">
          <h2>음악 · 커버</h2>
          <FileDrop accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" label={s.audioBusy || "🎧 음악 파일 (필수)"} hint="mp3·wav·m4a·ogg·flac — 끌어다 놓거나 눌러서 고르기" current={s.audio ? `${s.audio.name} · ${formatTime(s.audio.buffer.duration, false)}` : undefined} onFile={(f) => void onAudio(f)} />
          {!s.audio && s.savedNames.audioName && <div className="notice warning">저장된 작업입니다. 음악 파일 「{s.savedNames.audioName}」을 다시 넣어 주세요.</div>}
          <FileDrop accept="image/*" label="🖼️ 앨범 커버 (선택)" hint="jpg·png·webp — 없으면 색과 제목 첫 글자로 만듭니다" current={s.cover?.name} onFile={(f) => void onCover(f)} />
          {s.cover && <div className="row"><img src={s.cover.url} alt="커버 미리보기" className="cover-thumb" /><button type="button" className="link-button" onClick={s.clearCover}>커버 빼기</button></div>}
          <Message msg={msg} />
          <div className="field-grid two">
            <label>곡 제목<input value={s.title} maxLength={80} onChange={(e) => s.setTitle(e.target.value)} placeholder="예: 밤의 끝" /></label>
            <label>아티스트<input value={s.artist} maxLength={60} onChange={(e) => s.setArtist(e.target.value)} placeholder="예: 리릭" /></label>
          </div>
        </section>
        <section className="card stack">
          <h2>가사</h2>
          <FileDrop accept=".srt,.lrc,.txt,text/plain" label="📄 가사 파일 넣기" hint=".srt(자막) · .lrc(가사 시간) · .txt(가사 글)" onFile={(f) => void onLyricFile(f)} />
          <label>또는 가사 붙여넣기<textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={"한 줄에 한 소절씩 적어 주세요.\n빈 줄은 무시합니다.\n시간이 붙은 .srt·.lrc 내용을 붙여넣어도 됩니다."} /></label>
          <div className="actions"><button type="button" onClick={() => void apply(text)} disabled={!text.trim()}>가사 적용</button></div>
          <Message msg={lyricMsg} />
          {s.lines.length > 0 && (
            <div className="notice">
              지금 가사 <strong>{s.lines.length}줄</strong> · 시간 맞춘 줄 <strong>{synced}줄</strong>
              <ol className="lyric-peek">{s.lines.slice(0, 5).map((l) => <li key={l.id}><span className="mono">{isSynced(l) ? formatTime(l.start) : "--:--"}</span> {l.text.replace(/\n/g, " / ")}</li>)}</ol>
              {s.lines.length > 5 && <small>… 외 {s.lines.length - 5}줄</small>}
            </div>
          )}
        </section>
      </div>
      <div className="actions" style={{ justifyContent: "flex-end" }}>
        {allSynced(s.lines) && <Link className="button" href="/design">시간이 다 있습니다 — 디자인으로 →</Link>}
        <Link className="button primary" href="/sync">다음: 가사 싱크 →</Link>
      </div>
    </div>
  );
}
