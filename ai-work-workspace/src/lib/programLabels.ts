// 받은 업무에 「보낸 프로그램」으로 보여 줄 한국어 이름 — 받은 업무 화면(InboxBoard)·받은 업무 표·콘텐츠 캘린더 표가 함께 쓴다(2026-11-15 한 곳으로 모음).
// 모르는 slug는 그대로 보여 준다. 새 프로그램이 보내기를 붙이면 여기에 한 줄 추가.
export const PROGRAM_LABEL: Record<string, string> = {
  "ai-task-planner": "AI 할 일 플래너",
  "ai-audio-analyzer": "AI 음성 분석",
  "ai-doc-chatbot": "AI 문서 챗봇",
  "document-translator": "문서 번역",
  "ai-slide-builder": "AI 슬라이드",
  "ai-work-workspace": "업무 워크스페이스",
  // U10 발행·분석·수집
  "naver-blog-agent": "네이버 블로그 에이전트",
  "ai-auto-blog": "블로그 포스팅 자동화",
  "threads-content-ops": "Threads 콘텐츠 운영",
  "auto-instagram-posting": "INSTA 포스팅 자동화", // programs.slug(폴더 insta_auto_poster)
  "auto-shorts-posting": "YOUTUBE Shots 자동화", // programs.slug(폴더 shots)
  "shorts-onestop-studio": "AI 쇼츠 원스톱 제작 자동화",
  "playlist-channel-studio": "플레이리스트 채널 제작 자동화",
  "competitor-analysis": "키워드·경쟁사 분석",
  "longtail-keyword-expander": "롱테일 키워드",
  "blog-keyword": "블로그 키워드",
  "web-crawler-saas": "웹 크롤러", // programs.slug(폴더 web-crawler)
};

export function programLabel(slug: string): string {
  return PROGRAM_LABEL[slug] ?? slug;
}
