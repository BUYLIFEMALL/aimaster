"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Upload } from "lucide-react";
import { api, toMsg, type Msg } from "@/components/ui/api";
import { Message } from "@/components/ui/Message";
import { useStudio } from "./StudioContext";
import { uploadDefaults, uploadToYoutube, type Privacy, type UploadRecord } from "@/lib/youtube/browserUpload";

// v1.04 만든 MP4를 내 유튜브 채널에 올리기(shorts-onestop-studio YoutubeUploadCard를 가사영상에 맞게 줄임).
// 유튜브 연결은 다른 유튜브 프로그램에서 한 번 연결한 공용 계정을 그대로 쓴다(회원 본인 Google 앱·본인 채널만).
type Status = { state: "ok" | "not_connected" | "no_scope" | "no_keys" | "other_app" | "reconnect"; channelTitle: string | null; message: string; connectPrograms: { name: string; url: string }[]; channels?: { id: string; title: string; canUpload: boolean }[]; accountId?: string | null };
const PRIVACY: { id: Privacy; name: string }[] = [
  { id: "private", name: "비공개(나만 보기 — 확인 뒤 직접 공개)" },
  { id: "unlisted", name: "일부 공개(링크가 있는 사람만)" },
  { id: "public", name: "공개(바로 모두에게)" },
];
const CATEGORIES = [{ id: "10", name: "음악" }, { id: "24", name: "엔터테인먼트" }, { id: "22", name: "인물·블로그" }];
const PRIVACY_LABEL: Record<Privacy, string> = { private: "비공개", unlisted: "일부 공개", public: "공개" };
type Thumb = { url: string; dataUrl: string; size: number };

/** v1.07 배경 그림 → 유튜브 썸네일(1280×720 JPG, 2MB 이하, 플레이리스트 v1.23에서 옮김). 비율이 다르면 가운데를 잘라 맞춘다 */
async function makeThumbnail(bgUrl: string): Promise<Thumb> {
  const img = await createImageBitmap(await (await fetch(bgUrl)).blob());
  const c = document.createElement("canvas"); c.width = 1280; c.height = 720;
  const g = c.getContext("2d")!;
  const sc = Math.max(1280 / img.width, 720 / img.height), w = img.width * sc, h = img.height * sc;
  g.drawImage(img, (1280 - w) / 2, (720 - h) / 2, w, h);
  for (const q of [0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", q));
    if (blob && blob.size <= 2 * 1024 * 1024) {
      const dataUrl = await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(blob); });
      return { url: URL.createObjectURL(blob), dataUrl, size: blob.size };
    }
  }
  throw new Error("썸네일이 2MB를 넘어 만들지 못했습니다.");
}

