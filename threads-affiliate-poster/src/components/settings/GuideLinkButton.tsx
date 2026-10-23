"use client";

import { GUIDE_BASE_URL } from "@/lib/deployment";

/**
 * 루트 AIMaster의 공개 매뉴얼 게시판(app/(main)/guides/[id])을 팝업창으로 띄운다
 * (naver-cafe-poster의 GuideLinkButton.tsx와 동일한 패턴, 2026-09-13 플랫폼 표준) — 같은
 * 이름의 팝업을 재사용해서, 여러 매뉴얼을 눌러도 창 하나가 계속 갱신되며 옆에서 보고
 * 따라 할 수 있게 한다.
 */
export function GuideLinkButton({ guideId, label }: { guideId: string; label: string }) {
  // A standalone copy without its own manual site shows no manual buttons.
  if (!GUIDE_BASE_URL) return null;

  const openGuide = () => {
    window.open(
      `${GUIDE_BASE_URL}/guides/${guideId}`,
      "platform-guide-popup",
      "width=720,height=860,scrollbars=yes,resizable=yes",
    );
  };

  return (
    <button
      type="button"
      onClick={openGuide}
      className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
    >
      📄 {label}
    </button>
  );
}
