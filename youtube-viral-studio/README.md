# YOUTUBE VIRAL FINDER

유튜브 숏폼/롱폼 크리에이터를 위한 **떡상 영상 발굴 & 벤치마킹 분석 자동화 엔진**입니다.

## 핵심 기능

1. **조회수 폭발 쇼츠 찾기 (`/viral-shorts`)**
   - 키워드 기반 쇼츠 탐색
   - 소형 채널(구독자 1만~5만 이하) 필터링
   - 구독자 대비 조회수 배수(`vsRatio`), 시간당 속도(`VPH`), 떡상 점수(`viralScore`) 다차원 정렬

2. **황금 채널 발굴기 (`/golden-channels`)**
   - 구독자 1만명 이하 소형 채널 중 영상당 평균 조회수가 수만~수십만 회에 달하는 고효율 채널 발굴
   - 채널 떡상 지수 및 평균 조회수 분석

3. **실시간 터진 영상 (`/trending-videos`)**
   - 대한민국(KR) 실시간 급상승 영상 수집
   - 시간당 조회수 속도(`VPH`, 예: `+7.5만/h`) 랭킹 제공

4. **쇼츠 원본 찾기 (`/source-finder`)**
   - 쇼츠 URL 입력 시 설명란 역추적 및 동일 채널 롱폼 영상의 단어 유사도 분석으로 풀영상 원본 자동 매칭

5. **즐겨찾기 보관함 (`/favorites`)**
   - 발굴한 영상 및 채널을 저장하고 CSV 데이터로 다운로드

6. **YouTube API 키 관리 (`/settings`)**
   - 회원 본인 Google Cloud 콘솔에서 무료 발급받은 YouTube Data API v3 키 직접 연동 (BYOK 원칙)

## 기술 스택
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Lucide React
- Supabase SSR (공유 DB `esgxyikcnnvmlhygjkth`)
- Google YouTube Data API v3
