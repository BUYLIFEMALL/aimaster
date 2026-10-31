"use client";

import { ExternalLink } from "lucide-react";

const MAIN_SITE_URL = "https://www.buylife.xyz";

/** 키 발급 공식 화면으로 가는 3D 버튼(지침 DESIGN.md 원칙 21·23) */
export function IssueLink({ href, label = "발급" }: { href: string; label?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="btn-create-key"><span>{label}</span><ExternalLink size={11} /></a>;
}

/** 가입·콘솔 바로가기 */
export function ConsoleLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"><span>🌐 {label}</span><ExternalLink size={11} /></a>;
}

/** 공개 매뉴얼을 팝업으로 연다. 같은 이름의 창을 다시 써서 설정 화면 옆에 두고 따라 할 수 있다(기준 naver-cafe-poster GuideLinkButton) */
export function GuideLinkButton({ guideId, label }: { guideId: string; label: string }) {
  const open = () => window.open(`${MAIN_SITE_URL}/guides/${guideId}`, "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes");
  return <button type="button" onClick={open} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">📄 {label}</button>;
}
