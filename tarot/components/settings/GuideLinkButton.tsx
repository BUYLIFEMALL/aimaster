"use client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

/** 루트 AIMaster의 공개 매뉴얼 게시판(app/(main)/guides/[id])을 팝업창으로 띄운다. */
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
      className="rounded-xl border border-[#3e2e70] bg-[#120d24] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1c1536] hover:border-purple-500/60"
    >
      📄 {label}
    </button>
  );
}
