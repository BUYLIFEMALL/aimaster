"use client";

// 📊 통계·추이 대시보드(2026-10-25 주인님 「결과를 가지고 위에 대시보드 형태로 통계 수치나 추이 등 모니터링하고 비교」).
// 요약 기록은 확장(chrome.storage.local 「history」, extension/lib/stats.js)에만 있다 — 같은 계정일 때 이 화면에만 건넨다(§0, 서버 미보관).
// 그래프는 한 그래프에 선 하나(축 하나): 매물 수와 평균 가격을 따로 그린다. 같은 숫자는 표로도 보인다.
import { useEffect, useMemo, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";
import PriceChange from "./PriceChange";

type TradeStat = { n: number; avg: number | null; med: number | null; min: number | null; max: number | null; perM2: number | null; rentAvg?: number | null; bands: { label: string; n: number; avg: number }[] };
type ComplexSnap = { name: string; total: number; events: { new: number; priceDown: number; priceUp: number; gone: number }; trades: Partial<Record<Trade, TradeStat>> };
type Snap = { at: string; complexes: ComplexSnap[]; realtors: { name: string; n: number }[] };
type Trade = "매매" | "전세" | "월세";
type EvType = "new" | "priceDown" | "priceUp" | "gone";
type Period = "last" | "7" | "30" | "90";
type EventRow = { at: string; type: EvType; row: unknown[] };

const TRADES: Trade[] = ["매매", "전세", "월세"];
const PYEONG = 3.3058;

/** 만 원 → 「8억 3,000」 */
function won(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  const eok = Math.floor(v / 10000);
  const rest = Math.round(v % 10000);
  if (!eok) return rest.toLocaleString("ko-KR");
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}` : `${eok}억`;
}
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
const signed = (n: number) => (n > 0 ? `▲ ${n.toLocaleString("ko-KR")}` : n < 0 ? `▼ ${(-n).toLocaleString("ko-KR")}` : "변동 없음");

export default function StatsDashboard({ email }: { email: string }) {
  const [history, setHistory] = useState<Snap[] | null | undefined>(undefined); // undefined = 묻는 중, null = 확장 없음·다른 계정
  const [events, setEvents] = useState<EventRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [complex, setComplex] = useState("");
  const [trade, setTrade] = useState<Trade>("매매");
  const [evType, setEvType] = useState<EvType | "all">("all");
  const [evPeriod, setEvPeriod] = useState<Period>("last");

  useEffect(() => {
    let alive = true;
    void askExtension<{ ok?: boolean; history?: Snap[]; events?: EventRow[]; columns?: string[] }>("stats", 3000, { email }).then((r) => {
      if (!alive) return;
      setHistory(r?.ok ? r.history ?? [] : null);
      setEvents(r?.ok ? r.events ?? [] : []);
      setColumns(r?.columns ?? []);
    });
    return () => { alive = false; };
  }, [email]);

  // 요약 카드를 누르면 그 종류의 이번 회차 변동만 「변동 기록」에서 보여 준다
  const openEvents = (t: EvType | "all") => {
    setEvType(t);
    setEvPeriod("last");
    document.getElementById("event-log")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const latest = history?.length ? history[history.length - 1] : null;
  const prev = history && history.length > 1 ? history[history.length - 2] : null;
  const names = useMemo(() => latest?.complexes.map((c) => c.name) ?? [], [latest]);
  const selected = complex && names.includes(complex) ? complex : names[0] ?? "";

  const tiles = useMemo(() => {
    if (!latest) return null;
    const sum = (f: (c: ComplexSnap) => number, s: Snap | null) => (s ? s.complexes.reduce((n, c) => n + f(c), 0) : 0);
    // 직전 회차와는 두 회차에 모두 있는 단지끼리만 비교한다(회차마다 나눠 수집하면 단지가 다를 수 있음)
    const common = prev ? latest.complexes.filter((c) => prev.complexes.some((p) => p.name === c.name)).map((c) => c.name) : [];
    const totalOf = (s: Snap) => s.complexes.filter((c) => common.includes(c.name)).reduce((n, c) => n + c.total, 0);
    return {
      total: sum((c) => c.total, latest),
      delta: prev && common.length ? totalOf(latest) - totalOf(prev) : null,
      fresh: sum((c) => c.events.new, latest),
      down: sum((c) => c.events.priceDown, latest),
      up: sum((c) => c.events.priceUp, latest),
      gone: sum((c) => c.events.gone, latest),
    };
  }, [latest, prev]);

  const series = useMemo(() => (history ?? [])
    .map((h) => ({ at: h.at, t: h.complexes.find((c) => c.name === selected)?.trades[trade] }))
    .filter((p): p is { at: string; t: TradeStat } => !!p.t), [history, selected, trade]);

  const current = latest?.complexes.find((c) => c.name === selected)?.trades[trade];

  return (
    <section className="card" aria-labelledby="stats-title">
      <h2 className="card-title" id="stats-title">📊 통계·추이 대시보드</h2>
      {history === undefined && <p className="card-caption">확장에 통계를 물어보는 중…</p>}
      {history === null && (
        <p className="card-caption">통계는 확장이 설치된 PC 크롬에서, 확장에 연결한 계정으로 열면 보여요. 매물 정보는 이 사이트로 보내지 않아요.</p>
      )}
      {history && !latest && <p className="card-caption">아직 수집 기록이 없어요. 확장 팝업에서 「🔍 지금 수집」을 한 번 눌러 주세요.</p>}

      {latest && tiles && (
        <>
          <p className="card-caption">{when(latest.at)} 수집 기준 · 기록 {history!.length}회(최근 90일, 회원님 PC에만 저장)</p>
          <div className="ra-stat-tiles">
            <div className="ra-stat"><small>지금 매물</small><strong>{tiles.total.toLocaleString("ko-KR")}건</strong><span>{tiles.delta === null ? "직전 회차 없음" : `직전보다 ${signed(tiles.delta)}`}</span></div>
            <button type="button" className="ra-stat link" onClick={() => openEvents("new")}><small>🆕 새 매물</small><strong>{tiles.fresh.toLocaleString("ko-KR")}건</strong><span>이번 회차 · 눌러서 보기 →</span></button>
            <div className="ra-stat split">
              <button type="button" className="link" onClick={() => openEvents("priceDown")}><small>📉 가격 내림</small><strong>{tiles.down}건</strong></button>
              <button type="button" className="link" onClick={() => openEvents("priceUp")}><small>📈 가격 오름</small><strong>{tiles.up}건</strong></button>
            </div>
            <button type="button" className="ra-stat link" onClick={() => openEvents("gone")}><small>👋 사라진 매물</small><strong>{tiles.gone.toLocaleString("ko-KR")}건</strong><span>이번 회차 · 눌러서 보기 →</span></button>
          </div>

          <div className="ra-stat-filters">
            <label>단지
              <select value={selected} onChange={(e) => setComplex(e.target.value)}>
                {names.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <div className="ra-seg" role="group" aria-label="거래 종류">
              {TRADES.map((t) => (
                <button key={t} type="button" aria-pressed={trade === t} className={trade === t ? "on" : ""} onClick={() => setTrade(t)}>{t}</button>
              ))}
            </div>
          </div>

          {series.length < 2 && (
            <p className="card-caption">추이 그래프는 이 단지·{trade} 기록이 2회 이상 쌓이면 선으로 이어져요(지금 {series.length}회). 예약 수집이 돌 때마다 하나씩 쌓여요.</p>
          )}
          <div className="ra-chart-grid">
            <LineChart title={`${selected} · ${trade} 매물 수`} points={series.map((p) => ({ at: p.at, v: p.t.n }))} fmt={(v) => `${v.toLocaleString("ko-KR")}건`} />
            <LineChart title={`${selected} · ${trade} 평균 ${trade === "월세" ? "보증금" : "가격"}`} points={series.filter((p) => p.t.avg != null).map((p) => ({ at: p.at, v: p.t.avg! }))} fmt={won} />
          </div>

          <h3 className="ra-stat-h">🏢 단지 비교 (이번 회차)</h3>
          <div className="ra-result-wrap">
            <table className="ra-result">
              <thead><tr><th>단지</th><th>매물</th><th>매매 평균</th><th>매매 평당가</th><th>전세 평균</th><th>전세가율</th><th>월세 평균</th></tr></thead>
              <tbody>
                {latest.complexes.map((c) => {
                  const s = c.trades["매매"], j = c.trades["전세"], m = c.trades["월세"];
                  const ratio = s?.perM2 && j?.perM2 ? Math.round((j.perM2 / s.perM2) * 100) : null;
                  return (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td>{c.total}건</td>
                      <td>{s ? `${won(s.avg)} (${s.n})` : "—"}</td>
                      <td>{s?.perM2 ? won(Math.round(s.perM2 * PYEONG)) : "—"}</td>
                      <td>{j ? `${won(j.avg)} (${j.n})` : "—"}</td>
                      <td>{ratio !== null ? `${ratio}%` : "—"}</td>
                      <td>{m ? `${won(m.avg)} / ${won(m.rentAvg)} (${m.n})` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="card-caption">단위: 만 원 · 평당가 = ㎡당 평균 × 3.3058 · 전세가율 = 전세 ㎡당 ÷ 매매 ㎡당 · (괄호)는 매물 수</p>

          <div className="ra-stat-two">
            <div>
              <h3 className="ra-stat-h">📐 면적대별 — {selected} · {trade}</h3>
              {current?.bands.length ? (
                <table className="ra-result">
                  <thead><tr><th>전용면적</th><th>매물</th><th>평균 {trade === "월세" ? "보증금" : "가격"}</th></tr></thead>
                  <tbody>{current.bands.map((b) => <tr key={b.label}><td>{b.label}</td><td>{b.n}건</td><td>{won(b.avg)}</td></tr>)}</tbody>
                </table>
              ) : <p className="card-caption">이 단지에 {trade} 매물이 없어요.</p>}
              {current && <p className="card-caption">중간값 {won(current.med)} · 최저 {won(current.min)} · 최고 {won(current.max)}</p>}
            </div>
            <div>
              <h3 className="ra-stat-h">🤝 매물 많은 중개사 (전체 단지)</h3>
              {latest.realtors.length ? (
                <ol className="ra-rank">{latest.realtors.map((r) => <li key={r.name}><span>{r.name}</span><b>{r.n}건</b></li>)}</ol>
              ) : <p className="card-caption">중개사 정보가 없어요.</p>}
            </div>
          </div>

          <EventLog events={events} columns={columns} lastAt={latest.at} type={evType} setType={setEvType} period={evPeriod} setPeriod={setEvPeriod} />
        </>
      )}
    </section>
  );
}

/** 선 하나짜리 추이 그래프(축 하나). 점에 마우스를 올리면 값이 보인다. */
function LineChart({ title, points, fmt }: { title: string; points: { at: string; v: number }[]; fmt: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 220, L = 70, R = 16, T = 16, B = 30;
  if (!points.length) return <figure className="ra-chart"><figcaption>{title}</figcaption><p className="card-caption">기록이 없어요.</p></figure>;
  const vs = points.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (lo === hi) { lo = lo * 0.9; hi = hi * 1.1 || 1; }
  const pad = (hi - lo) * 0.1;
  lo = Math.max(0, lo - pad); hi += pad;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  const shown = hover ?? points.length - 1;
  return (
    <figure className="ra-chart">
      <figcaption>{title}<span>{when(points[shown].at)} · <b>{fmt(points[shown].v)}</b></span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} 추이`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{fmt(Math.round(t))}</text>
          </g>
        ))}
        <text x={x(0)} y={H - 8} textAnchor={points.length === 1 ? "middle" : "start"} fontSize="11" fill="var(--muted)">{day(points[0].at)}</text>
        {points.length > 1 && <text x={x(points.length - 1)} y={H - 8} textAnchor="end" fontSize="11" fill="var(--muted)">{day(points[points.length - 1].at)}</text>}
        {points.length > 1 && <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="3 3" />}
        {points.map((p, i) => (
          <g key={p.at}>
            <circle cx={x(i)} cy={y(p.v)} r={i === shown ? 5 : 4} fill="var(--accent)" stroke="#fff" strokeWidth="2" />
            <circle cx={x(i)} cy={y(p.v)} r="14" fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${when(p.at)} ${fmt(p.v)}`} />
          </g>
        ))}
      </svg>
    </figure>
  );
}

const EV_TABS: { id: EvType | "all"; label: string }[] = [
  { id: "all", label: "전체 변동" }, { id: "new", label: "🆕 새 매물" }, { id: "priceDown", label: "📉 가격 내림" }, { id: "priceUp", label: "📈 가격 오름" }, { id: "gone", label: "👋 사라짐" },
];
const EV_COLS = ["단지명", "동", "거래 종류", "가격(만 원)", "전용면적(㎡)", "층", "중개사 상호", "사무실 번호", "휴대폰"];
const MAX_ROWS = 500;

/** 🔔 변동 기록 — 새 매물·가격 내림/오름·사라짐을 기간·단지별로 모아 본다(회원 PC 확장의 eventLog). */
function EventLog({ events, columns, lastAt, type, setType, period, setPeriod }: {
  events: EventRow[]; columns: string[]; lastAt: string;
  type: EvType | "all"; setType: (t: EvType | "all") => void; period: Period; setPeriod: (p: Period) => void;
}) {
  const [complex, setComplex] = useState("");
  const col = (name: string) => columns.indexOf(name);
  const nameAt = col("단지명");
  const urlAt = col("네이버 매물 주소");

  const inPeriod = useMemo(() => {
    if (period === "last") return events.filter((e) => e.at === lastAt);
    const cut = new Date(lastAt).getTime() - Number(period) * 24 * 3600 * 1000; // 마지막 수집 시각 기준
    return events.filter((e) => new Date(e.at).getTime() >= cut);
  }, [events, period, lastAt]);
  const complexes = useMemo(() => [...new Set(inPeriod.map((e) => String(e.row[nameAt] ?? "")))].filter(Boolean), [inPeriod, nameAt]);
  const scoped = complex && complexes.includes(complex) ? inPeriod.filter((e) => e.row[nameAt] === complex) : inPeriod;
  const counts: Record<string, number> = { all: scoped.length, new: 0, priceDown: 0, priceUp: 0, gone: 0 };
  for (const e of scoped) counts[e.type]++;
  const rows = (type === "all" ? scoped : scoped.filter((e) => e.type === type)).slice().reverse(); // 최근 것부터

  // 날짜별 건수(기간 보기일 때) — 막대 하나·축 하나
  const daily: { d: string; n: number }[] = [];
  if (period !== "last") {
    const m = new Map<string, number>();
    for (const e of rows) { const d = day(e.at); m.set(d, (m.get(d) || 0) + 1); }
    daily.push(...[...m].reverse().map(([d, n]) => ({ d, n })));
  }

  return (
    <div id="event-log" className="ra-event-log">
      <h3 className="ra-stat-h">🔔 변동 기록</h3>
      <p className="card-caption">새 매물·가격 내림/오름·사라진 매물을 기간·단지별로 모아 봐요. 기록은 회원님 PC 확장에만 90일 쌓여요(사라짐은 목록을 끝까지 읽은 회차만 판단).</p>
      <div className="ra-stat-filters">
        <div className="ra-seg" role="group" aria-label="기간">
          {([["last", "이번 회차"], ["7", "7일"], ["30", "30일"], ["90", "90일"]] as [Period, string][]).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={period === id} className={period === id ? "on" : ""} onClick={() => setPeriod(id)}>{label}</button>
          ))}
        </div>
        <label>단지
          <select value={complex} onChange={(e) => setComplex(e.target.value)}>
            <option value="">전체 단지</option>
            {complexes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="ra-ev-tabs" role="tablist" aria-label="변동 종류">
        {EV_TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={type === t.id} className={type === t.id ? "on" : ""} onClick={() => setType(t.id)}>
            {t.label} <b>{counts[t.id]}</b>
          </button>
        ))}
      </div>

      {daily.length > 1 && <DailyBars data={daily} />}

      {rows.length === 0 ? (
        <p className="card-caption">{period === "last" ? "이번 회차에는 이 종류의 변동이 없어요. 기간을 7일·30일로 넓혀 보세요." : "이 기간에는 이 종류의 변동 기록이 없어요."}</p>
      ) : (
        <div className="ra-result-wrap">
          <table className="ra-result">
            <thead><tr><th>수집 시각</th><th>가격 변동</th>{EV_COLS.map((c) => <th key={c}>{c === "가격(만 원)" ? "가격" : c}</th>)}<th>네이버</th></tr></thead>
            <tbody>
              {rows.slice(0, MAX_ROWS).map((e, i) => {
                const url = urlAt >= 0 ? e.row[urlAt] : "";
                return (
                  <tr key={i}>
                    <td>{when(e.at)}</td>
                    <td><PriceChange status={e.type} prev={col("이전 가격") >= 0 ? e.row[col("이전 가격")] : ""} /></td>
                    {EV_COLS.map((c) => { const k = col(c); const v = k >= 0 ? e.row[k] : ""; return <td key={c}>{v == null ? "" : String(v)}</td>; })}
                    <td>{typeof url === "string" && /^https:\/\/(new|fin|m)\.land\.naver\.com\//.test(url) ? <a href={url} target="_blank" rel="noopener noreferrer">보기 ↗</a> : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > MAX_ROWS && <p className="card-caption">화면엔 최근 {MAX_ROWS}건까지 보여요(전체 {rows.length}건).</p>}
    </div>
  );
}

/** 날짜별 변동 건수 막대(축 하나). 막대에 마우스를 올리면 날짜·건수가 보인다. */
function DailyBars({ data }: { data: { d: string; n: number }[] }) {
  const W = 600, H = 140, L = 34, R = 8, T = 10, B = 24;
  const max = Math.max(...data.map((x) => x.n), 1);
  const slot = (W - L - R) / data.length;
  const bw = Math.max(4, Math.min(28, slot - 2));
  return (
    <figure className="ra-chart ra-ev-chart">
      <figcaption>날짜별 변동 건수</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="날짜별 변동 건수">
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--line)" />
        <text x={L - 6} y={T + 8} textAnchor="end" fontSize="11" fill="var(--muted)">{max}</text>
        {data.map((x, i) => {
          const h = ((H - T - B) * x.n) / max;
          const cx = L + slot * i + slot / 2;
          return (
            <g key={x.d}>
              <rect x={cx - bw / 2} y={H - B - h} width={bw} height={h} rx="3" fill="var(--accent)"><title>{`${x.d} · ${x.n}건`}</title></rect>
              {(i === 0 || i === data.length - 1) && <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{x.d}</text>}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
