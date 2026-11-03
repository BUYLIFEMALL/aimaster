"use client";
// E5-5(2026-11-04): 다른 프로그램(상세페이지·썸네일·인스타 카드뉴스) 창에서 열린 바나나 무료 도구가 그림을 받고 결과를 돌려보내는 훅.
// 「🧰 무료 이미지 도구」와 「🧽 무료 지우기」가 함께 쓴다. 약속(주소·메시지 검사)은 공용 nukki-handoff.
import { useEffect, useRef, useState } from "react";
import { NUKKI_MSG_READY, NUKKI_MSG_RESULT, NUKKI_RESULT_MAX_BYTES, NUKKI_SENDERS, nukkiSenderOf, readNukkiFile, type NukkiSender } from "@/lib/nukkiHandoff";

export interface NukkiLink { from: NukkiSender; label: string; section: string; name: string }
type Got = { file: File; label: string } | { error: string };

/** 보낸 곳 창에서 열렸으면 「준비됨」을 보내고, 받은 그림을 onGot으로 넘긴다. 결과를 돌려보낼 수 있으면 link가 채워진다 */
export function useNukkiReceive(onGot: (got: Got) => void) {
  const [link, setLink] = useState<NukkiLink | null>(null);
  const cb = useRef(onGot); cb.current = onGot;

  useEffect(() => {
    const from = nukkiSenderOf(new URLSearchParams(window.location.search).get("from"));
    if (!from || !window.opener) return;
    const { origin, label } = NUKKI_SENDERS[from];
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.opener) return;
      const got = readNukkiFile(e.origin, e.data, from);
      if (!got) return;
      if ("error" in got) { cb.current(got); return; }
      setLink(got.section ? { from, label, section: got.section, name: got.name } : null);
      cb.current({ file: new File([got.file], got.name, { type: got.file.type }), label });
    };
    window.addEventListener("message", onMessage);
    window.opener.postMessage({ type: NUKKI_MSG_READY }, origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /** 결과를 보낸 곳 그 자리로 돌려보낸다. 못 보내면 안내 문구, 보냈으면 null */
  function sendBack(blob: Blob): string | null {
    if (!link) return "결과를 돌려보낼 곳이 없습니다.";
    if (!window.opener || window.opener.closed) return `${link.label} 창이 닫혔습니다. 결과를 내려받아 ${link.label}에서 직접 올려 주세요.`;
    if (blob.size > NUKKI_RESULT_MAX_BYTES) return "결과가 10MB를 넘습니다. JPG로 바꾸거나 결과를 내려받아 줄인 뒤 직접 올려 주세요.";
    window.opener.postMessage({ type: NUKKI_MSG_RESULT, section: link.section, file: blob }, NUKKI_SENDERS[link.from].origin);
    return null;
  }

  return { link, sendBack };
}
