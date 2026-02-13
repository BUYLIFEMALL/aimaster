"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MemberGradeSelectProps {
  userId: string;
  currentGradeId: string | null;
  grades: { id: string; name: string; color: string | null }[];
}

export default function MemberGradeSelect({
  userId,
  currentGradeId,
  grades,
}: MemberGradeSelectProps) {
  const [gradeId, setGradeId] = useState(currentGradeId ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleChange(newGradeId: string) {
    setGradeId(newGradeId);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/grades/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: [userId],
          grade_id: newGradeId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "등급 변경 실패");
        setGradeId(currentGradeId ?? "");
      } else {
        router.refresh();
      }
    } catch {
      alert("등급 변경 중 오류 발생");
      setGradeId(currentGradeId ?? "");
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
