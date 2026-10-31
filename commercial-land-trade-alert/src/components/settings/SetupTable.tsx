"use client";

// API키등록·플랫폼연동 표. 기준: realty-listing-alert/app/settings/SetupTable.tsx
// 줄마다 이름 | 상태 | 연결 정보 | 버튼. 입력 칸은 「수정」「연결하기」를 누르면 그 줄 아래에 펼쳐진다.
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export const stepBadge = (optional?: boolean) => `mr-2 inline-block rounded-full px-2.5 py-0.5 align-middle text-xs font-bold text-white ${optional ? "bg-slate-400" : "bg-mx-primary-strong"}`;
export const statusBadge = (on: boolean) => `inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-extrabold ${on ? "border-green-200 bg-green-50 text-green-700" : "border-mx-border bg-gray-100 text-mx-muted"}`;
export const issueBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-orange-600 bg-orange-500 px-3 text-xs font-extrabold text-white hover:bg-orange-600";
export const editBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-mx-border bg-white px-3 text-xs font-bold text-mx-text hover:border-mx-primary disabled:opacity-60";
export const delBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60";
export const saveBtn = "inline-flex min-h-[34px] items-center whitespace-nowrap rounded-lg border border-mx-primary bg-mx-primary px-3 text-xs font-bold text-white hover:bg-mx-primary-strong disabled:opacity-60";

export type SetupRow = {
  id: string;
  name: ReactNode;
  sub?: string;
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  info: ReactNode;
  quick?: ReactNode;
  issue?: { href: string; label: string };
  detail: ReactNode;
  openLabel?: string;
  defaultOpen?: boolean;
};

export function SetupTable({ rows, head = ["항목", "상태", "연결 정보"] }: { rows: SetupRow[]; head?: [string, string, string] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.id, Boolean(r.defaultOpen)])));
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-mx-border">
      <table className="w-full min-w-[620px] table-fixed border-collapse bg-white text-sm">
        <colgroup><col className="w-28" /><col className="w-24" /><col /><col className="w-56" /></colgroup>
        <thead>
          <tr className="border-b border-mx-border bg-slate-50 text-left text-xs font-bold text-mx-muted">
            <th className="px-3 py-2">{head[0]}</th><th className="px-3 py-2">{head[1]}</th><th className="px-3 py-2">{head[2]}</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <SetupLine key={r.id} row={r} open={!!open[r.id]} toggle={() => setOpen({ ...open, [r.id]: !open[r.id] })} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SetupLine({ row, open, toggle }: { row: SetupRow; open: boolean; toggle: () => void }) {
  return (
    <>
      <tr id={row.id} className="border-b border-slate-100 last:border-b-0">
        <td className="px-3 py-2.5"><b className="block whitespace-nowrap">{row.name}</b>{row.sub && <small className="text-xs text-mx-muted">{row.sub}</small>}</td>
        <td className="px-3 py-2.5"><span className={statusBadge(row.on)}>{row.on ? row.onLabel ?? "✓ 등록완료" : row.offLabel ?? "미등록"}</span></td>
        <td className="truncate px-3 py-2.5 text-mx-text">{row.info}</td>
        <td className="px-3 py-2.5">
          <span className="flex flex-nowrap justify-end gap-1.5">
            <button type="button" className={row.on ? editBtn : saveBtn} onClick={toggle}>{open ? "닫기 ▲" : row.openLabel ?? (row.on ? "수정" : "연결하기")}</button>
            {row.quick}
            {row.issue && <a className={issueBtn} href={row.issue.href} target="_blank" rel="noopener noreferrer">{row.issue.label}</a>}
          </span>
        </td>
      </tr>
      {open && <tr className="border-b border-slate-100 bg-slate-50 last:border-b-0"><td colSpan={4} className="p-4">{row.detail}</td></tr>}
    </>
  );
}

/** 줄에서 바로 쓰는 끊기·삭제. 한 번 더 확인한다 */
export function ConfirmButton({ label, confirm, action }: { label: string; confirm: string; action: () => Promise<unknown> }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  if (!ask) return <button type="button" className={delBtn} onClick={() => setAsk(true)}>{label}</button>;
  return (
    <>
      <button type="button" className={delBtn} title={confirm} disabled={busy} onClick={() => start(async () => { await action(); setAsk(false); router.refresh(); })}>{busy ? "처리 중..." : `정말 ${label}`}</button>
      <button type="button" className={editBtn} onClick={() => setAsk(false)}>취소</button>
    </>
  );
}
