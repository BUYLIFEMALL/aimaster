"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// 답변(assistant) 표시용. react-markdown은 원본 HTML을 렌더링하지 않으므로 모델 출력에 태그가 섞여도 안전하다.
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold text-white first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold text-white first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-3 text-sm font-bold text-white first:mt-0">{children}</h4>,
  h4: ({ children }) => <h4 className="mb-1.5 mt-3 text-sm font-bold text-white first:mt-0">{children}</h4>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="break-all text-sky-300 underline underline-offset-2 hover:text-sky-200">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-indigo-400/50 pl-3 text-slate-300">{children}</blockquote>,
  code: ({ className, children }) =>
    className ? (
      <code className={`${className} block`}>{children}</code>
    ) : (
      <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[0.85em] text-indigo-200">{children}</code>
    ),
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed">{children}</pre>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-[#262c3d] bg-white/5 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-[#262c3d] px-2 py-1 align-top">{children}</td>,
  hr: () => <hr className="my-3 border-[#262c3d]" />,
};

// 한국어 답변은 「2026~2030년」처럼 물결표 하나로 범위를 쓰므로, 물결표 하나는 취소선으로 읽지 않는다(~~두 개~~만 취소선).
// 2026-10-19 v1.02 실검수에서 답변 한 문단 전체에 취소선이 그어진 것을 발견.
export const REMARK_PLUGINS: NonNullable<Parameters<typeof ReactMarkdown>[0]["remarkPlugins"]> = [[remarkGfm, { singleTilde: false }]];

export function Markdown({ text }: { text: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
