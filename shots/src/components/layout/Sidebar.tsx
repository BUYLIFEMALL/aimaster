"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 쇼츠 자동화는 "주제 수집 → 스크립트 → 이미지 → 음악 → 영상 포스팅" 순서로 진행하는
// 단계형 파이프라인이라, 사이드바도 그 순서를 그대로 위→아래 스텝퍼로 보여준다.
// 설정(API 키/플랫폼 연동)은 이 흐름의 일부가 아니라 별도 유틸리티라 분리.
const FLOW_STEPS = [
  {
    step: 1,
    href: "/candidates",
    icon: "🔍",
    label: "최신 쇼츠 주제 수집",
    description: "HTTP/RSS/Perplexity로 주제 후보 수집",
  },
  {
    step: 2,
    href: "/scripts",
    icon: "📝",
    label: "영상스크립트 생성",
    description: "스토리·6장면 대사·이미지 프롬프트 생성",
  },
  {
    step: 3,
    href: "/images",
    icon: "🖼️",
    label: "이미지 생성",
    description: "장면별 나노바나나 9:16 이미지 생성",
  },
  {
    step: 4,
    href: "/music",
    icon: "🎵",
    label: "음악 생성",
    description: "Suno로 배경음악 생성",
  },
  {
    step: 5,
    href: "/videos",
    icon: "🎬",
    label: "영상 포스팅",
    description: "렌더링 후 유튜브/인스타그램 업로드",
  },
];

const UTILITY_ITEMS = [{ href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" }];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:h-full md:w-64 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <div className="px-2 text-lg font-semibold text-neutral-900">YOUTUBE Shots(이미지 스토리) 자동화</div>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="block px-2 text-xs text-neutral-500 hover:text-neutral-900"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <nav className="relative flex flex-col">
          {FLOW_STEPS.map((item, idx) => {
            const isActive = pathname?.startsWith(item.href);
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-1">
                {/* 스텝 번호 + 연결선 */}
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? "bg-sky-600 text-white"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
                </div>

                {/* 라벨 + 설명 */}
                <div className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${isActive ? "bg-sky-50" : "group-hover:bg-neutral-50"}`}>
                  <p className={`text-sm font-bold ${isActive ? "text-sky-700" : "text-neutral-800"}`}>
                    {item.icon} {item.label}
                  </p>
                  <p className="text-xs text-neutral-500">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-neutral-200 pt-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-sky-50 text-sky-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs text-neutral-500">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
