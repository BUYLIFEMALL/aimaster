"use client";

// 통계·추이 대시보드. 기준: realty-listing-alert/app/results/StatsDashboard.tsx
// 요약 기록은 확장에만 있고, 같은 계정일 때 이 화면에만 건넨다. 그래프는 한 그래프에 선 하나다.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";

type SaleStat = { n: number; avg: number | null; med: number | null; perPyeong: number | null; gapMed?: number | null; gapN: number; yieldMed?: number | null; yieldN: number };
type RentStat = { n: number; avg: number | null; rentAvg: number | null };
type Group = { name: string; watch: string; kind: string; sgg: string | null; total: number; events: { new: number; priceDown: number; priceUp: number; gone: number }; trades: { 매매?: SaleStat; 월세?: RentStat } };
type Snap = { at: string; groups: Group[] };
type Weekly = { text: string; at: string; from: string; to: string };
type Trade = "매매" | "월세";

/** 「고양시 일산동구 백석동 상가·건물·토지」→「백석동」. 회원이 지은 이름은 그대로 둔다 */
export function shortWatch(watch: string) {
  const name = String(watch).replace(/\s*(상가|건물|토지)(·(상가|건물|토지))*$/, "").trim() || String(watch);
  const words = name.split(/\s+/);
  return words.length > 1 && /[동읍면가리]$/.test(words[words.length - 1]) ? words[words.length - 1] : name;
}
const label = (g: { watch: string; kind: string }) => `${shortWatch(g.watch)} · ${g.kind}`;

const RANGES: [number, string][] = [[30, "1개월"], [90, "3개월"], [180, "6개월"], [365, "1년"]];

function won(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  const eok = Math.floor(v / 10000);
  const rest = Math.round(v % 10000);
  if (!eok) return `${rest.toLocaleString("ko-KR")}만`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}만` : `${eok}억`;
}
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

function Tile({ label, value, sub, onClick }: { label: string; value: string; sub: string; onClick?: () => void }) {
  const body = (
    <>
      <small className="block text-xs text-mx-muted">{label}</small>
      <strong className="mt-1 block text-2xl font-bold">{value}</strong>
      <span className="mt-1 block text-xs text-mx-muted">{sub}</span>
    </>
  );
  const cls = "rounded-2xl border border-mx-border bg-white p-4 text-left";
  return onClick ? <button type="button" onClick={onClick} className={`${cls} hover:border-mx-primary`}>{body}</button> : <div className={cls}>{body}</div>;
}

function Seg<T extends string | number>({ options, value, onChange, label }: { options: [T, string][]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-xl border border-mx-border">
      {options.map(([id, text]) => (
        <button key={String(id)} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={`min-h-[40px] border-r border-mx-border px-4 text-sm last:border-r-0 ${value === id ? "bg-mx-primary/10 font-bold text-mx-primary" : "bg-white"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

function LineChart({ title, points, fmt }: { title: string; points: { at: string; v: number }[]; fmt: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <figure className="rounded-2xl border border-mx-border bg-white p-4"><figcaption className="text-sm font-bold">{title}</figcaption><p className="mt-2 text-xs text-mx-muted">기록이 없습니다.</p></figure>;
  const W = 600, H = 220, L = 86, R = 16, T = 16, B = 30;
  const vs = points.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (lo === hi) { lo *= 0.9; hi = hi * 1.1 || 1; }
  const pad = (hi - lo) * 0.1;
  lo = Math.max(0, lo - pad); hi += pad;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const shown = hover ?? points.length - 1;
  return (
    <figure className="rounded-2xl border border-mx-border bg-white p-4">
      <figcaption className="flex flex-wrap justify-between gap-2 text-sm font-bold">{title}<span className="font-normal text-mx-muted">{when(points[shown].at)} · <b>{fmt(points[shown].v)}</b></span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} 추이`} onMouseLeave={() => setHover(null)} className="mt-2 w-full">
        {[lo, (lo + hi) / 2, hi].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e6ee" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5b6475">{fmt(Math.round(t))}</text>
          </g>
        ))}
        <text x={x(0)} y={H - 8} textAnchor={points.length === 1 ? "middle" : "start"} fontSize="11" fill="#5b6475">{day(points[0].at)}</text>
        {points.length > 1 && <text x={x(points.length - 1)} y={H - 8} textAnchor="end" fontSize="11" fill="#5b6475">{day(points[points.length - 1].at)}</text>}
        {points.length > 1 && <polyline fill="none" stroke="#009b4d" strokeWidth="2" strokeLinejoin="round" points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />}
        {points.map((p, i) => (
          <g key={p.at}>
            <circle cx={x(i)} cy={y(p.v)} r={i === shown ? 5 : 4} fill="#009b4d" stroke="#fff" strokeWidth="2" />
            <circle cx={x(i)} cy={y(p.v)} r="14" fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${when(p.at)} ${fmt(p.v)}`} />
          </g>
        ))}
      </svg>
    </figure>
  );
}

