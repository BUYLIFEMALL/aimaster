"use client";

import { useState } from "react";
import { DraftComposer } from "./DraftComposer";
import type { CafeTarget } from "@/types/post";

/**
 * /drafts?edit=<id>로 "기존 초안 하나만 고치러" 들어온 경우, 위쪽의 "AI 맞춤 자동 글쓰기"(새
 * 초안 생성용) 폼은 이 작업과 무관한데도 항상 펼쳐져 있어서 헷갈린다는 지적(2026-09-12)이 있었다
 * — 특히 그 폼 자신의 "제목/본문" 미리보기 칸이 비어 있는 채로 아래쪽 "실제 수정 대상" 초안의
 * 제목/본문 칸과 나란히 보여서 어느 쪽이 진짜 수정 화면인지 헷갈리기 쉬웠다. 그래서 이 폼을
 * 기본으로 접어두고(defaultCollapsed), 새 글을 만들고 싶을 때만 펼치도록 분리했다.
 */
export function DraftComposerSection({
  targets,
  initialTitle,
  initialContent,
  defaultCollapsed,
}: {
  targets: CafeTarget[];
  initialTitle: string;
  initialContent: string;
  defaultCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="w-full rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-left text-sm font-medium text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"
      >
        + 새 초안 만들기 (주제를 입력해 AI로 새로 작성)
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <DraftComposer targets={targets} initialTitle={initialTitle} initialContent={initialContent} />
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="text-xs text-neutral-500 hover:underline"
      >
        접기
      </button>
    </div>
  );
}
