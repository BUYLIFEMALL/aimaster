// 화면 오른쪽 "트렌드 도구" 링크와 카테고리 트렌드의 분야 목록.

export interface ToolLink { title: string; desc: string; url: string }

export const TREND_LINKS: ToolLink[] = [
  { title: "네이버 크리에이터 어드바이저", desc: "블로그 인기 키워드·유입 분석(로그인 필요)", url: "https://creator-advisor.naver.com/naver_blog" },
  { title: "네이버 데이터랩", desc: "검색어 트렌드·쇼핑 인사이트", url: "https://datalab.naver.com" },
  { title: "네이버 검색광고 키워드도구", desc: "월간 검색수 조회(광고주 가입 필요)", url: "https://searchad.naver.com" },
  { title: "구글 트렌드", desc: "급상승 검색어와 관심도 비교", url: "https://trends.google.co.kr/trends/" },
  { title: "시그널 실시간 검색어", desc: "실시간 이슈 모아보기", url: "https://signal.bz" },
  { title: "대한민국 정책브리핑", desc: "정책·제도 뉴스(정책 글감)", url: "https://www.korea.kr" },
  { title: "금융위원회 보도자료", desc: "금융·지원 정책 발표", url: "https://www.fsc.go.kr" },
  { title: "기획재정부 보도자료", desc: "세제·경제 정책 발표", url: "https://www.moef.go.kr" },
  { title: "복지로", desc: "복지·지원금 제도 검색", url: "https://www.bokjiro.go.kr" },
];

export const TREND_CATEGORIES = [
  "맛집", "여행", "IT·컴퓨터", "패션·미용", "육아·결혼", "교육·학습", "건강·의학", "게임", "자동차", "스포츠",
  "취미·DIY", "인테리어", "요리·레시피", "반려동물", "문화·공연", "정치·사회", "경제·재테크", "연예·방송", "영화·도서", "생활·꿀팁",
];

// v1.06 (BLC-11): 결과를 SEO블로그 스튜디오로 보낸다 — 기록 번호만 주소에 싣고, SEO 서버가 같은 회원의 기록을 다시 읽는다(내용·키워드는 주소에 넣지 않음).
export const SEO_STUDIO_URL = "https://naver-blog-seo-studio.buylife.xyz";
const REPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function seoHandoffUrl(reportId: string | null | undefined): string | null {
  return reportId && REPORT_ID.test(reportId) ? `${SEO_STUDIO_URL}/dashboard#title&keyword-report=${reportId.toLowerCase()}` : null;
}
