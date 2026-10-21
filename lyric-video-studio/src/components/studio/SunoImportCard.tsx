"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { ApiError, api, timeAgo } from "@/components/ui/api";
import { useConfirm } from "@/components/ui/Confirm";
import { useStudio } from "./StudioContext";
import { formatTime, parseLyrics, type LyricLine } from "@/lib/lyrics";
import { plainSunoLyrics } from "@/lib/sunoAlign";

// v1.05 음악(SUNO) 자동화에서 만든 내 곡을 그대로 가져온다 — 음악·커버·제목 + Suno 시간 가사(본인 Suno 키).
// 시간 가사를 받지 못하면 가사 글만 넣고 「가사 싱크」에서 맞추게 한다. /source?suno=<변주 id>로 열면 자동 실행.
const MUSIC_APP_URL = "https://music-automation.buylife.xyz";
type Variant = { id: string; duration: number | null; hasCover: boolean; canTime: boolean };
type Track = { id: string; title: string; createdAt: string; variants: Variant[] };
type VariantInfo = { id: string; title: string; lyrics: string; audioUrl: string; coverUrl: string | null; canTime: boolean };
type Note = { text: string; ok?: boolean; needSunoKey?: boolean } | null;

const extOf = (type: string) => (/wav/.test(type) ? "wav" : /ogg/.test(type) ? "ogg" : /mp4|m4a|aac/.test(type) ? "m4a" : "mp3");
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 60) || "suno-song";

