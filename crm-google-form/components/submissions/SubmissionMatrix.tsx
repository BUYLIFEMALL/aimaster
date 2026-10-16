"use client";

import { Fragment, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";

export interface SubmissionRow {
  id: string;
  sourceName: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  errorMessage: string | null;
  rawValues: Record<string, string>;
  createdAt: string;
}

const STATUS: Record<string, { label: string; chip: string }> = {
  received: { label: "접수됨", chip: "mx-chip" },
  notified: { label: "발송 완료", chip: "mx-chip-green" },
  failed: { label: "발송 실패", chip: "mx-chip-red" },
};

// 접수 내역 — 검색(이름·연락처·이메일) + 상태·폼 필터 + 표, 행마다 원본 응답 펼치기 (스마트 매트릭스 스타일)
export function SubmissionMatrix({ rows, sources }: { rows: SubmissionRow[]; sources: string[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (source === "all" || r.sourceName === source) &&
        (!q || [r.name, r.phone, r.email].some((v) => (v ?? "").toLowerCase().includes(q))),
    );
  }, [rows, query, status, source]);

  return (
    <div className="mx-card p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 이름·연락처·이메일 검색"
          className="input-sm lg:max-w-xs"
          aria-label="이름·연락처·이메일 검색"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-mx-border p-0.5" role="group" aria-label="상태 필터">
            {(["all", "received", "notified", "failed"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={`mx-toggle ${status === s ? "mx-toggle-active" : ""}`}>
                {s === "all" ? "전체" : STATUS[s].label}
              </button>
            ))}
          </div>
          {sources.length > 1 && (
            <select value={source} onChange={(e) => setSource(e.target.value)} className="input-sm min-h-[40px] w-auto" aria-label="폼 필터">
              <option value="all">모든 폼</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-mx-muted">조건에 맞는 접수가 없습니다.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="mx-table min-w-[760px]">
            <thead>
              <tr>
                <th>신청자</th>
                <th>연락처 · 이메일</th>
                <th>폼</th>
                <th>접수 시각</th>
                <th>상태</th>
                <th className="text-right">원본</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const st = STATUS[r.status] ?? { label: r.status, chip: "mx-chip" };
                const open = openId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="font-semibold">{r.name ?? "이름 미매핑"}</td>
                      <td>
                        <p className="text-sm">{r.phone ?? "연락처 미매핑"}</p>
                        <p className="text-xs text-mx-muted">{r.email ?? "이메일 미매핑"}</p>
                      </td>
                      <td className="text-mx-muted">{r.sourceName}</td>
                      <td className="whitespace-nowrap text-mx-muted">{formatDateTime(r.createdAt)}</td>
                      <td>
                        <span className={st.chip}>{st.label}</span>
                        {r.status === "failed" && r.errorMessage && <p className="mt-1 max-w-[220px] text-xs text-mx-danger">{r.errorMessage}</p>}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : r.id)}
                          aria-expanded={open}
                          className="mx-btn-ghost min-h-[36px] px-3 text-xs"
                        >
                          {open ? "접기" : "응답 보기"}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} className="bg-mx-raised">
                          <dl className="grid gap-x-6 gap-y-1 text-xs md:grid-cols-2">
                            {Object.entries(r.rawValues).map(([q, a]) => (
                              <div key={q} className="flex gap-2">
                                <dt className="shrink-0 font-semibold text-mx-text">{q}</dt>
                                <dd className="text-mx-muted">{a}</dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
