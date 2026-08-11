"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Search, Ban, RotateCcw, Trash2 } from "lucide-react";
import MemberGradeSelect from "@/components/admin/MemberGradeSelect";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Profile, MemberGrade } from "@/types/database.types";

interface MembersTableProps {
  members: Profile[];
  grades: MemberGrade[];
}

export default function MembersTable({ members, grades }: MembersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGradeId, setBulkGradeId] = useState("");
  // 서버 refresh를 기다리지 않고 삭제 즉시 목록에서 사라지도록 로컬 상태로도 관리한다
  // (router.refresh()만으로는 반영이 늦어 보이는 경우가 있어 낙관적 업데이트를 병행).
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [suspendOverrides, setSuspendOverrides] = useState<Map<string, boolean>>(new Map());
  const [gradeOverrides, setGradeOverrides] = useState<Map<string, string | null>>(new Map());

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleMembers;
    return visibleMembers.filter(
      (m) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [visibleMembers, search]);

  // 관리자 계정은 선택/삭제 대상에서 제외한다 (실수로 관리자를 지우는 것 방지).
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
      const res = await fetch("/api/admin/grades/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: ids, grade_id: bulkGradeId || null }),
      });
      if (!res.ok) {
        let message = "일괄 등급 변경 실패";
        try {
          message = (await res.json()).error || message;
        } catch {
          message = `일괄 등급 변경 실패 (서버 오류 ${res.status})`;
        }
        alert(message);
        return;
      }
      setGradeOverrides((prev) => {
        const next = new Map(prev);
        ids.forEach((id) => next.set(id, bulkGradeId || null));
        return next;
      });
      router.refresh();
    } catch {
      alert("일괄 등급 변경 중 오류가 발생했습니다.");
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 이메일로 검색"
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-subtext focus:outline-none focus:border-gold/40 transition-colors"
          />
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
                className="flex items-center gap-1 text-xs text-gold-light hover:text-gold disabled:opacity-40 transition-colors"
              >
                {bulkPending ? "적용 중..." : "등급 일괄 적용"}
              </button>
            </div>

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
                <th className="text-center text-xs text-subtext font-medium p-4 hidden lg:table-cell">관리자</th>
                <th className="text-right text-xs text-subtext font-medium p-4 hidden md:table-cell">가입일</th>
                <th className="text-center text-xs text-subtext font-medium p-4 w-32">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-subtext text-sm">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
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
                  <td className="p-4 text-center hidden lg:table-cell">
                    {m.is_admin && (
                      <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full">관리자</span>
                    )}
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
    </div>
  );
}
