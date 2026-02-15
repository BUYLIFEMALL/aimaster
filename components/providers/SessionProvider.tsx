"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const heartbeat = async () => {
      try {
        const res = await fetch("/api/session/heartbeat", { method: "POST" });
        if (res.status === 401) {
          // 세션이 만료되었거나 다른 기기에서 강제 종료됨
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          router.push("/login");
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // 네트워크 오류 — 무시 (다음 heartbeat에서 재시도)
      }
    };

    // 최초 heartbeat (페이지 로드 시)
    heartbeat();

    // 60초마다 heartbeat
    intervalRef.current = setInterval(heartbeat, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

  return <>{children}</>;
}
