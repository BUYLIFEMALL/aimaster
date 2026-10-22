"use client";

// 2026-10-23: 버튼 한 번으로 확장 연결 — 7일짜리 연결 코드를 만들어 이 화면의 확장(web-bridge.js)에 바로 넘긴다(복사·붙여넣기 없음).
// auto: 확장 팝업의 「자동 연결」로 열린 화면이면 들어오자마자 연결하고, 확장이 이 탭을 닫는다. 기준 구현: naver-blog-seo-studio.
import { useEffect, useRef, useState } from "react";
import { askExtension } from "@/lib/extensionPageBridge";

type State = { kind: "idle" | "working" | "done" | "error"; message: string };

export function ExtensionConnectButton({ auto = false }: { auto?: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle", message: "" });
  const started = useRef(false);

  async function connect() {
    setState({ kind: "working", message: "확장 프로그램을 확인하는 중..." });
    const ping = await askExtension<{ ok?: boolean }>("ping", 1500);
    if (!ping?.ok) return setState({ kind: "error", message: "이 브라우저에서 확장 프로그램을 찾지 못했습니다(v1.10 이하는 자동 연결을 지원하지 않습니다). 최신 확장을 설치·새로고침한 뒤 이 화면을 새로고침해 주세요." });
    setState({ kind: "working", message: "연결 코드를 만들어 확장에 넘기는 중..." });
    const issued = await fetch("/api/extension", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "issue" }) }).then((res) => res.json()).catch(() => null);
    if (!issued?.token) return setState({ kind: "error", message: issued?.error || "연결 코드를 만들지 못했습니다." });
    const result = await askExtension<{ ok?: boolean; error?: string }>("connect", 15000, { token: issued.token, closeTab: auto });
    if (!result) return setState({ kind: "error", message: "확장이 응답하지 않았습니다. 확장을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요." });
    if (!result.ok) return setState({ kind: "error", message: result.error || "확장 연결에 실패했습니다." });
    setState({ kind: "done", message: `확장 연결 완료(7일 유효)${auto ? " · 이 탭은 곧 닫힙니다." : " · 확장 팝업에서 「연결·목록 새로고침」을 누르면 원고 목록이 보입니다."}` });
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    // 확장 버튼으로 열린 화면에서는 한 번만 자동 실행한다(마운트 직후 다음 순간에 시작).
    const timer = window.setTimeout(() => { void connect(); }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return <div className="stack">
    <button className="primary" disabled={state.kind === "working"} onClick={connect}>{state.kind === "working" ? "연결 중…" : "확장 프로그램 바로 연결"}</button>
    {state.message && <p role="status" className={state.kind === "error" ? "error" : "success"}>{state.message}</p>}
  </div>;
}

// 이 브라우저에 설치된 확장의 실제 버전을 물어 한 줄로 보여 준다(v1.10 이하는 응답 통로가 없어 「찾지 못함」으로 보임).
export function ExtensionInstallStatus({ latest }: { latest: string }) {
  const [installed, setInstalled] = useState<string | null | undefined>(undefined);
  async function detect() {
    setInstalled(undefined);
    const ping = await askExtension<{ ok?: boolean; version?: string }>("ping", 1500);
    setInstalled(ping?.ok ? String(ping.version || "버전 확인 불가") : null);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void detect(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const text = installed === undefined ? "확장 프로그램 확인 중…"
    : installed === null ? "확장을 찾지 못했습니다 · 설치 전이거나 v1.10 이하 버전입니다(최신 ZIP으로 설치·업데이트)"
    : installed === latest ? `설치됨 · ${latest} (최신)`
    : `설치됨 · 현재 ${installed} → 최신 ${latest}로 업데이트 필요`;
  return <p className="hint" role="status">{text} <button onClick={() => void detect()} disabled={installed === undefined}>다시 확인</button></p>;
}
