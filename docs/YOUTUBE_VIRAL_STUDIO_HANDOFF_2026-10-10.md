# YouTube Viral Studio (골든 파인더 엔진) v1.02 상세 인수인계 문서

> **작성일자**: 2026-10-10  
> **프로그램명**: YouTube Viral Studio (골든 파인더 엔진)  
> **Slug**: `youtube-viral-studio`  
> **현재 버전**: `v1.02` (`src/lib/version.ts` 및 DB `programs.version`)  
> **라이브 주소**: [https://youtube-viral-studio.vercel.app](https://youtube-viral-studio.vercel.app)  
> **공유 DB**: Supabase Project `esgxyikcnnvmlhygjkth`  

---

## 1. 개요 및 배경
- 사용자가 제공한 레퍼런스(골든 파인더 Golden Finder v1.2.0 벤치마킹 도구 스크린샷 5장)를 기반으로, 쇼츠/롱폼 크리에이터가 **"소형 채널에서 터진 순수 알고리즘 떡상 콘텐츠"**를 실시간으로 발굴하고 벤치마킹할 수 있는 독립 웹 스튜디오입니다.
- AIMaster의 4단계 로드맵([`docs/YOUTUBE_AUTOMATION_ROADMAP.md`](YOUTUBE_AUTOMATION_ROADMAP.md)) 중:
  - **Phase 1(골든 파인더형 벤치마킹 & 떡상 발굴 엔진)** 완료.
  - **Phase 2(떡상 쇼츠 훅킹 대본 AI 분석 & 벤치마킹 인사이트)** 완료 (v1.02).

---

## 2. ★ 최상위 절대 불변 규칙 (BYOK)
- **모든 사용자는 본인의 계정과, 본인이 사용할 본인 YouTube Data API v3 키를 각각 직접 등록·연동해서 사용합니다.**
- 운영자(주인님)의 API 키나 타인의 키로 폴백하지 않으며, 키가 등록되지 않은 회원이 조회를 시도하면 HTTP 400 (`needApiKey: true`)과 함께 `/settings` 메뉴로 안내합니다.
- API 키는 공유 Supabase DB의 `user_api_keys` 테이블에 `provider = 'youtube_api_key'`로 회원별 격리 저장됩니다.

---

## 3. 핵심 알고리즘 및 지표 계산 (`src/lib/youtube/metrics.ts`)

| 지표명 | 계산 공식 및 로직 | 목적 및 해석 |
| :--- | :--- | :--- |
| **VPH (Views Per Hour)** | `Math.round(views / hoursSinceUpload)` | 업로드 후 시간당 조회수 증가 속도 (예: `+7.5만/h`). 현재 실시간 급상승 속도 측정. |
| **vsRatio (구독자 대비 배수)** | `subscribers > 0 ? (views / subscribers) : outlier` | 소형 채널(예: 구독자 500명)인데 조회수 20만(400배)인 경우, 팬덤 화력이 아닌 100% 알고리즘 떡상 증명. |
| **Viral Score (0~100점)** | `ratioScore(35%) + vphScore(30%) + freshness(15%) + engagement(20%)` | 구독자 대비 배수와 시청 속도를 종합한 기여도 점수. |
| **등급 뱃지** | 80점 이상 `🚀 초대박`, 65점 이상 `🔥 대박`, 45점 이상 `📈 떡상` | 시각적으로 즉각 판별 가능한 뱃지. |
| **텍스트 유사도 매칭** | 단어 자카드 유사도 `(Intersection / Union) * 100` | 쇼츠 제목/핵심단어와 동일 채널 롱폼 영상 간 텍스트 유사도를 비교하여 원본 풀영상 자동 추적. |

---

## 4. 프론트엔드 라우트 및 기능 맵 (`src/app/(dashboard)/`)

1. **`/viral-shorts` (조회수 폭발 쇼츠 찾기 — 메인)**
   - 키워드 검색 + 10대 인기 분야 칩 원클릭 검색
   - 기간(7일/30일/90일/1년), 소형 채널 구독자수(1만 이하/5만 이하/10만 이하/전체), 최소 조회수 다차원 필터링
   - 떡상 점수순 / 구독대비 배수순 / VPH 속도순 / 최신순 정렬
2. **`/golden-channels` (황금 채널 발굴기)**
   - 구독자 1만명 이하 소형 채널 중 영상당 평균 조회수 3만~10만 이상인 고효율 채널 발굴
3. **`/trending-videos` (실시간 터진 영상)**
   - 대한민국(KR) 실시간 급상승 영상 수집 및 VPH 속도 랭킹 산출 (쇼츠/롱폼 탭 분리)
4. **`/source-finder` (쇼츠 원본 찾기)**
   - 쇼츠 URL 입력 ➔ 1) 설명란 직접 링크 파싱(확정 원본), 2) 동일 채널 롱폼 영상 유사도 매칭 후보 목록 반환
