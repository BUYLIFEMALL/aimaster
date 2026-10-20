"use client";

import { useEffect, useState } from "react";
import { CalendarClock, ExternalLink, Library } from "lucide-react";
import { listWorks } from "@/lib/comic/gallery";
import { MAX_BATCH_EPISODES, episodeTimes, sortForBatch, workCaption } from "@/lib/instagram/feed";
import { toFeedJpeg, uploadBlobs } from "@/lib/instagram/feedRender";
import { formatKst, kstLocalToIso, validateScheduleTime } from "@/lib/instagram/schedule";
import { InstaPostHistory } from "./InstaPostHistory";

// v1.19 내 작품 맨 위 「📤 인스타그램 예약」 — 예약 대기·게시 기록(InstaPostHistory) + 📚 여러 회차 한 번에 예약.
// 「이 브라우저」·「서버 보관함」 작품을 골라 화 순서대로, 첫 회차 시각부터 정한 간격으로 예약한다. 회차마다 바둑판 그림 1장 = 게시물 1개.
// 참고: ai-webtoon-studio v1.17 EpisodeBatchSchedule(간격 계산·사전 경고·회차별 결과). 플랜: docs/PLAN_20261020_WORKS_BATCH_SCHEDULE.md

interface Status { connected: boolean; username: string; expired: boolean; connectUrl: string }
interface Candidate { key: string; source: "browser" | "server"; title: string; episode: number; createdAt: number; src: string }
type Result = { title: string; ok: boolean; text: string };

const FALLBACK_CONNECT = "https://auto-instagram-posting.buylife.xyz/settings";
const INTERVALS = [
  { days: 1, label: "매일" },
  { days: 3, label: "3일마다" },
  { days: 7, label: "매주" },
  { days: 14, label: "2주마다" },
];

/** 다음 주 같은 요일 저녁 7시(한국 시간)를 첫 회차 기본값으로 */
function defaultFirstLocal(): string {
  const d = new Date(Date.now() + 9 * 3600000 + 7 * 86400000);
  return `${d.toISOString().slice(0, 10)}T19:00`;
}

const label = (c: { title: string; episode: number }) => `${c.title || "4컷 만화"}${c.episode > 1 ? ` ${c.episode}화` : ""}`;

