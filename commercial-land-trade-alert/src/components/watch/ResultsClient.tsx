"use client";

import { useEffect, useMemo, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";

// 매물은 서버에 없다. 이 브라우저의 확장에 직접 물어 같은 화면에만 보여 준다(확장 연결 계정 = 로그인 계정일 때만).
type Result = { at: string; columns: string[]; table: (string | number)[][]; perTarget: { name: string; total: number; complete: boolean }[] };

const SHOW = ["감시 화면", "유형", "거래 종류", "가격", "시세 대비", "추정 수익률", "후보 점수", "근거", "변동", "이전 가격", "면적 기준", "면적(㎡)", "층"];
const LINK = "네이버 매물 주소";

const yieldOf = (v: unknown) => Number.parseFloat(String(v ?? "")) || 0;

const pctOf = (v: unknown) => {
  const m = /^([+-]?\d+)%/.exec(String(v ?? ""));
  return m ? Number(m[1]) : null;
};

export function ResultsClient({ email }: { email: string }) {
  const [res, setRes] = useState<Result | null | undefined>(undefined);
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
    void askExtension<{ ok?: boolean; lastResult?: Result }>("lastResult", 2500, { email }).then((r) => {
      if (alive) setRes(r?.ok && r.lastResult?.table ? r.lastResult : null);
    });
    return () => {
      alive = false;
    };
  }, [email]);

  const rows = useMemo(() => {
    if (!res) return [];
    const at = (n: string) => res.columns.indexOf(n);
    const list = res.table.filter((r) => {
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
      <p className="mx-card mt-6 text-sm text-mx-muted">
        결과를 불러오지 못했습니다. 매물은 확장이 설치된 PC 크롬에만 있습니다. 확장을 연결한 계정으로 로그인했는지, 한 번 이상 「지금 수집」을 했는지 확인해 주세요. 확장을 새로고침했다면 이 화면도 새로고침해 주세요.
      </p>
    );
  }
  const at = (n: string) => res.columns.indexOf(n);
  return (
    <>
      <div className="mx-card mt-6 flex flex-wrap items-center gap-2 p-4">
        <span className="text-sm text-mx-muted">
          {new Date(res.at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 수집 · {rows.length.toLocaleString("ko-KR")}건
        </span>
        <select value={view} onChange={(e) => setView(e.target.value)} aria-label="보기" className="mx-input min-h-[40px] w-auto py-2 text-sm">
          <option value="all">전체</option>
          <option value="candidate">⭐ 후보만(40점 이상)</option>
          <option value="cheap">시세보다 낮은 매물</option>
          <option value="changed">변동 있는 매물</option>
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
            회원님 본인 Claude 키로 후보·변동 매물 최대 30건의 가격·면적·층·비교값을 Anthropic에 보냅니다. 중개사와 링크는 보내지 않고 우리 서버도 거치지 않습니다. 1회 약 100원 안팎이 본인 키에 청구됩니다.
          </p>
        </div>
        {ai.error && <p className="mt-3 text-sm text-red-600">{ai.error}</p>}
        {ai.text && (
          <div className="mt-3 border-t border-mx-border pt-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{ai.text}</p>
            <p className="mt-2 text-xs text-mx-muted">{ai.count}건 기준 AI 요약입니다. 사실과 다를 수 있으니 투자 판단은 직접 확인 후 해 주세요.</p>
          </div>
        )}
      </div>
      <div className="mx-card mt-3 overflow-x-auto p-0">
        <table className="mx-table min-w-[1100px]">
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
                  <td key={c} className={c === "가격" ? "whitespace-nowrap font-semibold" : c === "근거" ? "min-w-40" : "whitespace-nowrap"}>
                    {c === "후보 점수" && Number(r[at(c)]) >= 40 ? `⭐ ${r[at(c)]}` : String(r[at(c)] ?? "")}
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
