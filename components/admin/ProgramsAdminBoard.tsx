"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Eye, EyeOff, ExternalLink, CheckSquare, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database.types";

interface ProgramRow {
  id: string;
  name: string;
  slug: string;
  app_url: string | null;
  is_active: boolean;
  sort_order: number;
  category_id: string | null;
}

interface ProgramsAdminBoardProps {
  programs: ProgramRow[];
  categories: Category[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "전체 상태" },
  { value: "active", label: "공개" },
  { value: "inactive", label: "비공개" },
] as const;

const UNCATEGORIZED_KEY = "__uncategorized__";

export default function ProgramsAdminBoard({ programs: initialPrograms, categories }: ProgramsAdminBoardProps) {
  const supabase = createClient();
  const [programs, setPrograms] = useState(initialPrograms);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (categoryFilter !== "all") {
        const key = p.category_id ?? UNCATEGORIZED_KEY;
        if (key !== categoryFilter) return false;
      }
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;
      return true;
    });
  }, [programs, categoryFilter, statusFilter]);

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

  const applyIsActive = async (ids: string[], isActive: boolean) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from("programs").update({ is_active: isActive }).in("id", ids);
    if (error) {
      alert(`상태 변경 중 오류가 발생했습니다: ${error.message}`);
      return;
    }
    setPrograms((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, is_active: isActive } : p)));
  };

  const handleBulk = async (isActive: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    await applyIsActive([...selectedIds], isActive);
    setBulkLoading(false);
    setSelectedIds(new Set());
  };

  const handleToggleSingle = async (p: ProgramRow) => {
    setPendingIds((prev) => new Set(prev).add(p.id));
    await applyIsActive([p.id], !p.is_active);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(p.id);
      return next;
    });
  };

  return (
    <div>
      {/* 필터 바 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
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
        <p className="text-xs text-subtext self-center sm:ml-auto">
          {filteredPrograms.length}개 표시 중 (전체 {programs.length}개)
        </p>
      </div>

      {/* 선택 시 일괄 처리 툴바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
          <span className="text-sm text-white font-medium">{selectedIds.size}개 선택됨</span>
          <div className="flex-1" />
          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => handleBulk(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Eye size={13} /> 일괄 공개
          </button>
          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => handleBulk(false)}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 text-subtext hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <EyeOff size={13} /> 일괄 비공개
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-subtext hover:text-white px-2 py-1.5"
          >
            선택 해제
          </button>
        </div>
      )}

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
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => toggleSelectGroup(group.programs)}
                    className="text-subtext hover:text-gold transition-colors"
                    title="그룹 전체 선택/해제"
                  >
                    {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <h2 className="text-sm font-bold text-white">{group.name}</h2>
                  <span className="text-xs text-subtext">{group.programs.length}개</span>
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
                            <p className="text-subtext text-xs mt-0.5">/programs/{p.slug}</p>
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
