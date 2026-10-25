"use client";

// 📄 최근 수집 결과(2026-10-25 주인님 「여기서 수집했던 데이터가 있어야 하는거 아닌가?」).
// 매물 데이터는 서버에 없다(§0) — 이 브라우저의 확장에 직접 물어(web-bridge 「lastResult」) 회원 PC 안에서만 받아 보여 준다.
// 확장이 연결된 계정과 지금 로그인 계정이 같을 때만 확장이 답한다. 확장이 없는 브라우저(카톡 링크·휴대폰)에서는 안내 + 서버의 숫자 요약.
import { useEffect, useMemo, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";

type Result = { at: string; result: string; columns: string[] | null; table: unknown[][]; perTarget: { name: string; total: number; events: number; firstRun: boolean }[] } | null;
type Summary = { lastRunAt: string | null; lastCount: number | null; lastResult: string | null };

const SHOW = ["단지명", "동", "거래 종류", "가격(만 원)", "전용면적(㎡)", "층", "상태", "이전 가격", "중개사 상호", "사무실 번호", "휴대폰", "네이버 매물 주소"];
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function RecentResults({ email, summary }: { email: string; summary: Summary }) {
  const [res, setRes] = useState<Result | undefined>(undefined); // undefined = 묻는 중, null = 확장 없음·다른 계정
  const [all, setAll] = useState(false);

  useEffect(() => {
    let alive = true;
    void askExtension<{ ok?: boolean; lastResult?: Result }>("lastResult", 2500, { email }).then((r) => {
      if (alive) setRes(r?.ok ? r.lastResult ?? null : null);
    });
    return () => { alive = false; };
  }, [email]);

  const view = useMemo(() => {
    if (!res?.columns || !Array.isArray(res.table)) return null;
    const idx = SHOW.map((c) => res.columns!.indexOf(c));
    const statusAt = res.columns.indexOf("상태");
    const isChanged = (r: unknown[]) => statusAt >= 0 && !!r[statusAt] && r[statusAt] !== "유지";
    const changed = res.table.filter(isChanged).length;
    // 변동이 0건이면 처음부터 전체 매물을 보여 준다(2026-10-25 주인님 「바로 수집된 내용이 보여야 하지 않나?」)
    const showAll = all || changed === 0;
    const rows = showAll ? res.table : res.table.filter(isChanged);
    return { idx, rows: rows.slice(0, 300), changed, showAll, total: res.table.length };
  }, [res, all]);

  return (
    <section className="card" id="results" aria-labelledby="results-title">
      <h2 className="card-title" id="results-title">📄 최근 수집 결과</h2>
      {res === undefined && <p className="card-caption">확장에 결과를 물어보는 중…</p>}

      {res === null && (
        <div className="ra-hint">
          <strong>💻 결과 표는 회원님 PC 크롬 확장 안에만 있어요</strong>
          <span>매물 정보는 이 사이트로 보내지 않아서(개인 정보 보호), 확장이 설치된 <b>PC 크롬</b>에서 이 화면을 열면 표가 보여요.</span>
          <span>지금은 메일·텔레그램으로 받은 <b>엑셀 파일</b>로 확인해 주세요.</span>
          {summary.lastRunAt && <span>마지막 수집: <b>{when(summary.lastRunAt)}</b> · 매물 {summary.lastCount ?? 0}건</span>}
        </div>
      )}

      {res && (
        <>
          <p className="card-caption">
            {when(res.at)} 수집 · {res.perTarget.map((p) => `${p.name} ${p.total}건${p.events ? `(변동 ${p.events})` : ""}`).join(" · ")}
          </p>
          {!view ? (
            <p className="card-caption">이 결과는 예전 확장이 만든 것이라 표를 그릴 수 없어요. 「🔍 지금 수집」을 한 번 더 눌러 주세요.</p>
          ) : (
            <>
              <div className="ra-toggle-row">
                <span className="card-caption">
                  {view.changed === 0 ? `이번엔 새 매물·가격 변동 없음 · 지금 매물 ${view.total}건` : view.showAll ? `전체 ${view.total}건` : `새 매물·가격 변동 ${view.changed}건`}
                  {view.showAll && view.total > view.rows.length ? ` (화면엔 ${view.rows.length}건까지, 나머지는 엑셀)` : ""}
                </span>
                {view.changed > 0 && <button type="button" className="secondary" onClick={() => setAll((v) => !v)}>{all ? "변동만 보기" : "전체 보기"}</button>}
              </div>
              {view.rows.length === 0 ? (
                <p className="card-caption">수집된 매물이 없어요.</p>
              ) : (
                <div className="ra-result-wrap">
                  <table className="ra-result">
                    <thead><tr>{SHOW.map((c) => <th key={c}>{c === "네이버 매물 주소" ? "네이버" : c}</th>)}</tr></thead>
                    <tbody>
                      {view.rows.map((r, i) => (
                        <tr key={i}>
                          {view.idx.map((ci, k) => {
                            const v = ci >= 0 ? r[ci] : "";
                            if (SHOW[k] === "네이버 매물 주소") {
                              return <td key={k}>{typeof v === "string" && /^https:\/\/(new|fin|m)\.land\.naver\.com\//.test(v) ? <a href={v} target="_blank" rel="noopener noreferrer">보기 ↗</a> : ""}</td>;
                            }
                            return <td key={k}>{v == null ? "" : String(v)}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