function Gap({ s }: { s?: SaleStat }) {
  const v = s?.gapMed;
  if (!s || v == null) return <>—</>;
  const color = v > 0 ? "text-blue-700" : v < 0 ? "text-red-600" : "";
  return <><b className={color}>{v > 0 ? "▲" : v < 0 ? "▼" : ""} {Math.abs(v)}% {v > 0 ? "높음" : v < 0 ? "낮음" : "같음"}</b> <small className="text-mx-muted">({s.gapN}건)</small></>;
}

export function StatsDashboard({ email, onPick }: { email: string; onPick: (view: string) => void }) {
  const [history, setHistory] = useState<Snap[] | null | undefined>(undefined);
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [picked, setPicked] = useState("");
  const [trade, setTrade] = useState<Trade>("매매");
  const [range, setRange] = useState(90);

  useEffect(() => {
    let alive = true;
    void askExtension<{ ok?: boolean; history?: Snap[]; weeklyReport?: Weekly | null }>("stats", 3000, { email }).then((r) => {
      if (!alive) return;
      setHistory(r?.ok ? r.history ?? [] : null);
      setWeekly(r?.ok && r.weeklyReport?.text ? r.weeklyReport : null);
    });
    return () => { alive = false; };
  }, [email]);

  const latest = history?.length ? history[history.length - 1] : null;
  const prev = history && history.length > 1 ? history[history.length - 2] : null;
  const names = useMemo(() => latest?.groups.map((g) => g.name) ?? [], [latest]);
  const selected = names.includes(picked) ? picked : names[0] ?? "";

  const series = useMemo(() => {
    const last = history?.length ? new Date(history[history.length - 1].at).getTime() : 0;
    const cut = last - range * 24 * 3600 * 1000;
    return (history ?? []).filter((h) => new Date(h.at).getTime() >= cut).map((h) => ({ at: h.at, g: h.groups.find((g) => g.name === selected) }));
  }, [history, selected, range]);

  if (history === undefined || history === null || !latest) return null; // 안내는 아래 결과 칸이 맡는다

  const sum = (k: keyof Group["events"]) => latest.groups.reduce((n, g) => n + g.events[k], 0);
  const common = prev ? latest.groups.filter((g) => prev.groups.some((p) => p.name === g.name)) : [];
  const total = latest.groups.reduce((n, g) => n + g.total, 0);
  const delta = common.length ? common.reduce((n, g) => n + g.total - (prev!.groups.find((p) => p.name === g.name)?.total ?? 0), 0) : null;
  const selectedGroup = latest.groups.find((g) => g.name === selected);
  const selectedLabel = selectedGroup ? label(selectedGroup) : selected;
  const countPoints = series.flatMap((p) => { const t = p.g?.trades[trade]; return t ? [{ at: p.at, v: t.n }] : []; });
  const pricePoints = series.flatMap((p) => { const t = p.g?.trades[trade]; const v = trade === "월세" ? (t as RentStat | undefined)?.rentAvg : t?.avg; return v != null ? [{ at: p.at, v }] : []; });

  return (
    <section className="mx-card mt-6 p-5" aria-labelledby="stats-title">
      <h2 id="stats-title" className="text-lg font-bold">📊 통계·추이 대시보드</h2>
      <p className="mt-1 text-xs text-mx-muted">{when(latest.at)} 수집 기준 · 기록 {history.length}회(최근 1년, 회원님 PC에만 저장)</p>

      {weekly && (
        <details className="mt-3 rounded-2xl border border-mx-border bg-mx-primary/5 p-3 text-sm">
          <summary className="cursor-pointer font-bold">📅 지난 주간 리포트 <small className="font-normal text-mx-muted">{weekly.from}~{weekly.to}</small></summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans">{weekly.text}</pre>
        </details>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="지금 매물" value={`${total.toLocaleString("ko-KR")}건`} sub={delta === null ? "직전 회차 없음" : delta === 0 ? "직전보다 변동 없음" : `직전보다 ${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}`} />
        <Tile label="🆕 새 매물" value={`${sum("new")}건`} sub="눌러서 보기 →" onClick={() => onPick("new")} />
        <Tile label="📉 가격 내림" value={`${sum("priceDown")}건`} sub="눌러서 보기 →" onClick={() => onPick("priceDown")} />
        <Tile label="📈 가격 오름" value={`${sum("priceUp")}건`} sub="눌러서 보기 →" onClick={() => onPick("priceUp")} />
        <Tile label="👋 사라진 매물" value={`${sum("gone")}건`} sub="눌러서 보기 →" onClick={() => onPick("gone")} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={selected} onChange={(e) => setPicked(e.target.value)} aria-label="감시 화면과 유형" className="mx-input min-h-[40px] w-auto py-2 text-sm">
          {latest.groups.map((g) => <option key={g.name} value={g.name}>{label(g)}</option>)}
        </select>
        <Seg label="거래 종류" options={[["매매", "매매"], ["월세", "월세"]] as [Trade, string][]} value={trade} onChange={setTrade} />
        <Seg label="추이 기간" options={RANGES} value={range} onChange={setRange} />
      </div>
      {countPoints.length < 2 && <p className="mt-2 text-xs text-mx-muted">추이 그래프는 기록이 2회 이상 쌓이면 선으로 이어집니다(지금 {countPoints.length}회). 예약 수집이 돌 때마다 하나씩 쌓입니다.</p>}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <LineChart title={`${selectedLabel} · ${trade} 매물 수`} points={countPoints} fmt={(v) => `${v.toLocaleString("ko-KR")}건`} />
        <LineChart title={`${selectedLabel} · ${trade === "월세" ? "평균 월세" : "매매 평균 가격"}`} points={pricePoints} fmt={won} />
      </div>

      <h3 className="mt-5 text-base font-bold">🏢 감시 화면 비교 (이번 회차)</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-mx-border">
        <table className="mx-table [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead><tr><th>감시 화면 · 유형</th><th>매물</th><th>매매 평균</th><th>매매 평당가(중간값)</th><th>실거래 대비(중간값)</th><th>월세 평균</th><th>추정 수익률(중간값)</th></tr></thead>
          <tbody>
            {latest.groups.map((g) => {
              const s = g.trades["매매"], m = g.trades["월세"];
              const kind = g.kind === "토지" ? "land" : "building";
              return (
                <tr key={g.name}>
                  <td title={g.watch}>{label(g)}{g.sgg && <> <Link href={`/trades?sgg=${g.sgg}&kind=${kind}`} className="text-mx-link underline">📈 실거래</Link></>}</td>
                  <td>{g.total}건</td>
                  <td>{s ? `${won(s.avg)} (${s.n})` : "—"}</td>
                  <td>{won(s?.perPyeong)}</td>
                  <td><Gap s={s} /></td>
                  <td>{m ? `${won(m.avg)} / 월 ${won(m.rentAvg)} (${m.n})` : "—"}</td>
                  <td>{s?.yieldMed != null ? `${s.yieldMed}% (${s.yieldN}건)` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-mx-muted">금액은 호가 기준이며 (괄호)는 매물 수입니다. 평당가와 실거래 대비는 극단값에 덜 흔들리도록 중간값으로 보여 드립니다. 추정 수익률은 호가로 어림한 값이며 5건 이상일 때만 표시합니다. 토지는 지목이 달라 비교가 어려워 실거래 대비를 표시하지 않습니다.</p>
    </section>
  );
}
