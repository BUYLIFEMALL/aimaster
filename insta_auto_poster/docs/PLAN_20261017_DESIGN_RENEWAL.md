# INSTA 포스팅 자동화 (`insta_auto_poster`) 디자인 리뉴얼 및 가이드 고도화 개발 플랜

## 1. 개요 및 목적
- **대상 프로그램**: INSTA 포스팅 자동화 (폴더 `insta_auto_poster/`, slug `auto-instagram-posting`)
- **서비스 URL**: https://auto-instagram-posting.buylife.xyz
- **현재 버전**: `v1.22` ➔ **목표 버전**: `v1.23`
- **목적**:
  1. 기존의 단조로운 라이트 테마(`bg-white`)를 인스타그램 특유의 생동감과 최신 플랫폼 표준에 부합하는 **플로우 위저드 스타일 (인스타 바이럴 변형)** 다크 테마로 전면 리뉴얼.
  2. 375px 모바일 뷰포트에서 상단 56px 고정 헤더(`h-14`) 및 햄버거 토글 슬라이드 오버레이 드로어 구축으로 완벽한 모바일 접근성 확보.
  3. 텍스트 위주였던 연동 & 사용 매뉴얼(`/guide`)을 🤖 마스코트 환영 배너, 5단계 파이프라인 카드, Meta 개발자 앱(Facebook vs Instagram 로그인 2가지 방식) 연동 가이드, 인스타 피드/캐러셀 바이럴 팁, FAQ 6종을 갖춘 프리미엄 비주얼 가이드북으로 전면 고도화.
  4. 대시보드(`/dashboard`), 설정(`/settings`), 글쓰기/후보 관리 화면의 다크 토큰 일체화.

---

## 2. 디자인 템플릿 사양 (Design Token & Spec)
- **템플릿 명칭**: **플로우 위저드 스타일 (인스타 바이럴 변형)** 다크 테마
- **컬러 스펙**:
  - 메인 배경 (`Background`): `#0d0f17` (`bg-[#0d0f17]`)
  - 카드 및 서피스 (`Surface / Card`): `#161922` (`bg-[#161922]`)
  - 테두리 선 (`Border`): `#262c3d` (`border-[#262c3d]`)
  - 내부 패널/인풋 (`Panel / Input`): `#0d0f17` 및 `#1f2433`
  - 포인트 악센트:
    - 인스타 바이럴 그라디언트: `bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600`
    - Meta Facebook 블루: `bg-blue-600 hover:bg-blue-700 text-white`
    - Instagram 그린: `bg-emerald-600 hover:bg-emerald-700 text-white`
    - 앰버 악센트: `text-amber-400 bg-amber-500/10 border-amber-500/30`
  - 타이포그래피:
    - 제목: `text-slate-100 font-bold`
    - 본문: `text-slate-300`
    - 보조/설명: `text-slate-400`

---

## 3. 구현 세부 계획 및 순서

### Step 1: 전역 스타일 및 레이아웃 다크 토큰 적용
- `insta_auto_poster/src/app/globals.css`: 다크 테마 토큰 정의 (`--background: #0d0f17; --foreground: #f8fafc;`)
- `insta_auto_poster/src/app/layout.tsx`: `body` 클래스 `bg-[#0d0f17] text-slate-100` 적용
- `insta_auto_poster/src/app/(dashboard)/layout.tsx`: `min-h-screen bg-[#0d0f17] text-slate-100 dark` 적용
- `insta_auto_poster/src/lib/version.ts`: `APP_VERSION = "v1.23"` 갱신

### Step 2: 사이드바 모바일 반응형 헤더 & 오버레이 드로어 구축
- `insta_auto_poster/src/components/layout/Sidebar.tsx`:
  - 375px 모바일 상단 고정 헤더 (`h-14`, 앱 타이틀, `v1.23` 배지, 접근성 햄버거 버튼 `aria-label="메뉴 열기"`)
  - 슬라이드 오버레이 드로어 (배경 딤드 클릭 시 닫힘, 라우트 이동 시 자동 닫힘)
  - 데스크톱(1440px) 260px 고정 다크 아틀리에 사이드바 (단계별 번호 스텝퍼, `📖 연동 & 사용 매뉴얼` 하이라이트)

### Step 3: 비주얼 연동 & 사용 매뉴얼 (`/guide`) 전면 고도화
- `insta_auto_poster/src/app/(dashboard)/guide/page.tsx`:
  - 🤖 마스코트 안내 배너: "AI로 인스타그램 피드와 카드뉴스를 자동 발행하는 스마트 스튜디오!"
  - 5단계 단계별 파이프라인 비주얼 카드 (1. AI 키 등록 ➔ 2. Meta 앱 & 인스타 연결 ➔ 3. 주제 수집 ➔ 4. AI 생성 ➔ 5. 즉시/예약 게시)
  - Meta 연동 2대 방식 (📘 Facebook 페이지 방식 vs 📗 Instagram 로그인 방식) 상세 비교 카드 및 원클릭 복사 안내
  - 인스타그램 단일 이미지 vs 캐러셀 바이럴 공략 팁 카드
  - 차단된 URL/화이트리스트 오류 등 트러블슈팅 FAQ 6종 카드

### Step 4: 대시보드 (`/dashboard`) 다크 테마 정돈
- 환영 타이틀 및 바로가기 버튼 그라디언트 적용
- 5종 상태 카운터(`임시저장`, `예약됨`, `게시 중`, `게시 완료`, `게시 실패`) 카드 다크 서피스 토큰화
- 다가오는 예약 게시글 목록 및 빈 상태(Empty State) 시인성 극대화
- 계정 미연동 알림 배너 다크 앰버 스타일 정돈

### Step 5: 검증 및 배포
1. 로컬 빌드 검증: `npm run build` 컴파일 및 타입체크 100% 통과
2. Supabase DB `programs` 테이블에서 `slug = 'auto-instagram-posting'`의 `version = 'v1.23'` 갱신
3. Vercel 프로덕션 배포: `npx vercel --prod --yes`
4. Microsoft Edge 포그라운드 (`headless: false`) 실세션 검수:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 인증 세션 주입
   - 데스크톱(1440px) 대시보드 및 가이드북 화면 검수
   - 모바일(375px) 대시보드, 햄버거 메뉴 드로어, 가이드북 화면 검수
   - 캡처 증빙 5종 아티팩트 보존

### Step 6: 인수인계 문서 6종 규격화 및 커밋/푸시
- `AGENTS.md` (7대 핵심 항목 규격화)
- `README.md` (7대 핵심 항목 동기화)
- `docs/PLAN_20261017_DESIGN_RENEWAL.md`
- `docs/DESIGN_HANDOFF.md`
- `docs/IMPROVEMENTS.md` (3대 핵심 항목)
- `docs/IMPROVEMENT_BACKLOG.md`
- `DESIGN.md` 56번 `✅ 1차 작업완료` 갱신 (**✅ 42개 완료 달성!**), `ACTIVE_WORK.md` 및 `HANDOFF.md` 동기화
- Git 커밋 및 푸시
