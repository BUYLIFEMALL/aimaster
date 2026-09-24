"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MemberGradeSelectProps {
  userId: string;
  currentGradeId: string | null;
  grades: { id: string; name: string; color: string | null }[];
  onGradeChange?: (newGradeId: string | null) => void;
}

export default function MemberGradeSelect({
  userId,
  currentGradeId,
  grades,
  onGradeChange,
}: MemberGradeSelectProps) {
  const [gradeId, setGradeId] = useState(currentGradeId ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // router.refresh()로 서버가 최신 profiles.grade_id를 내려주면 select의
  // 로컬 상태도 함께 동기화한다.
  useEffect(() => {
    setGradeId(currentGradeId ?? "");
  }, [currentGradeId]);

  async function handleChange(newGradeId: string) {
    const nextValue = newGradeId || null;
    setGradeId(newGradeId);
    setLoading(true);

    // 부모 테이블의 로컬 override 즉시 갱신 (0.001초 즉시 반응)
    onGradeChange?.(nextValue);

    try {
      const res = await fetch("/api/admin/grades/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: [userId],
          grade_id: nextValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "등급 변경 실패");
        setGradeId(currentGradeId ?? "");
        onGradeChange?.(currentGradeId ?? null);
      } else {
        router.refresh();
      }
    } catch {
      alert("등급 변경 중 오류 발생");
      setGradeId(currentGradeId ?? "");
      onGradeChange?.(currentGradeId ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={gradeId}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="text-xs bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 cursor-pointer hover:border-gold/40 transition-colors disabled:opacity-50"
    >
      <option value="">미배정</option>
      {grades.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}
