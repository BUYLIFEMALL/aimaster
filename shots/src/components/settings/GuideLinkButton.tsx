"use client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

/**
 * 루트 AIMaster의 공개 매뉴얼 게시판(app/(main)/guides/[id])을 팝업창으로 띄운다
 * (3D 엠보싱 키발급/매뉴얼 바로가기 버튼 규격화)
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
      className="btn-create-key px-3.5 py-2 text-xs font-bold"
    >
      <span>🔑</span>
      <span>{label}</span>
    </button>
  );
}
