"use client";
// 2026-11-17 WS-20261117-17 QA017: 영수증 화면 전용 rpc — 화면이 연 계정(accountKey)을 모든 rcpt*/bt* 요청에 실어 보낸다.
// 보드가 컨텍스트로 내려 주고(전역 변수 공유 0), 서버가 계정 바뀜(409)을 알리면 보드에 알려 옛 자료·쓰기 화면을 숨긴다.
import { createContext, useContext } from "react";
import { AccountChangedError, rpc } from "@/lib/standaloneRpc";

export type ReceiptRpc = <T = unknown>(name: string, body?: Record<string, unknown>) => Promise<T>;

export function boundReceiptRpc(expectedAccount: string | null | undefined, onAccountChanged: () => void): ReceiptRpc {
  return async <T,>(name: string, body: Record<string, unknown> = {}) => {
    // QA017 P2: 영수증 화면은 계정 id 없이(빈 값·null·undefined·공백) 요청하지 않는다 — 보내기 전에 계정 바뀜으로 실패(fail-closed)
    if (typeof expectedAccount !== "string" || !expectedAccount.trim()) {
      onAccountChanged();
      throw new AccountChangedError();
    }
    try {
      return await rpc<T>(name, body, { expectedAccount });
    } catch (e) {
      if (e instanceof AccountChangedError) onAccountChanged();
      throw e;
    }
  };
}

export const ReceiptRpcContext = createContext<ReceiptRpc | null>(null);

/** 보드 안에서만 쓴다. 보드 밖에서 부르면 기대 계정 없이 요청이 나가지 않도록 바로 오류. */
export function useReceiptRpc(): ReceiptRpc {
  const r = useContext(ReceiptRpcContext);
  if (!r) throw new Error("useReceiptRpc: ReceiptsBoard 안에서만 쓸 수 있습니다.");
  return r;
}
