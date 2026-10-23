# allinone-graphic — 에이전트 인수인계 문서

## 1. 개요
- **프로그램명**: AI 올인원 그래픽 자동화 (`allinone-graphic`)
- **라이브 도메인**: https://graphic.buylife.xyz
- **버전**: v1.05

## 2. 핵심 로직 & 파일 구조
- `src/app/(auth)/login/page.tsx`: 표준 2탭 세그먼트 로그인/회원가입 페이지 (크리에이티브 아틀리에 앰버 테마)
- `src/app/guide/page.tsx`: 정식 `/guide` 사용 매뉴얼 (크리에이티브 아틀리에 앰버 골드 비주얼 가이드북)
- `src/lib/templates.ts`: 19개 직군 123종 프리셋 템플릿 데이터베이스
- `src/lib/gemini.ts`: 회원 본인 Gemini 키 기반 렌더링, 인페인팅, AI 자동 입력 도우미
- `src/components/studio/AllInOneGraphicApp.tsx`: 4컬럼 스튜디오 작업 환경
- `src/components/layout/Sidebar.tsx`: 5대 그룹 아코디언 및 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 표준 사이드바
- `docs/DESIGN_HANDOFF.md`: 디자인 완료 인수인계서 (크리에이티브 아틀리에 스타일)
- `docs/PLAN_20261017_LOGIN_RENEWAL.md`: 로그인 2탭 표준화 개발 플랜
- `docs/IMPROVEMENTS.md`: 프로그램 개선사항 관리 대장
- `docs/IMPROVEMENT_HANDOFF_20261017.md`: 개선사항 인수인계서

## 3. v1.05 (2026-10-17) — 로그인/회원가입 표준 2탭 레이아웃 개편 (allinone-graphic)
- **표준 레이아웃 적용**: `threads-comment-reply` 표준 규격에 맞춘 `[로그인]` / `[회원가입]` 2탭 세그먼트 전환 구조 구축.
- **크리에이티브 아틀리에 테마 일관성**: `#090d16` 딥 미드나잇 배경 + 24px 앰버 모눈 격자, 카드 다크 글래스모피즘, 앰버-오렌지(`#f59e0b` ➔ `#ea580c`) 그라디언트 탭 & 액션 버튼 일관 적용.
- **인풋 및 링크 최적화**: 이메일/비밀번호 좌측 아이콘(42px 패딩), 비밀번호 찾기 우측 링크, 회원가입 모드 전환 시 통합 계정 혜택 3종 및 무료 회원가입 CTA 버튼 배치.
- **Edge 실세션 검수 완료**: 데스크톱(1280x900) 로그인/회원가입 탭, 모바일(390x844) 반응형 캡처 3종 확인 완료.
- **버전 동기화**: `src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version` 모두 `v1.05` 동기화 완료.

