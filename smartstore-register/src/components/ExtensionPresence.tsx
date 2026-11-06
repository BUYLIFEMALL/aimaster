"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getExtensionPresenceAction } from "@/lib/actions/extension";
import type { Presence } from "@/lib/extension/presence";

/** 이 계정의 확장이 최근 3분 안에 접속하지 않았으면 안내 — 정상이면 아무것도 안 보임 */
export function ExtensionPresence({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<Presence | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => getExtensionPresenceAction().then((r) => { if (alive) setState(r.state); }).catch(() => {});
    check();
    const t = setInterval(check, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!state || state === "recent") return null;
  const msg = state === "none"
    ? "이 계정과 연결된 확장이 없습니다. 보낸 작업·점검은 확장을 연결할 때까지 「대기」로 남습니다."
    : "이 계정의 확장이 최근 3분 동안 접속하지 않았습니다. 크롬이 꺼져 있거나, 확장이 다른 계정에 연결돼 있으면 작업이 「대기」로 남습니다.";
  return (
    <p className={`rounded-md border border-amber-200 bg-amber-50 text-amber-800 ${compact ? "mt-2 px-2 py-1.5 text-[11px]" : "px-3 py-2 text-xs"}`}>
      ⚠️ {msg}{" "}
      <Link href="/extension" className="font-bold underline">확장 연결 확인 →</Link>
    </p>
  );
}