async function download(url: string, what: string): Promise<Blob> {
  let res: Response;
  try { res = await fetch(url, { cache: "no-store" }); } catch { throw new Error(`${what}을 받지 못했습니다. 네트워크를 확인해 주세요.`); }
  if (!res.ok) throw new Error(`${what}을 받지 못했습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
  return res.blob();
}

export function SunoImportCard({ autoVariant }: { autoVariant?: string | null }) {
  const s = useStudio();
  const ask = useConfirm();
  const [tracks, setTracks] = useState<Track[] | null>(null), [listError, setListError] = useState("");
  const [busy, setBusy] = useState(""), [note, setNote] = useState<Note>(null), [withTime, setWithTime] = useState(true);
  const [open, setOpen] = useState(false);
  const autoDone = useRef(false);

  async function load() {
    setListError("");
    try { setTracks((await api<{ tracks: Track[] }>("/api/suno/tracks")).tracks); }
    catch (e) { setTracks([]); setListError(e instanceof Error ? e.message : "곡 목록을 불러오지 못했습니다."); }
  }
  useEffect(() => { void load(); }, []);

  async function importVariant(id: string, title = "") {
    if (busy) return;
    if ((s.audio || s.lines.length) && !(await ask(`지금 작업을 ${title ? `「${title}」` : "이 곡"}으로 바꿀까요? 넣어 둔 음악·가사가 바뀝니다(보관함에 저장한 작업은 그대로 남습니다).`, { ok: "바꾸기" }))) return;
    setNote(null);
    try {
      setBusy("곡 정보를 확인하는 중…");
      const v = (await api<{ variant: VariantInfo }>(`/api/suno/tracks?variant=${id}`)).variant;
      setBusy("음악 파일을 받는 중…");
      const audio = await download(v.audioUrl, "음악 파일");
      const type = audio.type && audio.type !== "application/octet-stream" ? audio.type : "audio/mpeg";
      await s.loadAudio(new File([audio], `${safeName(v.title)}.${extOf(type)}`, { type }));
      if (v.coverUrl) {
        try { const img = await download(v.coverUrl, "커버"); if (/^image\//.test(img.type)) await s.loadCover(new File([img], `${safeName(v.title)}-cover.${img.type.split("/")[1] || "jpg"}`, { type: img.type })); }
        catch { /* 커버는 없어도 된다 */ }
      } else s.clearCover();
      if (v.title) s.setTitle(v.title.slice(0, 80));

      let timeError: Note = null;
      if (withTime && v.canTime) {
        setBusy("Suno에서 시간 맞춘 가사를 받는 중…");
        try {
          const { lines } = await api<{ lines: LyricLine[] }>("/api/suno/timed-lyrics", { body: { variantId: v.id } });
          s.setLines(lines);
          setNote({ ok: true, text: `「${v.title || "곡"}」을 가져왔습니다. Suno 시간 가사 ${lines.length}줄이 들어갔습니다 — 「가사 싱크」에서 재생해 보고 어긋난 줄만 고치면 됩니다.` });
          return;
        } catch (e) {
          timeError = { text: e instanceof Error ? e.message : "시간 가사를 받지 못했습니다.", needSunoKey: /Suno API 키/.test(e instanceof ApiError ? e.message : "") };
        }
      }
      const plain = parseLyrics(plainSunoLyrics(v.lyrics)).lines;
      s.setLines(plain);
      const base = `「${v.title || "곡"}」의 음악을 가져왔습니다. 가사 글 ${plain.length}줄을 넣었으니 「가사 싱크」에서 시간을 맞춰 주세요.`;
      setNote(timeError ? { ...timeError, text: `${base} (시간 가사: ${timeError.text})` } : { ok: true, text: base });
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : "곡을 가져오지 못했습니다. 다시 시도해 주세요." });
    } finally { setBusy(""); }
  }

  // 음악(SUNO) 자동화 곡 카드의 「가사 영상 만들기 →」로 들어온 경우
  useEffect(() => {
    if (!autoVariant || autoDone.current) return;
    autoDone.current = true; setOpen(true);
    void importVariant(autoVariant);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVariant]);

  const count = tracks?.length ?? 0;
  return (
    <section className="card stack suno-import">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>🎼 음악(SUNO) 자동화 곡 가져오기</h2>
        <button type="button" className="link-button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "접기" : tracks === null ? "불러오는 중…" : `내 곡 ${count}개 보기`}</button>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>음악(SUNO) 자동화에서 만든 곡을 음악·커버·제목까지 한 번에 넣고, <strong>Suno가 기록한 단어별 시각으로 가사 시간도 자동으로 맞춥니다</strong>(본인 Suno API 키 사용 · 곡을 고를 때 1번만 조회).</p>
      {busy && <div className="notice" aria-live="polite">⏳ {busy}</div>}
      {note && (
        <div role="status" className={`notice ${note.ok ? "success" : "warning"}`}>
          {note.text}
          {note.needSunoKey && <> <a className="subtle-link" href={`${MUSIC_APP_URL}/settings`} target="_blank" rel="noreferrer">🔑 음악(SUNO) 자동화에서 키 등록 →</a></>}
        </div>
      )}
      {open && (
        <div className="stack" style={{ gap: 8 }}>
          <label className="toggle"><input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} />Suno 시간 가사도 함께 받기 <small className="muted">— 끄면 가사 글만 넣고 직접 맞춥니다</small></label>
          {listError && <div className="notice error-box">{listError}</div>}
          {tracks !== null && !count && !listError && (
            <div className="notice">아직 가져올 곡이 없습니다. 음악(SUNO) 자동화에서 보컬 곡을 만들면 여기에 나옵니다. <a className="subtle-link" href={`${MUSIC_APP_URL}/plannings`} target="_blank" rel="noreferrer">곡 만들러 가기 <ExternalLink size={12} /></a></div>
          )}
          {!!count && (
            <div className="list suno-list">
              {tracks!.map((t) => (
                <div key={t.id} className="list-item">
                  <span><strong>{t.title}</strong> <small className="muted">· {timeAgo(t.createdAt)}</small></span>
                  <span className="row" style={{ gap: 6 }}>
                    {t.variants.map((v, i) => (
                      <button key={v.id} type="button" disabled={!!busy} onClick={() => void importVariant(v.id, t.title)} title={v.canTime ? "음악·커버·시간 가사를 가져옵니다" : "시간 가사 없이 음악·가사 글을 가져옵니다"}>
                        변주 {i + 1}{v.duration ? ` · ${formatTime(v.duration, false)}` : ""}{v.canTime ? "" : " · 시간 없음"}
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="actions"><button type="button" className="link-button" onClick={() => void load()} disabled={!!busy}><RefreshCw size={13} />목록 새로고침</button></div>
        </div>
      )}
    </section>
  );
}