export function YoutubeUploadCard({ blob, disabled }: { blob: Blob | null; disabled: boolean }) {
  const s = useStudio();
  const portrait = s.design.aspect === "portrait";
  const [status, setStatus] = useState<Status | null>(null);
  const [form, setForm] = useState(() => ({ ...uploadDefaults({ title: s.title, artist: s.artist, lines: s.lines, portrait }), privacy: "private" as Privacy, categoryId: "10", schedule: false, publishAt: "" }));
  const [picked, setPicked] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null), [msg, setMsg] = useState<Msg>(null), [done, setDone] = useState<UploadRecord[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const video = blob ?? picked;
  const coverUrl = s.cover?.url ?? null;
  const [thumb, setThumb] = useState<Thumb | null>(null), [useThumb, setUseThumb] = useState(true);
  // v1.09 「AI 썸네일·SEO 자동화」에서 만든 내 썸네일을 골라 쓸 수 있다(고르면 배경 그림 대신 그 그림을 1280×720으로 맞춰 지정)
  const [picks, setPicks] = useState<{ id: string; name: string; option: "A" | "B"; url: string }[] | null>(null), [picksMsg, setPicksMsg] = useState("");
  const [chosen, setChosen] = useState<{ name: string; url: string } | null>(null);
  const thumbSrc = chosen?.url ?? coverUrl;
  useEffect(() => { // v1.07 배경 그림이 있으면 썸네일을 미리 만들어 둔다
    let alive = true; setThumb(null);
    if (thumbSrc) void makeThumbnail(thumbSrc).then((t) => { if (alive) setThumb(t); }).catch(() => { if (alive) setPicksMsg("그림을 불러오지 못했습니다. 목록을 다시 열어 주세요(주소는 1시간 동안만 쓸 수 있습니다)."); });
    return () => { alive = false; };
  }, [thumbSrc]);
  async function loadPicks() {
    setPicksMsg(""); setPicks(null);
    try { setPicks((await api<{ picks: { id: string; name: string; option: "A" | "B"; url: string }[] }>("/api/youtube/thumbnail-picks")).picks ?? []); }
    catch (e) { setPicksMsg(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."); setPicks([]); }
  }

  async function check(account: string | null = status?.accountId ?? null) { // v1.08 채널이 여럿이면 고른 채널 상태
    setStatus(null);
    try { setStatus(await api<Status>(`/api/youtube/status${account ? `?account=${account}` : ""}`)); } catch (e) { setMsg(toMsg(e)); }
  }
  useEffect(() => { void check(); }, []);

  async function upload() {
    if (!video || pct !== null) return;
    setMsg(null); setPct(0);
    try {
      const publishAt = form.schedule && form.publishAt ? new Date(form.publishAt).toISOString() : null;
      if (form.schedule && !publishAt) throw new Error("예약 공개 날짜와 시각을 정해 주세요.");
      const rec = await uploadToYoutube({ blob: video, title: form.title, description: form.description, tags: form.tags, privacy: form.privacy, categoryId: form.categoryId, publishAt, portrait, onPct: setPct, accountId: status?.accountId ?? null });
      setDone((d) => [rec, ...d]);
      let thumbNote = "";
      if (useThumb && thumb && !portrait) { // 쇼츠(세로)는 유튜브가 앱에서만 썸네일을 바꾸게 해 지정하지 않는다
        try {
          const r = await fetch("/api/youtube/thumbnail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId: rec.videoId, image: thumb.dataUrl, accountId: status?.accountId ?? null }) });
          const d = (await r.json().catch(() => ({}))) as { error?: string };
          thumbNote = r.ok ? " 썸네일도 배경 그림으로 지정했습니다." : ` 썸네일은 지정하지 못했습니다: ${d.error ?? r.status}`;
        } catch { thumbNote = " 썸네일은 지정하지 못했습니다(연결 오류). 썸네일을 내려받아 유튜브 스튜디오에서 넣어 주세요."; }
      }
      setMsg({ text: (publishAt ? `유튜브에 올렸습니다. ${new Date(publishAt).toLocaleString("ko-KR")}에 공개됩니다(그때까지 비공개). 처리에 몇 분 걸릴 수 있습니다.` : `유튜브에 ${PRIVACY_LABEL[form.privacy]}로 올렸습니다. 유튜브가 영상을 처리하는 데 몇 분 걸릴 수 있습니다.`) + thumbNote, ok: true });
    } catch (e) {
      setMsg(e instanceof Error && !(e as { needKey?: boolean }).needKey ? { text: e.message } : toMsg(e));
      if (e instanceof Error && /연결|만료|권한|Client ID/.test(e.message)) void check();
    } finally { setPct(null); }
  }

  const ok = status?.state === "ok";
  return (
    <section className="card stack">
      <h2>📤 유튜브에 올리기</h2>
      <p className="muted" style={{ fontSize: 12 }}>만든 MP4를 내 유튜브 채널에 바로 올립니다. 영상은 이 브라우저에서 유튜브로 직접 보내지고(서버 요금 없음), 유튜브 연결은 다른 유튜브 프로그램에서 한 번 연결한 계정을 그대로 씁니다. 처음에는 <strong>비공개</strong>로 올려 확인한 뒤 공개하는 것을 권합니다.</p>
      <Message msg={msg} />
      {(status?.channels?.length ?? 0) > 1 && ( // v1.08 채널이 여러 개면 올릴 채널을 고른다(연결 상태가 나빠도 다른 채널로 바꿀 수 있게 항상 표시)
        <label>✅ 올릴 채널<select value={status!.accountId ?? ""} disabled={pct !== null} onChange={(e) => void check(e.target.value)}>
          {status!.channels!.map((c) => <option key={c.id} value={c.id}>{c.title}{c.canUpload ? "" : " (다시 연결 필요)"}</option>)}
        </select></label>
      )}
      {!status ? <small className="muted">유튜브 연결을 확인하는 중…</small> : ok ? (
        <div className="row" style={{ justifyContent: "space-between" }}><span className="badge brand">✅ 연결된 채널: {status.channelTitle ?? "내 채널"}</span><button type="button" onClick={() => void check()}><RefreshCw size={13} />다시 확인</button></div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <small>⚠️ {status.message}</small>
          <div className="actions">
            {status.connectPrograms.map((p) => <a key={p.url} className="button" href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={13} />{p.name}에서 연결</a>)}
            <button type="button" onClick={() => void check()}><RefreshCw size={13} />연결했어요 · 다시 확인</button>
          </div>
        </div>
      )}
      {ok && <>
        {!blob && (
          <div className="row">
            <button type="button" onClick={() => fileInput.current?.click()}>📁 저장한 MP4 고르기</button>
            <small className="muted">{picked ? `✓ ${picked.name} (${(picked.size / 1024 / 1024).toFixed(1)}MB)` : "「파일로 바로 저장」으로 만들었다면 저장한 MP4를 골라 올립니다."}</small>
            <input ref={fileInput} type="file" accept="video/mp4" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setPicked(f); e.target.value = ""; }} />
          </div>
        )}
        <label>제목 <small className="muted">({form.title.length}/100)</small><input value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>설명란(가사·해시태그)<textarea rows={5} value={form.description} maxLength={5000} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>검색 태그(쉼표로 구분)<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
        <div className="field-grid two">
          <label>공개 범위<select value={form.privacy} disabled={form.schedule} onChange={(e) => setForm({ ...form, privacy: e.target.value as Privacy })}>{PRIVACY.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>카테고리<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        {!portrait && (
          <div className="stack" style={{ gap: 8 }}>
            {thumbSrc && <div className="row" style={{ alignItems: "center", gap: 12 }}>
              {thumb ? <img src={thumb.url} alt="썸네일 미리보기" style={{ width: 160, borderRadius: 8 }} /> : <small className="muted">썸네일을 만드는 중…</small>}
              <div className="stack" style={{ gap: 6 }}>
                <label className="toggle"><input type="checkbox" checked={useThumb} onChange={(e) => setUseThumb(e.target.checked)} />🖼 올릴 때 {chosen ? `「${chosen.name}」 썸네일로` : "배경 그림을 썸네일로"} 지정</label>
                <small className="muted">1280×720 JPG{thumb ? ` · ${(thumb.size / 1024).toFixed(0)}KB` : ""} · 채널이 맞춤 썸네일 사용 인증(전화 인증)이 돼 있어야 지정됩니다</small>
                {thumb && <a className="button" href={thumb.url} download="lyric-video-thumbnail.jpg">⬇ 썸네일 내려받기</a>}
              </div>
            </div>}
            <div className="row" style={{ alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => void loadPicks()}>🎨 「AI 썸네일·SEO 자동화」에서 고르기</button>
              {chosen && <button type="button" onClick={() => setChosen(null)}>{coverUrl ? "↩ 배경 그림으로 되돌리기" : "↩ 고른 썸네일 빼기"}</button>}
              {!thumbSrc && <small className="muted">커버 그림을 넣거나 만들어 둔 썸네일을 고르면 올릴 때 썸네일로 지정합니다.</small>}
            </div>
            {picksMsg && <small>⚠️ {picksMsg}</small>}
            {picks && !picksMsg && (picks.length === 0 ? (
              <small className="muted">아직 만든 썸네일이 없습니다. <a href="https://thumbnail-master.buylife.xyz" target="_blank" rel="noreferrer">AI 썸네일·SEO 자동화</a>에서 만들면 여기서 고를 수 있습니다.</small>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {picks.map((p) => (
                  <button key={`${p.id}-${p.option}`} type="button" style={{ padding: 0, overflow: "hidden", textAlign: "left", display: "block" }} onClick={() => { setChosen({ name: `${p.name} ${p.option}`, url: p.url }); setPicks(null); }}>
                    <img src={p.url} alt={p.name} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
                    <small style={{ display: "block", padding: "4px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name} · {p.option}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        <label className="toggle"><input type="checkbox" checked={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.checked })} />정한 시각에 자동 공개(예약 — 그때까지 비공개)</label>
        {form.schedule && <label>공개 시각<input type="datetime-local" value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} /></label>}
        {pct !== null && <div className="progress-box"><div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div><small className="muted">{pct < 100 ? `유튜브로 보내는 중 ${pct}% — 이 탭을 닫지 마세요` : "유튜브가 받은 영상을 확인하는 중…"}</small></div>}
        <div className="actions"><button type="button" className="primary" disabled={!video || disabled || pct !== null || !form.title.trim()} onClick={() => void upload()}><Upload size={14} />{done.length ? "유튜브에 한 번 더 올리기" : "유튜브에 올리기"}</button></div>
        {done.length > 0 && <small className="muted">⚠️ 다시 누르면 새 영상으로 하나 더 올라갑니다.</small>}
      </>}
      {done.length > 0 && <div className="list">{done.map((d) => (
        <a key={d.videoId} className="list-item" href={d.url} target="_blank" rel="noreferrer"><span>{d.title} · {d.publishAt ? `${new Date(d.publishAt).toLocaleString("ko-KR")} 예약 공개` : PRIVACY_LABEL[d.privacy]}</span><ExternalLink size={13} /></a>
      ))}</div>}
    </section>
  );
}
