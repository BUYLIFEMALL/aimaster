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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-xs text-subtext font-medium p-3 sticky left-0 bg-surface z-10 min-w-[120px]">
              등급 / 프로그램
            </th>
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
