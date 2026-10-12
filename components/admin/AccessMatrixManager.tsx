"use client";

import { useState } from "react";
import type { MemberGrade, Program } from "@/types/database.types";

interface AccessMatrixProps {
  grades: MemberGrade[];
  programs: Program[];
  initialAccess: { grade_id: string; program_id: string }[];
}

export default function AccessMatrixManager({ grades, programs, initialAccess }: AccessMatrixProps) {
  const [accessSet, setAccessSet] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialAccess.forEach((a) => s.add(`${a.grade_id}:${a.program_id}`));
    return s;
  });
  const [loading, setLoading] = useState<string | null>(null);

  const toggle = async (gradeId: string, programId: string) => {
    const key = `${gradeId}:${programId}`;
    const hasAccess = accessSet.has(key);
    const action = hasAccess ? "revoke" : "grant";

    setLoading(key);

    // Optimistic update
    setAccessSet((prev) => {
      const next = new Set(prev);
      if (hasAccess) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      const res = await fetch("/api/admin/access-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade_id: gradeId, program_id: programId, action }),
      });
      if (!res.ok) {
        // Revert on error
        setAccessSet((prev) => {
          const next = new Set(prev);
          if (hasAccess) next.add(key);
          else next.delete(key);
          return next;
        });
      }
    } catch {
      // Revert
      setAccessSet((prev) => {
        const next = new Set(prev);
        if (hasAccess) next.add(key);
        else next.delete(key);
        return next;
      });
    } finally {
      setLoading(null);
    }
  };

  /** 등급 한 줄 전체 선택/해제 — 한 번의 저장으로 처리하고(자동 부여 등급이면 회원 권한도 함께 부여·회수) 확인 후 진행한다 */
  const toggleRow = async (grade: MemberGrade, selectAll: boolean) => {
    const label = selectAll ? "전체 선택" : "전체 해제";
    const note = grade.auto_grant
      ? "자동 부여가 켜진 등급이라 회원 권한도 함께 " + (selectAll ? "부여" : "회수(자동 부여분만)") + "됩니다."
      : "";
    if (!confirm(`[${grade.name}] 프로그램 ${programs.length}개를 ${label}합니다. ${note} 진행할까요?`)) return;
    setLoading(`row:${grade.id}`);
    try {
      const res = await fetch("/api/admin/grade-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_programs", grade_id: grade.id, program_ids: selectAll ? programs.map((p) => p.id) : [] }),
      });
      if (!res.ok) return;
      setAccessSet((prev) => {
        const next = new Set(prev);
        programs.forEach((p) => {
          if (selectAll) next.add(`${grade.id}:${p.id}`);
          else next.delete(`${grade.id}:${p.id}`);
        });
        return next;
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-xs text-subtext font-medium p-3 sticky left-0 bg-surface z-10 min-w-[120px]">
              등급 / 프로그램
            </th>
            <th className="text-center text-xs text-subtext font-medium p-3 min-w-[80px]">전체 선택/해제</th>
            {programs.map((p) => (
              <th key={p.id} className="text-center text-xs text-subtext font-medium p-3 min-w-[100px]">
                <div className="truncate max-w-[100px]" title={p.name}>{p.name}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grades.map((grade) => (
            <tr key={grade.id} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="p-3 sticky left-0 bg-surface z-10">
                <div className="flex items-center gap-2">
                  {grade.color && (
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: grade.color }}
                    />
                  )}
                  <span className="text-white font-medium">{grade.name}</span>
                </div>
              </td>
              <td className="p-3 text-center">
                {(() => {
                  const checkedCount = programs.filter((p) => accessSet.has(`${grade.id}:${p.id}`)).length;
                  const all = programs.length > 0 && checkedCount === programs.length;
                  return (
                    <label className="inline-flex flex-col items-center gap-0.5 cursor-pointer" title="이 등급의 모든 프로그램을 한 번에 선택/해제">
                      <input
                        type="checkbox"
                        checked={all}
                        ref={(el) => { if (el) el.indeterminate = checkedCount > 0 && !all; }}
                        disabled={loading === `row:${grade.id}`}
                        onChange={() => toggleRow(grade, !all)}
                        className="w-4 h-4 accent-gold"
                      />
                      <span className="text-[10px] text-subtext">{checkedCount}/{programs.length}</span>
                    </label>
                  );
                })()}
              </td>
              {programs.map((program) => {
                const key = `${grade.id}:${program.id}`;
                const checked = accessSet.has(key);
                const isLoading = loading === key;

                return (
                  <td key={program.id} className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(grade.id, program.id)}
                      disabled={isLoading}
                      className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center mx-auto ${
                        checked
                          ? "bg-gold/20 text-gold border border-gold/40"
                          : "bg-white/5 text-white/20 border border-white/10 hover:bg-white/10 hover:text-white/40"
                      } ${isLoading ? "opacity-50" : ""}`}
                    >
                      {checked ? "✓" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {programs.length === 0 && (
        <div className="text-center py-12 text-subtext">
          <p>등록된 프로그램이 없습니다.</p>
        </div>
      )}
      {grades.length === 0 && (
        <div className="text-center py-12 text-subtext">
          <p>등록된 등급이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
