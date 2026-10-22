"use client";

// BLC-09 (2026-10-22): 「구간별로 쓰기」 — 목차 → 구간을 하나씩 쓰고 바로 저장(중지·실패해도 쓴 구간은 남음) → 원고로 합치기.
// 승인한 근거(자료부터 집필)에서만 쓴다. 합친 원고는 기존 원고 화면·발행 전 점검·확장 전달을 그대로 쓴다.
import { useEffect, useRef, useState } from "react";
import type { DraftRecord } from "./shared";
import type { Studio } from "./useStudio";

type Section = { heading: string; goal: string; body: string; status: "empty" | "done" | "failed"; error?: string };
type Outline = { id: string; keyword: string; title: string; titles: string[]; sections: Section[]; status: string; draft_id: string | null; joined_hash: string | null; created_at: string };
const STATUS_LABEL = { empty: "⏳ 아직 안 씀", done: "✅ 저장됨", failed: "⚠️ 실패" } as const;

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as { outline?: Outline; draft?: DraftRecord; reused?: boolean; error?: string };
  return { ok: response.ok, ...result };
}

export function SectionWriter({ s, researchId }: { s: Studio; researchId: string }) {
  const { contentProvider, contentModel, strategy, personaId, customPersona, selectedStyleId, reuseDraft, refreshHistory } = s;
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"" | "outline" | "write" | "join">("");
  const [writing, setWriting] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const stopRef = useRef(false);

  const keep = (next: Outline) => { setOutline(next); setTitle((t) => (next.titles.includes(t) ? t : next.title)); setOutlines((list) => [next, ...list.filter((x) => x.id !== next.id)]); };
  useEffect(() => {
    fetch(`/api/outlines?researchId=${encodeURIComponent(researchId)}`).then((r) => r.json()).then((d: { outlines?: Outline[] }) => {
      const list = d.outlines ?? [];
      setOutlines(list);
      if (list[0]) { setOutline(list[0]); setTitle(list[0].title); }
    }).catch(() => {});
  }, [researchId]);

  const ai = { provider: contentProvider, model: contentModel };
  async function createOutline() {
    setBusy("outline"); setNotice("");
    const r = await post("/api/outlines", { researchId, styleId: selectedStyleId || undefined, strategy, personaId, customPersona, ...ai });
    setBusy("");
    if (!r.ok || !r.outline) return setNotice(r.error || "글 구성을 만들지 못했습니다.");
    keep(r.outline);
    setNotice(`구성 ${r.outline.sections.length}개를 만들었습니다. 「남은 구간 모두 쓰기」를 누르거나 구간마다 쓰세요.`);
  }
  async function writeOne(index: number): Promise<boolean> {
    if (!outline) return false;
    setWriting(index);
    const r = await post(`/api/outlines/${outline.id}/section`, { index, ...ai });
    setWriting(null);
    if (r.outline) keep(r.outline);
    if (!r.ok) { setNotice(`${index + 1}번 구간: ${r.error || "쓰지 못했습니다."} 이미 쓴 구간은 저장돼 있습니다.`); return false; }
    return true;
  }
  async function writeRest() {
    if (!outline) return;
    stopRef.current = false; setBusy("write"); setNotice("");
    let done = 0;
    for (let i = 0; i < outline.sections.length; i += 1) {
      if (stopRef.current) { setNotice(`중지했습니다. 쓴 ${done}개 구간은 저장됐고, 「남은 구간 모두 쓰기」로 이어 쓸 수 있습니다.`); break; }
      if (outline.sections[i].status === "done") continue;
      if (!(await writeOne(i))) break;
      done += 1;
    }
    setBusy("");
  }
  async function join() {
    if (!outline) return;
    setBusy("join"); setNotice("");
    const r = await post(`/api/outlines/${outline.id}/join`, { title, ...ai });
    setBusy("");
    if (r.outline) keep(r.outline);
    if (!r.ok || !r.draft) return setNotice(r.error || "원고로 합치지 못했습니다.");
    refreshHistory().catch(() => {});
    reuseDraft(r.draft, r.reused ? "구간이 바뀌지 않아 이미 합친 원고를 다시 열었습니다." : `구간 ${outline.sections.length}개를 합친 원고를 열었습니다. 발행 전 점검부터 확인해 주세요.`);
  }

  const sections = outline?.sections ?? [];
  const allDone = sections.length > 0 && sections.every((x) => x.status === "done");
  const changedAfterJoin = Boolean(outline?.draft_id) && outline?.status !== "joined";
  return (
    <div className="field">
      <h3 className="card-title">⑤ 구간별로 쓰기 (선택)</h3>
      <p className="section-description">긴 글을 구간마다 나눠 쓰고 바로 저장합니다. 중간에 멈추거나 한 구간이 실패해도 쓴 구간은 남고, 실패한 구간만 다시 쓰면 됩니다. 구간마다 본인 AI 키를 1회씩 씁니다(목차 1회 + 구간 수만큼).</p>
      {outlines.length > 1 && <select aria-label="이전 구성 다시 열기" value={outline?.id ?? ""} onChange={(e) => { const next = outlines.find((x) => x.id === e.target.value) ?? null; setOutline(next); if (next) setTitle(next.title); }}>
        {outlines.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.sections.filter((y) => y.status === "done").length}/{x.sections.length} 구간 · {new Date(x.created_at).toLocaleString("ko-KR")}</option>)}
      </select>}
      {!outline && <button type="button" className="secondary" disabled={Boolean(busy)} onClick={createOutline}>{busy === "outline" ? "구성을 만드는 중..." : "구간별로 쓰기 — 목차 만들기"}</button>}

      {outline && <>
        <label htmlFor="section-title">제목</label>
        <select id="section-title" value={title} onChange={(e) => setTitle(e.target.value)}>{outline.titles.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <ol style={{ paddingLeft: "1.2em" }}>{sections.map((x, i) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <strong>{x.heading || "도입부"}</strong> <small>{writing === i ? "✍️ 쓰는 중..." : STATUS_LABEL[x.status]}</small>
            <div><small>{x.goal}</small></div>
            {x.body && <details><summary>본문 보기 ({x.body.replace(/\s/g, "").length}자)</summary><p style={{ whiteSpace: "pre-wrap" }}>{x.body}</p></details>}
            {x.status === "failed" && x.error && <div><small>{x.error}</small></div>}
            <button type="button" className="secondary" disabled={Boolean(busy) || writing !== null} onClick={() => writeOne(i)}>{x.status === "done" ? "이 구간 다시 쓰기" : "이 구간 쓰기"}</button>
          </li>
        ))}</ol>
        {busy === "write"
          ? <button type="button" className="secondary" onClick={() => { stopRef.current = true; setNotice("지금 쓰는 구간까지 저장하고 멈춥니다..."); }}>중지</button>
          : !allDone && <button type="button" className="primary" disabled={Boolean(busy) || writing !== null} onClick={writeRest}>남은 구간 모두 쓰기</button>}
        {changedAfterJoin && <p className="freshness-note">합친 뒤 구간이 바뀌었습니다. 다시 합치면 기존 원고는 그대로 두고 새 원고를 만듭니다.</p>}
        {allDone && <button type="button" className="primary" disabled={Boolean(busy) || writing !== null} onClick={join}>{busy === "join" ? "원고로 합치는 중..." : outline.status === "joined" ? "합친 원고 열기" : "원고로 합치기"}</button>}
        {/* v1.95: 실수로 눌러 AI를 쓰지 않도록 화면 안 2단계 확인 */}
        {confirmRestart
          ? <div className="field">
              <p className="freshness-note">지금 구성은 그대로 남고, 새 목차를 만드는 데 본인 AI 키를 1회 씁니다.</p>
              <button type="button" className="primary" disabled={Boolean(busy) || writing !== null} onClick={() => { setConfirmRestart(false); createOutline(); }}>새 구성 만들기</button>
              <button type="button" className="secondary" onClick={() => setConfirmRestart(false)}>취소</button>
            </div>
          : <button type="button" className="secondary" disabled={Boolean(busy) || writing !== null} onClick={() => setConfirmRestart(true)}>새 구성으로 다시 시작</button>}
      </>}
      {notice && <div className="notice" role="status">{notice}</div>}
    </div>
  );
}
