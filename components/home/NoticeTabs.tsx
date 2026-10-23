"use client";

import { useState } from "react";
import { Info, GraduationCap, ShieldCheck, Zap } from "lucide-react";

interface NoticeItem {
  text: string;
  highlights: string[];
}

const NOTICE_ITEMS: NoticeItem[] = [
  {
    text: "서비스 중인 자동화 프로그램은 회원 개인별로 플랫폼별 본인의 API 키와 계정을 연동하여 사용할 수 있도록 제공됩니다.",
    highlights: ["자동화 프로그램", "개인별", "플랫폼별", "API 키와 계정"],
  },
  {
    text: "사용자별로 생성된 데이터는 본인만 볼 수 있으며, 보안이 적용된 서버에 개인별 분리되어 안전하게 저장됩니다.",
    highlights: ["본인만 볼 수 있으며", "개인별 분리되어 안전하게 저장"],
  },
  {
    text: "본 서비스는 프로그램 안정화를 위해 현재 베타(무료)로 서비스 중이며, 사용자 트래픽 및 서버 사용량 증가 시 일부 서비스는 유료로 전환될 예정입니다.",
    highlights: ["베타(무료)", "일부 서비스는 유료로 전환"],
  },
];

const DREAM_TEAM_ITEMS: NoticeItem[] = [
  {
    text: "드림팀 회원의 경우 대부분의 프로그램을 무료로 이용할 수 있습니다.",
    highlights: ["드림팀 회원", "무료로 이용"],
  },
  {
    text: "드림팀 혜택 제공을 위해 실명으로 가입해야 하며, 실명 확인이 안 될 경우 일반사용자 등급으로 서비스가 제공됩니다.",
    highlights: ["실명으로 가입", "실명 확인이 안 될 경우", "일반사용자 등급"],
  },
  {
    text: "트래픽 발생량이 많거나 서버 저장공간을 많이 사용하는 일부 프로그램은 유료(할인가 적용)로 제공됩니다.",
    highlights: ["일부 프로그램은 유료(할인가 적용)"],
  },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderNoticeText(item: NoticeItem) {
  if (item.highlights.length === 0) return item.text;
  const pattern = new RegExp(`(${item.highlights.map(escapeRegExp).join("|")})`, "g");
  return item.text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part, i) =>
      item.highlights.includes(part) ? (
        <strong key={i} className="font-bold text-gold">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
}

export default function NoticeTabs() {
  const [activeTab, setActiveTab] = useState<"notice" | "dream">("notice");

  return (
    <div className="glass-card rounded-2xl border border-gold/25 bg-gold/[0.03] p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* 탭 헤더 버튼 */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("notice")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "notice"
              ? "bg-gold text-black shadow-md shadow-gold/20"
              : "bg-white/5 text-subtext hover:text-white hover:bg-white/10"
          }`}
        >
          <Info size={15} className={activeTab === "notice" ? "text-black" : "text-gold"} />
          <span>서비스 이용 안내</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dream")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "dream"
              ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-md shadow-gold/20"
              : "bg-white/5 text-subtext hover:text-white hover:bg-white/10"
          }`}
        >
          <GraduationCap size={15} className={activeTab === "dream" ? "text-black" : "text-gold"} />
          <span>드림팀·수강생 혜택</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-black/20 text-black font-extrabold ml-0.5">
            전용
          </span>
        </button>
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div className="min-h-[96px]">
        {activeTab === "notice" ? (
          <ul className="space-y-2.5">
            {NOTICE_ITEMS.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-subtext text-xs sm:text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                <span>{renderNoticeText(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2.5">
            {DREAM_TEAM_ITEMS.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-subtext text-xs sm:text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>{renderNoticeText(item)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 하단 보증 바 */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-subtext gap-2">
        <div className="flex items-center gap-1.5 text-gold/80">
          <ShieldCheck size={13} className="text-gold" />
          <span>개인 API 키 100% 분리 보안</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/50">
          <Zap size={13} className="text-gold/70" />
          <span>신규 프로그램 지속 업데이트 중</span>
        </div>
      </div>
    </div>
  );
}
