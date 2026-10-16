# 개선 인수인계 — AI 엑셀·텍스트 합치기 자동화 (2026-10-17, Claude Code 맥미니)

## 한 일 (v1.07)
스마트 매트릭스 **라이트 변형** 디자인. 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md), 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md), 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 바뀐 파일
- 수정: `src/app/globals.css`, `src/app/page.tsx`(`/` → `/dashboard`), `src/components/layout/Sidebar.tsx`(대시보드 메뉴), `src/app/(workspace)/{excel-merge,excel-split,text-merge,text-split,guide}/page.tsx`, `src/lib/version.ts`(v1.07), `package.json`(1.0.7)
- 신규: `src/app/(workspace)/dashboard/page.tsx`, `src/components/ui/PageHero.tsx`, `docs/*`
- 파일 처리 로직·Worker·테스트 대상 코드 변경 없음.

## 확인한 것 / 못 한 것
- 확인: 정적 검토, 라이트 토큰 대비 계산(전부 4.5:1 이상), 히어로로 옮긴 설명 문구에 따옴표 없음.
- **못 한 것**: `npm test`·`npm run build`·배포·화면 검수(맥미니 빌드 금지).

## 다음 첫 단계 (윈도우 CLI)
1. `docs/ACTIVE_WORK.md` 줄 추가 → `cd file-merge && npm test && npm run build`.
2. `vercel deploy --cwd <file-merge> --prod --yes --scope buylife`(먼저 `.vercel/project.json` projectName이 `file-merge`인지) → DB `update programs set version='v1.07', updated_at=now() where slug='file-merge';`
3. `buylifemall@naver.com` 1440px·375px: `/`→`/dashboard`, 도구 카드 4개, 각 도구 히어로·파일 끌어놓기 영역·미리보기 표·칩 눌림 색, 매뉴얼 흐름 그림, ☰ 메뉴. 샘플 엑셀 2개로 합치기 1회(브라우저 안 처리, 비용 없음).
4. 루트 `DESIGN.md` 65번 「✅ 1차 작업완료 (`v1.07`, …)」, `DESIGN_HANDOFF.md` 기록, ACTIVE_WORK 줄 삭제.

## 2026-10-17 Codex(Windows) — 배포 전 검수

- 맥미니 c8ee93a7 인수, [Windows 검수 플랜](VERIFICATION_PLAN_20261017_WINDOWS.md). 기존 처리 코드 변경 없음. `npm test` 21/21, Next 16.4.0 빌드·TypeScript 검사 통과, npm 설치 audit 0건.
- 실제 일반 회원·보이는 Edge 로컬 1440px/375px 검수 12개 통과: 대시보드/6개 화면/매뉴얼/메뉴, 실제 Worker, 엑셀 두 파일 머리글 정렬·실제 다운로드 값/서식, 지역별 ZIP 3개, CP949/UTF-8 합치기, 텍스트 80자 분할·원문 복구, 파일 전송/쓰기·유료 API·페이지 오류 0회. 라이트 대비 8쌍 4.5:1 이상.
- 환경 파일/운영 설정은 변경하지 않았습니다. 로컬 파일에는 Vercel OIDC 항목만 있어 최초 검사는 setup으로 이동했으며, 기존 루트 DB 설정을 빌드/서버 자식 프로세스에만 전달하는 `tests/local.mjs`로 해결했습니다. 서버는 127.0.0.1:3032에만 바인딩합니다.
- 테스트 도구의 감싸는 label+select 정확 일치와 CSS 축약색 해석을 보완했으며 제품 오류가 아니었습니다. 캡처는 맨 위로 스크롤한 뒤 찍어 고정 메뉴가 중간에 보이는 오판을 방지합니다.
- 실행: `npm run build:verify`; `node tests/local.mjs start` 후 `npm run test:browser`. 운영은 FM_TEST_BASE=https://file-merge.buylife.xyz. 키/회원 세션/비밀번호는 기록하지 않습니다. 실제 다운로드 검증용 합성 파일은 Git 제외 `.vercel/test-downloads/`에 저장합니다.
- 새 검수 의존성 playwright 1.58.2(Edge 사용)와 테스트 스크립트만 추가했습니다. 앱 인증·파일 처리에는 모의 코드를 연결하지 않습니다. 다음: 고정 소스 커밋/푸시 → 운영 배포 → DB v1.07 → 운영 동일 검사 → 문서/현황판 마무리.
