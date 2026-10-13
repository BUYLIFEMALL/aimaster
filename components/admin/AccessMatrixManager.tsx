"use client";

import { useMemo, useState } from "react";
import type { MemberGrade, Program } from "@/types/database.types";

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

interface AccessMatrixProps {
  grades: MemberGrade[];
  programs: Program[];
  /** 프로그램 관리와 같은 카테고리(정렬 순서 포함). 프로그램의 category_id로 묶는다 */
  categories?: CategoryRow[];
  initialAccess: { grade_id: string; program_id: string }[];
}

type CheckState = "all" | "some" | "none";

/** 모든 체크 칸(개별·카테고리·등급 전체)이 같은 모양의 체크박스 버튼을 쓴다 — 전체 선택이면 ✓, 해제하면 비워진다 */
function CheckButton({ state, onClick, disabled, label, small = false }: { state: CheckState; onClick: () => void; disabled?: boolean; label: string; small?: boolean }) {
  const size = small ? "w-7 h-7 text-sm" : "w-8 h-8";
  const tone =
    state === "all"
      ? "bg-gold/20 text-gold border border-gold/40"
      : state === "some"
        ? "bg-white/5 text-white/20 border border-dashed border-gold/50 hover:bg-white/10"
        : "bg-white/5 text-white/20 border border-white/10 hover:bg-white/10 hover:text-white/40";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "all"}
      aria-label={label}
      title={label}
      className={`${size} rounded-lg transition-all flex items-center justify-center mx-auto ${tone} ${disabled ? "opacity-50" : ""}`}
    >
      {state === "all" ? "✓" : ""}
    </button>
  );
}

