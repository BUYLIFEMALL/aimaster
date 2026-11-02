"use client";

import { useEffect, useMemo, useState } from "react";
import { articleNoOf, type DongBoundary, locateDong, UNKNOWN_DONG } from "@/lib/adminDongGeo";
import { AI_ENGINES, aiModelName, toAiProvider, type AiProvider } from "@/lib/aiEngines";
import { askExtension } from "@/lib/extensionBridge";
import { shortWatch, StatsDashboard } from "./StatsDashboard";

// 매물은 서버에 없다. 이 브라우저의 확장에 직접 물어 같은 화면에만 보여 준다(확장 연결 계정 = 로그인 계정일 때만).
type Result = { at: string; columns: string[]; table: (string | number)[][]; places?: Record<string, [number, number]>; sggByWatch?: Record<string, string>; perTarget: { name: string; total: number; complete: boolean; pagesRead?: number; filterChanged?: boolean; filterText?: string | null; coords?: { total: number; withCoord: number; places: number } }[] };

const LINK = "네이버 매물 주소";
const EVENT_VIEW: Record<string, string> = { new: "🆕 신규", priceDown: "📉 가격 내림", priceUp: "📈 가격 오름", gone: "👋 사라짐" };

// AI 요약의 ## 제목과 **굵게**만 그린다. HTML로 넣지 않아 내용이 코드로 실행되지 않는다.
function bold(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

function AiText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const heading = /^#{1,6}\s+(.*)$/.exec(line);
        if (heading) return <h3 key={i} className="pt-3 text-base font-bold first:pt-0">{heading[1].replaceAll("**", "")}</h3>;
        return line.trim() ? <p key={i}>{bold(line)}</p> : null;
      })}
    </div>
  );
}

const MIN_EXTENSION = 1.17;

const yieldOf = (v: unknown) => Number.parseFloat(String(v ?? "")) || 0;

const pctOf = (v: unknown) => {
  const m = /^([+-]?\d+)%/.exec(String(v ?? ""));
  return m ? Number(m[1]) : null;
};

// 「+160%(시군구·1층 10건)」을 매물 알림의 실거래 대비와 같은 모양으로 그린다
function GapCell({ value }: { value: unknown }) {
  const m = /^([+-]?\d+)%(?:\((.*)\))?$/.exec(String(value ?? ""));
  if (!m) return <span className="text-mx-muted">—</span>;
  const n = Number(m[1]);
  const color = n > 0 ? "text-blue-700" : n < 0 ? "text-red-600" : "";
  return (
    <>
      <b className={`whitespace-nowrap ${color}`}>{n > 0 ? "▲" : n < 0 ? "▼" : ""} {Math.abs(n)}% {n > 0 ? "높음" : n < 0 ? "낮음" : "같음"}</b>
      {m[2] && <small className="block text-xs text-mx-muted">({m[2]})</small>}
    </>
  );
}

