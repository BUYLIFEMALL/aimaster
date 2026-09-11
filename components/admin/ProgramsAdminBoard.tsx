"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Eye, EyeOff, ExternalLink, CheckSquare, Square, ArrowUp, ArrowDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";
import { getContrastTextColor } from "@/lib/utils/color";
import type { Category, MemberGrade, Program } from "@/types/database.types";

type BadgeValue = Program["badges"][number];

interface ProgramRow {
  id: string;
  name: string;
  slug: string;
  app_url: string | null;
  is_active: boolean;
  sort_order: number;
  category_id: string | null;
  required_grade_id: string | null;
  badges: BadgeValue[];
}

interface ProgramsAdminBoardProps {
  programs: ProgramRow[];
  categories: Category[];
  grades: MemberGrade[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "공개유무" },
  { value: "active", label: "공개" },
  { value: "inactive", label: "비공개" },
] as const;

const BADGE_OPTIONS: { value: BadgeValue; label: string }[] = [
  { value: "free", label: "FREE" },
  { value: "new", label: "NEW" },
  { value: "best", label: "BEST" },
  { value: "sale", label: "SALE" },
  { value: "coming", label: "COMING SOON" },
];

const NONE_VALUE = "__none__";
const UNCATEGORIZED_KEY = "__uncategorized__";

