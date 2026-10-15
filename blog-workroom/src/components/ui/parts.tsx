"use client";
import { Loader2 } from "lucide-react";
import { ApiError } from "./api";
import type { KeywordMetric } from "@/lib/types";

export type Msg = { text: string; ok?: boolean; needKey?: boolean } | null;
export const toMsg = (e: unknown): Msg => e instanceof ApiError ? { text: e.message, needKey: e.needKey } : { text: "처리하지 못했습니다. 다시 시도해 주세요." };

export function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <div role="status" className={`notice ${msg.ok ? "success" : "error-box"}`}>{msg.text}{msg.needKey && <> <a href="/settings" style={{ textDecoration: "underline", fontWeight: 600 }}>API키등록·플랫폼연동으로 이동 →</a></>}</div>;
}

export function Busy({ on, label }: { on: boolean; label: string }) {
  return on ? <span className="row muted" style={{ fontSize: 12 }}><Loader2 size={14} className="spin" />{label}</span> : null;
}

export function Steps({ list, current }: { list: string[]; current: number }) {
  return <div className="steps">{list.map((s, i) => <span key={s} className={i === current ? "on" : i < current ? "done" : ""}>{i + 1}. {s}</span>)}</div>;
}

export const fmt = (n: number | null | undefined) => (n == null ? "-" : n.toLocaleString("ko-KR"));
export const ratioText = (r: number | null | undefined) => (r == null ? "-" : r < 10 ? r.toFixed(2) : Math.round(r).toLocaleString("ko-KR"));

/** 검색어 수치 표(선택 체크 포함) */
export function MetricTable({ rows, selected, onToggle, extra }: { rows: (KeywordMetric & { reason?: string; saved?: boolean })[]; selected?: Set<string>; onToggle?: (k: string) => void; extra?: (r: KeywordMetric) => React.ReactNode }) {
  if (!rows.length) return <p className="muted">표시할 검색어가 없습니다.</p>;
  return (
    <div className="table-wrap"><table>
      <thead><tr>{onToggle && <th />}<th>검색어</th><th>등급</th><th className="num">월간 검색량</th><th className="num">PC / 모바일</th><th className="num">블로그 문서수</th><th className="num">문서수÷검색량</th>{extra && <th />}</tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.keyword}>
          {onToggle && <td><input type="checkbox" aria-label={`${r.keyword} 선택`} checked={selected?.has(r.keyword) ?? false} disabled={r.saved} onChange={() => onToggle(r.keyword)} /></td>}
          <td><strong>{r.keyword}</strong>{r.saved && <small> · 보관됨</small>}{r.reason && <small style={{ display: "block" }}>{r.reason}</small>}</td>
          <td><span className={`badge ${r.grade}`}>{r.grade}</span></td>
          <td className="num">{fmt(r.total)}</td><td className="num">{fmt(r.pc)} / {fmt(r.mobile)}</td><td className="num">{fmt(r.docs)}</td><td className="num">{ratioText(r.ratio)}</td>
          {extra && <td>{extra(r)}</td>}
        </tr>
      ))}</tbody>
    </table></div>
  );
}

export function GradeHelp() {
  return <p className="muted" style={{ fontSize: 11 }}>등급은 블로그 문서수 ÷ 월간 검색량으로 정합니다 — 골드: 0.5 미만(검색량 500 이상), 실버: 2 미만, 일반: 10 미만, 경쟁: 10 이상, 검색 적음: 월 100회 미만. 검색 순위나 방문자를 보장하지 않습니다.</p>;
}

export function Spark({ series }: { series?: number[] }) {
  if (!series?.length) return null;
  const max = Math.max(...series, 1);
  return <span className="spark" aria-hidden>{series.map((v, i) => <i key={i} className={i >= series.length - 3 ? "last" : ""} style={{ height: `${Math.max(2, (v / max) * 22)}px` }} />)}</span>;
}
