"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Plus, Copy, Ticket, Calendar, X as XIcon, Search, Users, CheckSquare, Square } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import Modal from "@/components/ui/Modal";

interface CouponUsage {
  user_id: string;
  used_at: string;
  sub_status?: "active" | "expired" | "none";
  profiles?: { name: string | null; email: string } | { name: string | null; email: string }[] | null;
}

interface CouponRow {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free";
  value: number;
  program_id: string | null;
  assigned_user_id: string | null;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  programs?: { name: string } | { name: string }[] | null;
  assigned_user?: { name: string | null; email: string } | { name: string | null; email: string }[] | null;
  usage?: CouponUsage[];
}

interface ProgramOption {
  id: string;
  name: string;
}

interface MemberOption {
  id: string;
  name: string | null;
  email: string;
}

interface CouponManagerProps {
  initialCoupons: CouponRow[];
  programs: ProgramOption[];
  members: MemberOption[];
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function typeLabel(type: string) {
  switch (type) {
    case "percentage": return "% 할인";
    case "fixed": return "금액 할인";
    case "free": return "무료";
    default: return type;
  }
}

function discountDisplay(type: string, value: number) {
  switch (type) {
    case "percentage": return `${value}%`;
    case "fixed": return `${value.toLocaleString()}원`;
    case "free": return "100% 무료";
    default: return String(value);
  }
}

function getProgramName(coupon: CouponRow) {
  if (!coupon.programs) return "전체 프로그램";
  if (Array.isArray(coupon.programs)) return coupon.programs[0]?.name ?? "전체 프로그램";
  return coupon.programs.name;
}

function getAssignedUserDisplay(coupon: CouponRow) {
  if (!coupon.assigned_user) return null;
  const u = Array.isArray(coupon.assigned_user) ? coupon.assigned_user[0] : coupon.assigned_user;
  if (!u) return null;
  return u.name || u.email;
}

type TabType = "list" | "bulk";

export default function CouponManager({ initialCoupons, programs, members }: CouponManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 폼 상태 (개별 쿠폰 생성/수정)
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed" | "free">("percentage");
  const [formValue, setFormValue] = useState(0);
  const [formProgramId, setFormProgramId] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formMonth, setFormMonth] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formHour, setFormHour] = useState("");

  // 일괄 발행 상태
  const [bulkSearch, setBulkSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<"percentage" | "fixed" | "free">("percentage");
  const [bulkValue, setBulkValue] = useState(0);
  const [bulkProgramId, setBulkProgramId] = useState("");
  const [bulkMaxUses, setBulkMaxUses] = useState("1");
  const [bulkYear, setBulkYear] = useState("");
  const [bulkMonth, setBulkMonth] = useState("");
  const [bulkDay, setBulkDay] = useState("");
  const [bulkHour, setBulkHour] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: number } | null>(null);

  // 회원 검색 필터
  const filteredMembers = useMemo(() => {
    if (!bulkSearch.trim()) return members;
    const q = bulkSearch.toLowerCase();
    return members.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, bulkSearch]);

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredMembers.every((m) => next.has(m.id));
      if (allSelected) {
        filteredMembers.forEach((m) => next.delete(m.id));
      } else {
        filteredMembers.forEach((m) => next.add(m.id));
      }
      return next;
    });
  }

  function openCreate() {
    setEditingCoupon(null);
    setFormCode(generateCode());
    setFormType("percentage");
    setFormValue(0);
    setFormProgramId("");
    setFormMaxUses("");
    setFormYear("");
    setFormMonth("");
    setFormDay("");
    setFormHour("");
    setError("");
    setIsModalOpen(true);
  }

  function openEdit(coupon: CouponRow) {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormType(coupon.type);
    setFormValue(coupon.value);
    setFormProgramId(coupon.program_id ?? "");
    setFormMaxUses(coupon.max_uses != null ? String(coupon.max_uses) : "");
    if (coupon.expires_at) {
      const d = new Date(coupon.expires_at);
      setFormYear(String(d.getFullYear()));
      setFormMonth(String(d.getMonth() + 1));
      setFormDay(String(d.getDate()));
      setFormHour(String(d.getHours()));
    } else {
      setFormYear("");
      setFormMonth("");
      setFormDay("");
      setFormHour("");
    }
    setError("");
    setIsModalOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        code: formCode,
        type: formType,
        value: formType === "free" ? 0 : formValue,
        program_id: formProgramId || null,
        max_uses: formMaxUses ? parseInt(formMaxUses) : null,
        expires_at: formYear && formMonth && formDay
          ? new Date(parseInt(formYear), parseInt(formMonth) - 1, parseInt(formDay), formHour ? parseInt(formHour) : 23, 59, 59).toISOString()
          : null,
      };

      const method = editingCoupon ? "PUT" : "POST";
      if (editingCoupon) body.id = editingCoupon.id;

      const res = await fetch("/api/admin/coupons", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingCoupon) {
        setCoupons((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      } else {
        setCoupons((prev) => [data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/coupons?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(coupon: CouponRow) {
    const res = await fetch("/api/admin/coupons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, is_active: !coupon.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setCoupons((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    }
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleBulkIssue() {
    if (selectedUserIds.size === 0) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const body = {
        userIds: Array.from(selectedUserIds),
        type: bulkType,
        value: bulkType === "free" ? 0 : bulkValue,
        program_id: bulkProgramId || null,
        max_uses: bulkMaxUses ? parseInt(bulkMaxUses) : 1,
        expires_at: bulkYear && bulkMonth && bulkDay
          ? new Date(parseInt(bulkYear), parseInt(bulkMonth) - 1, parseInt(bulkDay), bulkHour ? parseInt(bulkHour) : 23, 59, 59).toISOString()
          : null,
      };

      const res = await fetch("/api/admin/coupons/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBulkResult({ created: data.created, errors: data.errors });
      setSelectedUserIds(new Set());

      // 쿠폰 목록 새로고침
      const listRes = await fetch("/api/admin/coupons");
      if (listRes.ok) {
        const listData = await listRes.json();
        setCoupons(listData);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "일괄 발행 실패");
    } finally {
      setBulkLoading(false);
    }
  }

  // 만료일 셀렉트 렌더링 헬퍼
  function renderExpirySelects(
    year: string, setYear: (v: string) => void,
    month: string, setMonth: (v: string) => void,
    day: string, setDay: (v: string) => void,
    hour: string, setHour: (v: string) => void,
  ) {
    if (year) {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <select className="input-dark" value={year} onChange={(e) => { setYear(e.target.value); setDay(""); }}>
              <option value="">년</option>
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select className="input-dark" value={month} onChange={(e) => { setMonth(e.target.value); setDay(""); }}>
              <option value="">월</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <select className="input-dark" value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">일</option>
              {Array.from(
                { length: year && month ? new Date(parseInt(year), parseInt(month), 0).getDate() : 31 },
                (_, i) => i + 1,
              ).map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
            <select className="input-dark" value={hour} onChange={(e) => setHour(e.target.value)}>
              <option value="">시간</option>
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}시</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-subtext">
              {year && month && day
                ? `${year}년 ${month}월 ${day}일 ${hour ? String(hour).padStart(2, "0") + ":00" : "23:59"} 만료`
                : "날짜를 선택하세요"}
            </span>
            <button
              type="button"
              onClick={() => { setYear(""); setMonth(""); setDay(""); setHour(""); }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <XIcon size={12} /> 초기화
            </button>
          </div>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          const now = new Date();
          setYear(String(now.getFullYear()));
          setMonth(String(now.getMonth() + 1));
          setDay("");
          setHour("");
        }}
        className="w-full py-2.5 rounded-lg border border-dashed border-white/20 text-subtext hover:text-white hover:border-gold/40 transition-colors text-sm"
      >
        만료일 설정하기
      </button>
    );
  }

  return (
    <>
      {/* 탭 네비게이션 */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === "list"
              ? "bg-gold/20 text-gold"
              : "text-subtext hover:text-white"
          }`}
        >
          <Ticket size={16} />
          쿠폰 목록
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === "bulk"
              ? "bg-gold/20 text-gold"
              : "text-subtext hover:text-white"
          }`}
        >
          <Users size={16} />
          회원 지정 발행
        </button>
      </div>

      {/* ===================== 쿠폰 목록 탭 ===================== */}
      {activeTab === "list" && (
        <>
          <div className="flex justify-between items-center mb-6">
            <p className="text-subtext text-sm">총 {coupons.length}개</p>
            <GoldButton onClick={openCreate} size="sm">
              <Plus size={14} className="mr-1" /> 새 쿠폰
            </GoldButton>
          </div>

          <div className="space-y-3">
            {coupons.length === 0 && (
              <GlassCard>
                <div className="text-center py-10 text-subtext">
                  <Ticket size={40} className="mx-auto mb-3 opacity-40" />
                  <p>등록된 쿠폰이 없습니다</p>
                </div>
              </GlassCard>
            )}

            {coupons.map((coupon) => {
              const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
              const isUsedUp = coupon.max_uses != null && coupon.current_uses >= coupon.max_uses;
              const assignedName = getAssignedUserDisplay(coupon);

              // 소진된 쿠폰의 구독 상태 확인 (기본은 사용완료, 활성 구독이 확인될 때만 사용중)
              let usedUpLabel = "사용완료";
              let usedUpStyle = "bg-gray-500/20 text-gray-400";
              if (isUsedUp && coupon.usage?.some((u) => u.sub_status === "active")) {
                usedUpLabel = "사용중";
                usedUpStyle = "bg-blue-500/20 text-blue-400";
              }

              return (
                <GlassCard key={coupon.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => copyCode(coupon.code, coupon.id)}
                          className="font-mono text-lg font-bold text-gold hover:text-gold-light transition-colors flex items-center gap-1"
                          title="클릭하여 복사"
                        >
                          {coupon.code}
                          <Copy size={12} className="opacity-50" />
                        </button>
                        {copiedId === coupon.id && (
                          <span className="text-xs text-green-400">복사됨!</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          !coupon.is_active ? "bg-red-500/20 text-red-400"
                            : isExpired ? "bg-red-500/20 text-red-400"
                            : isUsedUp ? usedUpStyle
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          {!coupon.is_active ? "비활성" : isExpired ? "만료" : isUsedUp ? usedUpLabel : "활성"}
                        </span>
                        {assignedName && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            지정: {assignedName}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-subtext">
                        <span>{typeLabel(coupon.type)}: <span className="text-white">{discountDisplay(coupon.type, coupon.value)}</span></span>
                        <span>대상: <span className="text-white">{getProgramName(coupon)}</span></span>
                        <span>사용: <span className="text-white">{coupon.current_uses}/{coupon.max_uses ?? "∞"}</span></span>
                        {coupon.expires_at && (
                          <span>만료: <span className={isExpired ? "text-red-400" : "text-white"}>
                            {new Date(coupon.expires_at).toLocaleDateString("ko-KR")}
                          </span></span>
                        )}
                      </div>

                      {/* 사용 내역 */}
                      {coupon.usage && coupon.usage.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                          {coupon.usage.map((u, i) => {
                            const uProfile = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles;
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs text-subtext">
                                <span>쿠폰사용일:</span>
                                <span className="text-white">{uProfile?.name || uProfile?.email || "알 수 없음"}</span>
                                <span>{new Date(u.used_at).toLocaleDateString("ko-KR")}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          coupon.is_active
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        }`}
                      >
                        {coupon.is_active ? "비활성화" : "활성화"}
                      </button>
                      <button
                        onClick={() => openEdit(coupon)}
                        className="p-2 text-subtext hover:text-gold transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(coupon)}
                        className="p-2 text-subtext hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </>
      )}

      {/* ===================== 회원 지정 발행 탭 ===================== */}
      {activeTab === "bulk" && (
        <div className="space-y-6">
          {/* 쿠폰 설정 */}
          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-4">쿠폰 설정</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-subtext mb-1">할인 유형</label>
                <select
                  className="input-dark w-full"
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value as "percentage" | "fixed" | "free")}
                >
                  <option value="percentage">퍼센트 할인 (%)</option>
                  <option value="fixed">금액 할인 (원)</option>
                  <option value="free">100% 무료</option>
                </select>
              </div>

              {bulkType !== "free" && (
                <div>
                  <label className="block text-sm text-subtext mb-1">
                    {bulkType === "percentage" ? "할인율 (%)" : "할인 금액 (원)"}
                  </label>
                  <input
                    type="number"
                    className="input-dark w-full"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(parseInt(e.target.value) || 0)}
                    min={0}
                    max={bulkType === "percentage" ? 100 : undefined}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-subtext mb-1">적용 프로그램</label>
                <select
                  className="input-dark w-full"
                  value={bulkProgramId}
                  onChange={(e) => setBulkProgramId(e.target.value)}
                >
                  <option value="">전체 프로그램</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-subtext mb-1">1인당 사용 횟수</label>
                <input
                  type="number"
                  className="input-dark w-full"
                  value={bulkMaxUses}
                  onChange={(e) => setBulkMaxUses(e.target.value)}
                  min={1}
                  placeholder="1"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm text-subtext mb-1">
                  <Calendar size={14} className="inline mr-1 mb-0.5" />
                  만료일 (비워두면 무기한)
                </label>
                {renderExpirySelects(
                  bulkYear, setBulkYear,
                  bulkMonth, setBulkMonth,
                  bulkDay, setBulkDay,
                  bulkHour, setBulkHour,
                )}
              </div>
            </div>
          </GlassCard>

          {/* 회원 검색 + 선택 */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">회원 선택</h3>
              {selectedUserIds.size > 0 && (
                <span className="text-sm text-gold">{selectedUserIds.size}명 선택됨</span>
              )}
            </div>

            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
              <input
                className="input-dark w-full pl-10"
                placeholder="이름 또는 이메일로 검색..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
              />
            </div>

            {/* 전체 선택 */}
            <button
              onClick={selectAllFiltered}
              className="flex items-center gap-2 text-sm text-subtext hover:text-white mb-3 transition-colors"
            >
              {filteredMembers.length > 0 && filteredMembers.every((m) => selectedUserIds.has(m.id))
                ? <CheckSquare size={16} className="text-gold" />
                : <Square size={16} />
              }
              전체 선택 ({filteredMembers.length}명)
            </button>

            {/* 회원 목록 */}
            <div className="max-h-80 overflow-y-auto space-y-1 border border-white/5 rounded-lg p-2">
              {filteredMembers.length === 0 ? (
                <p className="text-center py-6 text-subtext text-sm">검색 결과가 없습니다</p>
              ) : (
                filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => toggleUser(member.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedUserIds.has(member.id)
                        ? "bg-gold/10 border border-gold/30"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {selectedUserIds.has(member.id)
                      ? <CheckSquare size={16} className="text-gold shrink-0" />
                      : <Square size={16} className="text-subtext shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{member.name || "(이름 없음)"}</p>
                      <p className="text-xs text-subtext truncate">{member.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </GlassCard>

          {/* 발행 버튼 + 결과 */}
          <div className="space-y-3">
            {bulkResult && (
              <div className={`p-4 rounded-lg text-sm ${
                bulkResult.errors > 0
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-green-500/10 text-green-400"
              }`}>
                {bulkResult.created}개 쿠폰이 발행되었습니다.
                {bulkResult.errors > 0 && ` (${bulkResult.errors}건 오류)`}
              </div>
            )}

            <GoldButton
              onClick={handleBulkIssue}
              disabled={bulkLoading || selectedUserIds.size === 0}
              className="w-full"
              size="lg"
            >
              {bulkLoading
                ? "발행 중..."
                : selectedUserIds.size > 0
                  ? `선택한 ${selectedUserIds.size}명에게 쿠폰 발행`
                  : "회원을 선택해주세요"
              }
            </GoldButton>
          </div>
        </div>
      )}

      {/* 생성/수정 모달 */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <h2 className="text-xl font-bold text-white mb-6">
            {editingCoupon ? "쿠폰 수정" : "새 쿠폰 생성"}
          </h2>

          {error && <div className="mb-4 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-subtext mb-1">쿠폰 코드</label>
              <div className="flex gap-2">
                <input
                  className="input-dark flex-1"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                />
                <button
                  type="button"
                  onClick={() => setFormCode(generateCode())}
                  className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-subtext hover:text-white rounded-lg transition-colors"
                >
                  자동생성
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-subtext mb-1">할인 유형</label>
              <select
                className="input-dark w-full"
                value={formType}
                onChange={(e) => setFormType(e.target.value as "percentage" | "fixed" | "free")}
              >
                <option value="percentage">퍼센트 할인 (%)</option>
                <option value="fixed">금액 할인 (원)</option>
                <option value="free">100% 무료</option>
              </select>
            </div>

            {formType !== "free" && (
              <div>
                <label className="block text-sm text-subtext mb-1">
                  {formType === "percentage" ? "할인율 (%)" : "할인 금액 (원)"}
                </label>
                <input
                  type="number"
                  className="input-dark w-full"
                  value={formValue}
                  onChange={(e) => setFormValue(parseInt(e.target.value) || 0)}
                  min={0}
                  max={formType === "percentage" ? 100 : undefined}
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-subtext mb-1">적용 프로그램</label>
              <select
                className="input-dark w-full"
                value={formProgramId}
                onChange={(e) => setFormProgramId(e.target.value)}
              >
                <option value="">전체 프로그램</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-subtext mb-1">최대 사용 횟수 (비워두면 무제한)</label>
              <input
                type="number"
                className="input-dark w-full"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                placeholder="무제한"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm text-subtext mb-1">
                <Calendar size={14} className="inline mr-1 mb-0.5" />
                만료일 (비워두면 무기한)
              </label>
              {renderExpirySelects(
                formYear, setFormYear,
                formMonth, setFormMonth,
                formDay, setFormDay,
                formHour, setFormHour,
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-subtext hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              취소
            </button>
            <GoldButton onClick={handleSave} disabled={loading || !formCode} className="flex-1">
              {loading ? "저장 중..." : editingCoupon ? "수정" : "생성"}
            </GoldButton>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
          <h2 className="text-xl font-bold text-white mb-3">쿠폰 삭제</h2>
          <p className="text-subtext mb-6">
            <span className="font-mono text-gold">{deleteTarget.code}</span> 쿠폰을 삭제하시겠습니까?
            <br />이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-2.5 rounded-xl text-subtext hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium"
            >
              {loading ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
