"use client";

// 2026-10-21 병합 C: AI 프롬프트 템플릿 자동화는 AI Prompt 자동화 「📁 내 템플릿 보관함」으로 합쳐졌다.
// 이 앱은 안내만 하고(주소 유지), 이 주소의 브라우저(localStorage)에만 있던 템플릿을 내 계정 보관함으로 옮겨 준다.
import { useEffect, useState } from "react";
import { DEFAULT_PROMPTS } from "@/data/presets";
import type { PromptTemplate } from "@/types/prompt";

export const NEW_URL = "https://ai-prompt.buylife.xyz/?tab=templates";
const STORAGE_KEY_PROMPTS = "aimaster_prompt_templates";

// 처음부터 들어 있던 예제(수정하지 않은 것)는 옮기지 않는다
const isUntouchedExample = (p: PromptTemplate) =>
  DEFAULT_PROMPTS.some((d) => d.id === p.id && d.title === p.title && d.content === p.content);

export function MovedNotice({ loggedIn }: { loggedIn: boolean }) {
  const [mine, setMine] = useState<PromptTemplate[]>([]);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROMPTS);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setMine(parsed.filter((p) => p && typeof p === "object" && !isUntouchedExample(p)));
    } catch {
      setMine([]);
    }
  }, []);

  async function migrate() {
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/migrate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: mine }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "옮기지 못했습니다.");
      setState("done");
      setMessage(`${data.added}개를 AI Prompt 「📁 내 템플릿 보관함」으로 옮겼습니다.${data.skipped ? ` 이미 있거나 형식이 맞지 않는 ${data.skipped}개는 건너뛰었습니다.` : ""} 이 브라우저의 원래 템플릿은 지우지 않았습니다.`);
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "옮기지 못했습니다.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 font-sans text-slate-900">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-3xl">📁</p>
        <h1 className="text-lg font-black">AI 프롬프트 템플릿 자동화가 「AI Prompt 자동화」로 옮겨졌습니다</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          카테고리 보관함·{"{{변수}}"} 자동 인식·AI 변수 채우기·바로 실행·.md 받기는 이제 <strong className="text-slate-900">AI Prompt 자동화 → 📁 내 템플릿 보관함</strong>에서 그대로 쓰실 수 있습니다.
          템플릿이 내 계정에 저장되어 기기를 바꿔도 남고, AI Prompt로 설계한 프롬프트를 바로 템플릿으로 저장할 수도 있습니다.
        </p>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left text-sm">
          <p className="font-bold text-slate-800">이 브라우저에 저장된 내 템플릿: {mine.length}개</p>
          {mine.length === 0 ? (
            <p className="mt-1 text-xs text-slate-600">옮길 템플릿이 없습니다(처음부터 들어 있던 예제는 새 보관함에도 있습니다). 다른 브라우저·기기에서 쓰셨다면 그 브라우저로 이 주소에 들어와 주세요.</p>
          ) : loggedIn ? (
            <button
              type="button"
              disabled={state === "busy" || state === "done"}
              onClick={() => void migrate()}
              className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {state === "busy" ? "옮기는 중…" : state === "done" ? "옮기기 완료" : `AI Prompt로 옮기기 (${mine.length}개)`}
            </button>
          ) : (
            <a href="/login" className="mt-2 block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-700">로그인하고 옮기기</a>
          )}
          {message && <p className={`mt-2 text-xs ${state === "error" ? "text-rose-600" : "text-emerald-700"}`} role="status">{message}</p>}
        </div>

        <a href={NEW_URL} className="inline-block rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-800">AI Prompt 보관함으로 가기</a>
        <p className="text-xs text-slate-500">Gemini 키는 AIMaster 공용 저장소의 본인 키를 그대로 쓰므로 다시 등록하지 않아도 됩니다.</p>
      </div>
    </main>
  );
}
