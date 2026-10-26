"use client";

import { useCallback, useState } from "react";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { HtmlBlockEditor } from "@/components/products/HtmlBlockEditor";
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

/** v1.37: 미리보기 내용이 바뀌면 iframe을 새로 만든다 — srcDoc만 바꾸면 크롬이 다시 그리지 않는 경우가 있었다(로컬 확인) */
function previewKey(html: string): string {
  let h = 0;
  for (let i = 0; i < html.length; i += 97) h = (h * 31 + html.charCodeAt(i)) | 0;
  return `${html.length}-${h}`;
}

export function HtmlExportPanel({ productId }: { productId: string }) {
  const [template, setTemplate] = useState<HtmlTemplate>("coupang");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ html: string; fileName: string } | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  // v1.37(E3): 블록 편집 — 고친 HTML·글(없으면 처음 만든 HTML)로 미리보기·내려받기·복사
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState<{ html: string; text: string } | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const onEdited = useCallback((html: string, text: string) => setEdited({ html, text }), []);
  const currentHtml = edited?.html ?? result?.html ?? "";

  async function copyText(label: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopyNote(`✅ ${label}을(를) 복사했습니다.`); }
    catch { setCopyNote("복사하지 못했습니다. HTML 파일을 내려받아 열어 주세요."); }
  }

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    setEditing(false);
    setEdited(null);
    setCopyNote(null);
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
    const url = URL.createObjectURL(new Blob([currentHtml], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
      {showApiKeyModal && (
        <ApiKeyRequiredModal missingLabels={["Google (Gemini / 나노바나나)"]} onClose={() => setShowApiKeyModal(false)} />
      )}
      <div className="pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-sm border border-indigo-200/60 font-bold shrink-0">🧾</span>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">HTML 상세페이지로 내보내기</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          만든 섹션 이미지와 상품 정보로 글자를 고칠 수 있는 HTML 상세페이지를 씁니다. Gemini 글 생성 1회(회원 본인 키, 이미지 생성 아님)이며
          결과는 저장되지 않으니 바로 내려받아 주세요. 상품 정보에 없는 후기·판매량·인증은 넣지 않습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {(Object.keys(HTML_TEMPLATES) as HtmlTemplate[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTemplate(key)}
            className={`text-left rounded-xl border p-3 transition-all ${
              template === key
                ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-xs"
                : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
            }`}
          >
            <div className={`text-xs font-black tracking-tight ${template === key ? "text-blue-700" : "text-slate-800"}`}>
              {HTML_TEMPLATES[key].label}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 leading-snug">
              {HTML_TEMPLATES[key].description}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="btn-3d-seller w-full !text-sm !py-3 tracking-tight"
      >
        <span>🧾</span>
        <span>{busy ? "HTML 상세페이지 코드 작성 중... (1~2분)" : `${HTML_TEMPLATES[template].label} HTML 페이지 만들기`}</span>
      </button>

      {error && (
        <p className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl p-3 border border-rose-200">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={download}
            className="btn-3d-blue w-full !text-sm !py-2.5 tracking-tight"
          >
            <span>⬇️</span>
            <span>HTML 파일 내려받기{edited ? " (고친 내용 반영됨)" : ""}</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className={`text-xs font-bold rounded-xl py-2.5 px-3 border transition-all flex items-center justify-center gap-1.5 ${
                editing
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <span>✏️</span>
              <span>{editing ? "블록 편집기 닫기" : "블록 순서/글 편집"}</span>
            </button>
            <button
              type="button"
              onClick={() => void copyText("HTML 코드", currentHtml)}
              className="text-xs font-bold rounded-xl py-2.5 px-3 border bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5"
            >
              <span>📋</span>
              <span>HTML 코드 복사</span>
            </button>
            <button
              type="button"
              onClick={() => void copyText("글", edited?.text ?? "")}
              disabled={!edited}
              title={edited ? "" : "「✏️ 블록 편집」을 한 번 열면 글만 복사할 수 있습니다"}
              className="text-xs font-bold rounded-xl py-2.5 px-3 border bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center gap-1.5"
            >
              <span>📝</span>
              <span>텍스트만 복사</span>
            </button>
          </div>

          {copyNote && (
            <p role="status" className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/70 rounded-xl px-3 py-2 animate-fade-in">
              {copyNote}
            </p>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            💡 고해상도 이미지가 HTML 내부에 base64 형태로 내장되어 파일 크기가 큽니다. 오픈마켓 편집기 업로드 용량 초과 시, 상단 「📦 섹션별 ZIP」으로 이미지를 먼저 올리고 「📝 텍스트만 복사」를 활용해 문구를 배치하세요.
          </p>

          {editing && <HtmlBlockEditor original={result.html} onChange={onEdited} />}

          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>실시간 HTML 미리보기 (스크립트 실행 방지 격리 환경)</span>
              </span>
              <span className="text-[10px] text-slate-400">860px 너비 기준</span>
            </div>
            <iframe
              key={previewKey(currentHtml)}
              title="HTML 상세페이지 미리보기"
              sandbox=""
              srcDoc={currentHtml}
              className="w-full h-[640px] bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
