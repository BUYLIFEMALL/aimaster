"use client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

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
      className="rounded-full border border-[#2d2d3e] bg-[#1a1926] px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-orange-500/40 hover:text-orange-400 hover:bg-[#222130] transition-all"
    >
      📄 {label}
    </button>
  );
}
