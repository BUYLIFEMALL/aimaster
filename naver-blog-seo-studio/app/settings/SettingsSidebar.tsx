"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const flow = [
  ["/dashboard#title", "1", "제목 추천", "검색 의도 분석"],
  ["/dashboard#new-draft", "2", "새 글 만들기", "AI 초안 작성"],
  ["/dashboard#draft", "3", "기존 글 최적화", "콘텐츠 개선"],
  ["/dashboard#history", "4", "생성 기록", "작성한 초안 확인"],
];

export default function SettingsSidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  return <aside className="reference-sidebar">
    <div>
      <div className="reference-brand"><strong>SEO블로그</strong> 스튜디오</div>
      <Link className="reference-back" href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</Link>
      <nav className="reference-nav" aria-label="프로그램 메뉴">
        <Link className="reference-overview" href="/dashboard">▣ 대시보드</Link>
        <div className="reference-flow">{flow.map(([href, step, label, description]) => <Link key={step} href={href} className={`reference-flow-item ${pathname === href ? "active" : ""}`}><span className="reference-number">{step}</span><span><strong>{label}</strong><small>{description}</small></span></Link>)}</div>
        <div className="reference-utility">
          <Link className="active" href="/settings">⚙ API 키 등록 · 플랫폼 연동</Link>
        </div>
      </nav>
    </div>
    <div className="reference-account"><span>{email ?? "로그인 계정"}</span><button type="button">로그아웃</button></div>
  </aside>;
}
