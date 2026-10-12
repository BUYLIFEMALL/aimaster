"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import GoldButton from "@/components/ui/GoldButton";
import { GradeRow } from "@/components/admin/GradeAccessPolicy";
import type { MemberGrade, Program } from "@/types/database.types";

/**
 * 등급(골드·VIP)의 "사용 프로그램" 설정 팝업(2026-10-13): 프로그램을 체크해 저장하면 그 등급 회원 전원에게 사용권한이
 * 자동 부여되고, 체크를 풀면 자동 부여분이 회수된다. 사용기간은 같은 팝업의 일괄 연장 또는 회원 선택 후 "사용만료기간 설정".
 */
export default function GradeProgramsModal({
  grade,
  programs,
  onClose,
}: {
  grade: MemberGrade;
  programs: Pick<Program, "id" | "name">[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/grade-access?grade_id=${grade.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setSelected(new Set<string>(d.program_ids ?? []));
        setLoaded(true);
      })
      .catch(() => alive && setMsg("현재 설정을 불러오지 못했습니다."));
    return () => { alive = false; };
  }, [grade.id]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/grade-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_programs", grade_id: grade.id, program_ids: Array.from(selected) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(`실패: ${d.error ?? res.status}`); return; }
      setMsg(`저장했습니다. (추가 ${d.added}개 · 해제 ${d.removed}개) 추가된 프로그램은 등급 회원에게 바로 부여되었습니다.`);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold mb-1">[{grade.name}] 사용 프로그램 설정</h3>
        <p className="text-subtext text-xs mb-4">
          체크한 프로그램은 이 등급 회원 전원에게 사용권한이 한꺼번에 부여됩니다. 체크를 풀면 자동 부여분이 회수됩니다(관리자가 직접 준 권한은 유지).
          회원을 이 등급으로 넣기만 해도 아래 프로그램이 자동으로 부여됩니다.
        </p>

        <div className="flex items-center justify-between mb-1">
          <span className="text-subtext text-xs">
            사용 프로그램 <span className="text-gold font-semibold">· 선택 {selected.size} / 전체 {programs.length}</span>
          </span>
          <button
            type="button"
            className="text-xs text-gold/80 hover:text-gold hover:underline"
            onClick={() => setSelected(selected.size === programs.length ? new Set() : new Set(programs.map((p) => p.id)))}
          >
            {selected.size === programs.length ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2 mb-3 space-y-0.5">
          {!loaded ? (
            <p className="text-subtext text-xs px-2 py-1.5">불러오는 중...</p>
          ) : (
            programs.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-white px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="rounded border-white/20 bg-white/5 accent-gold" />
                {p.name}
              </label>
            ))
          )}
        </div>
        <div className="flex gap-2 mb-5">
          <GoldButton size="sm" onClick={save} disabled={saving || !loaded}>{saving ? "저장 중..." : "프로그램 저장·부여"}</GoldButton>
          <GoldButton size="sm" variant="ghost" onClick={onClose}>닫기</GoldButton>
        </div>
        {msg && <p className="text-xs text-gold mb-4">{msg}</p>}

        <p className="text-white text-sm font-semibold mb-2">사용기간</p>
        <GradeRow grade={grade} />
        <p className="text-subtext text-xs mt-3">사람마다 기간을 따로 정하려면 이 팝업을 닫고 회원을 선택한 뒤 &quot;사용만료기간 설정&quot;을 사용하세요.</p>
      </div>
    </div>,
    document.body,
  );
}