export function ResultsClient({ email }: { email: string }) {
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  const [why, setWhy] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("score");
  const [dongFilter, setDongFilter] = useState("");
  const [boundaries, setBoundaries] = useState<Record<string, DongBoundary[]>>({});
  const [ai, setAi] = useState<{ busy?: AiProvider; text?: string; count?: number; used?: string; error?: string }>({});

  async function runAi(provider: AiProvider) {
    setAi({ busy: provider });
    // 옛 확장은 어느 버튼을 눌렀는지 몰라 다른 AI로 분석하므로 먼저 버전을 확인한다
    const ping = await askExtension<{ ok?: boolean; version?: string }>("ping", 2000);
    if ((Number.parseFloat(String(ping?.version ?? "").replace("v", "")) || 0) < MIN_EXTENSION) {
      setAi({ error: "확장을 새 버전으로 바꿔 주세요. chrome://extensions에서 ↻ 새로고침한 뒤 이 화면도 새로고침해 주세요." });
      return;
    }
    const r = await askExtension<{ ok?: boolean; text?: string; count?: number; provider?: string; model?: string | null; error?: string }>("aiSummary", 180000, { email, provider });
    setAi(r?.ok ? { text: r.text, count: r.count, used: aiModelName(toAiProvider(r.provider), r.model) } : { error: r?.error || "응답이 없습니다. 확장을 새로고침한 뒤 다시 눌러 주세요." });
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await askExtension<{ ok?: boolean; lastResult?: Result }>("lastResult", 5000, { email });
      if (!alive) return;
      if (r?.ok && r.lastResult?.table) { setRes(r.lastResult); return; }
      // 실패 원인을 나눠 안내한다
      const ping = r ? null : await askExtension<{ ok?: boolean }>("ping", 2000);
      if (!alive) return;
      setWhy(
        r?.ok ? "아직 수집 결과가 없습니다. 확장 팝업에서 「지금 수집」을 눌러 주세요."
        : r ? "확장을 연결한 계정과 지금 로그인한 계정이 다릅니다. API키등록·플랫폼연동에서 「바로 연결」을 다시 눌러 주세요."
        : ping?.ok ? "확장이 결과를 늦게 보냈습니다. 「다시 불러오기」를 눌러 주세요."
        : "확장과 연결이 끊겼습니다. 이 화면을 새로고침해 주세요. 그래도 안 되면 chrome://extensions에서 ↻ 새로고침한 뒤 이 화면도 새로고침해 주세요.",
      );
      setRes(null);
    })();
    return () => {
      alive = false;
    };
  }, [email, attempt]);

  // 필요한 시·군·구 경계만 받는다. 좌표는 이 브라우저 안에서만 쓴다
  useEffect(() => {
    if (!res?.places) return;
    let alive = true;
    for (const sgg of new Set(Object.values(res.sggByWatch ?? {}))) {
      fetch(`/dong-boundaries/${sgg}.json`).then((r) => (r.ok ? r.json() : [])).then((d: DongBoundary[]) => alive && setBoundaries((b) => ({ ...b, [sgg]: d }))).catch(() => {});
    }
    return () => { alive = false; };
  }, [res]);

  const hasDong = !!res?.places && Object.keys(boundaries).length > 0;
  const dongOfRow = useMemo(() => {
    const memo = new Map<(string | number)[], string>();
    if (!res?.places) return memo;
    const at = (n: string) => res.columns.indexOf(n);
    for (const r of res.table) {
      const place = res.places[articleNoOf(r[at(LINK)])];
      const list = boundaries[res.sggByWatch?.[String(r[at("감시 화면")])] ?? ""];
      memo.set(r, place && list ? locateDong(list, place[0], place[1]) : UNKNOWN_DONG);
    }
    return memo;
  }, [res, boundaries]);
  const dongCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const d of dongOfRow.values()) c.set(d, (c.get(d) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => (a[0] === UNKNOWN_DONG ? 1 : b[0] === UNKNOWN_DONG ? -1 : a[0].localeCompare(b[0], "ko")));
  }, [dongOfRow]);

  const rows = useMemo(() => {
    if (!res) return [];
    const at = (n: string) => res.columns.indexOf(n);
    const list = res.table.filter((r) => {
      if (dongFilter && dongOfRow.get(r) !== dongFilter) return false;
      if (EVENT_VIEW[view]) return r[at("변동")] === EVENT_VIEW[view];
      if (view === "candidate") return Number(r[at("후보 점수")]) >= 40;
      if (view === "changed") return !!r[at("변동")];
      if (view === "cheap") return (pctOf(r[at("시세 대비")]) ?? 0) < 0;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "yield") return yieldOf(b[at("추정 수익률")]) - yieldOf(a[at("추정 수익률")]);
      if (sort === "gap") return (pctOf(a[at("시세 대비")]) ?? 9999) - (pctOf(b[at("시세 대비")]) ?? 9999);
      return Number(b[at("후보 점수")] || 0) - Number(a[at("후보 점수")] || 0);
    });
  }, [res, view, sort, dongFilter, dongOfRow]);

  if (res === undefined) return <p className="mx-card mt-6 text-sm text-mx-muted">확장에서 결과를 불러오는 중입니다...</p>;
  if (res === null) {
    return (
      <div className="mx-card mt-6 text-sm text-mx-muted">
        <p>결과를 불러오지 못했습니다. {why}</p>
        <button type="button" onClick={() => { setRes(undefined); setAttempt((n) => n + 1); }} className="mx-btn-ghost mt-3 min-h-[40px] text-sm">다시 불러오기</button>
      </div>
    );
  }
  const at = (n: string) => res.columns.indexOf(n);
  return (
    <>
      <StatsDashboard email={email} onPick={(v) => { setView(v); document.getElementById("result-rows")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
      {res.perTarget?.length > 0 && (
        <div className="mx-card mt-6 space-y-1 p-4 text-sm">
          <p className="font-bold">🔎 이번 회차에 읽은 범위</p>
          {res.perTarget.map((t) => (
            <p key={t.name} className="text-mx-muted">
              <b>{t.name}</b> · {t.total.toLocaleString("ko-KR")}건
              {t.filterText !== undefined && t.filterText !== null && <> · 네이버 조건: {t.filterText || "없음"}</>}
              {t.filterChanged && <> · 필터가 바뀌어 알림 없이 기준을 다시 저장</>}
              {!t.complete && <b className="text-amber-700"> · ⚠ 앞 {t.pagesRead ?? ""}페이지까지만 읽음. 네이버 화면에서 거래방식이나 면적을 좁히면 빠짐없이 읽습니다.</b>}
            </p>
          ))}
          <p className="text-xs text-mx-muted">시세 대비의 「참고」는 같은 동 거래가 부족해 시·군·구 거래와 견준 값입니다. 후보 점수와 평균에는 넣지 않습니다.</p>
        </div>
      )}
      <div id="result-rows" className="mx-card mt-6 flex flex-wrap items-center gap-2 p-4">
        <span className="text-sm text-mx-muted">
          {new Date(res.at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 수집 · {rows.length.toLocaleString("ko-KR")}건
        </span>
        <select value={view} onChange={(e) => setView(e.target.value)} aria-label="보기" className="mx-input min-h-[40px] w-auto py-2 text-sm">
          <option value="all">전체</option>
          <option value="candidate">⭐ 후보만(40점 이상)</option>
          <option value="cheap">시세보다 낮은 매물</option>
          <option value="changed">변동 있는 매물</option>
          <option value="new">🆕 새 매물</option>
          <option value="priceDown">📉 가격 내림</option>
          <option value="priceUp">📈 가격 오름</option>
          <option value="gone">👋 사라진 매물</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬" className="mx-input min-h-[40px] w-auto py-2 text-sm">
          <option value="score">후보 점수 높은순</option>
          <option value="gap">시세 대비 낮은순</option>
          <option value="yield">추정 수익률 높은순</option>
        </select>
        {hasDong && (
          <select value={dongFilter} onChange={(e) => setDongFilter(e.target.value)} aria-label="행정동" className="mx-input min-h-[40px] w-auto py-2 text-sm">
            <option value="">행정동 전체</option>
            {dongCounts.map(([d, n]) => <option key={d} value={d}>{d} ({n.toLocaleString("ko-KR")})</option>)}
          </select>
        )}
      </div>
      <div className="mx-card mt-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="AI 분석" className="flex flex-wrap gap-2">
            {AI_ENGINES.map((e) => (
              <button key={e.id} type="button" onClick={() => runAi(e.id)} disabled={!!ai.busy} className="mx-btn-primary">
                {ai.busy === e.id ? "분석 중입니다..." : `${e.icon} ${e.short} 분석`}
              </button>
            ))}
          </div>
          <p className="min-w-60 flex-1 text-xs text-mx-muted">
            누른 AI에 회원님 본인 키로 후보·변동 매물 최대 30건의 가격·면적·층·비교값을 보냅니다. 중개사와 링크는 보내지 않고 우리 서버도 거치지 않습니다. 요금은 본인 키에 청구되며, 세부 모델은 API키등록·플랫폼연동에서 고릅니다.
          </p>
        </div>
        {ai.error && <p className="mt-3 text-sm text-red-600">{ai.error}</p>}
        {ai.text && (
          <div className="mt-3 border-t border-mx-border pt-3">
            <AiText text={ai.text} />
            <p className="mt-2 text-xs text-mx-muted">{ai.used}로 만든 {ai.count}건 기준 AI 분석입니다. 사실과 다를 수 있으니 투자 판단은 직접 확인 후 해 주세요.</p>
          </div>
        )}
      </div>
      <div className="mx-card mt-3 overflow-x-auto p-0">
        <table className="mx-table min-w-[820px] text-sm [&_td]:align-top">
          <thead>
            <tr>
              <th>보기</th>
              <th>{hasDong ? "행정동(추정)" : "감시 화면"}</th>
              <th>매물</th>
              <th>가격</th>
              <th>면적·층</th>
              <th>시세 대비</th>
              <th>추정 수익률</th>
              <th>후보 점수</th>
              <th>변동</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 500).map((r, i) => {
              const v = (c: string) => String(r[at(c)] ?? "");
              const watch = shortWatch(v("감시 화면"));
              return (
                <tr key={`${v(LINK)}-${i}`}>
                  <td>
                    {v(LINK) ? (
                      <a href={v(LINK)} target="_blank" rel="noreferrer" className="whitespace-nowrap text-mx-link underline">
                        네이버
                      </a>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap">
                    <b>{hasDong ? dongOfRow.get(r) ?? UNKNOWN_DONG : watch}</b>
                    {hasDong && <small className="block text-xs text-mx-muted">{watch}</small>}
                  </td>
                  <td className="whitespace-nowrap">{v("유형")} {v("거래 종류")}</td>
                  <td className="whitespace-nowrap font-semibold">
                    {v("가격")}
                    {v("이전 가격") && <small className="block text-xs font-normal text-mx-muted">이전 {v("이전 가격")}</small>}
                  </td>
                  <td className="whitespace-nowrap">
                    {v("면적 기준")} {v("면적(㎡)")}㎡
                    {v("층") && <small className="block text-xs text-mx-muted">{v("층")}층</small>}
                  </td>
                  <td><GapCell value={v("시세 대비")} /></td>
                  <td>{v("추정 수익률")}</td>
                  <td>
                    {Number(v("후보 점수")) >= 40 ? `⭐ ${v("후보 점수")}` : v("후보 점수")}
                    {v("근거") && <small className="block text-xs text-mx-muted">{v("근거")}</small>}
                  </td>
                  <td className="whitespace-nowrap">{v("변동")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasDong && <p className="mt-2 text-xs text-mx-muted">행정동은 네이버 매물 좌표로 어림한 값이라 경계 근처는 틀릴 수 있습니다. 앞부분만 읽은 화면의 뒤쪽 매물은 나오지 않습니다. 경계 출처: 통계청 SGIS, vuski/admdongkor(CC BY 4.0).</p>}
      {rows.length > 500 && <p className="mt-2 text-xs text-mx-muted">앞 500건만 보여 드립니다. 전체는 알림에 첨부된 파일에서 볼 수 있습니다.</p>}
    </>
  );
}
