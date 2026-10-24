"use client";

// 2026-10-23: 버튼 한 번으로 확장 연결 — 연결 코드를 만들어 이 화면의 확장(web-bridge.js)에 바로 넘긴다(복사·붙여넣기 없음).
// auto: 확장의 「자동 연결」 버튼으로 열린 화면이면 들어오자마자 연결하고, 확장이 이 탭을 닫는다.
import { useEffect, useRef, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";
import { createExtensionToken, retireStaleAutoTokens } from "@/lib/tokenActions";

type State = { kind: "idle" | "working" | "done" | "error"; message: string };

export default function ExtensionConnectButton({ auto = false }: { auto?: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle", message: "" });
  const started = useRef(false);

  async function connect() {
    setState({ kind: "working", message: "확장 프로그램을 확인하는 중..." });
    const ping = await askExtension<{ ok?: boolean; version?: string }>("ping", 1500);
    if (!ping?.ok) return setState({ kind: "error", message: "이 브라우저에서 확장 프로그램을 찾지 못했습니다. 확장을 설치(또는 새로고침)한 뒤 이 화면을 새로고침해 주세요." });
    setState({ kind: "working", message: "연결 코드를 만들어 확장에 넘기는 중..." });
    const issued = await createExtensionToken(`확장 자동 연결 · ${new Date().toLocaleString("ko-KR")}`);
    if ("error" in issued) return setState({ kind: "error", message: issued.error ?? "연결 코드를 만들지 못했습니다." });
    const result = await askExtension<{ ok?: boolean; email?: string; error?: string }>("connect", 15000, { token: issued.token, closeTab: auto });
    if (!result) return setState({ kind: "error", message: "확장이 응답하지 않았습니다. 확장을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요." });
    if (!result.ok) return setState({ kind: "error", message: result.error || "확장 연결에 실패했습니다." });
    void retireStaleAutoTokens(issued.id).catch(() => undefined); // 연결 성공 뒤에만, 안 쓰이는 옛 자동 연결 코드 정리
    setState({ kind: "done", message: `확장 연결 완료: ${result.email ?? ""}${auto ? " · 이 탭은 곧 닫힙니다." : ""}` });
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    void connect();
    // 확장 버튼으로 열린 화면에서는 한 번만 자동 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return <div className="extension-connect">
    <button type="button" onClick={connect} disabled={state.kind === "working"}>{state.kind === "working" ? "연결 중..." : "확장 프로그램 바로 연결"}</button>
    {state.message && <p className={state.kind === "error" ? "token-error" : "extension-connect-status"}>{state.message}</p>}
  </div>;
}
