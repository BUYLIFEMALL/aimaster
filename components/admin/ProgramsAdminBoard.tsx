"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Eye, EyeOff, ExternalLink, CheckSquare, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category, MemberGrade, Program } from "@/types/database.types";

type BadgeValue = NonNullable<Program["badge"]>;

interface ProgramRow {
  id: string;
  name: string;
  slug: string;
  app_url: string | null;
  is_active: boolean;
  sort_order: number;
  category_id: string | null;
  required_grade_id: string | null;
  badge: BadgeValue | null;
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
  { value: "best", label: "BEST" },
  { value: "new", label: "NEW" },
  { value: "sale", label: "SALE" },
  { value: "free", label: "FREE" },
  { value: "coming", label: "COMING SOON" },
];

const NONE_VALUE = "__none__";
const UNCATEGORIZED_KEY = "__uncategorized__";

export default function ProgramsAdminBoard({ programs: initialPrograms, categories, grades }: ProgramsAdminBoardProps) {
  const supabase = createClient();
  const [programs, setPrograms] = useState(initialPrograms);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState("");
  const [bulkGradeValue, setBulkGradeValue] = useState("");
  const [bulkBadgeValue, setBulkBadgeValue] = useState("");

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
        const key = p.badge ?? NONE_VALUE;
        if (key !== badgeFilter) return false;
      }
      return true;
    });
  }, [programs, categoryFilter, statusFilter, gradeFilter, badgeFilter]);

  const groups = useMemo(() => {
    const byCategory = new Map<string, ProgramRow[]>();
    for (const p of filteredPrograms) {
      const key = p.category_id ?? UNCATEGORIZED_KEY;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(p);
    }

    const categoryMeta = new Map(categories.map((c) => [c.id, c]));
    const orderedKeys = [
      ...categories.map((c) => c.id).filter((id) => byCategory.has(id)),
      ...(byCategory.has(UNCATEGORIZED_KEY) ? [UNCATEGORIZED_KEY] : []),
    ];

    return orderedKeys.map((key) => ({
      key,
      name: key === UNCATEGORIZED_KEY ? "미분류" : (categoryMeta.get(key)?.name ?? "알 수 없음"),
      programs: byCategory.get(key)!.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    }));
  }, [filteredPrograms, categories]);

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

  const applyUpdate = async (ids: string[], patch: Partial<Pick<ProgramRow, "is_active" | "required_grade_id" | "badge">>) => {
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

  const handleBulkBadge = async () => {
    if (selectedIds.size === 0 || !bulkBadgeValue) return;
    setBulkLoading(true);
    await applyUpdate([...selectedIds], { badge: bulkBadgeValue === NONE_VALUE ? null : (bulkBadgeValue as BadgeValue) });
    setBulkLoading(false);
    setSelectedIds(new Set());
    setBulkBadgeValue("");
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

        <div className="flex items-center gap-1.5">
          <select
            value={bulkBadgeValue}
            onChange={(e) => setBulkBadgeValue(e.target.value)}
            disabled={selectedIds.size === 0}
            className="input-dark text-xs py-1.5 !w-auto disabled:opacity-40"
          >
            <option value="">추천 뱃지 변경...</option>
            <option value={NONE_VALUE}>없음</option>
            {BADGE_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={bulkLoading || selectedIds.size === 0 || !bulkBadgeValue}
            onClick={handleBulkBadge}
            className="text-xs font-medium bg-white/10 text-subtext hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
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
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <tbody>
                      {group.programs.map((p) => (
                        <tr key={p.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors">
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
                              <span
                                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-subtext"
                                style={p.required_grade_id ? { color: gradeMeta.get(p.required_grade_id)?.color ?? undefined } : undefined}
                              >
                                {p.required_grade_id && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: gradeMeta.get(p.required_grade_id)?.color ?? "#666" }}
                                  />
                                )}
                                {p.required_grade_id ? (gradeMeta.get(p.required_grade_id)?.name ?? "알 수 없음") : "전체 공개"}
                              </span>
                              {p.badge && (
                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-gold/10 text-gold">
                                  {BADGE_OPTIONS.find((b) => b.value === p.badge)?.label ?? p.badge}
                                </span>
                              )}
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
                                <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full hover:bg-emerald-500/30 transition-colors">
                                  <Eye size={10} />
                                  공개
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs bg-white/10 text-subtext px-2 py-0.5 rounded-full hover:bg-white/20 transition-colors">
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
