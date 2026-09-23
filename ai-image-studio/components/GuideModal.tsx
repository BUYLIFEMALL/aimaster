"use client";

import { useState } from "react";
import { BookOpen, X, ExternalLink } from "lucide-react";

export function GuideModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">📖 연동 매뉴얼 및 이용 안내</h3>
              <p className="text-xs text-zinc-400">
                OpenAI, FLUX(Fal.ai), Google Gemini, Stability AI 등 플랫폼별 API 키 발급 방법 및 옵션 가이드를 확인해보세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-bold text-zinc-100 transition-colors border border-zinc-700"
          >
            <span>매뉴얼 팝업 열기</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">이미지 자동화 플랫폼 연동 가이드</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                💡 <strong>AIMaster 멀티테넌시 보안 원칙:</strong> 서비스 플랫폼의 API 키는 본인 계정 전용이며 운영자 키로 폴백되지 않습니다. 본인의 API 키를 발급받아 등록해주시면 사용하신 만큼 본인 API 계정으로 안전하게 과금됩니다.
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h4 className="font-bold text-amber-400">1. OpenAI (DALL-E 3 / DALL-E 2)</h4>
                  <p>· platform.openai.com ➔ API Keys 메뉴에서 `sk-...` 형태의 API Key를 발급받아 등록합니다.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h4 className="font-bold text-amber-400">2. Fal.ai (FLUX.1 dev/schnell / Recraft V3)</h4>
                  <p>· fal.ai ➔ Dashboard ➔ API Keys 메뉴에서 Key를 발급받아 `fal` 항목에 등록합니다.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h4 className="font-bold text-amber-400">3. Google Gemini (Imagen 3)</h4>
                  <p>· aistudio.google.com ➔ Get API key 탭에서 Gemini API Key를 발급받아 `gemini` 항목에 등록합니다.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <h4 className="font-bold text-amber-400">4. Stability AI (SD3.5 / Ultra)</h4>
                  <p>· platform.stability.ai ➔ Account ➔ API Keys에서 Key를 발급받아 `stability` 항목에 등록합니다.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-zinc-800 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
