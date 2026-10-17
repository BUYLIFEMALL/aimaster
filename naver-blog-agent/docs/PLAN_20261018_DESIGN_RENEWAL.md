# 네이버 블로그 에이전트(naver-blog-agent) 디자인 리뉴얼 & 가이드북 고도화 개발 플랜

## 1. 개요 및 목적
- **프로그램명**: 네이버 블로그 에이전트 (`naver-blog-agent`)
- **서비스 URL**: https://naver-blog-agent.buylife.xyz
- **목적**:
  1. UI/UX 디자인 표준(`DESIGN.md`)에 따른 **플로우 위저드 스타일 (네이버 그린 라이트 변형)** 테마 전면 적용.
  2. 375px 모바일 화면에서도 완벽하게 동작하는 상단 고정 헤더, 햄버거 토글 슬라이드 오버레이 드로어 메뉴 구축.
  3. 초보자도 네이버 스마트에디터 ONE 안전 자동 발행 및 3단계 파이프라인을 쉽게 따라 할 수 있는 **비주얼 연동 & 사용 매뉴얼 (`guide/page.tsx`) 고도화**.
  4. 크롬 확장 프로그램(`extension/manifest.json`), `package.json`, `src/lib/version.ts`, DB `programs` 버전 일괄 동기화 (`v1.93` → `v1.94`).
  5. Microsoft Edge 포그라운드 실세션 검수(데스크톱/모바일 5종 캡처) 및 6종 인수인계 문서 7대 규격 완비.

---

## 2. 디자인 및 주요 개선 범위
1. **플로우 위저드 라이트 테마 (네이버 그린 변형)**:
   - 배경: 클린 슬레이트 (`bg-[#f8fafc]`)
   - 서피스 카드: 순백색 (`#ffffff`), 섬세한 보더 (`border-slate-200/90`), 가벼운 그림자 (`shadow-xs` / `shadow-sm`)
   - 브랜드 포인트: 네이버 시그니처 그린 (`#03c75a` / `#00c73c`), 에메랄드, 포인트 앰버/인디고
   - 사이드바 스텝퍼: 1번 떡상 수집 → 2번 콘텐츠 생성 → 3번 콘텐츠 보관함의 시각적 연결선 및 상태 배지 세련화
2. **모바일(375px) 반응형 내비게이션 완비**:
   - `Header.tsx`와 `Sidebar.tsx`: 모바일 전용 햄버거 메뉴 버튼, 오버레이 백드롭, 좌측 슬라이드 드로어 메뉴 구축
   - 모바일에서도 대시보드, 1~3 스텝퍼, API키 설정, 사용 매뉴얼, 로그아웃을 터치 한 번으로 안전하게 접근
3. **비주얼 연동 & 사용 매뉴얼 (`guide/page.tsx`) 전면 고도화**:
   - 상단 환영 히어로 배너: 네이버 그린 & 에메랄드 테마 공식 가이드북 배너 (`v1.94`)
   - 3단계 핵심 파이프라인 카드 (01 떡상 글감 수집 → 02 AI 원고 & 이미지 생성 → 03 보관함 & 스마트에디터 ONE 자동 발행)
   - 크롬 확장 프로그램 1초 설치 및 네이버 스마트에디터 ONE 자동 연결 가이드
   - 네이버 C-Rank & D.I.A.+ 검색엔진 알고리즘 상위 노출 4대 실전 체크포인트
   - 안전 발행 모드(발행 전 준비까지만) 및 트러블슈팅 FAQ 아코디언 탑재
4. **버전 및 확장 프로그램 관리**:
   - `src/lib/version.ts` (`v1.94`), `package.json` (`1.94.0`), `extension/manifest.json` (`1.94.0`, `v1.94`) 일괄 갱신
   - 확장 프로그램 아카이브 빌드 (`npm run build:extension`) 및 Supabase DB `programs` 동기화

---

## 3. 구현 단계별 순서
1. **[Step 1] 기획 및 플랜 제시**:
   - `docs/PLAN_20261018_DESIGN_RENEWAL.md` 작성 및 사용자(주인님)에게 플랜 제시.
2. **[Step 2] 버전 판올림 & 확장 프로그램 동기화**:
   - `src/lib/version.ts`, `package.json`, `extension/manifest.json` `v1.94` 일괄 갱신.
   - 확장 프로그램 아카이브 재빌드.
3. **[Step 3] 모바일 반응형 헤더 & 사이드바 정비 (`Header.tsx`, `Sidebar.tsx`, `layout.tsx`)**:
   - 햄버거 토글 상태 연동, 슬라이드 오버레이 드로어 구축, 플로우 위저드 라이트 테마 토큰 적용.
4. **[Step 4] 비주얼 사용 매뉴얼 고도화 (`guide/page.tsx`)**:
   - 공식 가이드 배너, 3단계 파이프라인, 크롬 확장 설치 가이드, FAQ 아코디언 구축.
5. **[Step 5] 로컬 단위 테스트 및 Next.js 빌드 검증**:
   - `npm run build` 및 주요 테스트 스크립트 실행 (무료 로컬 검증).
6. **[Step 6] Supabase DB 갱신 및 Vercel 프로덕션 배포**:
   - Supabase `programs` 테이블 버전 `v1.94` 갱신.
   - `npx vercel --prod --yes` 1회 프로덕션 배포.
7. **[Step 7] Microsoft Edge 포그라운드 실세션 검수**:
   - `headless: false` 설정으로 실제 Edge 창 화면 노출.
   - 데스크톱(1440px) 대시보드/가이드북, 모바일(375px) 대시보드/메뉴/가이드북 5종 캡처 보존.
8. **[Step 8] 인수인계 문서 6종 규격화 & 저장소 동기화**:
   - `AGENTS.md`, `README.md` 7대 규격 갱신.
   - `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md` 작성.
   - `DESIGN.md` 29번 `✅ 1차 작업완료` 갱신, `ACTIVE_WORK.md` 및 `HANDOFF.md` 동기화 후 Git Commit & Push.

---

## 4. 검수 기준 및 비용 통제
- **비용 통제**:
  - 로컬 테스트 및 Turbopack 빌드 0원.
  - Vercel 프로덕션 배포 1회 완결로 빌드 비용 최소화.
  - 외부 유료 API 불필요한 호출 전면 배제.
- **검수 브라우저**:
  - Microsoft Edge (`msedge`) 포그라운드 (`headless: false`) 전용 검수.
- **성공 판정**:
  - 로컬 빌드 성공.
  - 프로덕션 배포 성공 (HTTP 200).
  - 모바일(375px) 햄버거 메뉴 및 슬라이드 드로어 정상 동작.
  - 비주얼 가이드북 정상 노출 확인.
