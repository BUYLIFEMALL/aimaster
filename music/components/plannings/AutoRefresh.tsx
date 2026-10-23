"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Suno 웹훅(app/api/webhooks/suno)이 비동기로 DB를 갱신하므로, 생성 중인 트랙이 있으면
 * 이 화면(서버 컴포넌트)을 주기적으로 새로고침해서 완료 여부를 반영한다.
 */
export function AutoRefresh({ enabled, intervalMs = 5000 }: { enabled: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, router]);

  return null;
}
