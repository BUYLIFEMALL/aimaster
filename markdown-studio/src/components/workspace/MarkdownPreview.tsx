"use client";
import { useDeferredValue, useMemo } from "react";
import DOMPurify from "dompurify";
import { parseMarkdown } from "@/lib/markdown/parser";

// 새 창으로 열리는 링크는 원문 창의 접근을 막는다
let hooked = false;
function ensureHook() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", node => {
    if (node.tagName === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}
export function sanitizedMarkdown(markdown: string): string {
  ensureHook();
  return DOMPurify.sanitize(parseMarkdown(markdown), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["form", "input", "button", "textarea", "select", "iframe", "style"],
    FORBID_ATTR: ["style", "id", "name"],
  });
}
export function MarkdownPreview({ markdown }: { markdown: string }) {
  const deferred = useDeferredValue(markdown);
  const rendered = useMemo(() => sanitizedMarkdown(deferred), [deferred]);
  return <article className="markdown-content" aria-label="문서 미리보기" dangerouslySetInnerHTML={{ __html: rendered }}/>;
}
