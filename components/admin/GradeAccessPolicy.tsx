"use client";

import { useState } from "react";
import GoldButton from "@/components/ui/GoldButton";
import type { MemberGrade } from "@/types/database.types";

/**
 * 등급별 자동 부여 설정(2026-10-13): 아래 표에서 등급에 프로그램을 체크하면, 자동 부여가 켜진 등급의 회원에게
 * 사용권한이 한꺼번에 생기고 체크를 풀면 자동 부여분이 회수된다. 사용기간은
 *  - 일괄: 등급 전원에게 한 번에 연장/지정 (이 화면)
 *  - 사람별: 회원 관리 > 회원 선택 > 사용만료기간 설정 (회원마다 가입 시점이 달라 부여일부터 각자 계산됨)
 */
export default function GradeAccessPolicy({ grades }: { grades: MemberGrade[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-subtext leading-relaxed">
        등급에 프로그램을 체크해 두면 <b className="text-white">자동 부여가 켜진 등급</b>의 회원에게 사용권한이 한꺼번에 부여됩니다
        (체크를 풀면 자동 부여분만 회수, 관리자가 직접 준 권한은 유지). 사용기간은 회원마다 가입·등급 지정 시점이 달라{" "}
        <b className="text-white">부여된 날부터 기본 기간</b>이 각자 계산되며, 아래 <b className="text-white">일괄 연장</b> 또는 회원 관리의
        <b className="text-white"> 사람별 만료기간 설정</b> 두 가지로 바꿀 수 있습니다.
      </div>
      {grades.map((g) => (
        <GradeRow key={g.id} grade={g} />
      ))}
    </div>
  );
}

function GradeRow({ grade }: { grade: MemberGrade }) {
  const [auto, setAuto] = useState(!!grade.auto_grant);
  const [days, setDays] = useState(grade.default_access_days ? String(grade.default_access_days) : "");
  const [extendDays, setExtendDays] = useState("30");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/grade-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade_id: grade.id, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(`실패: ${data.error ?? res.status}`); return null; }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function savePolicy() {
    const parsed = days.trim() === "" ? null : Number(days);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1)) { setMsg("기본 기간은 1 이상의 정수(일)이거나 비워 두세요(무기한)."); return; }
    const d = await call({ action: "policy", auto_grant: auto, default_access_days: parsed });
    if (d) setMsg("저장했습니다.");
  }

  async function apply() {
    if (!confirm(`${grade.name} 회원 전원에게 이 등급에 체크된 프로그램 중 아직 없는 권한을 부여합니다. (기존 부여는 그대로) 진행할까요?`)) return;
    const d = await call({ action: "apply" });
    if (d) setMsg(`새로 부여된 권한 ${d.added}건`);
  }

  async function extend(byUntil: boolean) {
    if (byUntil) {
      if (!until) { setMsg("만료일을 선택하세요."); return; }
      if (!confirm(`${grade.name} 회원 전원의 사용기간(무기한 제외)을 ${until}로 지정합니다. 진행할까요?`)) return;
      const d = await call({ action: "extend", until });
      if (d) setMsg(`${d.updated}건의 사용기간을 변경했습니다.`);
    } else {
      const n = Number(extendDays);
      if (!Number.isInteger(n) || n === 0) { setMsg("연장 일수는 0이 아닌 정수여야 합니다."); return; }
      if (!confirm(`${grade.name} 회원 전원의 사용기간(무기한 제외)을 ${n}일 ${n > 0 ? "연장" : "단축"}합니다. 진행할까요?`)) return;
      const d = await call({ action: "extend", days: n });
      if (d) setMsg(`${d.updated}건의 사용기간을 변경했습니다.`);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-white font-semibold min-w-[120px]">{grade.name}</span>
        <label className="flex items-center gap-2 text-sm text-subtext">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-gold" />
          자동 부여
        </label>
        <label className="flex items-center gap-2 text-sm text-subtext">
          기본 기간(일)
          <input value={days} onChange={(e) => setDays(e.target.value)} placeholder="무기한" inputMode="numeric" className="input-dark w-24 py-1 text-sm" />
        </label>
        <GoldButton size="sm" onClick={savePolicy} disabled={busy}>저장</GoldButton>
        <GoldButton size="sm" variant="outline" onClick={apply} disabled={busy || !auto}>지금 등급 회원 전원에 적용</GoldButton>
      </div>
      {auto && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3 text-sm text-subtext">
          <span className="text-white/80">일괄 연장</span>
          <input value={extendDays} onChange={(e) => setExtendDays(e.target.value)} inputMode="numeric" className="input-dark w-20 py-1 text-sm" />
          <span>일</span>
          <GoldButton size="sm" variant="outline" onClick={() => extend(false)} disabled={busy}>전원 연장</GoldButton>
          <span className="mx-1 text-white/20">|</span>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="input-dark py-1 text-sm" />
          <GoldButton size="sm" variant="outline" onClick={() => extend(true)} disabled={busy}>이 날짜로 전원 지정</GoldButton>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-gold">{msg}</p>}
    </div>
  );
}