export default function AccessMatrixManager({ grades, programs, categories = [], initialAccess }: AccessMatrixProps) {
  const [accessSet, setAccessSet] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialAccess.forEach((a) => s.add(`${a.grade_id}:${a.program_id}`));
    return s;
  });
  const [loading, setLoading] = useState<string | null>(null);

  // 프로그램 관리와 같은 규칙: 카테고리는 sort_order 순, 카테고리 안 프로그램은 sort_order → 이름 순, 카테고리 없는 것은 맨 아래 "미분류"
  const groups = useMemo(() => {
    const known = new Map(categories.map((c) => [c.id, c]));
    const byCategory = new Map<string, Program[]>();
    for (const p of programs) {
      const key = p.category_id && known.has(p.category_id) ? p.category_id : "__uncategorized__";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(p);
    }
    const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const keys = [
      ...sortedCategories.map((c) => c.id).filter((id) => byCategory.has(id)),
      ...(byCategory.has("__uncategorized__") ? ["__uncategorized__"] : []),
    ];
    return keys.map((key) => ({
      key,
      name: key === "__uncategorized__" ? "미분류" : known.get(key)!.name,
      programs: byCategory.get(key)!.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    }));
  }, [programs, categories]);

  const setMany = (gradeId: string, ids: string[], on: boolean) =>
    setAccessSet((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(`${gradeId}:${id}`) : next.delete(`${gradeId}:${id}`)));
      return next;
    });

  const toggle = async (gradeId: string, programId: string) => {
    const key = `${gradeId}:${programId}`;
    const hasAccess = accessSet.has(key);
    const action = hasAccess ? "revoke" : "grant";

    setLoading(key);
    setMany(gradeId, [programId], !hasAccess); // 먼저 화면에 반영

    try {
      const res = await fetch("/api/admin/access-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade_id: gradeId, program_id: programId, action }),
      });
      if (!res.ok) setMany(gradeId, [programId], hasAccess); // 실패하면 되돌림
    } catch {
      setMany(gradeId, [programId], hasAccess);
    } finally {
      setLoading(null);
    }
  };

  /** 등급 한 열 전체 선택/해제 — 한 번의 저장으로 처리하고(자동 부여 등급이면 회원 권한도 함께 부여·회수) 확인 후 진행한다 */
  const toggleGrade = async (grade: MemberGrade, selectAll: boolean) => {
    const label = selectAll ? "전체 선택" : "전체 해제";
    const note = grade.auto_grant
      ? "자동 부여가 켜진 등급이라 회원 권한도 함께 " + (selectAll ? "부여" : "회수(자동 부여분만)") + "됩니다."
      : "";
    if (!confirm(`[${grade.name}] 프로그램 ${programs.length}개를 ${label}합니다. ${note} 진행할까요?`)) return;
    setLoading(`col:${grade.id}`);
    try {
      const res = await fetch("/api/admin/grade-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_programs", grade_id: grade.id, program_ids: selectAll ? programs.map((p) => p.id) : [] }),
      });
      if (!res.ok) return;
      setMany(grade.id, programs.map((p) => p.id), selectAll);
    } finally {
      setLoading(null);
    }
  };

  /** 카테고리 하나의 프로그램만 한꺼번에 선택/해제(프로그램별 저장 API를 같은 방식으로 호출) */
  const toggleCategory = async (grade: MemberGrade, categoryName: string, items: Program[], selectAll: boolean) => {
    const targets = items.filter((p) => accessSet.has(`${grade.id}:${p.id}`) !== selectAll);
    if (targets.length === 0) return;
    const note = grade.auto_grant ? " 자동 부여가 켜진 등급이라 회원 권한도 함께 처리됩니다." : "";
    if (!confirm(`[${grade.name}] ${categoryName} 프로그램 ${targets.length}개를 ${selectAll ? "선택" : "해제"}합니다.${note} 진행할까요?`)) return;
    const loadingKey = `cat:${grade.id}:${categoryName}`;
    setLoading(loadingKey);
    setMany(grade.id, targets.map((p) => p.id), selectAll);
    try {
      const results = await Promise.all(
        targets.map(async (p) => {
          try {
            const res = await fetch("/api/admin/access-matrix", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ grade_id: grade.id, program_id: p.id, action: selectAll ? "grant" : "revoke" }),
            });
            return res.ok ? null : p.id;
          } catch {
            return p.id;
          }
        }),
      );
      const failed = results.filter((id): id is string => !!id);
      if (failed.length) setMany(grade.id, failed, !selectAll); // 실패한 것만 되돌림
    } finally {
      setLoading(null);
    }
  };

  const stateOf = (gradeId: string, items: Program[]): CheckState => {
    const checked = items.filter((p) => accessSet.has(`${gradeId}:${p.id}`)).length;
    return items.length > 0 && checked === items.length ? "all" : checked > 0 ? "some" : "none";
  };
  const countOf = (gradeId: string, items: Program[]) => items.filter((p) => accessSet.has(`${gradeId}:${p.id}`)).length;

  let rowNumber = 0;

  // 세로 배치: 위쪽에 등급(일반|실버|골드|VIP) 열, 왼쪽에 프로그램을 카테고리별로 묶어 세로 목록으로 나열한다.
  return (
    <div className="max-h-[75vh] overflow-y-auto overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 z-20 bg-surface">
          <tr>
            <th className="text-left text-xs text-subtext font-medium p-3 border-b border-white/10 min-w-[150px] sm:min-w-[200px] bg-surface">
              프로그램 <span className="text-white/40">({programs.length})</span>
            </th>
            {grades.map((grade) => {
              const state = stateOf(grade.id, programs);
              return (
                <th key={grade.id} className="p-3 border-b border-white/10 min-w-[96px] sm:min-w-[120px] bg-surface font-normal">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-2">
                      {grade.color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: grade.color }} />}
                      <span className="text-white font-medium text-sm whitespace-nowrap">{grade.name}</span>
                    </div>
                    <div className="relative inline-block">
                      <CheckButton
                        state={state}
                        disabled={loading === `col:${grade.id}`}
                        onClick={() => toggleGrade(grade, state !== "all")}
                        label={`${grade.name} 전체 ${state === "all" ? "해제" : "선택"}`}
                      />
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 text-[11px] text-subtext whitespace-nowrap">전체 {countOf(grade.id, programs)}/{programs.length}</span>
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows key={group.key}>
              <tr className="bg-white/[0.04]">
                <td className="p-3 border-b border-white/10 border-l-2 border-l-gold/60">
                  <span className="text-white font-bold">{group.name}</span>
                  <span className="ml-2 text-xs text-subtext">{group.programs.length}개</span>
                </td>
                {grades.map((grade) => (
                  <td key={grade.id} className="p-2 border-b border-white/10 text-center">
                    <div className="relative inline-block">
                      <CheckButton
                        small
                        state={stateOf(grade.id, group.programs)}
                        disabled={loading === `cat:${grade.id}:${group.name}`}
                        onClick={() => toggleCategory(grade, group.name, group.programs, stateOf(grade.id, group.programs) !== "all")}
                        label={`${grade.name} · ${group.name} 전체 ${stateOf(grade.id, group.programs) === "all" ? "해제" : "선택"}`}
                      />
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 text-[10px] text-subtext whitespace-nowrap">{countOf(grade.id, group.programs)}/{group.programs.length}</span>
                    </div>
                  </td>
                ))}
              </tr>
              {group.programs.map((program) => {
                rowNumber += 1;
                return (
                  <tr key={program.id} className="hover:bg-white/[0.03]">
                    <td className="p-3 pl-4 border-b border-white/5 text-white">
                      <span className="inline-block w-7 text-xs text-white/30">{rowNumber}</span>
                      <span className="font-medium" title={program.name}>{program.name}</span>
                    </td>
                    {grades.map((grade) => {
                      const key = `${grade.id}:${program.id}`;
                      const checked = accessSet.has(key);
                      return (
                        <td key={grade.id} className="p-2 border-b border-white/5 text-center">
                          <CheckButton
                            state={checked ? "all" : "none"}
                            disabled={loading === key}
                            onClick={() => toggle(grade.id, program.id)}
                            label={`${grade.name} · ${program.name} ${checked ? "허용됨" : "허용 안 됨"}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </GroupRows>
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

/** tbody 안에서 여러 행을 한 묶음으로 반환하기 위한 래퍼 */
function GroupRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
