"use client";

import { useCallback, useEffect, useState } from "react";
import { getEngineStatus, getToken, type EngineStatus } from "@/lib/engine";

/**
 * 내 PC 엔진 상태를 주기적으로 확인한다. 브라우저의 「로컬 네트워크 접근」 허용 창은
 * 첫 확인 때 한 번 뜬다.
 * - checking: 첫 확인 전 / offline: 엔진이 꺼져 있거나 허용 안 됨 / ready 등은 status 참고
 */
export function useEngine(intervalMs = 5000) {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getEngineStatus();
    setStatus(s);
    setHasToken(!!getToken());
    setChecking(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs]);

  const online = !!status;
  // 이 브라우저에 토큰이 있고 엔진도 짝지은 기록이 있어야 연결된 것으로 본다.
  const paired = online && hasToken && status.paired;
  const ready = paired && status.ready;

  return { status, checking, online, paired, ready, refresh };
}
