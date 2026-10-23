"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import { ApiError, api, timeAgo } from "@/components/ui/api";
import { useConfirm } from "@/components/ui/Confirm";
import { useStudio, type SavedItem } from "./StudioContext";
import { formatTime, parseLyrics, type LyricLine } from "@/lib/lyrics";
import { plainSunoLyrics } from "@/lib/sunoAlign";
import { fetchSunoMedia } from "@/lib/sunoClient";

// v1.05 음악(SUNO) 자동화에서 만든 내 곡을 그대로 가져온다 — 음악·커버·제목 + Suno 시간 가사(본인 Suno 키).
// 시간 가사를 받지 못하면 가사 글만 넣고 「가사 싱크」에서 맞추게 한다. /source?suno=<변주 id>로 열면 자동 실행.
// v1.06 보관함에 저장한 변주는 「✓ 보관함」 — 누르면 그 작업을 연다(Suno 재조회 없음). 이번 접속에서 받은 변주도 다시 부르지 않는다.
const MUSIC_APP_URL = "https://music-automation.buylife.xyz";
type Variant = { id: string; duration: number | null; hasCover: boolean; canTime: boolean; saved: { id: string; title: string } | null };
type Track = { id: string; title: string; createdAt: string; variants: Variant[] };
type Note = { text: string; ok?: boolean; needSunoKey?: boolean } | null;

// 이번 접속에서 이미 받은 시간 가사(변주 번호 → 줄) — 같은 곡을 다시 골라도 Suno를 다시 부르지 않는다
const timedCache = new Map<string, LyricLine[]>();

export function SunoImportCard({ autoVariant }: { autoVariant?: string | null }) {
  const s = useStudio();
  const ask = useConfirm();
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[] | null>(null), [listError, setListError] = useState("");
  const [busy, setBusy] = useState(""), [note, setNote] = useState<Note>(null), [withTime, setWithTime] = useState(true);
  const [open, setOpen] = useState(false);
  const [cached, setCached] = useState<Set<string>>(() => new Set(timedCache.keys()));
  const autoDone = useRef(false);

  async function load() {
    setListError("");
    try { setTracks((await api<{ tracks: Track[] }>("/api/suno/tracks")).tracks); }
    catch (e) { setTracks([]); setListError(e instanceof Error ? e.message : "곡 목록을 불러오지 못했습니다."); }
  }
  useEffect(() => { void load(); }, []);

  // 보관함에 저장한 작업이 있으면 그 작업을 연다(가사 시간표는 저장된 것, 음악·커버는 열 때 자동으로 다시 받음)
  async function openSaved(saved: { id: string; title: string }) {
    if (s.dirty && !(await ask(`보관함의 「${saved.title}」 작업을 엽니다. 지금 저장하지 않은 변경은 사라집니다.`, { ok: "열기" }))) return;
    setNote(null);
    try {
      const { item } = await api<{ item: SavedItem }>(`/api/items?id=${saved.id}`);
      s.open(item); router.push("/source");
      setNote({ ok: true, text: `보관함의 「${saved.title}」 작업을 열었습니다. 저장된 가사 시간표를 쓰고, 음악·커버는 자동으로 다시 받습니다(Suno 조회 없음).` });
    } catch (e) { setNote({ text: e instanceof Error ? e.message : "보관함 작업을 열지 못했습니다." }); }
  }

  async function importVariant(id: string, title = "", saved: Variant["saved"] = null) {
    if (busy) return;
    if (saved) { await openSaved(saved); return; }
    if ((s.audio || s.lines.length) && !(await ask(`지금 작업을 ${title ? `「${title}」` : "이 곡"}으로 바꿀까요? 넣어 둔 음악·가사가 바뀝니다(보관함에 저장한 작업은 그대로 남습니다).`, { ok: "바꾸기" }))) return;
    setNote(null);
    try {
      const { info: v, audioFile, coverFile } = await fetchSunoMedia(id, setBusy);
      await s.loadAudio(audioFile, v.id);
      if (coverFile) await s.loadCover(coverFile).catch(() => {}); else s.clearCover();
      if (v.title) s.setTitle(v.title.slice(0, 80));

      const hit = timedCache.get(v.id);
      if (withTime && hit) { // 이번 접속에서 이미 받은 곡 — Suno를 다시 부르지 않는다
        s.setLines(hit.map((l) => ({ ...l })));
        setNote({ ok: true, text: `「${v.title || "곡"}」을 가져왔습니다. 이번 접속에서 이미 받은 시간 가사 ${hit.length}줄을 다시 썼습니다(Suno 조회 없음).` });
        return;
      }
      let timeError: Note = null;
      if (withTime && v.canTime) {
        setBusy("Suno에서 시간 맞춘 가사를 받는 중…");
        try {
          const { lines } = await api<{ lines: LyricLine[] }>("/api/suno/timed-lyrics", { body: { variantId: v.id } });
          s.setLines(lines);
          timedCache.set(v.id, lines.map((l) => ({ ...l }))); setCached(new Set(timedCache.keys()));
          setNote({ ok: true, text: `「${v.title || "곡"}」을 가져왔습니다. Suno 시간 가사 ${lines.length}줄이 들어갔습니다 — 「가사 싱크」에서 재생해 보고 어긋난 줄만 고치면 됩니다. 「💾 저장」해 두면 다음에는 Suno를 다시 부르지 않습니다.` });
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
    if (!autoVariant || autoDone.current || tracks === null) return; // 목록을 먼저 받아 보관함에 있는지 확인한다
    autoDone.current = true; setOpen(true);
    const saved = tracks.flatMap((t) => t.variants).find((v) => v.id === autoVariant)?.saved ?? null;
    void importVariant(autoVariant, "", saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVariant, tracks]);

  const count = tracks?.length ?? 0;
  return (
    <section className="card stack suno-import">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>🎼 음악(SUNO) 자동화 곡 가져오기</h2>
        <button type="button" className="link-button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "접기" : tracks === null ? "불러오는 중…" : `내 곡 ${count}개 보기`}</button>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>음악(SUNO) 자동화에서 만든 곡을 음악·커버·제목까지 한 번에 넣고, <strong>Suno가 기록한 단어별 시각으로 가사 시간도 자동으로 맞춥니다</strong>(본인 Suno API 키 사용 · 곡을 고를 때 1번만 조회). 「✓ 보관함」은 저장해 둔 작업을 열고, 「✓ 받음」은 이번 접속에서 받은 가사를 다시 써서 Suno를 다시 부르지 않습니다.</p>
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
                      <button key={v.id} type="button" className={v.saved ? "primary" : undefined} disabled={!!busy} onClick={() => void importVariant(v.id, t.title, v.saved)}
                        title={v.saved ? `보관함의 「${v.saved.title}」 작업을 엽니다(Suno 조회 없음)` : cached.has(v.id) ? "이번 접속에서 받은 시간 가사를 다시 씁니다(Suno 조회 없음)" : v.canTime ? "음악·커버·시간 가사를 가져옵니다" : "시간 가사 없이 음악·가사 글을 가져옵니다"}>
                        변주 {i + 1}{v.duration ? ` · ${formatTime(v.duration, false)}` : ""}{v.saved ? " · ✓ 보관함" : cached.has(v.id) ? " · ✓ 받음" : v.canTime ? "" : " · 시간 없음"}
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
