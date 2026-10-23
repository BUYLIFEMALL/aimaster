"use client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

/** 루트 AIMaster의 공개 매뉴얼(/guides/[id])을 팝업창으로 열어 설정 화면 옆에서 따라 할 수 있게 합니다. */
export function GuideLinkButton({ guideId, label }: { guideId: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.open(
          `${MAIN_SITE_URL}/guides/${guideId}`,
          "platform-guide-popup",
          "width=720,height=860,scrollbars=yes,resizable=yes",
        )
      }
      className="rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-semibold text-[#c9d1d9] hover:bg-[#30363d] hover:text-[#f0f6fc] transition-colors"
    >
      📄 {label}
    </button>
  );
}