## 4. v1.04 (2026-10-16) — 크리에이티브 아틀리에 스타일 리뉴얼 & 가이드북 신설 (allinone-graphic)
- **적용 템플릿**: `✨ 크리에이티브 아틀리에 스타일` (Creative Atelier Style — 앰버 골드 `#f59e0b` & 딥 미드나잇 다크 `#0a0d14`)
- **신규 라우트**: 정식 `/guide` 비주얼 가이드북 전면 구축 (5단계 파이프라인 인포그래픽, Gemini 키 1분 발급 가이드, 19개 직군 123종 프리셋 맵 치트시트, 스마트 매직 에디터 인페인팅 팁, FAQ 4종)
- **사이드바 표준화**: 좌측 유틸리티 영역 최상단에 `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 탑재, 계정 블록 12px 간격 밀착 정렬.
- **검수**: Microsoft Edge 전용 실세션 검수 완료 (데스크톱 1440px 및 모바일 380px 반응형).
- **버전 동기화**: `src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version` 모두 `v1.04` 동기화 완료.

## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.02)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.

## 2026-10-16 DB 연동 변수 호환 — v1.03 (allinone-graphic)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.06 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/gemini.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-18 v1.07 — 이미지 생성 호출을 공용 기준 코드로 (이미지 4묶음 B · SDK 사용형, Claude Code 윈도우)
- **한 일**: `src/lib/gemini.ts` `generateGraphicImage`·`editGraphicImage`가 공용 호출 함수(`callImage`)를 씀. 라우트에 `maxDuration`이 없어 기본 300초 → 시간 제한 240초. 실패하면 한국어 안내(키 가림)를 담은 오류를 던지고 라우트가 그 문구를 그대로 보여 줌(예전엔 SDK 영어 오류 문장이 그대로 노출). 결과 data URL의 형식을 실제 이미지 형식으로. 키 확인용 시험 호출·참고문서 분석은 그대로.
- **왜**: ① SDK 호출에 시간 제한이 없어 Vercel 함수 한도에서 원인 모를 끊김(요금은 나갔을 수 있음) ② 응답의 첫 이미지만 꺼내 `gemini-3-pro-image`의 중간 초안(thought) 이미지를 결과로 쓸 위험 ③ 영어 오류 문장을 정규식으로 추측해 분류 — 공용 모듈은 시간 제한·최종 이미지 선택·상태 코드별 오류 구분·키 가리기·시간 초과 표준 안내(Google AI Studio 사용량 확인)를 갖췄다.
- **바꾸지 않은 것**: 프롬프트·모델 이름·비율·화질·화면·글 생성 호출(SDK 그대로). 유료 생성이라 재시도 0(이중 과금 방지).
- **검수**: tsc 0, 프로그램 테스트(없음(테스트 스크립트 없음)), `check-shared-modules` OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. eslint는 이 폴더에 설정 파일이 없어(이전부터) 실행 안 됨. 실제 이미지 생성 시험은 하지 않음(비용) — 오류가 나면 그때 검증.
- **주의(다음 CLI)**: `src/lib/geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 이 프로그램만 다르게 해야 하면 호출하는 쪽에서 덮어쓴다. 점검표: 루트 `docs/SHARED_MODULE_CHECKPOINTS.md`.

## 2026-10-19 v1.08 — 깨진 사진을 AI 자동 입력 첨부에서 빼고 안내 (Claude Code 윈도우)
- 운영 실측: 「AI 자동 입력」 레퍼런스 첨부에 깨진 JPG가 그대로 붙음(AI로 보내면 실패·비용 낭비 가능).
- 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts` 수정 후 `node scripts/check-shared-modules.mjs --sync`. `npm test` 명령 신설.
- `AllInOneGraphicApp.tsx` `handleFileUpload`: 사진 파일만 검사해 깨진 것은 빼고 첨부 바 아래 `role="alert"` 안내. 글·PDF 첨부는 그대로.
- 검수: 공용 테스트 5/5, tsc, 빌드, Vercel READY(`allinone-graphic-282u19ydo`), DB v1.08, 운영 실측 — 깨진 사진+메모 → 안내 표시, 메모만 첨부(1개 파일). AI 비용 없음.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->


## 2026-10-21 v1.09 — 바나나 캔버스로 병합(이동 안내만 남김) (Claude Code 윈도우)
- 근거: [이미지 카테고리 병합 분석](../docs/analysis-image-consolidation-20261021/REPORT.md) 묶음 B(주인님 결정). 템플릿 123종·칸 자동 입력·화풍/언어/해상도·참고 이미지·브러시 부분 수정·비율 확장은 **바나나 캔버스 v1.13** 「📐 템플릿 그래픽」·「빠른 작업」으로 옮김(`banana-canvas/AGENTS.md` v1.13). 템플릿 데이터의 기준은 이제 `banana-canvas/src/lib/bnc/graphicTemplates.ts`.
- 이 앱: 첫 화면(`src/app/page.tsx`) → 이동 안내(로그인·권한 확인 없음, 회원 자료 없음 — 원래 저장 기능이 없었음). `/api/generate`·`/api/edit`·`/api/ai-fill` → 410. `/guide`·`/api/user-key`는 그대로.
- 옮기면서 고친 원래 앱 문제: `/api/ai-fill`에 프로그램 권한 검사가 없었음, PDF를 글자로 읽어 내용이 깨졌음, 결과가 새로고침하면 사라졌음.
- 쓰지 않게 된 코드(`src/components/studio/AllInOneGraphicApp.tsx`·`src/lib/templates.ts`·`src/lib/gemini.ts` 등)는 사용 종료 코드 정리 규칙(백업 폴더 + git 태그 뒤)에 따라 아직 지우지 않음.
- 운영 DB: `is_active=false`·`version='v1.09'`(기록 `supabase/migrations/20261021_v1_09_merged_into_banana.sql`).