export function WorksInstaSchedule({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [first, setFirst] = useState(defaultFirstLocal);
  const [intervalDays, setIntervalDays] = useState(7);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [historyKey, setHistoryKey] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: FALLBACK_CONNECT }));
    (async () => {
      const out: Candidate[] = [];
      try {
        for (const w of await listWorks(userId)) out.push({ key: `b-${w.id}`, source: "browser", title: w.title, episode: w.episode, createdAt: w.createdAt, src: w.image });
      } catch { /* 이 브라우저 보관을 쓸 수 없어도 서버 보관함은 쓴다 */ }
      try {
        const r = await fetch("/api/saved", { cache: "no-store" });
        const d = r.ok ? await r.json() : null;
        const items = (Array.isArray(d) ? d : d?.items ?? []) as { id: string; url: string | null; title: string; episode: number; createdAt: string }[];
        for (const it of items) if (it.url) out.push({ key: `s-${it.id}`, source: "server", title: it.title, episode: it.episode, createdAt: Date.parse(it.createdAt) || 0, src: it.url });
      } catch { /* 서버 보관함이 비어 있거나 읽지 못하면 이 브라우저 작품만 */ }
      if (alive) setCandidates(sortForBatch(out));
    })();
    return () => { alive = false; };
  }, [userId]);

  const ready = status?.connected && !status.expired;
  const chosen = sortForBatch((candidates ?? []).filter((c) => picked.includes(c.key)));
  const times = episodeTimes(first, chosen.length, intervalDays);
  const room = Math.max(0, MAX_BATCH_EPISODES - pendingCount);
  const firstCheck = times.length ? validateScheduleTime(kstLocalToIso(times[0]) ?? "") : null;
  const lastCheck = times.length ? validateScheduleTime(kstLocalToIso(times[times.length - 1]) ?? "") : null;
  const problem =
    chosen.length === 0 ? "" :
    chosen.length > room ? `대기 중인 예약이 ${pendingCount}건이라 이번에는 ${room}회차까지만 예약할 수 있어요(회원당 대기 예약 ${MAX_BATCH_EPISODES}건).` :
    firstCheck && !firstCheck.ok ? `첫 회차: ${firstCheck.error}` :
    lastCheck && !lastCheck.ok ? `마지막 회차(${formatKst(kstLocalToIso(times[times.length - 1]))}): ${lastCheck.error} 간격을 줄이거나 회차 수를 줄여 주세요.` : "";

  function toggle(key: string) {
    setResults([]);
    setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  async function scheduleAll() {
    const out: Result[] = [];
    setResults([]);
    for (let i = 0; i < chosen.length; i++) {
      const c = chosen[i];
      const name = `${i + 1}/${chosen.length}회차 「${label(c)}」`;
      try {
        setBusy(`${name} — 인스타용 그림 만드는 중...`);
        const blob = await toFeedJpeg(c.src);
        setBusy(`${name} — 그림 올리는 중...`);
        const paths = await uploadBlobs([blob]);
        setBusy(`${name} — 예약을 저장하는 중...`);
        const res = await fetch("/api/instagram/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths, caption: workCaption(c.title, c.episode), scheduledAt: kstLocalToIso(times[i]) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "예약하지 못했습니다.");
        out.push({ title: label(c), ok: true, text: `${formatKst(data.scheduledAt)} 예약` });
      } catch (e) {
        out.push({ title: label(c), ok: false, text: e instanceof Error ? e.message : "예약하지 못했습니다." });
      }
      setResults([...out]);
    }
    setBusy("");
    setConfirmed(false);
    setPicked([]);
    setHistoryKey((k) => k + 1);
  }

  return (
    <section className="cc-save" style={{ marginBottom: 24 }} aria-label="인스타그램 예약">
      <b className="cc-label">📤 인스타그램 예약 {status && ready && <span className="muted">· 연결됨 @{status.username}</span>}</b>
      <InstaPostHistory refreshKey={historyKey} onPendingChange={setPendingCount} emptyText="아직 인스타 게시·예약 기록이 없습니다." />

      {!status ? null : !ready ? (
        <div className="actions">
          <small className="muted">{status.expired ? "인스타그램 연결이 만료되었어요." : "아직 연결된 인스타그램 계정이 없어요."} INSTA 포스팅 자동화에서 한 번 연결하면 여기서 여러 회차를 예약할 수 있어요.</small>
          <button type="button" onClick={() => { const w = window.open(status.connectUrl || FALLBACK_CONNECT, "_blank"); if (w) w.opener = null; }}><ExternalLink size={14} />INSTA에서 연결하기</button>
        </div>
      ) : (
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}><Library size={14} style={{ verticalAlign: "-2px" }} /> 📚 여러 회차 한 번에 예약 (연재용)</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <small className="muted">아래 작품(이 브라우저·서버 보관함)을 골라 주세요. 화 순서대로 정한 간격에 맞춰 한 번에 예약하고, 회차마다 바둑판 그림 1장이 게시물 하나가 됩니다. 캡션은 「제목 N화」와 해시태그로 채워집니다.</small>
            {candidates === null ? <small className="muted">작품을 불러오는 중...</small> : candidates.length === 0 ? (
              <small className="muted">예약할 작품이 없습니다. [만화 만들기]에서 완성한 뒤 [내 작품에 저장] 또는 [서버 보관함에 저장]을 눌러 주세요.</small>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4, maxHeight: 260, overflowY: "auto" }} aria-label="예약할 작품 고르기">
                {candidates.map((c) => {
                  const idx = chosen.findIndex((x) => x.key === c.key);
                  return (
                    <li key={c.key}>
                      <label className="check" style={{ flexDirection: "row", alignItems: "center", background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }}>
                        <input type="checkbox" checked={idx >= 0} disabled={!!busy} onChange={() => toggle(c.key)} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.src} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} />
                        <span style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <b>{label(c)}</b>
                          <small className="muted">{c.source === "browser" ? "이 브라우저" : "서버 보관함"}</small>
                          {idx >= 0 && times[idx] && <small style={{ color: "#0284c7" }}>→ {formatKst(kstLocalToIso(times[idx]))}</small>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="actions">
              <label style={{ fontSize: 12 }}>
                첫 회차 날짜·시간 (한국 시간)
                <input type="datetime-local" value={first} onChange={(e) => setFirst(e.target.value)} disabled={!!busy} aria-label="첫 회차 예약 시각" style={{ maxWidth: 240 }} />
              </label>
              <label style={{ fontSize: 12 }}>
                간격
                <select value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value))} disabled={!!busy} aria-label="회차 간격" style={{ maxWidth: 140 }}>
                  {INTERVALS.map((o) => <option key={o.days} value={o.days}>{o.label}</option>)}
                </select>
              </label>
            </div>
            {problem && <small style={{ color: "#d97706" }} role="alert">{problem}</small>}
            <label className="check" style={{ flexDirection: "row", alignItems: "center" }}>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!!busy} />
              <span>@{status.username} 계정에 고른 {chosen.length}개 회차가 각 예약 시각에 공개 게시되는 것을 확인했어요.</span>
            </label>
            <div className="actions">
              <button type="button" className="primary" onClick={() => void scheduleAll()} disabled={!confirmed || !!busy || chosen.length === 0 || !!problem}>
                <CalendarClock size={14} />{busy ? "예약하는 중..." : `${chosen.length}개 회차 한 번에 예약`}
              </button>
              {busy && <small className="muted">{busy}</small>}
            </div>
            {results.length > 0 && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 12 }} aria-label="회차 예약 결과">
                {results.map((r, i) => <li key={i} style={{ color: r.ok ? "#059669" : "#dc2626" }}>{r.ok ? "✓" : "✗"} {r.title} — {r.text}</li>)}
              </ul>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
