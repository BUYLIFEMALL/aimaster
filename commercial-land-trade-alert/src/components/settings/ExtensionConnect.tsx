"use client";

import { useState } from "react";
import { askExtension } from "@/lib/extensionBridge";
import { createExtensionToken, retireStaleAutoTokens } from "@/lib/actions/tokenActions";

// 버튼 한 번으로 연결 코드를 만들어 이 화면의 확장에 바로 넘긴다(복사·붙여넣기 없음). 기준: realty-listing-alert ExtensionConnectButton
export function ExtensionConnect({ version }: { version: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function connect() {
    setBusy(true);
    try {
      const ping = await askExtension<{ ok?: boolean }>("ping", 1500);
      if (!ping?.ok) return setMsg("이 브라우저에서 확장을 찾지 못했어요. 설치(또는 새로고침)한 뒤 이 화면도 새로고침해 주세요.");
      const issued = await createExtensionToken(`확장 자동 연결 · ${new Date().toLocaleString("ko-KR")}`);
      if ("error" in issued) return setMsg(issued.error ?? "연결 코드를 만들지 못했어요.");
      const r = await askExtension<{ ok?: boolean; email?: string; error?: string }>("connect", 15000, { token: issued.token });
      if (!r?.ok) return setMsg(r?.error ?? "확장이 응답하지 않았어요.");
      void retireStaleAutoTokens(issued.id).catch(() => undefined);
      setMsg(`✅ 연결 완료${r.email ? ` · ${r.email}` : ""}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-mx-muted">
        <li>ZIP을 받아 압축을 풉니다.</li>
        <li>
          크롬 주소창에 <code>chrome://extensions</code>를 넣고 개발자 모드를 켠 뒤 「압축해제된 확장 프로그램을 로드합니다」로 폴더를 고릅니다.
        </li>
        <li>아래 「바로 연결」을 누릅니다.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <a href="/downloads/commercial-land-trade-alert-extension-latest.zip" className="mx-btn-primary text-sm">
          ⬇ 확장 받기 ({version})
        </a>
        <button type="button" onClick={connect} disabled={busy} className="mx-btn-ghost text-sm">
          {busy ? "연결 중..." : "🔗 바로 연결"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-mx-text">{msg}</p>}
    </div>
  );
}
