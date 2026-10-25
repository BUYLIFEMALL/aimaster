"use client";

// 🔑 API키등록·플랫폼연동 표(2026-10-25 주인님 「이걸로 하고 페이지 구성 다시 해봐」 — AI 엔진 한 줄 표와 같은 모양)
// 줄마다: 이름(받는 내용) | 상태 | 연결 정보 | [연동 방법·수정] [바로 쓰는 버튼(끊기·삭제)] [발급 ↗]
// 키 입력·카카오 연결처럼 단계가 많은 일은 「연동 방법·수정」을 누르면 그 줄 아래에 기존 입력 칸이 펼쳐진다.
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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
    <div className="ra-aitbl-wrap">
      <table className="ra-aitbl ra-setup">
        <colgroup><col style={{ width: 104 }} /><col style={{ width: 82 }} /><col /><col style={{ width: 216 }} /></colgroup>
        <thead><tr><th>{head[0]}</th><th>{head[1]}</th><th>{head[2]}</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <SetupLine key={r.id} row={r} open={open[r.id]} toggle={() => setOpen({ ...open, [r.id]: !open[r.id] })} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SetupLine({ row, open, toggle }: { row: SetupRow; open: boolean; toggle: () => void }) {
  return (
    <>
      <tr id={row.id} className={open ? "open" : ""}>
        <td><b className="ra-setup-name">{row.name}</b>{row.sub && <small className="ra-setup-sub">{row.sub}</small>}</td>
        <td><span className={`ra-badge ${row.on ? "on" : "off"}`}>{row.on ? row.onLabel ?? "✓ 등록완료" : row.offLabel ?? "미등록"}</span></td>
        <td><div className="ra-setup-info">{row.info}</div></td>
        <td>
          <span className="ra-aitbl-btns">
            <button type="button" className={row.on ? "ra-btn-edit" : "ra-btn-save"} onClick={toggle}>{open ? "닫기 ▲" : row.openLabel ?? (row.on ? "수정" : "연결하기")}</button>
            {row.quick}
            {row.issue && <a className="ra-btn-orange" href={row.issue.href} target="_blank" rel="noopener noreferrer">{row.issue.label}</a>}
          </span>
        </td>
      </tr>
      {open && <tr className="ra-setup-detail"><td colSpan={4}>{row.detail}</td></tr>}
    </>
  );
}

/** 줄에서 바로 쓰는 끊기·삭제 — 한 번 더 확인한다 */
export function ConfirmButton({ label, confirm, action }: { label: string; confirm: string; action: () => Promise<unknown> }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  if (!ask) return <button type="button" className="ra-btn-del" onClick={() => setAsk(true)}>{label}</button>;
  return (
    <>
      <button type="button" className="ra-btn-del" title={confirm} disabled={busy} onClick={() => start(async () => { await action(); setAsk(false); router.refresh(); })}>{busy ? "처리 중..." : `정말 ${label}`}</button>
      <button type="button" className="ra-btn-edit" onClick={() => setAsk(false)}>취소</button>
    </>
  );
}
