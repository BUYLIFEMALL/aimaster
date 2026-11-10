"use client";

import { useEffect, useState } from "react";

/** 사이트가 알려 주는 최신 설치 파일(엔진 실행 프로그램의 「새 버전」 알림도 같은 파일을 읽음) */
export type LatestEngine = { version: string; url: string; sizeMb: number; sha256: string; releasedAt?: string };

/** a가 b보다 새 버전인가(0.8.4 > 0.8.3) */
export const newerThan = (a: string, b: string) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

/**
 * 최신 엔진 버전과 비교(2026-11-10 — 「내 PC 엔진」 화면에만 있던 업데이트 안내를 상태 막대·곡 메뉴로 넓힘).
 * mine: 연결된 엔진 버전(없으면 비교하지 않음).
 */
export function useLatestEngine(mine?: string) {
  const [latest, setLatest] = useState<LatestEngine | null>(null);
  useEffect(() => {
    fetch("/downloads/engine-latest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.version && setLatest(j))
      .catch(() => {});
  }, []);
  const outdated = !!(latest && mine && newerThan(latest.version, mine));
  return { latest, outdated };
}
