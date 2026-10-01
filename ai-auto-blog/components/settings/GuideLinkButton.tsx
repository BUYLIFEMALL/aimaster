"use client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

/**
 * 루트 AIMaster의 공개 매뉴얼 게시판(app/(main)/guides/[id])을 팝업창으로 띄운다
 * (naver-cafe-poster에서 처음 도입한 패턴, 2026-09-13 — 모든 서브프로젝트의
 * API키등록·플랫폼연동 페이지 표준으로 확대 적용) — 같은 이름의 팝업을 재사용해서,
 * 여러 매뉴얼을 눌러도 창 하나가 계속 갱신되며 옆에서 보고 따라 할 수 있게 한다.
 */
export function GuideLinkButton({ guideId, label }: { guideId: string; label: string }) {
  const openGuide = () => {
    window.open(
      `${MAIN_SITE_URL}/guides/${guideId}`,
      "platform-guide-popup",
      "width=720,height=860,scrollbars=yes,resizable=yes",
    );
  };

  return (
    <button
      type="button"
      onClick={openGuide}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
    >
      📄 {label}
    </button>
  );
}