5. **`/favorites` (즐겨찾기 보관함)**
   - 영상 및 채널 북마크 저장, CSV 다운로드 기능
6. **`/settings` (YouTube API 키 설정)**
   - 회원 본인 YouTube Data API v3 키 등록 및 실시간 유효성 검증, Google Cloud 콘솔 1분 발급 가이드
7. **`/guide` (이용 가이드)**
   - VPH/vsRatio 지표 해석 및 4단계 실전 벤치마킹 워크플로우 안내

---

## 5. 인프라 및 DB 배포 현황

### Vercel 배포
- **프로젝트**: `buylife/youtube-viral-studio`
- **배포 ID**: `dpl_E2c3zNE6UnUdCqadfrCfZ6F7KCkA`
- **프로덕션 환경변수 등록 완료**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_MAIN_SITE_URL`

### 공유 Supabase DB 등록 및 메인 사이트 연동 완료
- `programs` 테이블:
  - `slug`: `'youtube-viral-studio'`
  - `name`: `'YouTube Viral Studio (골든 파인더)'`
  - `version`: `'v1.02'`
  - `category_id`: `'cb3c7c75-da5e-4474-a185-f069a6dcbda9'` (카테고리: `유튜브`, `slug: 'youtube'`)
  - `badges`: `['free', 'new']` (FREE 배지 프로그램으로 가입 회원 누구나 무료 이용 가능)
  - `thumbnail_url`: `'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/youtube-viral-studio-thumbnail.jpg?v=1791641119708'`
  - `app_url`: `'https://youtube-viral-studio.vercel.app'`
- `pricing_plans` 테이블:
  - 1개월 이용권 (`monthly`, 29,000원)
  - 2개월 이용권 (`bimonthly`, 54,000원)
  - 3개월 이용권 (`quarterly`, 75,000원)
- 메인 사이트 연동 확인:
  - 메인 홈페이지: `https://www.buylife.xyz` (유튜브 섹션에 프로그램 및 썸네일 노출 확인)
  - 카탈로그 페이지: `https://www.buylife.xyz/programs` (노출 확인)
  - 유튜브 카테고리 전용 페이지: `https://www.buylife.xyz/programs/category/youtube` (노출 확인)
  - 프로그램 상세 페이지: `https://www.buylife.xyz/programs/youtube-viral-studio` (HTTP 200 정상 서빙 확인)

---

## 6. 직접 검수 및 테스트 증거

1. **미인증 보호 테스트**:
   - `curl -I https://youtube-viral-studio.vercel.app/viral-shorts`
   - 결과: `HTTP/1.1 307 Temporary Redirect` ➔ `Location: https://www.buylife.xyz/login?redirect=%2Fviral-shorts` (정상 통과)
2. **API 엔드포인트 보안 테스트**:
   - `curl https://youtube-viral-studio.vercel.app/api/settings/api-keys`
   - 결과: `{"error":"로그인이 필요합니다."}` (정상 401 차단)
3. **로컬 컴파일 테스트**:
   - `npm run build` 결과 15개 라우트 100% 정상 통과

---

## 7. 다른 CLI가 이어받을 후속 작업 (Phase 2 안내)
1. **쇼츠 훅킹 대본 AI 분석 기능 붙이기 (`/viral-shorts` 카드 내)**:
   - 쇼츠 자막(Captions) 또는 오디오 텍스트를 추출하여 `첫 3초 훅킹 문장`, `이탈 방지 전개 방식`, `CTA(행동유도)` 3단 구조 분석 기능 추가.
   - 회원 본인의 Gemini / OpenAI API 키(`user_api_keys`)를 연동하여 분석 수행.
2. **커스텀 도메인 연동**:
   - 도메인 SSO 정책에 따라 `youtube-viral-studio.buylife.xyz` 도메인 추가 시 `vercel domains add youtube-viral-studio.buylife.xyz` 및 DB `app_url` 업데이트.
