// 플랫폼 가이드 메타데이터 헬퍼 (이모티콘, 소요시간, 난이도, 공식 콘솔 URL)

export interface GuideMeta {
  icon: string;
  badgeTone: string;
  difficulty: "초급" | "중급" | "고급";
  difficultyTone: string;
  estimatedTime: string;
  summary: string;
  consoleUrl?: string;
  consoleLabel?: string;
}

export function getGuideMeta(title: string, category: string): GuideMeta {
  const t = title.toLowerCase();
  const c = category.toLowerCase();

  // 1. LLM AI
  if (t.includes("openai") || t.includes("chatgpt")) {
    return {
      icon: "🤖",
      badgeTone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "3분",
      summary: "ChatGPT API 키 발급 및 Billing Tier 1 결제 한도 등록 가이드",
      consoleUrl: "https://platform.openai.com/api-keys",
      consoleLabel: "OpenAI 플랫폼 콘솔",
    };
  }
  if (t.includes("gemini") || t.includes("google ai")) {
    return {
      icon: "💎",
      badgeTone: "bg-blue-500/10 text-blue-300 border-blue-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "2분",
      summary: "Google AI Studio에서 무료 Gemini API 키 1분 발급 가이드",
      consoleUrl: "https://aistudio.google.com/app/apikey",
      consoleLabel: "Google AI Studio 콘솔",
    };
  }
  if (t.includes("claude") || t.includes("anthropic")) {
    return {
      icon: "🧠",
      badgeTone: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "3분",
      summary: "Anthropic Console 키 발급 및 크레딧 충전 가이드",
      consoleUrl: "https://console.anthropic.com/settings/keys",
      consoleLabel: "Anthropic Console",
    };
  }
  if (t.includes("perplexity")) {
    return {
      icon: "⚡",
      badgeTone: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "2분",
      summary: "실시간 웹 검색 기반 Perplexity AI API 연동 가이드",
      consoleUrl: "https://www.perplexity.ai/settings/api",
      consoleLabel: "Perplexity API 설정",
    };
  }
  if (t.includes("upstage") || t.includes("업스테이지")) {
    return {
      icon: "📄",
      badgeTone: "bg-purple-500/10 text-purple-300 border-purple-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "3분",
      summary: "Solar LLM 및 문서 파싱(Document Parse) API 발급 가이드",
      consoleUrl: "https://console.upstage.ai",
      consoleLabel: "Upstage Console",
    };
  }

  // 2. SNS & Meta
  if (t.includes("공개 글 검색") || t.includes("keyword_search")) {
    return {
      icon: "🔍",
      badgeTone: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
      difficulty: "고급",
      difficultyTone: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      estimatedTime: "심사 3~7일",
      summary: "Meta 비즈니스 앱 승인 및 threads_keyword_search 권한 획득 가이드",
      consoleUrl: "https://developers.facebook.com/apps",
      consoleLabel: "Meta 개발자 센터",
    };
  }
  if (t.includes("댓글") && (t.includes("쓰레드") || t.includes("threads"))) {
    return {
      icon: "💬",
      badgeTone: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "5분",
      summary: "Threads Webhooks 실시간 이벤트 수신 및 AI 자동 답글 앱 연동",
      consoleUrl: "https://developers.facebook.com/apps",
      consoleLabel: "Meta 개발자 센터",
    };
  }
  if (t.includes("쓰레드") || t.includes("threads")) {
    return {
      icon: "🧵",
      badgeTone: "bg-amber-400/10 text-amber-300 border-amber-400/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "3분",
      summary: "Meta for Developers Threads API 연동 및 자동 발행 설정",
      consoleUrl: "https://developers.facebook.com/apps",
      consoleLabel: "Meta 개발자 센터",
    };
  }
  if (t.includes("댓글") || t.includes("dm")) {
    return {
      icon: "💬",
      badgeTone: "bg-purple-500/10 text-purple-300 border-purple-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "5분",
      summary: "인스타그램 Webhooks 실시간 감지 및 자동 답글/DM 발송 연동",
      consoleUrl: "https://developers.facebook.com/apps",
      consoleLabel: "Meta 개발자 센터",
    };
  }
  if (t.includes("릴스")) {
    return {
      icon: "🎬",
      badgeTone: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "인스타그램 릴스(Reels) 비디오 컨테이너 업로드 및 자동 발행 연동",
      consoleUrl: "https://developers.facebook.com/apps",
      consoleLabel: "Meta 개발자 센터",
    };
  }
  if (t.includes("인스타그램")) {
    return {
      icon: "📸",
      badgeTone: "bg-pink-500/10 text-pink-300 border-pink-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "5분",
      summary: "인스타그램 프로페셔널 계정 연결 및 Graph API 자동 포스팅 가이드",
      consoleUrl: "https://developers.facebook.com/apps",
      consoleLabel: "Meta 개발자 센터",
    };
  }
  if (t.includes("유튜브 채널") || t.includes("youtube channel")) {
    return {
      icon: "▶️",
      badgeTone: "bg-red-500/10 text-red-300 border-red-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "Google Cloud OAuth 본인 유튜브 채널 연결 및 동영상 관리 가이드",
      consoleUrl: "https://console.cloud.google.com/apis/credentials",
      consoleLabel: "Google Cloud 콘솔",
    };
  }
  if (t.includes("youtube") || t.includes("유튜브")) {
    return {
      icon: "▶️",
      badgeTone: "bg-red-500/10 text-red-300 border-red-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "5분",
      summary: "Google Cloud Console에서 YouTube Data API v3 발급 가이드",
      consoleUrl: "https://console.cloud.google.com/apis/credentials",
      consoleLabel: "Google Cloud 콘솔",
    };
  }
  if (t.includes("카카오") || t.includes("kakao")) {
    return {
      icon: "💬",
      badgeTone: "bg-yellow-400/10 text-yellow-300 border-yellow-400/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "Kakao Developers 앱 생성 및 메시지 전송(나에게 보내기) 연동",
      consoleUrl: "https://developers.kakao.com/console/app",
      consoleLabel: "Kakao Developers",
    };
  }

  // 3. 구글 워크스페이스
  if (t.includes("drive") || t.includes("드라이브")) {
    return {
      icon: "📁",
      badgeTone: "bg-blue-500/10 text-blue-300 border-blue-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "5분",
      summary: "Google Drive API 활성화 및 문서 보관함 자동 동기화 OAuth 클라이언트 설정",
      consoleUrl: "https://console.cloud.google.com/apis/credentials",
      consoleLabel: "Google Cloud 콘솔",
    };
  }
  if (t.includes("google oauth") || t.includes("구글 oauth") || t.includes("oauth 클라이언트")) {
    return {
      icon: "🔑",
      badgeTone: "bg-sky-500/10 text-sky-300 border-sky-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "Google Workspace(Gmail·Drive 등) 자동화를 위한 공용 OAuth 2.0 클라이언트 발급",
      consoleUrl: "https://console.cloud.google.com/apis/credentials",
      consoleLabel: "Google Cloud 콘솔",
    };
  }

  // 4. 네이버
  if (t.includes("카페") || t.includes("cafe")) {
    return {
      icon: "☕",
      badgeTone: "bg-green-500/10 text-green-300 border-green-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "네이버 개발자 센터 앱 등록 및 네이버 카페 글쓰기 자동화 연동",
      consoleUrl: "https://developers.naver.com/apps/#/register",
      consoleLabel: "네이버 개발자 센터",
    };
  }
  if (t.includes("검색광고")) {
    return {
      icon: "📈",
      badgeTone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "네이버 검색광고 API 키(라이선스·비밀키·고객ID) 무료 발급",
      consoleUrl: "https://searchad.naver.com",
      consoleLabel: "네이버 검색광고 센터",
    };
  }
  if (t.includes("네이버") || c.includes("네이버")) {
    return {
      icon: "🟢",
      badgeTone: "bg-green-500/10 text-green-300 border-green-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "3분",
      summary: "네이버 개발자 센터 검색·데이터랩 Client ID/Secret 발급",
      consoleUrl: "https://developers.naver.com/apps/#/register",
      consoleLabel: "네이버 개발자 센터",
    };
  }

  // 4. 이커머스
  if (t.includes("쿠팡")) {
    return {
      icon: "🛍️",
      badgeTone: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "5분",
      summary: "쿠팡 파트너스 Open API 키 발급 및 상품 링크 자동 수집 연동",
      consoleUrl: "https://partners.coupang.com",
      consoleLabel: "쿠팡 파트너스 콘솔",
    };
  }
  if (t.includes("알리") || t.includes("aliexpress")) {
    return {
      icon: "📦",
      badgeTone: "bg-orange-500/10 text-orange-300 border-orange-500/30",
      difficulty: "고급",
      difficultyTone: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      estimatedTime: "7분",
      summary: "AliExpress Portals 어필리에이트 API 연동 가이드",
      consoleUrl: "https://portals.aliexpress.com",
      consoleLabel: "AliExpress Portals",
    };
  }

  // 5. 이미지 / 음성 / 미디어
  if (t.includes("suno") || t.includes("수노")) {
    return {
      icon: "🎵",
      badgeTone: "bg-purple-500/10 text-purple-300 border-purple-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "2분",
      summary: "AI 음악 및 보컬 음원 생성 SUNO API 키 연동",
      consoleUrl: "https://suno.com",
      consoleLabel: "SUNO 공식 사이트",
    };
  }
  if (t.includes("elevenlabs") || t.includes("일레븐랩스")) {
    return {
      icon: "🎙️",
      badgeTone: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "2분",
      summary: "초현실적 AI 나레이션 및 보이스 클로닝 API 연동",
      consoleUrl: "https://elevenlabs.io",
      consoleLabel: "ElevenLabs 콘솔",
    };
  }
  if (t.includes("replicate") || t.includes("flux")) {
    return {
      icon: "🎨",
      badgeTone: "bg-sky-500/10 text-sky-300 border-sky-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "3분",
      summary: "FLUX 고화질 화보 생성 Replicate API 토큰 발급",
      consoleUrl: "https://replicate.com/account/api-tokens",
      consoleLabel: "Replicate 토큰 발급",
    };
  }
  if (t.includes("runway") || t.includes("런웨이")) {
    return {
      icon: "🎬",
      badgeTone: "bg-violet-500/10 text-violet-300 border-violet-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "Gen-2 / Gen-3 Alpha AI 비디오 생성 Runway API 키 발급",
      consoleUrl: "https://app.runwayml.com",
      consoleLabel: "Runway 콘솔",
    };
  }
  if (t.includes("json2video")) {
    return {
      icon: "🎥",
      badgeTone: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "3분",
      summary: "JSON 데이터 기반 영상 장면/자막/오디오 자동 렌더링 합성 API 연동",
      consoleUrl: "https://json2video.com",
      consoleLabel: "JSON2Video 콘솔",
    };
  }
  if (t.includes("placid")) {
    return {
      icon: "🖼️",
      badgeTone: "bg-violet-500/10 text-violet-300 border-violet-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "디자인 템플릿 기반 썸네일·배너·카드뉴스 자동 생성 PLACID API 연동",
      consoleUrl: "https://placid.app",
      consoleLabel: "PLACID 콘솔",
    };
  }
  if (t.includes("cloudinary")) {
    return {
      icon: "☁️",
      badgeTone: "bg-sky-500/10 text-sky-300 border-sky-500/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "클라우드 미디어 실시간 자동 변환·최적화 및 초고속 CDN 호스팅 연동",
      consoleUrl: "https://console.cloudinary.com/settings/api-keys",
      consoleLabel: "Cloudinary 콘솔",
    };
  }
  if (t.includes("pixabay") || t.includes("픽사베이")) {
    return {
      icon: "📷",
      badgeTone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "2분",
      summary: "상업적 100% 무료 고화질 사진 및 일러스트 즉시 검색 Pixabay API 발급",
      consoleUrl: "https://pixabay.com/api/docs/",
      consoleLabel: "Pixabay API 콘솔",
    };
  }
  if (t.includes("pexels") || t.includes("펙셀스")) {
    return {
      icon: "📸",
      badgeTone: "bg-teal-500/10 text-teal-300 border-teal-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "2분",
      summary: "고감성 무료 스톡 비디오 및 사진 검색 Pexels API 가이드",
      consoleUrl: "https://www.pexels.com/api/",
      consoleLabel: "Pexels API 콘솔",
    };
  }

  // 6. 메신저 / 알림
  if (t.includes("텔레그램") || t.includes("telegram")) {
    return {
      icon: "✈️",
      badgeTone: "bg-sky-400/10 text-sky-300 border-sky-400/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "3분",
      summary: "@BotFather를 통한 1분 텔레그램 봇 토큰 생성 가이드",
      consoleUrl: "https://t.me/BotFather",
      consoleLabel: "@BotFather 바로가기",
    };
  }
  if (t.includes("solapi") || t.includes("알림톡")) {
    return {
      icon: "📩",
      badgeTone: "bg-blue-400/10 text-blue-300 border-blue-400/30",
      difficulty: "중급",
      difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      estimatedTime: "4분",
      summary: "카카오톡 알림톡/친구톡 대량 발송 SOLAPI 키 연동",
      consoleUrl: "https://solapi.com",
      consoleLabel: "SOLAPI 콘솔",
    };
  }
  if (t.includes("메일") || t.includes("smtp")) {
    return {
      icon: "📧",
      badgeTone: "bg-green-500/10 text-green-300 border-green-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "3분",
      summary: "네이버 메일 POP3/SMTP 설정 및 2단계 인증 애플리케이션 비밀번호 발급",
      consoleUrl: "https://mail.naver.com",
      consoleLabel: "네이버 메일 설정",
    };
  }

  // 7. 정보수집 & 웹스크랩핑
  if (t.includes("tavily") || t.includes("타빌리")) {
    return {
      icon: "🔍",
      badgeTone: "bg-teal-500/10 text-teal-300 border-teal-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "2분",
      summary: "AI 실시간 웹 검색 및 딥 리서치 Tavily Search API 연동",
      consoleUrl: "https://tavily.com",
      consoleLabel: "Tavily 콘솔",
    };
  }
  if (t.includes("rss") || t.includes("inoreader")) {
    return {
      icon: "📡",
      badgeTone: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      difficulty: "초급",
      difficultyTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      estimatedTime: "3분",
      summary: "블로그·뉴스 콘텐츠 자동 수집을 위한 RSS 피드 및 Inoreader 연동",
      consoleUrl: "https://www.inoreader.com",
      consoleLabel: "Inoreader 사이트",
    };
  }

  // 기본값
  return {
    icon: "🔑",
    badgeTone: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    difficulty: "중급",
    difficultyTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    estimatedTime: "3분",
    summary: `${category} 연동을 위한 단계별 가이드`,
  };
}
