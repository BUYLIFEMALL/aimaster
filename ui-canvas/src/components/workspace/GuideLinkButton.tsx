"use client";
import { BookOpen } from "lucide-react";

/** 플랫폼 매뉴얼 게시글을 설정 화면 옆에 두고 따라 할 수 있도록 팝업창으로 연다 */
export function GuideLinkButton({ url, label }: { url: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.open(url, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes")}
    >
      <BookOpen size={14} />{label}
    </button>
  );
}