export default function ProgramsAdminBoard({ programs: initialPrograms, categories: initialCategories, grades }: ProgramsAdminBoardProps) {
  const supabase = createClient();
  const [programs, setPrograms] = useState(initialPrograms);
  const [categories, setCategories] = useState(initialCategories);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState("");
  const [bulkGradeValue, setBulkGradeValue] = useState("");
  const [bulkBadgeValues, setBulkBadgeValues] = useState<Set<BadgeValue>>(new Set());

  const gradeMeta = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (categoryFilter !== "all") {
        const key = p.category_id ?? UNCATEGORIZED_KEY;
        if (key !== categoryFilter) return false;
      }
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;
      if (gradeFilter !== "all") {
        const key = p.required_grade_id ?? NONE_VALUE;
        if (key !== gradeFilter) return false;
      }
      if (badgeFilter !== "all") {
        const hasBadge = badgeFilter === NONE_VALUE ? p.badges.length === 0 : p.badges.includes(badgeFilter as BadgeValue);
        if (!hasBadge) return false;
      }
      return true;
    });
  }, [programs, categoryFilter, statusFilter, gradeFilter, badgeFilter]);

  const sortedCategoriesForGrouping = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );

  const groups = useMemo(() => {
    const byCategory = new Map<string, ProgramRow[]>();
    for (const p of filteredPrograms) {
      const key = p.category_id ?? UNCATEGORIZED_KEY;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(p);
    }

    const categoryMeta = new Map(sortedCategoriesForGrouping.map((c) => [c.id, c]));
    const orderedKeys = [
      ...sortedCategoriesForGrouping.map((c) => c.id).filter((id) => byCategory.has(id)),
      ...(byCategory.has(UNCATEGORIZED_KEY) ? [UNCATEGORIZED_KEY] : []),
    ];

    return orderedKeys.map((key) => ({
      key,
      name: key === UNCATEGORIZED_KEY ? "미분류" : (categoryMeta.get(key)?.name ?? "알 수 없음"),
      programs: byCategory.get(key)!.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    }));
  }, [filteredPrograms, sortedCategoriesForGrouping]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectGroup = (groupPrograms: ProgramRow[]) => {
    const groupIds = groupPrograms.map((p) => p.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) groupIds.forEach((id) => next.delete(id));
      else groupIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const applyUpdate = async (ids: string[], patch: Partial<Pick<ProgramRow, "is_active" | "required_grade_id" | "badges">>) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from("programs").update(patch).in("id", ids);
    if (error) {
      alert(`변경 중 오류가 발생했습니다: ${error.message}`);
      return;
    }
    setPrograms((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p)));
  };

  const handleBulkStatus = async () => {
    if (selectedIds.size === 0 || !bulkStatusValue) return;
    setBulkLoading(true);
    await applyUpdate([...selectedIds], { is_active: bulkStatusValue === "active" });
    setBulkLoading(false);
    setSelectedIds(new Set());
    setBulkStatusValue("");
  };

  const handleBulkGrade = async () => {
    if (selectedIds.size === 0 || !bulkGradeValue) return;
    setBulkLoading(true);
    await applyUpdate([...selectedIds], { required_grade_id: bulkGradeValue === NONE_VALUE ? null : bulkGradeValue });
    setBulkLoading(false);
    setSelectedIds(new Set());
    setBulkGradeValue("");
  };

  const toggleBulkBadge = (value: BadgeValue) => {
    setBulkBadgeValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  // 체크된 뱃지 조합으로 선택된 프로그램들의 badges를 통째로 교체한다(추가가 아니라 설정).
  // 전부 해제한 채로 적용하면 뱃지를 모두 지우는 것과 같다.
  const handleBulkBadge = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    await applyUpdate([...selectedIds], { badges: [...bulkBadgeValues] });
    setBulkLoading(false);
    setSelectedIds(new Set());
    setBulkBadgeValues(new Set());
  };

  const handleToggleSingle = async (p: ProgramRow) => {
    setPendingIds((prev) => new Set(prev).add(p.id));
    await applyUpdate([p.id], { is_active: !p.is_active });
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(p.id);
      return next;
    });
  };

  // 카테고리 블록 자체의 위/아래 순서(메인 /programs 페이지 노출 순서)를 바꾼다.
  // 카테고리 필터가 걸려 있으면(하나만 보이는 상태) 헷갈리므로 "전체 카테고리"일 때만 노출한다.
  //
  // 단순히 두 항목의 sort_order를 맞바꾸는 방식은 쓰지 않는다 — 실제 데이터에 sort_order가
  // 중복(주로 0)인 행이 많아서, 값이 같은 두 항목을 "맞바꾸면" 0↔0처럼 변화가 없는 것과
  // 똑같아 눈에 보이는 순서가 절대 바뀌지 않는 버그가 있었다(2026-09-11 실사용 중 발견).
  // 그래서 이동할 때마다 전체 그룹을 원하는 순서로 배열한 뒤 0,1,2...로 통째로 다시
  // 번호를 매긴다 — 기존에 어떤 sort_order 값이었든 이번 이동을 계기로 항상 유일한
  // 값으로 정규화되어, 다음 이동부터도 계속 정상 동작한다.
  // 낙관적(optimistic) 업데이트로 처리한다 — 네트워크 왕복이 끝난 뒤에야 화면 순서가
  // 바뀌면, 그 사이(수백 ms) 사용자가 "안 바뀌었네" 하고 같은 자리를 또 클릭하는 순간
  // 이미 그 자리엔 다른 항목이 올라와 있어(방금 이동한 항목이 그 자리를 벗어났으므로)
  // 엉뚱한 항목이 움직이거나, 화면 갱신 전에 겹쳐 들어온 두 번째 클릭이 아직 갱신 안 된
  // 옛 배열을 기준으로 계산돼 두 번째 이동이 씹히는 문제가 있었다(2026-09-11 실사용 중
  // "한 번은 되는데 두 번째는 안 움직인다"로 재현). 그래서 클릭하자마자 로컬 state부터
  // 새 순서로 즉시 반영하고, DB 반영은 그 뒤에 백그라운드로 실행한다 — 실패하면 그때
  // 화면을 원래 상태로 되돌린다.
  const moveCategory = async (category: Category, direction: "up" | "down") => {
    const index = sortedCategoriesForGrouping.findIndex((c) => c.id === category.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategoriesForGrouping.length) return;

    const reordered = [...sortedCategoriesForGrouping];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const updates = reordered.map((c, i) => ({ id: c.id, sort_order: i }));
    const sortMap = new Map(updates.map((u) => [u.id, u.sort_order]));

    const previous = categories;
    setCategories((prev) => prev.map((c) => (sortMap.has(c.id) ? { ...c, sort_order: sortMap.get(c.id)! } : c)));

    const results = await Promise.all(
      updates.map((u) => supabase.from("categories").update({ sort_order: u.sort_order }).eq("id", u.id)),
    );

    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      alert(`순서 변경 중 오류가 발생했습니다: ${firstError.message}`);
      setCategories(previous);
    }
  };

  // 같은 카테고리 안에서만 프로그램 순서를 바꾼다 — groupPrograms는 이미 sort_order순 정렬됨.
  // moveCategory와 동일한 이유(낙관적 업데이트)로 클릭 즉시 로컬 state부터 반영한다.
  const moveProgram = async (program: ProgramRow, groupPrograms: ProgramRow[], direction: "up" | "down") => {
    const index = groupPrograms.findIndex((p) => p.id === program.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groupPrograms.length) return;

    const reordered = [...groupPrograms];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
    const sortMap = new Map(updates.map((u) => [u.id, u.sort_order]));

    const previous = programs;
    setPrograms((prev) => prev.map((p) => (sortMap.has(p.id) ? { ...p, sort_order: sortMap.get(p.id)! } : p)));

    const results = await Promise.all(
      updates.map((u) => supabase.from("programs").update({ sort_order: u.sort_order }).eq("id", u.id)),
    );

    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      alert(`순서 변경 중 오류가 발생했습니다: ${firstError.message}`);
      setPrograms(previous);
    }
  };

  return (
    <div>
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-dark sm:w-56"
        >
          <option value="all">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={UNCATEGORIZED_KEY}>미분류</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="input-dark sm:w-40"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="input-dark sm:w-44"
        >
          <option value="all">전체 접근등급</option>
          <option value={NONE_VALUE}>전체 공개 (등급 제한 없음)</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={badgeFilter}
          onChange={(e) => setBadgeFilter(e.target.value)}
          className="input-dark sm:w-40"
        >
          <option value="all">전체 추천뱃지</option>
          <option value={NONE_VALUE}>뱃지 없음</option>
          {BADGE_OPTIONS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-subtext sm:ml-auto">
          {filteredPrograms.length}개 표시 중 (전체 {programs.length}개)
        </p>
      </div>

      {/* 상단 고정 일괄 처리 툴바 — 항상 노출, 선택 없으면 컨트롤만 비활성화 */}
      <div className="flex flex-wrap items-center gap-3 mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
        <button
          type="button"
          onClick={() =>
            setSelectedIds(
              filteredPrograms.every((p) => selectedIds.has(p.id)) && filteredPrograms.length > 0
                ? new Set()
                : new Set(filteredPrograms.map((p) => p.id))
            )
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-subtext hover:text-white transition-colors shrink-0"
        >
          {filteredPrograms.length > 0 && filteredPrograms.every((p) => selectedIds.has(p.id)) ? (
            <CheckSquare size={16} className="text-gold" />
          ) : (
            <Square size={16} />
          )}
          현재 목록 전체 선택
        </button>

        <span className="text-sm text-white font-medium shrink-0">{selectedIds.size}개 선택됨</span>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        <div className="flex items-center gap-1.5">
          <select
            value={bulkStatusValue}
            onChange={(e) => setBulkStatusValue(e.target.value)}
            disabled={selectedIds.size === 0}
            className="input-dark text-xs py-1.5 !w-auto disabled:opacity-40"
          >
            <option value="">공개유무 변경...</option>
            <option value="active">공개</option>
            <option value="inactive">비공개</option>
          </select>
          <button
            type="button"
            disabled={bulkLoading || selectedIds.size === 0 || !bulkStatusValue}
            onClick={handleBulkStatus}
            className="text-xs font-medium bg-white/10 text-subtext hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            적용
          </button>
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        <div className="flex items-center gap-1.5">
          <select
            value={bulkGradeValue}
            onChange={(e) => setBulkGradeValue(e.target.value)}
            disabled={selectedIds.size === 0}
            className="input-dark text-xs py-1.5 !w-auto disabled:opacity-40"
          >
            <option value="">접근등급 변경...</option>
            <option value={NONE_VALUE}>전체 공개 (등급 제한 없음)</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={bulkLoading || selectedIds.size === 0 || !bulkGradeValue}
            onClick={handleBulkGrade}
            className="text-xs font-medium bg-white/10 text-subtext hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            적용
          </button>
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-subtext shrink-0">추천 뱃지(복수 선택)</span>
          <div className="flex items-center gap-2 flex-wrap">
            {BADGE_OPTIONS.map((b) => (
              <label
                key={b.value}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg cursor-pointer select-none ${
                  selectedIds.size === 0 ? "opacity-40 cursor-not-allowed" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={bulkBadgeValues.has(b.value)}
                  onChange={() => toggleBulkBadge(b.value)}
                  disabled={selectedIds.size === 0}
                  className="rounded border-white/20 bg-white/5 accent-gold"
                />
                {b.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={bulkLoading || selectedIds.size === 0}
            onClick={handleBulkBadge}
            className="text-xs font-medium bg-white/10 text-subtext hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
          >
            적용
          </button>
        </div>

        <div className="flex-1" />
        <button
          type="button"
          disabled={selectedIds.size === 0}
          onClick={() => setSelectedIds(new Set())}
          className="text-xs text-subtext hover:text-white px-2 py-1.5 disabled:opacity-40"
        >
          선택 해제
        </button>
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="glass-card rounded-2xl text-center py-12">
          <p className="text-subtext">조건에 맞는 프로그램이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const groupIds = group.programs.map((p) => p.id);
            const allSelected = groupIds.every((id) => selectedIds.has(id));
            const category = group.key === UNCATEGORIZED_KEY ? null : sortedCategoriesForGrouping.find((c) => c.id === group.key);
            const realCategoryCount = sortedCategoriesForGrouping.length;
            const categoryIndex = category ? sortedCategoriesForGrouping.findIndex((c) => c.id === category.id) : -1;
            const canReorderCategory = categoryFilter === "all" && category;
            return (
              <div key={group.key} className="glass-card rounded-2xl p-0 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gold/20 bg-gold/[0.06]">
                  <button
                    type="button"
                    onClick={() => toggleSelectGroup(group.programs)}
                    className="text-subtext hover:text-gold transition-colors shrink-0"
                    title="그룹 전체 선택/해제"
                  >
                    {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <span className="w-1 self-stretch rounded-full bg-gold/60 shrink-0" />
                  <h2 className="text-lg font-extrabold tracking-tight text-white">{group.name}</h2>
                  <span className="text-xs font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    {group.programs.length}개
                  </span>
                  {canReorderCategory && (
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="카테고리 위로 이동"
                        disabled={categoryIndex <= 0}
                        onClick={() => moveCategory(category, "up")}
                        className="rounded-lg p-1.5 text-subtext hover:bg-white/10 hover:text-gold transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        title="카테고리 아래로 이동"
                        disabled={categoryIndex >= realCategoryCount - 1}
                        onClick={() => moveCategory(category, "down")}
                        className="rounded-lg p-1.5 text-subtext hover:bg-white/10 hover:text-gold transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <tbody>
                      {group.programs.map((p, programIndex) => (
                        <tr key={p.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors">
                          <td className="p-4 w-16">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                title="위로 이동"
                                disabled={programIndex === 0}
                                onClick={() => moveProgram(p, group.programs, "up")}
                                className="rounded p-1 text-subtext hover:bg-white/10 hover:text-gold transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                title="아래로 이동"
                                disabled={programIndex === group.programs.length - 1}
                                onClick={() => moveProgram(p, group.programs, "down")}
                                className="rounded p-1 text-subtext hover:bg-white/10 hover:text-gold transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 w-10">
                            <button
                              type="button"
                              onClick={() => toggleSelect(p.id)}
                              className="text-subtext hover:text-gold transition-colors"
                            >
                              {selectedIds.has(p.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <p className="text-white font-medium text-sm">{p.name}</p>
                              {p.app_url && (
                                <span title={`실행형 프로그램: ${p.app_url}`}>
                                  <ExternalLink size={12} className="text-gold" />
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                              <p className="text-subtext text-xs">/programs/{p.slug}</p>
                              {(() => {
                                const gradeColor = p.required_grade_id ? (gradeMeta.get(p.required_grade_id)?.color ?? "#666666") : "#ffffff";
                                return (
                                  <span
                                    className="inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: gradeColor, color: getContrastTextColor(gradeColor) }}
                                  >
                                    {p.required_grade_id ? (gradeMeta.get(p.required_grade_id)?.name ?? "알 수 없음") : "전체 공개"}
                                  </span>
                                );
                              })()}
                              {p.badges.map((b) => (
                                <Badge key={b} variant={b} className="text-[11px] px-1.5 py-0.5" />
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              disabled={pendingIds.has(p.id)}
                              onClick={() => handleToggleSingle(p)}
                              title="클릭해서 공개/비공개 전환"
                              className="disabled:opacity-40"
                            >
                              {p.is_active ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full hover:bg-yellow-400/30 transition-colors">
                                  <Eye size={10} />
                                  공개
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full hover:bg-red-500/30 transition-colors">
                                  <EyeOff size={10} />
                                  비공개
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <Link href={`/admin/programs/${p.id}/edit`}>
                              <button className="inline-flex items-center gap-1.5 text-sm text-subtext hover:text-gold hover:bg-gold/10 px-3 py-1.5 rounded-lg transition-colors">
                                <Pencil size={13} />
                                편집
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
