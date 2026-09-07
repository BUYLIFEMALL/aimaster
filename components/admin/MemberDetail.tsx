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
  const [subPending, setSubPending] = useState<string | null>(null);
  const [accessExtendPending, setAccessExtendPending] = useState<string | null>(null);
  // 행별 "정확한 날짜로 설정" 입력값 — id별로 독립된 date input 상태를 들고 있는다.
  const [subDateInputs, setSubDateInputs] = useState<Map<string, string>>(new Map());
  const [accessDateInputs, setAccessDateInputs] = useState<Map<string, string>>(new Map());
  // 행별 연장 select 선택값(기본 +30일).
  const [subExtendSelect, setSubExtendSelect] = useState<Map<string, string>>(new Map());
  const [accessExtendSelect, setAccessExtendSelect] = useState<Map<string, string>>(new Map());

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

  /** 수동 접근의 만료일을 연장한다 — 기존 POST(upsert)를 그대로 재사용한다. */
  const extendAccess = async (access: UserProgramAccess, days: number) => {
    setAccessExtendPending(access.id);
    const base =
      access.expires_at && new Date(access.expires_at) > new Date() ? new Date(access.expires_at) : new Date();
    const newExpiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch("/api/admin/user-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, program_id: access.program_id, expires_at: newExpiresAt }),
    });
    if (res.ok) {
      setManualAccess((prev) =>
        prev.map((a) => (a.id === access.id ? { ...a, expires_at: newExpiresAt } : a)),
      );
    }
    setAccessExtendPending(null);
  };

  /** 구독 1건을 중지(cancelled)하거나 재개(active)한다. */
  const toggleSubscription = async (sub: Subscription) => {
    setSubPending(sub.id);
    const nextStatus = sub.status === "cancelled" ? "reactivate" : "suspend";
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: sub.id, action: nextStatus }),
    });
    if (res.ok) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: nextStatus === "suspend" ? "cancelled" : "active" } : s)),
      );
    }
    setSubPending(null);
  };

  /** 구독 만료일을 days만큼 연장한다(평생 이용권은 서버에서 거부됨). */
  const extendSubscription = async (sub: Subscription, days: number) => {
    setSubPending(sub.id);
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: sub.id, action: "extend", days }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, expires_at: data.expires_at, status: "active" } : s)),
      );
    } else {
      alert(data.error ?? "연장에 실패했습니다.");
    }
    setSubPending(null);
  };

  /** 구독 만료일을 입력한 정확한 날짜로 직접 설정한다(상대적 연장이 아니라 절대 지정). */
  const setSubscriptionExpiry = async (sub: Subscription) => {
    const dateValue = subDateInputs.get(sub.id);
    if (!dateValue) return;
    setSubPending(sub.id);
    const res = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_id: sub.id, action: "set_expiry", expires_at: dateValue }),
    });
    const data = await res.json();
    if (res.ok) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, expires_at: data.expires_at, status: "active" } : s)),
      );
      setSubDateInputs((prev) => {
        const next = new Map(prev);
        next.delete(sub.id);
        return next;
      });
    } else {
      alert(data.error ?? "설정에 실패했습니다.");
    }
    setSubPending(null);
  };

  /** 수동 접근의 만료일을 입력한 정확한 날짜로 직접 설정한다(기존 POST 업서트 재사용). */
  const setAccessExpiry = async (access: UserProgramAccess) => {
    const dateValue = accessDateInputs.get(access.id);
    if (!dateValue) return;
    setAccessExtendPending(access.id);
    const newExpiresAt = new Date(dateValue).toISOString();
    const res = await fetch("/api/admin/user-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, program_id: access.program_id, expires_at: newExpiresAt }),
    });
    if (res.ok) {
      setManualAccess((prev) =>
        prev.map((a) => (a.id === access.id ? { ...a, expires_at: newExpiresAt } : a)),
      );
      setAccessDateInputs((prev) => {
        const next = new Map(prev);
        next.delete(access.id);
        return next;
      });
    } else {
      alert("설정에 실패했습니다.");
    }
    setAccessExtendPending(null);
  };

  /** select에서 고른 값(일수 또는 "lifetime")을 구독에 적용한다. */
  const applySubExtend = async (sub: Subscription) => {
    const selected = subExtendSelect.get(sub.id) ?? "30";
    if (selected === "lifetime") {
      setSubPending(sub.id);
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: sub.id, action: "set_expiry", expires_at: null }),
      });
      if (res.ok) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === sub.id ? { ...s, expires_at: null, status: "active" } : s)),
        );
      } else {
        alert("설정에 실패했습니다.");
      }
      setSubPending(null);
      return;
    }
    await extendSubscription(sub, Number(selected));
  };

  /** select에서 고른 값(일수 또는 "lifetime")을 수동 접근에 적용한다. */
  const applyAccessExtend = async (access: UserProgramAccess) => {
    const selected = accessExtendSelect.get(access.id) ?? "30";
    if (selected === "lifetime") {
      setAccessExtendPending(access.id);
      const res = await fetch("/api/admin/user-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: member.id, program_id: access.program_id, expires_at: null }),
      });
      if (res.ok) {
        setManualAccess((prev) => prev.map((a) => (a.id === access.id ? { ...a, expires_at: null } : a)));
      } else {
        alert("설정에 실패했습니다.");
      }
      setAccessExtendPending(null);
      return;
    }
    await extendAccess(access, Number(selected));
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
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
                      <td className="py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <select
                              disabled={isPending}
                              value={subExtendSelect.get(sub.id) ?? "30"}
                              onChange={(e) =>
                                setSubExtendSelect((prev) => new Map(prev).set(sub.id, e.target.value))
                              }
                              className="input-dark text-xs py-1 px-2 w-[130px]"
                            >
                              {EXTEND_SELECT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => applySubExtend(sub)}
                              className="text-xs px-2 py-1 rounded-md bg-white/5 text-subtext hover:bg-gold/10 hover:text-gold transition-colors disabled:opacity-50"
                            >
                              적용
                            </button>
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
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              disabled={isPending}
                              value={subDateInputs.get(sub.id) ?? ""}
                              onChange={(e) =>
                                setSubDateInputs((prev) => new Map(prev).set(sub.id, e.target.value))
                              }
                              className="input-dark text-xs py-1 px-2 w-[130px]"
                            />
                            <button
                              type="button"
                              disabled={isPending || !subDateInputs.get(sub.id)}
                              onClick={() => setSubscriptionExpiry(sub)}
                              className="text-xs px-2 py-1 rounded-md bg-white/5 text-subtext hover:bg-gold/10 hover:text-gold transition-colors disabled:opacity-40"
                            >
                              설정
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
          <div className="space-y-2">
            {manualAccess.map((access) => {
              const isExpired = !!access.expires_at && new Date(access.expires_at) <= new Date();
              return (
                <div key={access.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
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
                  <div className="flex items-center gap-1.5">
                    {access.expires_at && (
                      <>
                        <select
                          disabled={accessExtendPending === access.id}
                          value={accessExtendSelect.get(access.id) ?? "30"}
                          onChange={(e) =>
                            setAccessExtendSelect((prev) => new Map(prev).set(access.id, e.target.value))
                          }
                          className="input-dark text-xs py-1 px-2 w-[130px]"
                        >
                          {EXTEND_SELECT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={accessExtendPending === access.id}
                          onClick={() => applyAccessExtend(access)}
                          className="text-xs px-2 py-1 rounded-md bg-white/5 text-subtext hover:bg-gold/10 hover:text-gold transition-colors disabled:opacity-50"
                        >
                          <CalendarPlus size={11} className="inline -mt-0.5 mr-0.5" />
                          적용
                        </button>
                      </>
                    )}
                    <input
                      type="date"
                      disabled={accessExtendPending === access.id}
                      value={accessDateInputs.get(access.id) ?? ""}
                      onChange={(e) =>
                        setAccessDateInputs((prev) => new Map(prev).set(access.id, e.target.value))
                      }
                      className="input-dark text-xs py-1 px-2 w-[130px]"
                    />
                    <button
                      type="button"
                      disabled={accessExtendPending === access.id || !accessDateInputs.get(access.id)}
                      onClick={() => setAccessExpiry(access)}
                      className="text-xs px-2 py-1 rounded-md bg-white/5 text-subtext hover:bg-gold/10 hover:text-gold transition-colors disabled:opacity-40"
                    >
                      설정
                    </button>
                    <button
                      onClick={() => revokeAccess(access.program_id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
