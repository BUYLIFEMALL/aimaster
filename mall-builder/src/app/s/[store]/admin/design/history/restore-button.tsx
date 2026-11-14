"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreDesignAction } from "@/lib/builder/design-actions";

// 디자인 빌더 D6 — 「이 판으로 되돌리기」: 두 번 눌러 확인(브라우저 확인 창 대신), 성공하면 편집기로 이동해 초안을 보여 준다
export default function RestoreButton({ slug, storeId, historyId }: { slug: string; storeId: string; historyId: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function click() {
    if (!armed) return setArmed(true);
    setError("");
    start(async () => {
      const r = await restoreDesignAction(slug, storeId, historyId);
      if (!r.ok) {
        setError(r.error);
        setArmed(false);
        return;
      }
      router.push(`/s/${slug}/admin/design?restored=1`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${armed ? "bg-amber-600 text-white" : "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"}`}
        data-restore
      >
        {pending ? "되돌리는 중…" : armed ? "한 번 더 누르면 초안으로 되돌림" : "이 판으로 되돌리기"}
      </button>
      {armed && !pending && (
        <button type="button" onClick={() => setArmed(false)} className="text-[11px] text-gray-500 underline">취소</button>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
