"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface MemberGradeSelectProps {
  userId: string;
  currentGradeId: string | null;
  grades: { id: string; name: string; color: string | null }[];
  onGradeChange?: (newGradeId: string | null) => void;
}

function getGradeStyle(gradeName?: string, hexColor?: string | null) {
  if (hexColor && hexColor !== "") {
    return {
      style: {
        color: hexColor,
        borderColor: `${hexColor}60`,
        backgroundColor: `${hexColor}1a`,
      },
      dotColor: hexColor,
    };
  }

  const name = (gradeName ?? "").toLowerCase();
  if (name.includes("vip") || name.includes("드림ai")) {
    return {
      className: "text-purple-300 bg-purple-500/20 border-purple-400/40 hover:border-purple-400/70 shadow-purple-900/10",
      dotColor: "#c084fc",
    };
  }
  if (name.includes("골드") || name.includes("gold") || name.includes("드림팀")) {
    return {
      className: "text-amber-300 bg-amber-500/20 border-amber-400/40 hover:border-amber-400/70 shadow-amber-900/10",
      dotColor: "#f59e0b",
    };
  }
  if (name.includes("실버") || name.includes("silver")) {
    return {
      className: "text-cyan-300 bg-cyan-500/20 border-cyan-400/40 hover:border-cyan-400/70 shadow-cyan-900/10",
      dotColor: "#38bdf8",
    };
  }
  if (name.includes("일반") || name.includes("basic")) {
    return {
      className: "text-slate-300 bg-slate-500/15 border-slate-400/30 hover:border-slate-400/60",
      dotColor: "#94a3b8",
    };
  }

  return {
    className: "text-subtext bg-white/5 border-white/10 hover:border-white/20",
    dotColor: "#6b7280",
  };
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

  useEffect(() => {
    setGradeId(currentGradeId ?? "");
  }, [currentGradeId]);

  const currentGrade = grades.find((g) => g.id === gradeId);
  const gradeTheme = getGradeStyle(currentGrade?.name, currentGrade?.color);

  async function handleChange(newGradeId: string) {
    const nextValue = newGradeId || null;
    setGradeId(newGradeId);
    setLoading(true);

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
    <div className="relative inline-flex items-center">
      <select
        value={gradeId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        style={gradeTheme.style}
        className={cn(
          "text-xs font-semibold rounded-lg px-2.5 py-1 cursor-pointer transition-all border outline-none disabled:opacity-50 appearance-none pr-6",
          gradeTheme.className,
        )}
      >
        <option value="" className="bg-neutral-900 text-gray-300 font-normal py-1">
          미배정
        </option>
        {grades.map((g) => (
          <option key={g.id} value={g.id} className="bg-neutral-900 text-white font-normal py-1">
            {g.name}
          </option>
        ))}
      </select>
      {/* 셀렉트박스 화살표 표시 */}
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] opacity-70">
        ▼
      </span>
    </div>
  );
}
