"use client";

// 네이버 발행 카테고리 선택. 실제 목록은 크롬 확장이 읽어 온다(확장이 새 탭에서 발행 설정창만 열어 읽고 닫는다).
// 목록은 이 브라우저에 기억해 두고, 마지막으로 쓴 카테고리가 다음 글의 기본값(자동 선택)이 된다.
import { useEffect, useState } from "react";
import {
  loadNaverCategoryList,
  reconcileNaverCategory,
  readNaverCategoryList,
  saveNaverCategoryList,
  type NaverCategory,
} from "@/lib/naverCategory";

const APP = "seo-studio-app";
const EXTENSION = "seo-studio-extension";

function askExtension<T>(type: "ping" | "categories", timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => { window.removeEventListener("message", onMessage); resolve(null); }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.source !== EXTENSION || data.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data.result as T);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: APP, type, requestId }, window.location.origin);
  });
}

/** "v1.62" 같은 확장 버전이 기준 이상인지(읽을 수 없으면 false) */
function versionAtLeast(version: unknown, minimum: [number, number]) {
  const m = /^v?(\d+)\.(\d+)/.exec(String(version ?? "").trim());
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a > minimum[0] || (a === minimum[0] && b >= minimum[1]);
}

export function NaverCategoryPicker({ value, onChange, disabled }: { value: NaverCategory | null; onChange: (next: NaverCategory | null) => void; disabled?: boolean }) {
  const [list, setList] = useState<NaverCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { setList(loadNaverCategoryList(window.localStorage)); }, []);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const ping = await askExtension<{ ok?: boolean; version?: string }>("ping", 1500);
      if (!ping?.ok) {
        setMessage("Chrome 확장 프로그램(v1.62 이상)을 찾지 못했습니다. 설정 화면에서 최신 ZIP을 받아 덮어쓰고 chrome://extensions에서 새로고침한 뒤 이 화면도 새로고침해 주세요.");
        return;
      }
      if (!versionAtLeast(ping.version, [1, 62])) {
        setMessage(`설치된 확장 프로그램(${ping.version || "버전 확인 불가"})이 오래되어 카테고리를 읽을 수 없습니다. 최신 ZIP(v1.62 이상)을 받아 덮어쓰고 새로고침해 주세요.`);
        return;
      }
      setMessage("네이버에서 내 카테고리를 읽는 중입니다. 네이버 창이 잠깐 열렸다 닫힙니다(로그인이 필요하면 로그인해 주세요).");
      const result = await askExtension<{ categories?: unknown; error?: string }>("categories", 150000);
      if (!result) { setMessage("확장 프로그램이 응답하지 않았습니다. 확장을 새로고침하고 다시 시도해 주세요."); return; }
      const next = readNaverCategoryList(result.categories);
      if (result.error || next.length === 0) { setMessage(result.error || "카테고리를 읽지 못했습니다."); return; }
      setList(next);
      saveNaverCategoryList(window.localStorage, next);
      setMessage(`내 네이버 카테고리 ${next.length}개를 불러왔습니다.`);
      if (value) {
        const kept = reconcileNaverCategory(value, next);
        if (!kept) { onChange(null); setMessage("선택했던 카테고리가 네이버에 없어 선택을 해제했습니다. 목록에서 다시 골라 주세요."); }
        else if (kept.name !== value.name) onChange(kept);
      }
    } finally {
      setLoading(false);
    }
  };

  const options = value && !list.some((c) => c.id === value.id) ? [value, ...list] : list;

  return (
    <div className="cat-field">
      <label htmlFor="seo-naver-category">네이버 발행 카테고리</label>
      <div className="cat-row">
        <select id="seo-naver-category" disabled={disabled || loading} value={value?.id ?? ""} onChange={(event) => onChange(options.find((c) => c.id === event.target.value) ?? null)}>
          <option value="">지정 안 함 (네이버 기본 카테고리)</option>
          {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" className="secondary compact" disabled={disabled || loading} onClick={() => void load()}>{loading ? "불러오는 중..." : "카테고리 불러오기"}</button>
      </div>
      {message && <p className="cat-hint">{message}</p>}
    </div>
  );
}
