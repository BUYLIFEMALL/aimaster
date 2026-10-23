import type { LayoutType } from "./types";

export interface Template { id: string; label: string; type: LayoutType; summary: string; structure: string }

export const LAYOUT_LABELS: Record<LayoutType, string> = {
  card: "카드형(모바일 프로필 카드)",
  document: "문서형(A4 이력서·소개서)",
  hero: "히어로형(전체 화면 + 입력 폼)",
  gallery: "갤러리형(그리드 모음)",
  landing: "랜딩형(섹션 스크롤)",
};

// 주제 프리셋. 구조 문자열은 기획안의 페이지 구성(메인 1 + 서브 4)을 고정하는 데 쓴다.
export const TEMPLATES: Template[] = [
  { id: "homepage", label: "개인 홈페이지", type: "landing", summary: "나를 소개하는 대표 페이지", structure: "Main: 소개·핵심 가치 / Sub 1: 나의 이야기 / Sub 2: 활동·작업 / Sub 3: 후기·소식 / Sub 4: 연락하기" },
  { id: "link-bio", label: "링크 인 바이오", type: "card", summary: "SNS 프로필에 거는 링크 모음 카드", structure: "Main: 프로필·대표 링크 / Sub 1: 링크 모음 / Sub 2: 소개 / Sub 3: 콘텐츠 보기 / Sub 4: 문의·소셜" },
  { id: "online-cv", label: "온라인 이력서", type: "document", summary: "한 장짜리 경력 문서", structure: "Main: 요약·핵심 역량 / Sub 1: 경력 / Sub 2: 학력·자격 / Sub 3: 프로젝트 / Sub 4: 연락처" },
  { id: "portfolio", label: "포트폴리오", type: "gallery", summary: "작업물을 그리드로 보여주는 모음", structure: "Main: 대표작 그리드 / Sub 1: 작업 상세 / Sub 2: 분야별 모음 / Sub 3: 소개 / Sub 4: 의뢰하기" },
  { id: "business", label: "기업·가게 홍보", type: "landing", summary: "서비스를 알리는 홍보 페이지", structure: "Main: 한 줄 가치·대표 서비스 / Sub 1: 서비스·메뉴 / Sub 2: 강점·후기 / Sub 3: 오시는 길·시간 / Sub 4: 문의·예약" },
  { id: "newsletter", label: "뉴스레터 구독", type: "hero", summary: "구독자를 모으는 한 화면 페이지", structure: "Main: 혜택·구독 폼 / Sub 1: 지난 호 보기 / Sub 2: 발행인 소개 / Sub 3: 자주 묻는 질문 / Sub 4: 구독 완료·공유" },
  { id: "content-hub", label: "콘텐츠 허브", type: "gallery", summary: "글·영상을 모아 보여주는 허브", structure: "Main: 추천 콘텐츠 / Sub 1: 카테고리별 목록 / Sub 2: 인기 콘텐츠 / Sub 3: 운영자 소개 / Sub 4: 구독·문의" },
  { id: "digital-goods", label: "디지털 굿즈 판매", type: "landing", summary: "전자책·템플릿 판매 페이지", structure: "Main: 상품 가치·구매 버튼 / Sub 1: 상품 상세 / Sub 2: 구성·미리보기 / Sub 3: 후기·FAQ / Sub 4: 구매 안내" },
  { id: "consulting", label: "컨설팅 예약", type: "landing", summary: "상담·컨설팅 예약 유도", structure: "Main: 해결 문제·예약 버튼 / Sub 1: 서비스 소개 / Sub 2: 진행 방식 / Sub 3: 후기·사례 / Sub 4: 예약·요금" },
  { id: "freelancer", label: "프리랜서 소개", type: "document", summary: "의뢰를 받는 프리랜서 소개서", structure: "Main: 전문 분야 요약 / Sub 1: 서비스 범위 / Sub 2: 작업 사례 / Sub 3: 진행 절차·요금 / Sub 4: 의뢰 문의" },
  { id: "class", label: "클래스·강의 접수", type: "hero", summary: "수강 신청을 받는 페이지", structure: "Main: 수강 혜택·신청 폼 / Sub 1: 커리큘럼 / Sub 2: 강사 소개 / Sub 3: 수강 후기 / Sub 4: 일정·환불 안내" },
  { id: "local-service", label: "지역 소규모 서비스", type: "card", summary: "동네 가게·서비스 안내 카드", structure: "Main: 대표 서비스·전화 / Sub 1: 가격표 / Sub 2: 위치·영업시간 / Sub 3: 사진·후기 / Sub 4: 예약·문의" },
  { id: "donation", label: "후원·기부 캠페인", type: "landing", summary: "공감을 얻어 후원을 받는 페이지", structure: "Main: 사연·후원 버튼 / Sub 1: 캠페인 소개 / Sub 2: 사용처·투명성 / Sub 3: 진행 현황·후기 / Sub 4: 후원 방법" },
  { id: "tool-collection", label: "웹도구 모음", type: "gallery", summary: "유용한 도구를 카드로 모은 페이지", structure: "Main: 도구 카드 그리드 / Sub 1: 도구 상세 / Sub 2: 카테고리 / Sub 3: 사용 가이드 / Sub 4: 제안·문의" },
  { id: "shortcut-hub", label: "바로가기 허브", type: "card", summary: "자주 쓰는 링크를 한곳에", structure: "Main: 바로가기 버튼 / Sub 1: 업무 링크 / Sub 2: 학습·참고 링크 / Sub 3: 즐겨찾기 / Sub 4: 설정·도움말" },
  { id: "mini-app", label: "미니 웹앱 소개", type: "hero", summary: "작은 앱을 소개하고 체험시키는 페이지", structure: "Main: 한 줄 소개·체험 버튼 / Sub 1: 주요 기능 / Sub 2: 사용 방법 / Sub 3: 업데이트 소식 / Sub 4: 피드백" },
  { id: "open-source", label: "오픈소스 프로젝트", type: "landing", summary: "개발자용 프로젝트 소개", structure: "Main: 핵심 가치·설치 / Sub 1: 기능 소개 / Sub 2: 시작하기 문서 / Sub 3: 로드맵·기여 / Sub 4: 커뮤니티" },
  { id: "waitlist", label: "대기자 명단", type: "hero", summary: "출시 전 사전 신청 페이지", structure: "Main: 기대 포인트·신청 폼 / Sub 1: 서비스 미리보기 / Sub 2: 얼리버드 혜택 / Sub 3: 팀 소개 / Sub 4: 자주 묻는 질문" },
  { id: "survey", label: "설문·피드백", type: "document", summary: "의견을 모으는 문서형 설문", structure: "Main: 설문 목적·시작 / Sub 1: 질문 1단계 / Sub 2: 질문 2단계 / Sub 3: 주관식·의견 / Sub 4: 제출 완료·감사" },
  { id: "custom", label: "기타 (직접 입력)", type: "landing", summary: "주제에 맞게 AI가 구조를 정합니다", structure: "Auto-Detect" },
];

export function templateById(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1];
}
