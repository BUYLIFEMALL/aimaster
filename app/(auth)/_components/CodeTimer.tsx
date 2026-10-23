"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** 인증번호 남은 시간(5:00 → 0:00). expiresAt이 바뀌면(다시 받기) 처음부터 센다. */
export default function CodeTimer({ expiresAt, onExpire }: { expiresAt: number | null; onExpire?: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const left = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;

  useEffect(() => {
    if (expiresAt && left === 0) onExpire?.();
  }, [expiresAt, left, onExpire]);

  if (!expiresAt) return null;
  if (left === 0) {
    return <p className="mt-2 text-xs text-red-400">인증번호가 만료되었습니다. 인증번호를 다시 받아주세요.</p>;
  }
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <p className={`mt-2 flex items-center gap-1 text-xs ${left <= 60 ? "text-red-400" : "text-gold-light"}`}>
      <Timer size={13} /> 남은 시간 {mm}:{ss}
    </p>
  );
}
