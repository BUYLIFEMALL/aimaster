"use client";

/**
 * 루트 AIMaster의 공개 매뉴얼 게시판(app/(main)/guides/[id])을 팝업창으로 띄운다 —
 * naver-cafe-poster의 GuideLinkButton.tsx와 동일한 패턴(같은 이름의 팝업을 재사용해서
 * 여러 매뉴얼을 눌러도 창 하나가 계속 갱신되며 옆에서 보고 따라 할 수 있게 한다).
 * 이 컴포넌트는 루트 앱 안에 있어서 절대 URL 대신 같은 출처의 상대 경로를 쓴다.
 */
export function GuideLinkButton({ guideId, label }: { guideId: string; label: string }) {
  const openGuide = () => {
    window.open(`/guides/${guideId}`, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes");
  };

  return (
    <button
      type="button"
      onClick={openGuide}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
    >
      📄 {label}
    </button>
  );
}
