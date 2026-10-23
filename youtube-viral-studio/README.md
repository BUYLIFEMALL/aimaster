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


## 2026-10-16 DB 연동 변수 호환 — v1.12 (youtube-viral-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 디자인 (v1.13)
- [디자인 인수인계](docs/DESIGN_HANDOFF.md) · [개선 원장](docs/IMPROVEMENTS.md) · [인수인계 2026-10-17](docs/IMPROVEMENT_HANDOFF_20261017.md)

## Windows 인수 완료 — v1.13 (2026-10-17)

유튜브 다크 디자인·대시보드·휴대폰 전체 메뉴를 운영 배포했습니다. Next16.4.2 빌드와 일반 회원 Edge1440/375 검수, 비로그인 API401 확인. 검색·AI는 실행하지 않았습니다. 회원별 즐겨찾기 분리·30일 삭제, lint 설정/개발 도구 경고는 후속 과제입니다. [최종 인수인계](docs/WINDOWS_HANDOFF_20261017.md) · [검수 증거](docs/evidence/) · https://youtube-viral-studio.buylife.xyz

## v1.14 개선 완료 (2026-10-17)

즐겨찾기를 회원별 DB로 연결하고 생성일30일 만료·자동 정리를 적용했습니다. 페이지 진입 자동 검색을 없애고 가이드·누락 지수 설명을 고쳤습니다. [검수/배포·인수인계](docs/IMPROVEMENT_HANDOFF_20261017_V114.md).

## v1.14 최신 프로그램 설명·후속 작업 (공통 7항목)

1. **목적·대상:** 본인 YouTube 키로 쇼츠/영상/채널 후보를 조사하고 참고 자료를 보관하는 콘텐츠 제작자용 도구입니다. 지표는 후보 비교용이며 성공·추천 알고리즘 유입을 확정하지 않습니다.
2. **도구·기법·스킬:** Next16.4.2·React19·TypeScript·Tailwind4, Supabase SSR/Postgres RLS·pg_cron, YouTube Data API, 회원 본인 AI 키 대본 분석. 이번 작업은 Node 검사·ESLint9·Playwright 실제 Edge·Supabase MCP·Vercel CLI와 Supabase/Postgres·React/배포 지침을 사용했습니다. 외부 검색/AI 실호출 없이 합성 응답과 실제 본인 DB를 구분해 검수했습니다.
3. **기능·로직·장단점:** 검색 버튼→본인 키 API→영상/채널 카드→본인 즐겨찾기 API/RLS→전용 yvs_favorites 저장. 30일 경계부터 조회 차단, 분당 Cron 물리 정리. 자동검색 없이 회원이 호출하고 재저장해도 생성일을 연장하지 않는 장점이 있습니다. 지표 추정, 본인 Cloud 한도, 최근1000건 조회, 기존 개발 도구 경고가 한계입니다. 과거 소유자 불명 localStorage는 자동 이전하지 않습니다.
4. **현재 버전·히스토리:** v1.13 다크/모바일/대시보드 운영 완료 → v1.14 회원 DB·30일 보관·선택 검색·안내/CSV·메모 복사 운영 완료. 과거 버전 항목의 미완료 표시는 당시 기록이며 최신 [결과 문서](docs/IMPROVEMENT_HANDOFF_20261017_V114.md)를 따릅니다.
5. **대기 과제:** [개선 대기 목록](docs/IMPROVEMENT_BACKLOG.md) 및 [원장](docs/IMPROVEMENTS.md). 개발 의존성 high5·lint경고74, 즐겨찾기1000건 페이지 나눔, 회원별 검색 임시 저장은 미완료입니다. 새로운 DB 범위는 별도 승인 확인이 필요합니다.
6. **연계·아이디어:** Playlist에 본인 영상 제목/URL 참고 메모를 명시적으로 복사/붙여넣는 연결을 제공합니다. 채널 진단/쇼츠 대본/SEO 프로그램 연계는 제안입니다. 다른 회원 결과·키를 공유하지 않습니다.
7. **UI·스타일 제안:** 유튜브 다크와 모바일 메뉴를 유지합니다. 후속은 즐겨찾기 대량 탐색/페이지 나눔과 키보드 조작성입니다. 과거 예시칩/정렬 제안은 기존 구현과 대조한 뒤 중복 개발하지 않습니다.
