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
  // 서버 refresh를 기다리지 않고 삭제 즉시 목록에서 사라지도록 로컬 상태로도 관리한다
  // (router.refresh()만으로는 반영이 늦어 보이는 경우가 있어 낙관적 업데이트를 병행).
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [suspendOverrides, setSuspendOverrides] = useState<Map<string, boolean>>(new Map());

  const visibleMembers = useMemo(
    () =>
      members
        .filter((m) => !removedIds.has(m.id))
        .map((m) =>
          suspendOverrides.has(m.id)
            ? { ...m, is_suspended: suspendOverrides.get(m.id)! }
            : m,
        ),
    [members, removedIds, suspendOverrides],
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
      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 이메일로 검색"
          className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-subtext focus:outline-none focus:border-gold/40 transition-colors"
        />
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10">
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
                  <td colSpan={6} className="p-8 text-center text-subtext text-sm">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
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
