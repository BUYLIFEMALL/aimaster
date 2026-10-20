"use client";
import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Upload } from "lucide-react";
import { api, toMsg, type Msg } from "@/components/ui/api";
import { Message } from "@/components/ui/Message";
import type { ShortsScript, YoutubeUpload } from "@/lib/script";
import type { PlanData } from "@/lib/plan";
import { planSlotIso, toLocalInput, uploadDefaults as defaults, uploadToYoutube } from "@/lib/youtube/browserUpload";

// v1.19 ⑥ 유튜브에 올리기 — 서버는 업로드 주소만 만들고(/api/youtube/upload-session), 영상은 이 브라우저가 유튜브로 바로 보낸다.
// v1.21: 업로드는 src/lib/youtube/browserUpload.ts(일괄 제작과 공용), 이 대본이 발행 계획에 있으면 그 일정으로 예약 공개를 미리 채운다.
type Status = { state: "ok" | "not_connected" | "no_scope" | "no_keys" | "other_app" | "reconnect"; channelTitle: string | null; message: string; connectPrograms: { name: string; url: string }[] };
const PRIVACY: { id: YoutubeUpload["privacy"]; name: string }[] = [
  { id: "private", name: "비공개(나만 보기 — 확인 뒤 직접 공개)" },
  { id: "unlisted", name: "일부 공개(링크가 있는 사람만)" },
  { id: "public", name: "공개(바로 모두에게)" },
];
const CATEGORIES = [
  { id: "22", name: "인물·블로그" }, { id: "27", name: "교육" }, { id: "26", name: "노하우·스타일" },
  { id: "24", name: "엔터테인먼트" }, { id: "28", name: "과학기술" }, { id: "25", name: "뉴스·정치" },
];
const PRIVACY_LABEL: Record<YoutubeUpload["privacy"], string> = { private: "비공개", unlisted: "일부 공개", public: "공개" };

