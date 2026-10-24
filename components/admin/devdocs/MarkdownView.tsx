"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

const GITHUB_BLOB = "https://github.com/BUYLIFEMALL/aimaster/blob/master/";

// 문서 표시 스타일(글 스타일 플러그인이 없어 여기서 직접 지정)
const MD_CLASS = [
  "text-[15px] leading-7 text-white/85 break-words",
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-2 [&_h1]:mb-4",
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-white/10",
  "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2",
  "[&_h4]:text-base [&_h4]:font-bold [&_h4]:text-white [&_h4]:mt-5 [&_h4]:mb-2",
  "[&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5",
  "[&_a]:text-sky-300 [&_a]:underline [&_a:hover]:text-sky-200",
  "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:text-amber-200",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/50 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-gold/50 [&_blockquote]:bg-gold/5 [&_blockquote]:px-3 [&_blockquote]:py-1",
  "[&_table]:my-3 [&_table]:block [&_table]:overflow-x-auto [&_table]:text-sm [&_table]:border-collapse",
  "[&_th]:border [&_th]:border-white/15 [&_th]:bg-white/5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-white",
  "[&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top",
  "[&_hr]:my-6 [&_hr]:border-white/10 [&_strong]:text-white",
].join(" ");

/** 문서 기준 상대 링크 → 저장소 경로 */
function resolveRepoPath(fromPath: string, href: string): string {
  const base = fromPath.split("/").slice(0, -1);
  for (const part of href.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") base.pop();
    else base.push(part);
  }
  return base.join("/");
}

export default function MarkdownView({
  markdown,
  path,
  onOpenDoc,
}: {
  markdown: string;
  /** 이 문서의 저장소 경로(상대 링크 계산용) */
  path?: string;
  /** 저장소 안 .md 링크를 누르면 부른다 */
  onOpenDoc?: (path: string) => void;
}) {
  const html = useMemo(() => {
    const raw = marked.parse(markdown, { gfm: true, async: false }) as string;
    return DOMPurify.sanitize(raw, { ADD_ATTR: ["target"] });
  }, [markdown]);

  return (
    <div
      className={MD_CLASS}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (!a) return;
        const href = a.getAttribute("href") ?? "";
        if (!href || href.startsWith("#")) return;
        e.preventDefault();
        if (/^[a-z]+:/i.test(href)) {
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }
        const [rel] = href.split("#");
        const repoPath = path ? resolveRepoPath(path, decodeURIComponent(rel)) : rel;
        if (/\.md$/i.test(repoPath) && onOpenDoc) onOpenDoc(repoPath);
        else window.open(GITHUB_BLOB + repoPath, "_blank", "noopener,noreferrer");
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
