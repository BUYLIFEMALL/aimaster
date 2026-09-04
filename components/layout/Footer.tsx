import Link from "next/link";
import GoldGradientText from "@/components/ui/GoldGradientText";

const FOOTER_LINKS = {
  서비스: [
    { href: "/programs", label: "프로그램 목록" },
    { href: "/packages", label: "패키지 플랜" },
    { href: "/revenue-share", label: "수익 공유" },
    { href: "/custom", label: "커스텀 제작" },
  ],
  고객지원: [
    { href: "/support", label: "고객센터" },
    { href: "/support/faq", label: "자주 묻는 질문" },
    { href: "/support/notice", label: "공지사항" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                <span className="text-black font-bold text-sm">AI</span>
              </div>
              <GoldGradientText className="text-xl font-bold">AI Master</GoldGradientText>
            </div>
            <p className="text-subtext text-sm leading-relaxed">
              마케팅 자동화의 새로운 기준.<br />
              AI로 비즈니스를 한 단계 높이세요.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-subtext text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-subtext text-xs">사업자등록번호: 864-25-00988</span>
            <span className="text-subtext text-xs">대표: 유승엽</span>
            <span className="text-subtext text-xs">연락처: 1644-3686</span>
            <span className="text-subtext text-xs">주소: 경기도 고양시 일산동구 장항로 203-21 바동</span>
          </div>
          <p className="text-subtext text-sm">
            © 2026 AI Master. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
