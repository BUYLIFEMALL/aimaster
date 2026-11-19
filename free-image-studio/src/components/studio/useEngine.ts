"use client";

import { useCallback, useSyncExternalStore } from "react";
import { EngineError, createEngineClient, type EngineClient } from "@/lib/engine";
import { createClientRegistry } from "@/lib/studio/clientRegistry";

/** 엔진 설치 안내 주소(엔진은 AI 무료음악 자동화와 같은 프로그램이다) */
export const ENGINE_DOWNLOAD_URL = "https://free-music-studio.buylife.xyz/engine";

// 회원별 엔진 연결 계층. 화면이 쓰는 동안만 살아 있다(브라우저에서만 만들어진다 — 사용 등록은 화면이 뜬 뒤에 일어난다).
const engines = createClientRegistry<EngineClient>((memberId) => createEngineClient({ memberId, storage: window.localStorage }));

/**
 * 로그인 회원 번호로 엔진 연결 계층을 쓴다. 회원이 바뀌거나 화면을 떠나면 dispose()해
 * 앞 회원이 보낸 요청의 늦은 응답이 다음 화면에 섞이지 않게 한다.
 * 서버에서 그릴 때와 화면이 붙기 전에는 null이다.
 */
export function useEngine(memberId: string): EngineClient | null {
  // 쓰기 시작하면 만들어지고, 사용 등록이 끊기면(회원이 바뀌거나 화면을 떠나면) 정리된다.
  // 사용 등록 직후 React가 값을 다시 읽으므로 따로 알릴 것이 없다.
  const subscribe = useCallback(() => engines.subscribe(memberId), [memberId]);
  return useSyncExternalStore(
    subscribe,
    () => engines.get(memberId),
    () => null,
  );
}

const noSubscribe = () => () => {};
/** 브라우저에 붙은 뒤인가. 서버에서 그릴 때와 붙는 순간에는 false — 브라우저 저장소를 읽는 화면은 true가 된 뒤에 그린다 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/** 화면에 보일 오류 문장. 회원 전환 뒤 버려진 응답(stale)은 보이지 않는다 */
export function messageOf(e: unknown, fallback: string): string | null {
  if (e instanceof EngineError && e.kind === "stale") return null;
  return e instanceof Error && e.message ? e.message : fallback;
}
export const isKind = (e: unknown, ...kinds: string[]) => e instanceof EngineError && kinds.includes(e.kind);
