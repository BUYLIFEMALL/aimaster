"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Plus, Copy, Ticket, Calendar, X as XIcon } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import Modal from "@/components/ui/Modal";

interface CouponRow {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free";
  value: number;
  program_id: string | null;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  programs?: { name: string } | { name: string }[] | null;
}

interface ProgramOption {
  id: string;
  name: string;
}

interface CouponManagerProps {
  initialCoupons: CouponRow[];
  programs: ProgramOption[];
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

export default function CouponManager({ initialCoupons, programs }: CouponManagerProps) {
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 폼 상태
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed" | "free">("percentage");
  const [formValue, setFormValue] = useState(0);
  const [formProgramId, setFormProgramId] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formMonth, setFormMonth] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formHour, setFormHour] = useState("");

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

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <p className="text-subtext text-sm">총 {coupons.length}개</p>
        <GoldButton onClick={openCreate} size="sm">
          <Plus size={14} className="mr-1" /> 새 쿠폰
        </GoldButton>
      </div>

      {/* 쿠폰 목록 */}
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

          return (
            <GlassCard key={coupon.id}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* 코드 + 타입 */}
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
                      coupon.is_active && !isExpired && !isUsedUp
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {!coupon.is_active ? "비활성" : isExpired ? "만료" : isUsedUp ? "소진" : "활성"}
                    </span>
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
                </div>

                {/* 버튼들 */}
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

      {/* 생성/수정 모달 */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <h2 className="text-xl font-bold text-white mb-6">
            {editingCoupon ? "쿠폰 수정" : "새 쿠폰 생성"}
          </h2>

          {error && <div className="mb-4 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">{error}</div>}

          <div className="space-y-4">
            {/* 코드 */}
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

            {/* 유형 */}
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

            {/* 할인 값 */}
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

            {/* 대상 프로그램 */}
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

            {/* 최대 사용 횟수 */}
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

            {/* 만료일 */}
            <div>
              <label className="block text-sm text-subtext mb-1">
                <Calendar size={14} className="inline mr-1 mb-0.5" />
                만료일 (비워두면 무기한)
              </label>
              {formYear ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {/* 년 */}
                    <select className="input-dark" value={formYear} onChange={(e) => { setFormYear(e.target.value); setFormDay(""); }}>
                      <option value="">년</option>
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                        <option key={y} value={y}>{y}년</option>
                      ))}
                    </select>
                    {/* 월 */}
                    <select className="input-dark" value={formMonth} onChange={(e) => { setFormMonth(e.target.value); setFormDay(""); }}>
                      <option value="">월</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m}월</option>
                      ))}
                    </select>
                    {/* 일 */}
                    <select className="input-dark" value={formDay} onChange={(e) => setFormDay(e.target.value)}>
                      <option value="">일</option>
                      {Array.from(
                        { length: formYear && formMonth ? new Date(parseInt(formYear), parseInt(formMonth), 0).getDate() : 31 },
                        (_, i) => i + 1,
                      ).map((d) => (
                        <option key={d} value={d}>{d}일</option>
                      ))}
                    </select>
                    {/* 시간 */}
                    <select className="input-dark" value={formHour} onChange={(e) => setFormHour(e.target.value)}>
                      <option value="">시간</option>
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}시</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-subtext">
                      {formYear && formMonth && formDay
                        ? `${formYear}년 ${formMonth}월 ${formDay}일 ${formHour ? String(formHour).padStart(2, "0") + ":00" : "23:59"} 만료`
                        : "날짜를 선택하세요"}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setFormYear(""); setFormMonth(""); setFormDay(""); setFormHour(""); }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <XIcon size={12} /> 초기화
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setFormYear(String(now.getFullYear()));
                    setFormMonth(String(now.getMonth() + 1));
                    setFormDay("");
                    setFormHour("");
                  }}
                  className="w-full py-2.5 rounded-lg border border-dashed border-white/20 text-subtext hover:text-white hover:border-gold/40 transition-colors text-sm"
                >
                  만료일 설정하기
                </button>
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
