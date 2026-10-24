// 관리자 패널 좌측 메뉴 목록 — 관리자 사이드바와 메인 사이트 상단 사용자 메뉴(바로가기)가 같이 쓴다.
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Users,
  Award,
  CreditCard,
  BarChart2,
  Shield,
  Settings,
  Ticket,
  HelpCircle,
  Megaphone,
  FileText,
  KeyRound,
  Sparkles,
  Compass,
  Wrench,
  Hourglass,
  CalendarClock,
  ClipboardCheck,
  BookOpen,
  FolderTree,
  Inbox,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "대시보드" },
  { href: "/admin/programs", icon: Package, label: "프로그램 관리" },
  { href: "/admin/programs/new", icon: PackagePlus, label: "프로그램 추가" },
  { href: "/admin/prompts", icon: Sparkles, label: "프로그램별 프롬프트 관리" },
  { href: "/admin/members", icon: Users, label: "회원 관리 (사용권한/기간)" },
  { href: "/admin/access-matrix", icon: Shield, label: "접근 권한 관리" },
  { href: "/admin/grades", icon: Award, label: "등급 관리" },
  { href: "/admin/coupons", icon: Ticket, label: "쿠폰 관리" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ 관리" },
  { href: "/admin/guides", icon: KeyRound, label: "API/플랫폼 가이드 관리" },
  { href: "/admin/notices", icon: Megaphone, label: "공지사항 관리" },
  { href: "/admin/legal", icon: FileText, label: "약관/정책 관리" },
  { href: "/admin/settlements", icon: CreditCard, label: "정산 관리" },
  { href: "/admin/statistics", icon: BarChart2, label: "통계" },
  { href: "/admin/settings", icon: Settings, label: "사이트 설정" },
];

// 관리자 사이드바 「사이트 설정」 아래 구분선 다음 묶음 — 개발 현황·지침 문서(2026-10-24, 주인님 지시)
// 상단 사용자 메뉴 바로가기에는 넣지 않는다(관리자 사이드바 전용).
export const ADMIN_DEV_NAV_TITLE = "개발 문서 관리";
export const ADMIN_DEV_NAV_ITEMS = [
  { href: "/admin/dev-docs", icon: Compass, label: "한눈에 보기" },
  { href: "/admin/dev-docs/in-progress", icon: Wrench, label: "개발 진행 중" },
  { href: "/admin/dev-docs/waiting", icon: Hourglass, label: "개발 대기 중" },
  { href: "/admin/dev-docs/planned", icon: CalendarClock, label: "개발 예정" },
  { href: "/admin/dev-docs/analyzed", icon: ClipboardCheck, label: "분석 완료 · 판단" },
  { href: "/admin/dev-docs/guidelines", icon: BookOpen, label: "지침 관리" },
  { href: "/admin/dev-docs/programs", icon: FolderTree, label: "프로그램별 지침" },
  { href: "/admin/dev-docs/requests", icon: Inbox, label: "수정 요청함" },
];
