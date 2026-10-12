"use client";

// 네이버 발행 카테고리 선택. 실제 목록은 크롬 확장이 읽어 온다(확장이 새 탭에서 발행 설정창만 열어 읽고 닫는다).
// 목록은 이 브라우저에 기억해 두고, 마지막으로 쓴 카테고리가 다음 글의 기본값(자동 선택)이 된다.
import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  extensionVersionAtLeast,
  loadNaverCategoryList,
  reconcileNaverCategory,
  readNaverCategoryList,
  saveNaverCategoryList,
  type NaverCategory,
} from "@/lib/blog/naverCategory";

interface Props {
  value: NaverCategory | null;
  onChange: (next: NaverCategory | null) => void;
  disabled?: boolean;
  /** true면 라벨을 숨기고 한 줄로(결과 화면용) */
  compact?: boolean;
}

function askExtension<T>(type: string, requestId: string, replyType: string, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || !event.data) return;
      if (event.data.type !== replyType || (requestId && event.data.requestId !== requestId)) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(event.data as T);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ type, requestId }, "*");
  });
}

export function NaverCategoryPicker({ value, onChange, disabled, compact }: Props) {
  const [list, setList] = useState<NaverCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setList(loadNaverCategoryList(window.localStorage));
  }, []);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const pong = await askExtension<{ version?: string }>("ALLINONE_PING_EXTENSION", "", "ALLINONE_PONG_EXTENSION", 1500);
      if (!pong) {
        setMessage("크롬 확장 프로그램이 이 화면과 연결되지 않았습니다. ① 상단 [크롬 확장 프로그램 ZIP]을 받아 압축을 풀고 ② chrome://extensions에서 개발자 모드를 켠 뒤 [압축해제된 확장 프로그램을 로드합니다]로 그 폴더를 선택(이미 설치했다면 폴더에 덮어쓴 뒤 새로고침) ③ 이 화면을 새로고침(F5)한 다음 다시 눌러 주세요. 확장은 페이지를 연 뒤에 설치하거나 새로고침하면 이 화면에 연결되지 않습니다.");
        return;
      }
      if (!extensionVersionAtLeast(pong.version, "v1.25")) {
        setMessage(`설치된 확장 프로그램(${pong.version || "버전 확인 불가"})이 오래되어 카테고리를 읽을 수 없습니다. 최신 ZIP(v1.25 이상)을 받아 기존 폴더에 덮어쓰고 chrome://extensions에서 새로고침한 뒤 이 화면도 새로고침해 주세요.`);
        return;
      }
      setMessage("네이버에서 내 카테고리를 읽는 중입니다. 네이버 창이 잠깐 열렸다 닫힙니다(로그인이 필요하면 로그인해 주세요).");
      const requestId = `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await askExtension<{ categories?: unknown; error?: string }>("ALLINONE_READ_CATEGORIES", requestId, "ALLINONE_CATEGORIES_RESULT", 150000);
      if (!result) {
        setMessage("확장 프로그램이 응답하지 않았습니다. 확장을 새로고침(v1.25 이상)하고 다시 시도해 주세요.");
        return;
      }
      const next = readNaverCategoryList(result.categories);
      if (result.error || next.length === 0) {
        setMessage(result.error || "카테고리를 읽지 못했습니다.");
        return;
      }
      setList(next);
      saveNaverCategoryList(window.localStorage, next);
      setMessage(`내 네이버 카테고리 ${next.length}개를 불러왔습니다.`);
      if (value) {
        const kept = reconcileNaverCategory(value, next);
        if (!kept) {
          onChange(null);
          setMessage("선택했던 카테고리가 네이버에 없어 선택을 해제했습니다. 목록에서 다시 골라 주세요.");
        } else if (kept.name !== value.name) onChange(kept);
      }
    } finally {
      setLoading(false);
    }
  };

  const options = value && !list.some((c) => c.id === value.id) ? [value, ...list] : list;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {!compact && <label htmlFor="aio-naver-category" className="text-xs font-bold text-slate-700 whitespace-nowrap">네이버 발행 카테고리</label>}
        <select
          id="aio-naver-category"
          disabled={disabled || loading}
          value={value?.id ?? ""}
          onChange={(e) => onChange(options.find((c) => c.id === e.target.value) ?? null)}
          className="h-9 min-w-0 w-64 max-w-full text-xs px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">지정 안 함 (네이버 기본 카테고리)</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="button" disabled={disabled || loading} onClick={() => void load()} className="h-9 flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} 카테고리 불러오기
        </button>
      </div>
      {message && <p className="text-[11px] leading-4 text-slate-500">{message}</p>}
    </div>
  );
}
