"use client";

import { useEffect, useMemo, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";
import { shortWatch, StatsDashboard } from "./StatsDashboard";

// 매물은 서버에 없다. 이 브라우저의 확장에 직접 물어 같은 화면에만 보여 준다(확장 연결 계정 = 로그인 계정일 때만).
type Result = { at: string; columns: string[]; table: (string | number)[][]; perTarget: { name: string; total: number; complete: boolean }[] };

const SHOW = ["감시 화면", "유형", "거래 종류", "가격", "시세 대비", "추정 수익률", "후보 점수", "근거", "변동", "이전 가격", "면적 기준", "면적(㎡)", "층"];
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
      <b className={color}>{n > 0 ? "▲" : n < 0 ? "▼" : ""} {Math.abs(n)}% {n > 0 ? "높음" : n < 0 ? "낮음" : "같음"}</b>
      {m[2] && <small className="ml-1 text-xs text-mx-muted">({m[2]})</small>}
    </>
  );
}

export function ResultsClient({ email }: { email: string }) {
  const [res, setRes] = useState<Result | null | undefined>(undefined);
  const [why, setWhy] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("score");
  const [ai, setAi] = useState<{ busy?: boolean; text?: string; count?: number; error?: string }>({});

  async function runAi() {
    setAi({ busy: true });
    const r = await askExtension<{ ok?: boolean; text?: string; count?: number; error?: string }>("aiSummary", 180000, { email });
    setAi(r?.ok ? { text: r.text, count: r.count } : { error: r?.error || "응답이 없습니다. 확장을 새로고침한 뒤 다시 눌러 주세요." });
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

  const rows = useMemo(() => {
    if (!res) return [];
    const at = (n: string) => res.columns.indexOf(n);
    const list = res.table.filter((r) => {
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
  }, [res, view, sort]);

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
      </div>
      <div className="mx-card mt-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={runAi} disabled={ai.busy} className="mx-btn-primary">
            {ai.busy ? "요약 중입니다..." : "🤖 AI 요약 보기"}
          </button>
          <p className="min-w-60 flex-1 text-xs text-mx-muted">
            API키등록·플랫폼연동에서 고른 AI(OpenAI·Claude·Gemini)에 회원님 본인 키로 후보·변동 매물 최대 30건의 가격·면적·층·비교값을 보냅니다. 중개사와 링크는 보내지 않고 우리 서버도 거치지 않습니다. 요금은 고른 모델 기준으로 본인 키에 청구됩니다.
          </p>
        </div>
        {ai.error && <p className="mt-3 text-sm text-red-600">{ai.error}</p>}
        {ai.text && (
          <div className="mt-3 border-t border-mx-border pt-3">
            <AiText text={ai.text} />
            <p className="mt-2 text-xs text-mx-muted">{ai.count}건 기준 AI 요약입니다. 사실과 다를 수 있으니 투자 판단은 직접 확인 후 해 주세요.</p>
          </div>
        )}
      </div>
      <div className="mx-card mt-3 overflow-x-auto p-0">
        <table className="mx-table [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead>
            <tr>
              {SHOW.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th>보기</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 500).map((r, i) => (
              <tr key={`${String(r[at(LINK)])}-${i}`}>
                {SHOW.map((c) => (
                  <td key={c} className={c === "가격" ? "font-semibold" : undefined}>
                    {c === "감시 화면" ? shortWatch(String(r[at(c)] ?? "")) : c === "시세 대비" ? <GapCell value={r[at(c)]} /> : c === "후보 점수" && Number(r[at(c)]) >= 40 ? `⭐ ${r[at(c)]}` : String(r[at(c)] ?? "")}
                  </td>
                ))}
                <td>
                  {r[at(LINK)] ? (
                    <a href={String(r[at(LINK)])} target="_blank" rel="noreferrer" className="whitespace-nowrap text-mx-link underline">
                      네이버
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 500 && <p className="mt-2 text-xs text-mx-muted">앞 500건만 보여 드립니다. 전체는 알림에 첨부된 파일에서 볼 수 있습니다.</p>}
    </>
  );
}
