"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Search, Ban, RotateCcw, Trash2, CalendarClock, UserPlus, Layers } from "lucide-react";
import MemberGradeSelect from "@/components/admin/MemberGradeSelect";
import SetExpiryModal from "@/components/admin/SetExpiryModal";
import AddMembersToGradeModal from "@/components/admin/AddMembersToGradeModal";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Profile, MemberGrade, Program } from "@/types/database.types";

interface MemberExpiryInfo {
  soonest: string | null;
  hasLifetime: boolean;
  count: number;
}

interface MembersTableProps {
  members: Profile[];
  grades: MemberGrade[];
  /** user_id → 활성 구독 만료 요약(가장 이른 만료일/평생 여부/개수). 없으면 활성 구독 없음. */
  expiryByUserId?: Record<string, MemberExpiryInfo>;
  /** 목록에서 바로 "만료일 설정" 모달을 열 때 고를 프로그램 목록. */
  programs?: Pick<Program, "id" | "name">[];
}

export default function MembersTable({ members, grades, expiryByUserId = {}, programs = [] }: MembersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expirySettingMembers, setExpirySettingMembers] = useState<Profile[] | null>(null);
  const [bulkGradeId, setBulkGradeId] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [suspendOverrides, setSuspendOverrides] = useState<Map<string, boolean>>(new Map());
  const [gradeOverrides, setGradeOverrides] = useState<Map<string, string | null>>(new Map());
  const [expiryOverrides, setExpiryOverrides] = useState<Map<string, MemberExpiryInfo>>(new Map());

  const mergedExpiryByUserId = useMemo(() => {
    const map = { ...expiryByUserId };
    expiryOverrides.forEach((val, userId) => {
      map[userId] = val;
    });
    return map;
  }, [expiryByUserId, expiryOverrides]);

  const visibleMembers = useMemo(
    () =>
      members
        .filter((m) => !removedIds.has(m.id))
        .map((m) => {
          let next = m;
          if (suspendOverrides.has(m.id)) {
            next = { ...next, is_suspended: suspendOverrides.get(m.id)! };
          }
          if (gradeOverrides.has(m.id)) {
            next = { ...next, grade_id: gradeOverrides.get(m.id)! };
          }
          return next;
        }),
    [members, removedIds, suspendOverrides, gradeOverrides],
  );

  // 등급 카테고리별 실시간 인원수 집계
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: visibleMembers.length,
      unassigned: 0,
    };
    for (const g of grades) {
      counts[g.id] = 0;
    }
    for (const m of visibleMembers) {
      if (!m.grade_id) {
        counts.unassigned = (counts.unassigned || 0) + 1;
      } else if (counts[m.grade_id] !== undefined) {
        counts[m.grade_id] += 1;
      }
    }
    return counts;
  }, [visibleMembers, grades]);

  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 검색어나 등급 필터 카테고리가 바뀌면 페이지 1로 리셋
  const filtered = useMemo(() => {
    let result = visibleMembers;

    if (selectedGradeId === "unassigned") {
      result = result.filter((m) => !m.grade_id);
    } else if (selectedGradeId !== "all") {
      result = result.filter((m) => m.grade_id === selectedGradeId);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [visibleMembers, selectedGradeId, search]);

  // 검색어/등급필터 변경 시 첫 페이지로 이동
  useMemo(() => {
    setCurrentPage(1);
  }, [search, selectedGradeId, pageSize]);

  const totalFilteredCount = filtered.length;
  const numericPageSize = pageSize === "all" ? totalFilteredCount || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / numericPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMembers = useMemo(() => {
    if (pageSize === "all") return filtered;
    const start = (safeCurrentPage - 1) * numericPageSize;
    return filtered.slice(start, start + numericPageSize);
  }, [filtered, pageSize, safeCurrentPage, numericPageSize]);

  const startMemberNum = totalFilteredCount === 0 ? 0 : (safeCurrentPage - 1) * numericPageSize + 1;
  const endMemberNum = Math.min(totalFilteredCount, safeCurrentPage * numericPageSize);

  // 넘버링 버튼 번호 배열 생성 (예: 현재 페이지 기준 최대 5개 번호 노출)
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let startPage = Math.max(1, safeCurrentPage - Math.floor(maxButtons / 2));
    let endPage = startPage + maxButtons - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [safeCurrentPage, totalPages]);

  const activeTargetGrade = useMemo(
    () => grades.find((g) => g.id === selectedGradeId),
    [grades, selectedGradeId],
  );

  const availableForAdd = useMemo(
    () => visibleMembers.filter((m) => m.grade_id !== selectedGradeId),
    [visibleMembers, selectedGradeId],
  );

  const selectableFiltered = useMemo(() => filtered.filter((m) => !m.is_admin), [filtered]);
  const allSelectableChecked =
    selectableFiltered.length > 0 && selectableFiltered.every((m) => selectedIds.has(m.id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allSelectableChecked) {
        const next = new Set(prev);
        selectableFiltered.forEach((m) => next.delete(m.id));
        return next;
      }
      const next = new Set(prev);
      selectableFiltered.forEach((m) => next.add(m.id));
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assignGradeToUsers(userIds: string[], targetGradeId: string | null) {
    setGradeOverrides((prev) => {
      const next = new Map(prev);
      userIds.forEach((id) => next.set(id, targetGradeId));
      return next;
    });
    try {
      const res = await fetch("/api/admin/grades/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: userIds, grade_id: targetGradeId }),
      });
      if (!res.ok) {
        alert("등급 이동 처리 실패");
      }
      router.refresh();
    } catch {
      alert("등급 이동 중 오류가 발생했습니다.");
    }
  }

  async function bulkDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}명을 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    setBulkPending(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: ids }),
      });
      if (!res.ok) {
        alert("일괄 삭제 요청이 실패했습니다.");
        return;
      }
      const data: { results: { user_id: string; success: boolean; error?: string }[] } = await res.json();
      const succeededIds = data.results.filter((r) => r.success).map((r) => r.user_id);
      const failed = data.results.filter((r) => !r.success);

      if (succeededIds.length > 0) {
        setRemovedIds((prev) => {
          const next = new Set(prev);
          succeededIds.forEach((id) => next.add(id));
          return next;
        });
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        succeededIds.forEach((id) => next.delete(id));
        return next;
      });

      if (failed.length > 0) {
        alert(
          `${succeededIds.length}명 삭제됨, ${failed.length}명은 건너뜀:\n` +
            failed.map((f) => `- ${f.error}`).join("\n"),
        );
      }
      router.refresh();
    } catch {
      alert("일괄 삭제 중 오류가 발생했습니다.");
    } finally {
      setBulkPending(false);
    }
  }

  async function bulkChangeGrade() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const gradeLabel = bulkGradeId
      ? grades.find((g) => g.id === bulkGradeId)?.name ?? "선택한 등급"
      : "미배정";
    if (!confirm(`선택한 ${ids.length}명의 등급을 "${gradeLabel}"(으)로 한 번에 바꿀까요?`)) {
      return;
    }
    setBulkPending(true);
    try {
      await assignGradeToUsers(ids, bulkGradeId || null);
    } finally {
      setBulkPending(false);
    }
  }

  async function toggleSuspend(member: Profile) {
    const nextSuspended = !member.is_suspended;
    if (nextSuspended && !confirm(`${member.name ?? member.email} 님을 정지할까요? 정지 중에는 결제한 프로그램도 이용할 수 없게 됩니다.`)) {
      return;
    }
    setPendingId(member.id);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: member.id, is_suspended: nextSuspended }),
      });
      if (!res.ok) {
        let message = "처리 실패";
        try {
          message = (await res.json()).error || message;
        } catch {
          message = `처리 실패 (서버 오류 ${res.status})`;
        }
        alert(message);
        return;
      }
      setSuspendOverrides((prev) => new Map(prev).set(member.id, nextSuspended));
      router.refresh();
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  async function deleteMember(member: Profile) {
    if (!confirm(`${member.name ?? member.email} 님을 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    setPendingId(member.id);
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: member.id }),
      });
      if (!res.ok) {
        let message = "삭제 실패";
        try {
          message = (await res.json()).error || message;
        } catch {
          message = `삭제 실패 (서버 오류 ${res.status})`;
        }
        alert(message);
        return;
      }
      setRemovedIds((prev) => new Set(prev).add(member.id));
      router.refresh();
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {/* 1. 상단 등급별 카테고리 탭 바 (Grade Category Tabs) */}
      <div className="glass-card p-3 mb-6 flex flex-wrap items-center justify-between gap-3 border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-gold text-xs font-semibold px-2.5 py-1 bg-gold/10 rounded-lg border border-gold/20 mr-1">
            <Layers size={14} />
            등급 카테고리
          </div>

          <button
            onClick={() => setSelectedGradeId("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              selectedGradeId === "all"
                ? "bg-gold text-black font-bold shadow-md shadow-gold/20"
                : "bg-white/5 text-subtext hover:text-white hover:bg-white/10 border border-white/10",
            )}
          >
            전체
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                selectedGradeId === "all" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-white/70",
              )}
            >
              {gradeCounts.all ?? 0}
            </span>
          </button>

          {grades.map((g) => {
            const isSelected = selectedGradeId === g.id;
            const count = gradeCounts[g.id] ?? 0;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGradeId(g.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-gold text-black font-bold shadow-md shadow-gold/20"
                    : "bg-white/5 text-subtext hover:text-white hover:bg-white/10 border border-white/10",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: g.color ?? "#d4af37" }}
                />
                {g.name}
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px]",
                    isSelected ? "bg-black/20 text-black font-bold" : "bg-white/10 text-white/70",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setSelectedGradeId("unassigned")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              selectedGradeId === "unassigned"
                ? "bg-gold text-black font-bold shadow-md shadow-gold/20"
                : "bg-white/5 text-subtext hover:text-white hover:bg-white/10 border border-white/10",
            )}
          >
            미배정
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                selectedGradeId === "unassigned" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-white/70",
              )}
            >
              {gradeCounts.unassigned ?? 0}
            </span>
          </button>
        </div>

        {/* 특정 등급 탭 선택 시 "해당 등급으로 회원 추가/이동" 핫버튼 */}
        {activeTargetGrade && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/40 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-sm hover:border-gold"
          >
            <UserPlus size={14} />
            + [{activeTargetGrade.name}] 카테고리에 회원 추가/이동
          </button>
        )}
      </div>

      {/* 2. 검색, 표시 단위 및 일괄 처리 툴바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 이메일로 검색"
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-subtext focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* 주인님 지시: 검색창 우측으로 [총 N명 중 A~B명 표시 중 | 보기 단위] 이동 */}
          <div className="flex flex-wrap items-center gap-2.5 px-3 py-1.5 glass-card border border-white/10 rounded-lg text-xs">
            <span className="text-subtext">
              총 <strong className="text-gold-light">{totalFilteredCount}</strong>명 중{" "}
              <span className="text-white font-medium">{startMemberNum} ~ {endMemberNum}</span>명 표시 중
            </span>
            <span className="text-white/10">|</span>
            <div className="flex items-center gap-1.5 text-subtext">
              <span>보기 단위:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="bg-white/5 border border-white/10 text-white rounded-md px-2 py-0.5 text-xs cursor-pointer hover:border-gold/40 transition-colors outline-none font-medium"
              >
                <option value={50} className="bg-neutral-900 text-white">50명씩 보기</option>
                <option value={100} className="bg-neutral-900 text-white">100명씩 보기</option>
                <option value={500} className="bg-neutral-900 text-white">500명씩 보기</option>
                <option value={1000} className="bg-neutral-900 text-white">1000명씩 보기</option>
                <option value="all" className="bg-neutral-900 text-white">전체 보기</option>
              </select>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-gold/10 border border-gold/20 rounded-lg px-3 py-2">
            <span className="text-xs text-gold-light">{selectedIds.size}명 선택됨</span>

            <div className="flex items-center gap-1.5">
              <select
                value={bulkGradeId}
                onChange={(e) => setBulkGradeId(e.target.value)}
                disabled={bulkPending}
                className="text-xs bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 cursor-pointer hover:border-gold/40 transition-colors disabled:opacity-50"
              >
                <option value="">미배정</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                onClick={bulkChangeGrade}
                disabled={bulkPending}
                className="flex items-center gap-1 text-xs text-gold-light hover:text-gold disabled:opacity-40 transition-colors font-medium"
              >
                {bulkPending ? "이동 중..." : "선택 회원 등급 이동"}
              </button>
            </div>

            <span className="text-white/10">|</span>

            <button
              onClick={() => setExpirySettingMembers(filtered.filter((m) => selectedIds.has(m.id)))}
              className="flex items-center gap-1 text-xs text-gold-light hover:text-gold transition-colors"
            >
              <CalendarClock size={12} />
              만료기간 일괄 설정
            </button>

            <span className="text-white/10">|</span>

            <button
              onClick={bulkDeleteSelected}
              disabled={bulkPending}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={12} />
              {bulkPending ? "삭제 중..." : "선택 삭제"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-subtext hover:text-white transition-colors"
            >
              선택 해제
            </button>
          </div>
        )}
      </div>

      {/* 3. 회원 목록 테이블 */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelectableChecked}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
                  />
                </th>
                <th className="text-left text-xs text-subtext font-medium p-4">회원</th>
                <th className="text-left text-xs text-subtext font-medium p-4 hidden md:table-cell">등급</th>
                <th className="text-center text-xs text-subtext font-medium p-4">상태</th>
                <th className="text-right text-xs text-subtext font-medium p-4 hidden lg:table-cell">사용만료기간</th>
                <th className="text-right text-xs text-subtext font-medium p-4 hidden md:table-cell">가입일</th>
                <th className="text-center text-xs text-subtext font-medium p-4 w-32">관리</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-subtext text-sm">
                    {selectedGradeId !== "all"
                      ? `[${activeTargetGrade?.name ?? (selectedGradeId === "unassigned" ? "미배정" : "")}] 카테고리에 해당하는 회원이 없습니다.`
                      : "검색 결과가 없습니다."}
                  </td>
                </tr>
              )}
              {paginatedMembers.map((m) => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="p-4">
                    {!m.is_admin && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelectOne(m.id)}
                        className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
                      />
                    )}
                  </td>
                  <td className="p-4">
                    <Link href={`/admin/members/${m.id}`} className="hover:text-gold transition-colors">
                      <p className="text-white text-sm font-medium">{m.name ?? "(이름 없음)"}</p>
                      <p className="text-subtext text-xs">{m.email}</p>
                    </Link>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <MemberGradeSelect
                      userId={m.id}
                      currentGradeId={m.grade_id}
                      grades={grades.map((g) => ({ id: g.id, name: g.name, color: g.color }))}
                      onGradeChange={(newGradeId) => {
                        setGradeOverrides((prev) => new Map(prev).set(m.id, newGradeId));
                      }}
                    />
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        m.is_suspended
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400",
                      )}
                    >
                      {m.is_suspended ? "정지" : "활성"}
                    </span>
                  </td>
                  <td className="p-4 text-right hidden lg:table-cell">
                    {(() => {
                      const info = mergedExpiryByUserId[m.id];
                      if (!info) return <span className="text-subtext text-xs">-</span>;
                      const label = info.soonest ? formatDate(info.soonest) : info.hasLifetime ? "평생" : "-";
                      return (
                        <Link href={`/admin/members/${m.id}`} className="text-xs hover:text-gold transition-colors">
                          <span className="text-subtext">{label}</span>
                          {info.count > 1 && <span className="text-subtext/60 ml-1">({info.count}개)</span>}
                        </Link>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-right hidden md:table-cell">
                    <span className="text-subtext text-xs">{formatDate(m.created_at)}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="text-subtext hover:text-gold transition-colors p-1.5 rounded hover:bg-gold/10 inline-flex"
                        title="상세보기"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        onClick={() => setExpirySettingMembers([m])}
                        className="text-subtext hover:text-gold transition-colors p-1.5 rounded hover:bg-gold/10 inline-flex"
                        title="사용만료기간 설정"
                      >
                        <CalendarClock size={14} />
                      </button>
                      {!m.is_admin && (
                        <>
                          <button
                            onClick={() => toggleSuspend(m)}
                            disabled={pendingId === m.id}
                            className={cn(
                              "p-1.5 rounded transition-colors disabled:opacity-40",
                              m.is_suspended
                                ? "text-green-400 hover:bg-green-500/10"
                                : "text-yellow-400 hover:bg-yellow-500/10",
                            )}
                            title={m.is_suspended ? "정지 해제" : "정지"}
                          >
                            {m.is_suspended ? <RotateCcw size={14} /> : <Ban size={14} />}
                          </button>
                          <button
                            onClick={() => deleteMember(m)}
                            disabled={pendingId === m.id}
                            className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors disabled:opacity-40"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 하단 페이지 넘버링 컨트롤 바 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4 px-3 py-3 glass-card border border-white/10 rounded-xl">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-subtext hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="첫 페이지로"
          >
            «
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
            className="px-3 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-subtext hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            title="이전 페이지"
          >
            이전
          </button>

          {pageNumbers.map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
              className={cn(
                "px-3.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer",
                safeCurrentPage === num
                  ? "bg-gold text-black font-bold shadow-md shadow-gold/20"
                  : "bg-white/5 border border-white/10 text-subtext hover:text-white hover:bg-white/10",
              )}
            >
              {num}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
            className="px-3 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-subtext hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            title="다음 페이지"
          >
            다음
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-subtext hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="마지막 페이지로"
          >
            »
          </button>
        </div>
      )}

      {/* 만료기간 설정 모달 */}
      {expirySettingMembers && expirySettingMembers.length > 0 && (
        <SetExpiryModal
          members={expirySettingMembers}
          programs={programs}
          onClose={() => setExpirySettingMembers(null)}
          onSaved={(updatedList) => {
            setExpiryOverrides((prev) => {
              const next = new Map(prev);
              for (const item of updatedList) {
                const current =
                  next.get(item.user_id) ??
                  expiryByUserId[item.user_id] ?? { soonest: null, hasLifetime: false, count: 1 };
                const newInfo: MemberExpiryInfo = {
                  soonest: item.expires_at,
                  hasLifetime: item.expires_at === null,
                  count: current.count > 0 ? current.count : 1,
                };
                next.set(item.user_id, newInfo);
              }
              return next;
            });
            router.refresh();
          }}
        />
      )}

      {/* 등급 카테고리로 회원 일괄 추가/이동 모달 */}
      {isAddModalOpen && activeTargetGrade && (
        <AddMembersToGradeModal
          targetGrade={activeTargetGrade}
          availableMembers={availableForAdd}
          grades={grades}
          onClose={() => setIsAddModalOpen(false)}
          onAssign={assignGradeToUsers}
        />
      )}
    </div>
  );
}

