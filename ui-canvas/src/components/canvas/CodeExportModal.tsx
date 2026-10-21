"use client";
import { useMemo, useState } from "react";
import { Copy, Download, Trash2, X } from "lucide-react";
import type { CanvasComponent, CanvasSize, Snippet } from "@/lib/canvas/types";
import { generateTsx } from "@/lib/canvas/codegen";

// 「</> 코드」 창(2026-10-21 병합 D): 캔버스 화면 → React + Tailwind TSX, 갤러리에서 저장한 AI 컴포넌트 보기·복사·삭제.
interface Props {
  projectId: string;
  name: string;
  dark: boolean;
  canvas: CanvasSize;
  components: CanvasComponent[];
  snippets: Snippet[];
  onSnippets: (list: Snippet[]) => void;
  onClose: () => void;
  say: (text: string, kind?: "ok" | "error") => void;
}

function saveFile(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CodeExportModal({ projectId, name, dark, canvas, components, snippets, onSnippets, onClose, say }: Props) {
  const [tab, setTab] = useState<"screen" | "saved">("screen");
  const [openId, setOpenId] = useState<string | null>(snippets[0]?.id ?? null);
  const code = useMemo(() => generateTsx(components, canvas, { name, dark }), [components, canvas, name, dark]);
  const fileBase = (name || "design").replace(/[\\/:*?"<>|]/g, "_");

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); say("코드를 복사했습니다."); }
    catch { say("복사하지 못했습니다. 코드 칸을 직접 선택해 복사해 주세요.", "error"); }
  };

  const remove = async (s: Snippet) => {
    if (!window.confirm(`저장한 AI 컴포넌트 「${s.title}」을 삭제할까요?`)) return;
    const res = await fetch(`/api/projects/${projectId}/snippets?sid=${encodeURIComponent(s.id)}`, { method: "DELETE" });
    if (!res.ok) { say("삭제하지 못했습니다.", "error"); return; }
    onSnippets(snippets.filter((x) => x.id !== s.id));
    say("삭제했습니다.");
  };

  const opened = snippets.find((s) => s.id === openId) ?? null;

  return (
    <div className="uc-overlay" onClick={onClose}>
      <div className="uc-modal wide uc-code-modal" role="dialog" aria-modal="true" aria-label="코드 내보내기" onClick={(e) => e.stopPropagation()}>
        <div className="uc-modal-head">
          <h2>{"</>"} 코드 내보내기</h2>
          <button type="button" className="uc-icon-btn" aria-label="닫기" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="uc-tabs">
          <button type="button" aria-pressed={tab === "screen"} onClick={() => setTab("screen")}>이 화면 코드 (React + Tailwind)</button>
          <button type="button" aria-pressed={tab === "saved"} onClick={() => setTab("saved")}>저장한 AI 컴포넌트 ({snippets.length})</button>
        </div>

        {tab === "screen" ? (
          <>
            <p className="uc-code-note">
              캔버스 컴포넌트 {components.length}개를 React + Tailwind CSS 컴포넌트 한 파일로 만들었습니다. 위치·크기는 캔버스 그대로(절대 위치)이고,
              아이콘은 <code>lucide-react</code>를 씁니다. 실제 서비스에 넣을 때는 flex·grid로 바꿔 반응형으로 다듬으세요.
            </p>
            <pre className="uc-code" aria-label="생성된 코드">{code}</pre>
            <div className="actions">
              <button type="button" className="primary" onClick={() => copy(code)}><Copy size={14} />코드 복사</button>
              <button type="button" onClick={() => { saveFile(`${fileBase}.tsx`, code); say(".tsx 파일로 저장했습니다."); }}><Download size={14} />.tsx 파일로 받기</button>
            </div>
          </>
        ) : snippets.length === 0 ? (
          <p className="uc-code-note">
            아직 저장한 AI 컴포넌트가 없습니다. 좌측 메뉴 <a href="/gallery?tab=ai" target="_blank" rel="noopener">🧩 컴포넌트 갤러리 → AI 컴포넌트 생성기</a>에서
            만든 컴포넌트를 이 프로젝트에 저장하면 여기에서 다시 볼 수 있습니다.
          </p>
        ) : (
          <div className="uc-snippets">
            <ul>
              {snippets.map((s) => (
                <li key={s.id}>
                  <button type="button" aria-pressed={s.id === openId} onClick={() => setOpenId(s.id)}>
                    <strong>{s.title}</strong>
                    <small>{new Date(s.createdAt).toLocaleString("ko-KR")}</small>
                  </button>
                </li>
              ))}
            </ul>
            {opened && (
              <div className="uc-snippet-view">
                {opened.prompt && <p className="uc-code-note">요청: {opened.prompt}</p>}
                <pre className="uc-code">{opened.code}</pre>
                <div className="actions">
                  <button type="button" className="primary" onClick={() => copy(opened.code)}><Copy size={14} />코드 복사</button>
                  <button type="button" onClick={() => saveFile(`${opened.title.replace(/[\\/:*?"<>|]/g, "_")}.tsx`, opened.code)}><Download size={14} />.tsx 받기</button>
                  <button type="button" onClick={() => void remove(opened)}><Trash2 size={14} />삭제</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
