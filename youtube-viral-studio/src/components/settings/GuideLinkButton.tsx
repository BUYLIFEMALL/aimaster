"use client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

/** 루트 AIMaster의 공개 매뉴얼(/guides/[id])을 팝업창으로 띄운다. 같은 이름의 팝업을 재사용한다. */
export function GuideLinkButton({ guideId, label }: { guideId: string; label: string }) {
  const openGuide = () => {
    window.open(`${MAIN_SITE_URL}/guides/${guideId}`, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes");
  };

  return (
    <button
      type="button"
      onClick={openGuide}
      className="rounded-full border border-yt-border bg-yt-raised px-4 py-2 text-xs font-medium text-yt-text hover:bg-yt-hover"
    >
      📄 {label}
    </button>
  );
}
