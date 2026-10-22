# 🎬 YOUTUBE Shorts 자동화 스튜디오 (shots)

> **AIMaster 58번 프로그램** | **공식 도메인**: [https://shots.buylife.xyz](https://shots.buylife.xyz)  
> **현재 버전**: `v1.34` | **디자인 템플릿**: 유튜브 다크 콘솔 스타일 (Shorts Studio Edition)

---

## 📌 주요 기능
1. **바이럴 주제 수집 (`/candidates`)**:
   - HTTP 단일 URL 및 목록 페이지 크롤링
   - NewsBlur 연동 RSS 피드 자동 구독 수집
   - Perplexity Sonar 실시간 트렌드 검색 기반 쇼츠 앵글 추출
2. **6장면 스크립트 & 훅 기획 (`/scripts`)**:
   - 0~3초 시선 강탈 훅 및 6씬 연속 대본 자동 작성 (OpenAI GPT-4o)
3. **9:16 비주얼 에셋 생성 (`/images`)**:
   - 나노바나나 2.1 세로 전용 프롬프트로 일관된 캐릭터/배경 6장면 생성
4. **Suno AI 테마곡 생성 (`/music`)**:
   - 분위기(감성, 팝, 시네마틱)별 맞춤형 고품질 AI BGM 작곡
5. **영상 믹싱 & 쇼츠 업로드 (`/videos`)**:
   - Remotion 기반 Full HD(1080x1920) 비디오 렌더링
   - 유튜브 쇼츠 및 인스타그램 릴스 즉시 게시
6. **독립 비주얼 가이드북 (`/guide`)**:
   - 5단계 제작 파이프라인 다이어그램, 9:16 프롬프트 매트릭스 표, 3대 오디오 팁, FAQ 아코디언 제공

---

## 🛠️ 기술 스택
- **Framework**: Next.js 16.2.11 (Turbopack)
- **UI & Styling**: React 19.2.4, Tailwind CSS v4, Lucide React
- **Backend / DB**: Supabase (PostgreSQL, Row Level Security)
- **AI Integrations**: OpenAI GPT-4o, Perplexity Sonar, Gemini Nano-Banana 2.1, Suno AI
- **Rendering Engine**: Remotion, Cheerio
- **Deployment**: Vercel Production (`https://shots.buylife.xyz`)
