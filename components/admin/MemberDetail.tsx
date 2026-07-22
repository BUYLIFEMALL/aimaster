"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Monitor, LogOut } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { formatDate } from "@/lib/utils/format";
import type { Profile, Program, Subscription, UserProgramAccess, UserSession } from "@/types/database.types";

interface MemberDetailProps {
  member: Profile;
  subscriptions: Subscription[];
  manualAccess: UserProgramAccess[];
  sessions: UserSession[];
  allPrograms: Program[];
}

export default function MemberDetail({
  member,
  subscriptions,
  manualAccess: initialAccess,
  sessions: initialSessions,
  allPrograms,
}: MemberDetailProps) {
  const router = useRouter();
  const [manualAccess, setManualAccess] = useState(initialAccess);
  const [sessions, setSessions] = useState(initialSessions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 접근 부여된 프로그램 ID
  const grantedIds = new Set(manualAccess.map((a) => a.program_id));
  const availablePrograms = allPrograms.filter((p) => !grantedIds.has(p.id));

  const grantAccess = async () => {
    if (!selectedProgramId) return;
    setLoading(true);
    const res = await fetch("/api/admin/user-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, program_id: selectedProgramId }),
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
          expires_at: null,
          program,
        },
      ]);
      setSelectedProgramId("");
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

      {/* 활성 구독 */}
      <GlassCard>
        <h2 className="text-lg font-bold text-white mb-4">
          활성 <GoldGradientText>구독</GoldGradientText>
        </h2>
        {subscriptions.length === 0 ? (
          <p className="text-subtext text-sm">활성 구독이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-subtext font-medium pb-3">프로그램</th>
                  <th className="text-left text-xs text-subtext font-medium pb-3">플랜</th>
                  <th className="text-left text-xs text-subtext font-medium pb-3">상태</th>
                  <th className="text-right text-xs text-subtext font-medium pb-3">만료일</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
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
                  </tr>
                ))}
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
            {manualAccess.map((access) => (
              <div key={access.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                <div>
                  <span className="text-white text-sm font-medium">{access.program?.name ?? access.program_id}</span>
                  <span className="text-subtext text-xs ml-3">{formatDate(access.granted_at)}</span>
                </div>
                <button
                  onClick={() => revokeAccess(access.program_id)}
                  className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 프로그램 추가 모달 */}
        {showAddModal && (
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
                    className="input-dark w-full mb-4"
                  >
                    <option value="">프로그램 선택</option>
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
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
          </div>
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
