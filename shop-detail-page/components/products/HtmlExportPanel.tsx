"use client";

import { useState } from "react";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { HTML_TEMPLATES, type HtmlTemplate } from "@/lib/ai/htmlDetailPrompt";

// v1.17(2026-10-21, 이커머스 병합 E2): 상세페이지 자동생성기 v1의 「HTML 상세페이지」를 이 앱으로 옮겼다.
// 서버는 [IMAGE_N] 자리가 있는 HTML과 이미지 주소만 돌려주고, 브라우저가 860px로 줄인 이미지를 HTML 안에 넣는다.
// 미리보기는 sandbox(스크립트 실행 안 함) iframe — 생성 HTML은 믿을 수 없는 코드로 취급한다(D-49-01).

async function toDataUrl(src: string): Promise<string> {
  const res = await fetch(`${src}&w=860`);
  if (!res.ok) throw new Error("이미지를 불러오지 못했습니다.");
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(blob);
  });
}

export function HtmlExportPanel({ productId }: { productId: string }) {
  const [template, setTemplate] = useState<HtmlTemplate>("coupang");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ html: string; fileName: string } | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/products/${productId}/export-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const json = await res.json();
      if (json.needsApiKey) {
        setShowApiKeyModal(true);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "HTML 작성에 실패했습니다.");
      let html: string = json.html;
      for (const img of json.images as { placeholder: string; src: string }[]) {
        const dataUrl = await toDataUrl(img.src);
        html = html.split(img.placeholder).join(dataUrl);
      }
      setResult({ html, fileName: json.fileName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "HTML 작성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 sm:p-5 space-y-3">
      {showApiKeyModal && (
        <ApiKeyRequiredModal missingLabels={["Google (Gemini / 나노바나나)"]} onClose={() => setShowApiKeyModal(false)} />
      )}
      <div>
        <h3 className="text-sm font-black text-slate-900">🧾 HTML 상세페이지로 내보내기</h3>
        <p className="text-xs text-slate-500 mt-1">
          만든 섹션 이미지와 상품 정보로 글자를 고칠 수 있는 HTML 상세페이지를 씁니다. Gemini 글 생성 1회(회원 본인 키, 이미지 생성 아님)이며
          결과는 저장되지 않으니 바로 내려받아 주세요. 상품 정보에 없는 후기·판매량·인증은 넣지 않습니다.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(Object.keys(HTML_TEMPLATES) as HtmlTemplate[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTemplate(key)}
            className={`text-left rounded-xl border p-3 transition-all ${
              template === key ? "border-blue-500 bg-white shadow-xs" : "border-slate-200 bg-white/60 hover:border-slate-300"
            }`}
          >
            <div className={`text-sm font-bold ${template === key ? "text-blue-700" : "text-slate-800"}`}>{HTML_TEMPLATES[key].label}</div>
            <div className="text-[11px] text-slate-500 mt-1">{HTML_TEMPLATES[key].description}</div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl py-3"
      >
        {busy ? "HTML 작성 중... (1~2분)" : `${HTML_TEMPLATES[template].label} HTML 만들기`}
      </button>
      {error && <p className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg p-3 border border-rose-200">{error}</p>}
      {result && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={download}
            className="w-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl py-2.5"
          >
            ⬇️ HTML 파일 내려받기
          </button>
          <iframe
            title="HTML 상세페이지 미리보기"
            sandbox=""
            srcDoc={result.html}
            className="w-full h-[640px] rounded-xl border border-slate-200 bg-white"
          />
        </div>
      )}
    </div>
  );
}