export function YoutubeUploadCard({ projectId, script, blob, disabled, onUploaded }: { projectId: string | null; script: ShortsScript; blob: Blob | null; disabled: boolean; onUploaded: (rec: YoutubeUpload) => Promise<void> }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [form, setForm] = useState(() => ({ ...defaults(script), privacy: "private" as YoutubeUpload["privacy"], categoryId: "22", schedule: false, publishAt: "" }));
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const seoKey = script.seo ? script.seo.titles.join("|") + script.seo.description : "";

  async function check() {
    setStatus(null);
    try { setStatus(await api<Status>("/api/youtube/status")); } catch (e) { setMsg(toMsg(e)); }
  }
  useEffect(() => { void check(); }, []);
  // 발행 계획에서 이 대본의 일정을 찾아 예약 공개를 미리 채운다(지났거나 15분 안이면 안내만)
  const [planNote, setPlanNote] = useState("");
  useEffect(() => {
    if (!projectId) return;
    let live = true;
    api<{ items: { title: string; data: PlanData }[] }>("/api/items?kind=plan").then(({ items }) => {
      for (const p of items) {
        const e = p.data?.entries?.find((x) => x.projectId === projectId);
        if (!e || !live) continue;
        const iso = planSlotIso(e.date, e.time);
        if (iso) { setForm((f) => ({ ...f, schedule: true, publishAt: toLocalInput(iso) })); setPlanNote(`📅 발행 계획 「${p.title}」의 ${e.date} ${e.time} 일정으로 예약 공개를 채웠습니다. 바꿔도 됩니다.`); }
        else setPlanNote(`📅 발행 계획 「${p.title}」의 ${e.date} ${e.time} 일정은 이미 지났거나 15분 안이라 예약을 채우지 않았습니다.`);
        return;
      }
    }).catch(() => undefined);
    return () => { live = false; };
  }, [projectId]);
  // 업로드 문구를 새로 만들면 제목·설명·태그를 다시 채운다
  useEffect(() => { setForm((f) => ({ ...f, ...defaults(script) })); }, [seoKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload() {
    if (!blob || pct !== null) return;
    setMsg(null); setPct(0);
    try {
      const publishAt = form.schedule && form.publishAt ? new Date(form.publishAt).toISOString() : null;
      if (form.schedule && !publishAt) throw new Error("예약 공개 날짜와 시각을 정해 주세요.");
      const rec = await uploadToYoutube({ blob, title: form.title, description: form.description, tags: form.tags, privacy: form.privacy, categoryId: form.categoryId, publishAt, channel: status?.channelTitle ?? null, onPct: setPct });
      await onUploaded(rec);
      setMsg({ text: publishAt ? `유튜브에 올렸습니다. ${new Date(publishAt).toLocaleString("ko-KR")}에 공개됩니다(그때까지 비공개). 처리에 몇 분 걸릴 수 있습니다.` : `유튜브에 ${PRIVACY_LABEL[form.privacy]}로 올렸습니다. 유튜브가 영상을 처리하는 데 몇 분 걸릴 수 있습니다.`, ok: true });
    } catch (e) {
      setMsg(e instanceof Error && !(e as { needKey?: boolean }).needKey ? { text: e.message } : toMsg(e));
      if (e instanceof Error && /연결|만료|권한|Client ID/.test(e.message)) void check();
    } finally { setPct(null); }
  }

  const done = script.youtube ?? [];
  const ok = status?.state === "ok";
  return (
    <section className="card stack">
      <h2>📤 ⑥ 유튜브에 올리기</h2>
      <p className="muted">④에서 만든 MP4를 내 유튜브 채널에 바로 올립니다. 영상은 이 브라우저에서 유튜브로 직접 보내지고(서버 요금 없음), 유튜브 연결은 다른 유튜브 프로그램에서 한 번 연결한 계정을 그대로 씁니다.</p>
      <Message msg={msg} />
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
        <label>제목 <small className="muted">({form.title.length}/100)</small><input value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        {script.seo && script.seo.titles.length > 1 && <label>제목 후보에서 고르기<select value="" onChange={(e) => e.target.value && setForm({ ...form, title: e.target.value.slice(0, 100) })}><option value="">— 후보 선택 —</option>{script.seo.titles.map((t, i) => <option key={i} value={t}>{t}</option>)}</select></label>}
        <label>설명란(해시태그 포함)<textarea rows={5} value={form.description} maxLength={5000} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>검색 태그(쉼표로 구분)<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
        <div className="field-grid">
          <label>공개 범위<select value={form.privacy} disabled={form.schedule} onChange={(e) => setForm({ ...form, privacy: e.target.value as YoutubeUpload["privacy"] })}>{PRIVACY.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>카테고리<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        {planNote && <small className="muted">{planNote}</small>}
        <label className="row" style={{ gap: 8, alignItems: "center" }}><input type="checkbox" checked={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.checked })} style={{ width: "auto" }} />정한 시각에 자동 공개(예약 — 그때까지 비공개)</label>
        {form.schedule && <label>공개 시각<input type="datetime-local" value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} /></label>}
        {!blob && <small className="muted">먼저 ④에서 [MP4 만들기]를 눌러 주세요. 만든 MP4는 이 화면을 떠나면 사라집니다.</small>}
        {pct !== null && <div className="stack" style={{ gap: 6 }}><div style={{ height: 10, borderRadius: 6, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--brand)", transition: "width .3s" }} /></div><small className="muted">{pct < 100 ? `유튜브로 보내는 중 ${pct}% — 이 탭을 닫지 마세요` : "유튜브가 받은 영상을 확인하는 중…"}</small></div>}
        <div className="actions"><button type="button" className="primary" disabled={!blob || disabled || pct !== null || !form.title.trim()} onClick={() => void upload()}><Upload size={14} />{done.length ? "유튜브에 한 번 더 올리기" : "유튜브에 올리기"}</button></div>
        {done.length > 0 && <small className="muted">⚠️ 이 대본은 이미 {done.length}번 올렸습니다. 다시 누르면 새 영상으로 하나 더 올라갑니다.</small>}
      </>}
      {done.length > 0 && <div className="list">{done.map((d) => (
        <a key={d.videoId} className="list-item" href={d.url} target="_blank" rel="noreferrer"><span>{d.title} · {d.publishAt ? `${new Date(d.publishAt).toLocaleString("ko-KR")} 예약 공개` : PRIVACY_LABEL[d.privacy]} · {new Date(d.uploadedAt).toLocaleDateString("ko-KR")}</span><ExternalLink size={13} /></a>
      ))}</div>}
    </section>
  );
}
