# 네이버 블로그 올인원 자동화(naver-blog-allinone) 디자인 리뉴얼 & 사용 매뉴얼 신설 개발 플랜

## 1. 개요 및 목적
- **프로그램명**: 네이버 블로그 올인원 자동화 (`naver-blog-allinone`)
- **서비스 URL**: https://naver-blog-allinone.buylife.xyz
- **목적**:
  1. UI/UX 디자인 표준(`DESIGN.md`)에 따른 **플로우 위저드 스타일 (네이버 그린 라이트 변형)** 테마 전면 적용.
  2. 초보 사용자도 직관적으로 스마트에디터 ONE 연동 및 4단계 올인원 워크플로우를 익힐 수 있는 **비주얼 사용 매뉴얼(`GuideSection.tsx`) 신설**.
  3. 375px 모바일 화면에서도 완벽하게 동작하는 상단 고정 헤더 및 햄버거 토글 슬라이드 오버레이 드로어 반응형 최적화.
  4. 크롬 확장 프로그램(`extension/manifest.json`), ZIP 다운로드, DB 버전 동기화(`v1.48` → `v1.49`).
  5. Microsoft Edge 포그라운드 실세션 검수 및 6종 인수인계 문서 7대 규격 완비.

---

## 2. 디자인 및 주요 개선 범위
1. **디자인 테마 (플로우 위저드 스타일 - 네이버 그린 라이트)**:
   - 배경: 클린 라이트 슬레이트 (`bg-slate-50` / `bg-[#f8fafc]`)
   - 서피스 카드: 순백색 (`bg-white`), 섬세한 테두리 (`border-slate-200/90`), 가벼운 그림자 (`shadow-xs` / `shadow-sm`)
   - 브랜드 포인트: 네이버 시그니처 그린 (`#03c75a` / `#00c73c`), 에메랄드, 포인트 인디고
   - 스텝퍼 비주얼 강화: 단계 번호 원형 배지(1~4), 직관적 상태 배지 및 설명.
2. **비주얼 사용 매뉴얼(`GuideSection.tsx`) 완전 신설**:
   - 상단 환영 마스코트 배너: 스마트에디터 ONE 1초 주입 및 C-Rank 최적화 안내
   - 4단계 올인원 파이프라인 카드 (아이디어 발굴 → 멀티모달 비전 분석 → 7대 엔진 키워드 발굴 → 본문 생성 & 보관함)
   - 크롬 확장 프로그램 원클릭 설치 및 네이버 스마트에디터 ONE 자동 주입 가이드
   - C-Rank & D.I.A.+ 네이버 검색 알고리즘 대응 실전 포스팅 팁
   - 자주 묻는 질문(FAQ) 아코디언 및 고객 지원 안내
3. **네비게이션 & 모바일 드로어 정비**:
   - `Sidebar.tsx`: `MainTabType`에 `"guide"` 추가, `📖 연동 & 사용 매뉴얼` 메뉴 항목 배치.
   - 375px 모바일 뷰: 상단 햄버거 버튼과 사이드바 드로어 연결 및 탭 터치 시 자동 닫힘 처리.
   - `page.tsx`: URL 쿼리 파라미터(`?tab=guide`) 지원 및 탭 전환 시 매뉴얼 섹션 부드러운 렌더링.
4. **버전 및 크롬 확장 관리**:
   - `src/lib/version.ts` (`v1.49`), `package.json` (`1.49.0`), `extension/manifest.json` (`1.49.0`, `v1.49`) 일괄 판올림.
   - 크롬 확장 최신 ZIP 패키징 확인 및 배포.

---

## 3. 구현 단계별 순서
1. **[Step 1] 기획 및 문서 수립**:
   - `docs/PLAN_20261018_DESIGN_RENEWAL.md` 작성 및 사용자 공유.
2. **[Step 2] 버전 판올림 & 확장 프로그램 동기화**:
   - `src/lib/version.ts`, `package.json`, `extension/manifest.json` `v1.49` 갱신.
   - 크롬 확장 ZIP 패키징 갱신.
3. **[Step 3] 사용 매뉴얼 컴포넌트 신설 (`GuideSection.tsx`)**:
   - 마스코트 배너, 4단계 파이프라인, 크롬 확장 설치 가이드, FAQ 구축.
4. **[Step 4] 사이드바 및 메인 페이지 연동 (`Sidebar.tsx`, `page.tsx`)**:
   - `"guide"` 탭 타입 추가, 사이드바 메뉴 배치, 모바일 드로어 연동.
   - 페이지 쿼리 파라미터 및 탭 렌더링 연결.
5. **[Step 5] 로컬 빌드 및 테스트 검증**:
   - `npm test` 및 `npm run build` 오류 없는지 검증 (무료 로컬 검증).
6. **[Step 6] Supabase DB 갱신 및 Vercel 배포**:
   - Supabase `programs` 테이블 버전 `v1.49` 갱신.
   - `npx vercel --prod --yes` 1회 프로덕션 배포.
7. **[Step 7] Microsoft Edge 포그라운드 실세션 검수**:
   - `headless: false` 설정으로 Edge 브라우저 화면 포그라운드 띄움.
   - 데스크톱(1440px) 대시보드/매뉴얼, 모바일(375px) 대시보드/메뉴/매뉴얼 5종 캡처 보존.
8. **[Step 8] 인수인계 문서 6종 규격화 & 저장소 동기화**:
   - `AGENTS.md`, `README.md` 7대 규격 갱신.
   - `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md` 작성.
   - `DESIGN.md` 26번 `✅ 1차 작업완료` 갱신, `ACTIVE_WORK.md` 및 `HANDOFF.md` 동기화 후 Git Commit & Push.

---

## 4. 검수 기준 및 비용 통제
- **비용 관리**:
  - 로컬 테스트 및 Turbopack 빌드 0원.
  - Vercel 프로덕션 배포 1회 완결로 빌드 비용 최소화.
  - 외부 유료 API 불필요한 호출 배제.
- **검수 브라우저**:
  - Microsoft Edge (`msedge`) 포그라운드 (`headless: false`) 전용 검수.
- **성공 판정**:
  - 로컬 빌드 성공.
  - 프로덕션 Vercel 배포 성공 (HTTP 200).
  - 모바일(375px) 햄버거 메뉴 및 드로어 정상 동작.
  - 비주얼 가이드북 정상 노출 및 스마트에디터 연동 팁 안내 확인.
