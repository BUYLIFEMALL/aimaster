"use client";

import { useEffect, useState } from "react";
import { EngineError, createEngineClient, type EngineClient } from "@/lib/engine";

/** 엔진 설치 안내 주소(엔진은 AI 무료음악 자동화와 같은 프로그램이다) */
export const ENGINE_DOWNLOAD_URL = "https://free-music-studio.buylife.xyz/engine";

/**
 * 로그인 회원 번호로 엔진 연결 계층을 만든다. 회원이 바뀌거나 화면을 떠나면 dispose()해
 * 앞 회원이 보낸 요청의 늦은 응답이 다음 화면에 섞이지 않게 한다.
 */
export function useEngine(memberId: string): EngineClient | null {
  const [client, setClient] = useState<EngineClient | null>(null);
  useEffect(() => {
    const c = createEngineClient({ memberId, storage: window.localStorage });
    setClient(c);
    return () => {
      c.dispose();
      setClient(null);
    };
  }, [memberId]);
  return client;
}

/** 화면에 보일 오류 문장. 회원 전환 뒤 버려진 응답(stale)은 보이지 않는다 */
export function messageOf(e: unknown, fallback: string): string | null {
  if (e instanceof EngineError && e.kind === "stale") return null;
  return e instanceof Error && e.message ? e.message : fallback;
}
export const isKind = (e: unknown, ...kinds: string[]) => e instanceof EngineError && kinds.includes(e.kind);
