"use client";
import { useDeferredValue, useMemo } from "react";
import DOMPurify from "dompurify";
import { Marked } from "marked";
const parser = new Marked({ gfm: true, breaks: false, async: false,
  renderer: { checkbox: ({ checked }) => `<span class="task-marker" aria-label="${checked ? "완료" : "미완료"}">${checked ? "☑" : "☐"}</span> ` },
});
export function sanitizedMarkdown(markdown: string): string {
  return DOMPurify.sanitize(parser.parse(markdown) as string, {
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
