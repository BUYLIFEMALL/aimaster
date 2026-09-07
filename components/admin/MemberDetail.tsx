"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Monitor, LogOut, Ban, RotateCcw, CalendarPlus } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { formatDate } from "@/lib/utils/format";
import type { Profile, Program, Subscription, UserProgramAccess, UserSession } from "@/types/database.types";

// 만료일 연장 시 선택할 기간 — 버튼을 여러 개 늘어놓으면 칸이 부족해서 select 하나로
// 통합했다. "lifetime"은 숫자 연장이 아니라 평생(expires_at=null)으로 직접 설정한다.
const EXTEND_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "30", label: "+30일" },
  { value: "60", label: "+60일" },
  { value: "90", label: "+90일" },
  { value: "180", label: "+180일 (6개월)" },
  { value: "365", label: "+365일 (1년)" },
  { value: "lifetime", label: "평생으로 설정" },
];

interface MemberDetailProps {
  member: Profile;
  subscriptions: Subscription[];
  manualAccess: UserProgramAccess[];
  sessions: UserSession[];
  allPrograms: Program[];
}

export default function MemberDetail({
  member,
  subscriptions: initialSubscriptions,
  manualAccess: initialAccess,
  sessions: initialSessions,
  allPrograms,
}: MemberDetailProps) {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [manualAccess, setManualAccess] = useState(initialAccess);
  const [sessions, setSessions] = useState(initialSessions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("unlimited");
  const [loading, setLoading] = useState(false);
  const [subBulkPending, setSubBulkPending] = useState(false);
  const [accessBulkPending, setAccessBulkPending] = useState(false);
  const [subPending, setSubPending] = useState<string | null>(null);
  // 프로그램을 체크박스로 여러 개 선택한 뒤, 아래 공용 select/날짜로 한 번에 연장/설정한다
  // (행마다 select+버튼을 따로 두면 칸이 부족해지는 문제가 있어 일괄 처리 방식으로 바꿨다).
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
  const [selectedAccessIds, setSelectedAccessIds] = useState<Set<string>>(new Set());
  const [subBulkExtend, setSubBulkExtend] = useState("30");
  const [accessBulkExtend, setAccessBulkExtend] = useState("30");
  const [subBulkDate, setSubBulkDate] = useState("");
  const [accessBulkDate, setAccessBulkDate] = useState("");

  function toggleSubSelected(id: string) {
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllSubSelected() {
    setSelectedSubIds((prev) => (prev.size === subscriptions.length ? new Set() : new Set(subscriptions.map((s) => s.id))));
  }
  function toggleAccessSelected(id: string) {
    setSelectedAccessIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllAccessSelected() {
    setSelectedAccessIds((prev) =>
      prev.size === manualAccess.length ? new Set() : new Set(manualAccess.map((a) => a.id)),
    );
  }

  // 이미 접근 부여된 프로그램 ID
  const grantedIds = new Set(manualAccess.map((a) => a.program_id));
  const availablePrograms = allPrograms.filter((p) => !grantedIds.has(p.id));

  const PERIOD_OPTIONS = [
    { value: "30", label: "30일" },
    { value: "90", label: "90일" },
    { value: "180", label: "180일" },
    { value: "365", label: "365일" },
    { value: "unlimited", label: "무제한" },
  ];

  const grantAccess = async () => {
    if (!selectedProgramId) return;
    setLoading(true);
    const expiresAt =
      selectedPeriod === "unlimited"
        ? null
        : new Date(Date.now() + parseInt(selectedPeriod) * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch("/api/admin/user-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, program_id: selectedProgramId, expires_at: expiresAt }),
    });
    if (res.ok) {
      const program = allPrograms.find((p) => p.id === selectedProgramId);
      setManualAccess((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          user_id: member.id,
          program_id: selectedProgramId,
          granted_by: null,
          granted_at: new Date().toISOString(),
          expires_at: expiresAt,
          program,
        },
      ]);
      setSelectedProgramId("");
      setSelectedPeriod("unlimited");
      setShowAddModal(false);
    }
    setLoading(false);
  };

  const revokeAccess = async (programId: string) => {
    const res = await fetch("/api/admin/user-access", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, program_id: programId }),
    });
    if (res.ok) {
      setManualAccess((prev) => prev.filter((a) => a.program_id !== programId));
    }
  };

  /** 구독 1건을 중지(cancelled)하거나 재개(active)한다. */
  const toggleSubscription = async (sub: Subscription) => {
    setSubPending(sub.id);
    const nextAction = sub.status === "cancelled" ? "reactivate" : "suspend";
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: sub.id, action: nextAction }),
    });
    if (res.ok) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: nextAction === "suspend" ? "cancelled" : "active" } : s)),
      );
    }
    setSubPending(null);
  };

  async function patchSubscription(subscriptionId: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: subscriptionId, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  /** 체크한 구독들에 선택된 연장 옵션(일수 또는 "평생으로 설정")을 한 번에 적용한다. */
  const bulkApplySubExtend = async () => {
    if (selectedSubIds.size === 0) return;
    setSubBulkPending(true);
    const targets = subscriptions.filter((s) => selectedSubIds.has(s.id));
    const results = await Promise.all(
      targets.map(async (sub) => ({
        id: sub.id,
        ...(await patchSubscription(
          sub.id,
          subBulkExtend === "lifetime"
            ? { action: "set_expiry", expires_at: null }
            : { action: "extend", days: Number(subBulkExtend) },
        )),
      })),
    );
    setSubscriptions((prev) =>
      prev.map((s) => {
        const result = results.find((r) => r.id === s.id);
        if (!result?.ok) return s;
        return {
          ...s,
          expires_at: subBulkExtend === "lifetime" ? null : result.data.expires_at,
          status: "active",
        };
      }),
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) alert(`${failed.length}건 처리에 실패했습니다.`);
    setSubBulkPending(false);
  };

  /** 체크한 구독들의 만료일을 입력한 정확한 날짜로 한 번에 지정한다. */
  const bulkSetSubDate = async () => {
    if (selectedSubIds.size === 0 || !subBulkDate) return;
    setSubBulkPending(true);
    const targets = subscriptions.filter((s) => selectedSubIds.has(s.id));
    const results = await Promise.all(
      targets.map(async (sub) => ({
        id: sub.id,
        ...(await patchSubscription(sub.id, { action: "set_expiry", expires_at: subBulkDate })),
      })),
    );
    setSubscriptions((prev) =>
      prev.map((s) => {
        const result = results.find((r) => r.id === s.id);
        if (!result?.ok) return s;
        return { ...s, expires_at: result.data.expires_at, status: "active" };
      }),
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) alert(`${failed.length}건 처리에 실패했습니다.`);
    setSubBulkPending(false);
  };

  async function upsertAccessExpiry(programId: string, expiresAt: string | null) {
    const res = await fetch("/api/admin/user-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, program_id: programId, expires_at: expiresAt }),
    });
    return res.ok;
  }

  /**
   * 체크한 수동 접근들에 선택된 연장 옵션을 한 번에 적용한다. 이미 무제한(expires_at=null)인
   * 항목은 연장할 기준일이 없어 건너뛴다.
   */
  const bulkApplyAccessExtend = async () => {
    if (selectedAccessIds.size === 0) return;
    setAccessBulkPending(true);
    const targets = manualAccess.filter((a) => selectedAccessIds.has(a.id) && a.expires_at);
    const computed = targets.map((access) => {
      if (accessBulkExtend === "lifetime") return { access, newExpiresAt: null as string | null };
      const base =
        access.expires_at && new Date(access.expires_at) > new Date() ? new Date(access.expires_at) : new Date();
      return {
        access,
        newExpiresAt: new Date(base.getTime() + Number(accessBulkExtend) * 24 * 60 * 60 * 1000).toISOString(),
      };
    });
    const results = await Promise.all(
      computed.map(async ({ access, newExpiresAt }) => ({
        id: access.id,
        newExpiresAt,
        ok: await upsertAccessExpiry(access.program_id, newExpiresAt),
      })),
    );
    setManualAccess((prev) =>
      prev.map((a) => {
        const result = results.find((r) => r.id === a.id);
        return result?.ok ? { ...a, expires_at: result.newExpiresAt } : a;
      }),
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) alert(`${failed.length}건 처리에 실패했습니다.`);
    setAccessBulkPending(false);
  };

  /** 체크한 수동 접근들의 만료일을 입력한 정확한 날짜로 한 번에 지정한다(program_ids 배열 업서트 1회 호출). */
  const bulkSetAccessDate = async () => {
    if (selectedAccessIds.size === 0 || !accessBulkDate) return;
    setAccessBulkPending(true);
    const targets = manualAccess.filter((a) => selectedAccessIds.has(a.id));
    const newExpiresAt = new Date(accessBulkDate).toISOString();
    const res = await fetch("/api/admin/user-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: member.id,
        program_ids: targets.map((a) => a.program_id),
        expires_at: newExpiresAt,
      }),
    });
    if (res.ok) {
      setManualAccess((prev) => prev.map((a) => (selectedAccessIds.has(a.id) ? { ...a, expires_at: newExpiresAt } : a)));
    } else {
      alert("설정에 실패했습니다.");
    }
    setAccessBulkPending(false);
  };

  const forceLogout = async (sessionId: string) => {
    const res = await fetch("/api/admin/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  };

  const forceLogoutAll = async () => {
    const res = await fetch("/api/admin/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id }),
    });
    if (res.ok) {
      setSessions([]);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* 회원 정보 */}
      <GlassCard>
        <h2 className="text-lg font-bold text-white mb-4">
          <GoldGradientText>회원 정보</GoldGradientText>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-subtext">이름</span>
            <p className="text-white font-medium">{member.name ?? "(이름 없음)"}</p>
          </div>
          <div>
            <span className="text-subtext">이메일</span>
            <p className="text-white font-medium">{member.email}</p>
          </div>
          <div>
            <span className="text-subtext">등급</span>
            <p className="text-white font-medium flex items-center gap-2">
              {member.grade?.color && (
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: member.grade.color }} />
              )}
              {member.grade?.name ?? "미지정"}
            </p>
          </div>
          <div>
            <span className="text-subtext">가입일</span>
            <p className="text-white font-medium">{formatDate(member.created_at)}</p>
          </div>
          <div>
            <span className="text-subtext">관리자</span>
            <p className="text-white font-medium">{member.is_admin ? "예" : "아니오"}</p>
          </div>
          <div>
            <span className="text-subtext">추천 코드</span>
            <p className="text-white font-medium">{member.affiliate_code ?? "-"}</p>
          </div>
        </div>
      </GlassCard>

      {/* 구독 (활성/만료/취소 전체 — 중지시킨 뒤 재개할 대상을 찾을 수 있도록 전체를 보여준다) */}
      <GlassCard>
        <h2 className="text-lg font-bold text-white mb-4">
          <GoldGradientText>구독</GoldGradientText> 관리
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-subtext text-sm">구독 이력이 없습니다.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-0 pb-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedSubIds.size === subscriptions.length}
                        onChange={toggleAllSubSelected}
                        className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
                      />
                    </th>
                    <th className="text-left text-xs text-subtext font-medium pb-3">프로그램</th>
                    <th className="text-left text-xs text-subtext font-medium pb-3">플랜</th>
                    <th className="text-left text-xs text-subtext font-medium pb-3">상태</th>
                    <th className="text-right text-xs text-subtext font-medium pb-3">사용만료기간</th>
                    <th className="text-right text-xs text-subtext font-medium pb-3">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => {
                    const isPending = subPending === sub.id;
                    return (
                      <tr key={sub.id} className="border-b border-white/5">
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selectedSubIds.has(sub.id)}
                            onChange={() => toggleSubSelected(sub.id)}
                            className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
                          />
                        </td>
                        <td className="py-3 text-white">{sub.program?.name ?? "-"}</td>
                        <td className="py-3 text-subtext">{sub.pricing_plan?.name ?? "-"}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            sub.status === "active" ? "bg-green-500/20 text-green-400" :
                            sub.status === "expired" ? "bg-red-500/20 text-red-400" :
                            "bg-gray-500/20 text-gray-400"
                          }`}>
                            {sub.status === "active" ? "활성" : sub.status === "expired" ? "만료" : "취소"}
                          </span>
                        </td>
                        <td className="py-3 text-right text-subtext">
                          {sub.expires_at ? formatDate(sub.expires_at) : "평생"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => toggleSubscription(sub)}
                            title={sub.status === "cancelled" ? "재개" : "중지"}
                            className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                              sub.status === "cancelled"
                                ? "text-green-400 hover:bg-green-500/10"
                                : "text-red-400 hover:bg-red-500/10"
                            }`}
                          >
                            {sub.status === "cancelled" ? <RotateCcw size={14} /> : <Ban size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 체크한 프로그램들을 골라 만료일을 일괄 처리하는 영역 — 프로그램별로 버튼을
                따로 두면 칸이 부족해지는 문제가 있어, 먼저 체크박스로 대상을 고르고 여기서
                한 번에 적용하는 방식으로 바꿨다. */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs text-subtext mr-1">
                선택 {selectedSubIds.size}개 →
              </span>
              <select
                disabled={subBulkPending || selectedSubIds.size === 0}
                value={subBulkExtend}
                onChange={(e) => setSubBulkExtend(e.target.value)}
                className="input-dark text-xs py-1.5 px-2 w-[150px] disabled:opacity-40"
              >
                {EXTEND_SELECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <GoldButton
                type="button"
                variant="outline"
                size="sm"
                disabled={subBulkPending || selectedSubIds.size === 0}
                onClick={bulkApplySubExtend}
              >
                일괄 적용
              </GoldButton>
              <span className="text-xs text-subtext/60">또는</span>
              <input
                type="date"
                disabled={subBulkPending || selectedSubIds.size === 0}
                value={subBulkDate}
                onChange={(e) => setSubBulkDate(e.target.value)}
                className="input-dark text-xs py-1.5 px-2 w-[140px] disabled:opacity-40"
              />
              <GoldButton
                type="button"
                variant="outline"
                size="sm"
                disabled={subBulkPending || selectedSubIds.size === 0 || !subBulkDate}
                onClick={bulkSetSubDate}
              >
                날짜로 일괄 설정
              </GoldButton>
            </div>
          </>
        )}
      </GlassCard>

      {/* 수동 프로그램 접근 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            수동 <GoldGradientText>프로그램 접근</GoldGradientText>
          </h2>
          <GoldButton type="button" variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> 추가
          </GoldButton>
        </div>

        {manualAccess.length === 0 ? (
          <p className="text-subtext text-sm">수동으로 부여된 프로그램 접근이 없습니다.</p>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={selectedAccessIds.size === manualAccess.length}
                onChange={toggleAllAccessSelected}
                className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
              />
              <span className="text-xs text-subtext">전체 선택</span>
            </div>
            <div className="space-y-2">
              {manualAccess.map((access) => {
                const isExpired = !!access.expires_at && new Date(access.expires_at) <= new Date();
                return (
                  <div key={access.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedAccessIds.has(access.id)}
                        onChange={() => toggleAccessSelected(access.id)}
                        className="rounded border-white/20 bg-white/5 accent-gold cursor-pointer"
                      />
                      <div>
                        <span className="text-white text-sm font-medium">{access.program?.name ?? access.program_id}</span>
                        <span className="text-subtext text-xs ml-3">{formatDate(access.granted_at)} 부여</span>
                        {access.expires_at ? (
                          <span className={`text-xs ml-3 ${isExpired ? "text-red-400" : "text-subtext"}`}>
                            {isExpired ? "만료됨" : "만료"} {formatDate(access.expires_at)}
                          </span>
                        ) : (
                          <span className="text-xs ml-3 text-gold/70">무제한</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => revokeAccess(access.program_id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 체크한 프로그램 접근들을 골라 만료일을 일괄 처리하는 영역(구독 섹션과 동일한 방식). */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs text-subtext mr-1">
                선택 {selectedAccessIds.size}개 →
              </span>
              <select
                disabled={accessBulkPending || selectedAccessIds.size === 0}
                value={accessBulkExtend}
                onChange={(e) => setAccessBulkExtend(e.target.value)}
                className="input-dark text-xs py-1.5 px-2 w-[150px] disabled:opacity-40"
              >
                {EXTEND_SELECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <GoldButton
                type="button"
                variant="outline"
                size="sm"
                disabled={accessBulkPending || selectedAccessIds.size === 0}
                onClick={bulkApplyAccessExtend}
              >
                <CalendarPlus size={13} /> 일괄 적용
              </GoldButton>
              <span className="text-xs text-subtext/60">또는</span>
              <input
                type="date"
                disabled={accessBulkPending || selectedAccessIds.size === 0}
                value={accessBulkDate}
                onChange={(e) => setAccessBulkDate(e.target.value)}
                className="input-dark text-xs py-1.5 px-2 w-[140px] disabled:opacity-40"
              />
              <GoldButton
                type="button"
                variant="outline"
                size="sm"
                disabled={accessBulkPending || selectedAccessIds.size === 0 || !accessBulkDate}
                onClick={bulkSetAccessDate}
              >
                날짜로 일괄 설정
              </GoldButton>
            </div>
          </>
        )}

        {/* 프로그램 추가 모달 — GlassCard의 backdrop-filter가 position:fixed 자식의
            containing block이 되어버려 뷰포트 대신 카드 안에 갇히는 CSS 부작용이 있어,
            body에 직접 포탈로 렌더링해서 다른 카드에 가려지지 않게 한다. */}
        {showAddModal &&
          createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
              <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-white font-bold mb-4">프로그램 접근 부여</h3>
                {availablePrograms.length === 0 ? (
                  <p className="text-subtext text-sm">추가 가능한 프로그램이 없습니다.</p>
                ) : (
                  <>
                    <select
                      value={selectedProgramId}
                      onChange={(e) => setSelectedProgramId(e.target.value)}
                      className="input-dark w-full mb-3"
                    >
                      <option value="">프로그램 선택</option>
                      {availablePrograms.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <label className="text-subtext text-xs mb-1 block">이용 기간</label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="input-dark w-full mb-4"
                    >
                      {PERIOD_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <GoldButton onClick={grantAccess} disabled={!selectedProgramId || loading} size="sm">
                        {loading ? "부여 중..." : "접근 부여"}
                      </GoldButton>
                      <GoldButton variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                        취소
                      </GoldButton>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )}
      </GlassCard>

      {/* 활성 세션 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            활성 <GoldGradientText>세션</GoldGradientText>
          </h2>
          {sessions.length > 0 && (
            <GoldButton type="button" variant="outline" size="sm" onClick={forceLogoutAll}>
              <LogOut size={14} /> 전체 로그아웃
            </GoldButton>
          )}
        </div>

        {sessions.length === 0 ? (
          <p className="text-subtext text-sm">활성 세션이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Monitor size={16} className="text-subtext" />
                  <div>
                    <p className="text-white text-sm">{session.device_info ?? "알 수 없는 기기"}</p>
                    <p className="text-subtext text-xs">
                      {session.ip_address ?? "-"} · 마지막 활동: {formatDate(session.last_active)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => forceLogout(session.id)}
                  className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
