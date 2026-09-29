"use client";

/**
 * Opens the product's real detail page in a popup so the member can check it before registering.
 * Pass a plain product page URL, not the member's affiliate tracking link, so previews are not
 * counted as affiliate clicks.
 */
export function ProductPreviewButton({ url }: { url: string | null | undefined }) {
  if (!url) return null;

  return (
    <button
      type="button"
      onClick={() =>
        window.open(url, "product-preview-popup", "width=1100,height=900,scrollbars=yes,resizable=yes")
      }
      title="실제 상세페이지를 팝업으로 열어 확인합니다"
      className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
    >
      🔍 상세보기
    </button>
  );
}
