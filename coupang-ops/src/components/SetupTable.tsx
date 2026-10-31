"use client";

// 🔑 API키등록·플랫폼연동 표. 기준 realty-listing-alert app/settings/SetupTable.tsx(2026-10-31 주인님 「이렇게 바꿔」).
// 줄마다: 이름 | 상태 | 연결 정보 | [수정] [끊기·삭제] [발급 ↗]. 입력은 「수정」을 누르면 그 줄 아래에 펼쳐진다.
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const edit = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 whitespace-nowrap";
const save = "rounded-lg border border-blue-600 bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 whitespace-nowrap";
const del = "rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 whitespace-nowrap";

export type SetupRow = {
  id: string;
  name: ReactNode;
  sub?: string;
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  info: ReactNode;
  quick?: ReactNode;
  issue?: { href: string; label?: string };
  detail: ReactNode;
  openLabel?: string;
  defaultOpen?: boolean;
};

export function SetupTable({ rows, head = ["항목", "상태", "연결 정보"] }: { rows: SetupRow[]; head?: [string, string, string] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.id, Boolean(r.defaultOpen)])));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[720px] table-fixed text-left text-[13px]">
        <colgroup><col style={{ width: 120 }} /><col style={{ width: 90 }} /><col /><col style={{ width: 230 }} /></colgroup>
        <thead className="bg-slate-50 text-[12px] font-bold text-slate-600">
          <tr><th className="px-3 py-2">{head[0]}</th><th className="px-2 py-2">{head[1]}</th><th className="px-2 py-2">{head[2]}</th><th /></tr>
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
      <tr id={row.id} className={`scroll-mt-20 border-t border-slate-100 ${open ? "bg-blue-50/40" : ""}`}>
        <td className="px-3 py-2.5"><b className="block whitespace-nowrap text-slate-900">{row.name}</b>{row.sub && <small className="block text-[11px] text-slate-500">{row.sub}</small>}</td>
        <td className="px-2 py-2.5"><span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${row.on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>{row.on ? row.onLabel ?? "✓ 등록완료" : row.offLabel ?? "미등록"}</span></td>
        <td className="truncate px-2 py-2.5 text-[12.5px] text-slate-700">{row.info}</td>
        <td className="px-3 py-2.5">
          <span className="flex items-center justify-end gap-1.5">
            <button type="button" className={row.on ? edit : save} onClick={toggle}>{open ? "닫기 ▲" : row.openLabel ?? (row.on ? "수정" : "연결하기")}</button>
            {row.quick}
            {row.issue && <a className="btn-create-key" href={row.issue.href} target="_blank" rel="noopener noreferrer">{row.issue.label ?? "발급"} ↗</a>}
          </span>
        </td>
      </tr>
      {open && <tr className="border-t border-slate-100 bg-slate-50/60"><td colSpan={4} className="space-y-3 px-4 py-3">{row.detail}</td></tr>}
    </>
  );
}

/** 줄에서 바로 쓰는 끊기·삭제. 한 번 더 확인한다 */
export function ConfirmButton({ label, action }: { label: string; action: () => Promise<unknown> }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  if (!ask) return <button type="button" className={del} onClick={() => setAsk(true)}>{label}</button>;
  return (
    <>
      <button type="button" className={del} disabled={busy} onClick={() => start(async () => { await action(); setAsk(false); router.refresh(); })}>{busy ? "처리 중…" : `정말 ${label}`}</button>
      <button type="button" className={edit} onClick={() => setAsk(false)}>취소</button>
    </>
  );
}
