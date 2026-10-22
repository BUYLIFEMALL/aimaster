# 시네마틱 스토리보드 자동화 — 인수인계 (AGENTS.md)

> 다른 CLI가 대화 없이 이어서 작업할 수 있도록 쓴 문서입니다. 작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다. 작업 기록은 아래 "작업 기록"에 **추가만** 합니다.

## 1. 한눈에 보기
| 항목 | 값 |
|---|---|
| 이름 / slug | 시네마틱 스토리보드 자동화 / `cinematic-storyboard-studio` |
| 현재 버전 | **v1.07** (`src/lib/version.ts` = `package.json` = DB `programs.version`) |
| 라이브 | https://cinematic-storyboard-studio.buylife.xyz (옛 `*.vercel.app` 유지) |
| Vercel | 팀 `buylife`, 프로젝트 `cinematic-storyboard-studio` (CLI 업로드 배포) |
| 배지·카테고리 | FREE + new, 멀티미디어, 최소 등급 일반, 요금제 1·2·3개월 등록 |
| 스택 | Next.js 16 · React 19 · Tailwind 4 · Supabase(DB+Storage) · `@google/genai` · `sharp` · `jszip` |
| AI 모델 | 분석·영상 프롬프트 `gemini-2.5-flash`(thinking 끔), 이미지 `gemini-2.5-flash-image`(표준)/`gemini-3-pro-image-preview`(Pro 2K, 본인 Google 결제 필요) — `src/lib/storyboard/types.ts` |
| 비용 | **회원 본인 Gemini 키**로 서버 호출 → 운영자 AI 비용 없음. 저장소(이미지)는 운영자 부담 → 사용자당 프로젝트 30개 제한 + JPEG 압축 |
| 참고 원본 | cinematic-storyboard-ai.vercel.app (HTML·번들 전체 분석, 흐름·규칙 참고, 프롬프트·문구는 새로 작성, 원작자 크레딧·가짜 "4K" 표기는 따라 하지 않음) |

## 2. 무엇을 하는가
레퍼런스 이미지 1장 → ① 분석(장면·스토리·연출·키프레임 9개, JSON 스키마) → ② 9컷 마스터 콘택트 시트 이미지(3:2, 컷마다 `KF#01 | 2s | ELS` 자막) → ③ 자르기(3×3 경계 슬라이더 → 9 JPG ZIP, 브라우저 처리) → ④ 영상 프롬프트(마스터 프롬프트 + 장면 9개 + JSON, 길이 5/8/10/15초, 대사 없음/KR/EN).

## 3. 구조
```
src/lib/storyboard/types.ts     타입·상수(엔진, 길이 옵션, 한도 maxProjects=30)
src/lib/storyboard/plan.ts      장면 길이 배분(0.5초 단위, 합계=총 길이, 장면1 최장), 자르기 좌표, 파일명
src/lib/storyboard/prompts.ts   분석/콘택트시트/영상/주제 프롬프트 + JSON 스키마(연도·인물 규칙 포함)
src/lib/storyboard/validate.ts  AI 응답 정리(키프레임 9개 검증, 영상 길이를 계획값으로 고정, 메타 단어 제거, 장면1 시작어 보정, 대사 규칙)
src/lib/gemini.ts               회원 키로 호출 + 오류를 한국어 문구로(Pro 403 → 결제 안내)
src/lib/projects.ts             소유 확인, 비공개 버킷 업로드/다운로드/서명 URL, sharp 정규화(참조 1600px, 마스터 2400px JPEG)
src/lib/routeGuard.ts           requireAccess / requireAccessAndKey(키 없으면 needKey 응답, 폴백 없음)
src/app/api/projects            목록(GET)·생성(POST, 이미지 저장)
src/app/api/projects/[id]       조회(GET, 서명 URL)·삭제(DELETE, 파일 포함)
src/app/api/projects/[id]/analyze | render | video-prompts   단계별 요청(시간 초과 방지, render maxDuration 300)
src/app/api/topic-suggest       주제 AI 제안
src/components/studio/*         StudioWorkspace(흐름), SplitEditor(자르기), ProjectsList, i18n
```
- 요청 용량(약 4.5MB) 때문에 마스터 이미지는 서버가 비공개 버킷 `storyboard-ai`에 올리고 **서명 URL**로 보여준다. 업로드 이미지는 브라우저에서 1600px로 줄여 전송.
- 접근 판정은 `image-convert-studio`와 같은 핸드폰 확인 포함 코드. 모든 API route에 `dynamic/fetchCache` 두 줄, 모든 쿼리에 `user_id` 필터.

## 4. DB (공용 Supabase `esgxyikcnnvmlhygjkth`)
- `storyboard_projects` (user_id, title, topic, lang, engine, status[created|analyzed|rendered|prompts], ref_path, master_path, analysis jsonb, video_prompts jsonb, video_settings jsonb) — RLS owner-only.
- Storage 버킷 `storyboard-ai`(비공개, 8MB): `<user_id>/<project_id>/ref.jpg|master.jpg`. 프로젝트 삭제 시 파일도 삭제(확인함: 삭제 후 객체 0건).

## 5. 동작 메모 (원본과 다르게 한 점)
- 키: 원본은 브라우저 localStorage(base64)+직접 호출 → 서버 호출·본인 키. 키 확인용 3회 호출은 없앰(Pro 권한은 실제 사용 때 오류 안내).
- 결과 보관: 원본은 새로고침하면 사라짐 → 프로젝트로 저장하고 `?p=<id>`로 이어보기.
- 영상 길이: 원본은 장면1=5초 고정이라 총 길이와 어긋남 → 총 길이에 맞춰 0.5초 단위로 배분(합계 정확), 길이는 서버가 계획값으로 고정.
- 메타 단어(storyboard/panel/frame/grid…)는 프롬프트 지시 + 서버 후처리로 이중 방어.

## 6. 배포·운영 절차
1. `npm test` → `npm run build`. 2. 버전 +0.01(`src/lib/version.ts`의 `APP_VERSION` **줄만**) + `package.json` + DB `update programs set version=… where slug='cinematic-storyboard-studio'` + 이 문서. 3. `cd cinematic-storyboard-studio && vercel deploy --prod --yes --scope buylife`. 4. 경로를 지정해 커밋 후 `git push origin master`. 5. 라이브 새로고침해 사이드바 버전 확인.
- 환경변수 4개는 `scripts/add-cinematic-storyboard-vercel-env.mjs`로 등록 완료.

## 7. 알려진 한계·남은 일
- 화면 검수(2026-10-13, 관리자 계정 `buylifemall@gmail.com`의 본인 키 사용): 업로드→분석→마스터 시트(표준 엔진)→영상 프롬프트(10초/없음, 8초/KR)→자르기·ZIP(9 JPG, 크롭 슬라이더 반영)→프로젝트 복원(`?p=`)→목록→삭제(저장소 정리), English 전환·모바일 폭(가로 넘침 없음)·비이미지 거절. 시험 데이터는 모두 삭제함.
- **미확인**: Pro 엔진(2K) 실제 생성, 일반 회원(`buylifemall@naver.com`) 계정 시험, 키 미등록 팝업의 실제 상태, 프로젝트 30개 한도 도달 메시지, 터치 기기.
- 장면 길이가 짧은 구간(0.5초)이 생길 수 있음(9컷을 5~8초에 넣는 경우) — 영상 AI 한 클립은 보통 5초 이상이므로 사용자가 장면을 묶어 쓰도록 안내 문구 보강 여지.
- 같은 폴더를 다른 CLI도 쓴다: 커밋은 경로를 지정(`git commit -- cinematic-storyboard-studio …`).

## 8. 작업 기록 (추가만)
- **2026-10-13 v1.01** 신규 구축·프로그램 등록·도메인 연결·테이블/버킷 마이그레이션 적용·첫 배포.
- **2026-10-13 v1.02** 시험 중 확인한 ZIP 파일명 문제 수정 시도(적용 누락) — 버전만 상승.
- **2026-10-13 v1.03** ZIP·이미지 저장 파일명을 40자로 줄임(로그라인이 그대로 파일명이 되던 문제). 썸네일 생성·등록(관리자 Gemini 키 1회 사용, 임시 파일 삭제).

## v1.04 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/storyboard/prompts.ts `yearNotice()`(영어)에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.04. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (cinematic-storyboard-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 크리에이티브 아틀리에 디자인 리뉴얼 & 비주얼 가이드 신설 — v1.06 (완료)
- **적용 템플릿**: **크리에이티브 아틀리에 스타일 (Creative Atelier Style, 시네마틱 아틀리에)**
- **단일 배경색 준수**: 전체 페이지(`/studio`, `/projects`, `/settings`, `/guide`) 동일한 딥 차콜 `#0b0f17` 배경색 일체화.
- **개발 플랜**: [`docs/PLAN_20261016_DESIGN_RENEWAL.md`](docs/PLAN_20261016_DESIGN_RENEWAL.md)
- **개선사항 목록**: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- **개선사항 인수인계**: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](docs/IMPROVEMENT_HANDOFF_20261016.md)
- **디자인 완료 인수인계**: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- **검수**: Microsoft Edge 전용 (`msedge.exe`) 실세션 테스트 계정(`buylifemall@naver.com`) 검증 완료 (데스크톱 및 모바일 8종 캡처 확인).

## 2026-10-17 로그인/회원가입 표준 2탭 레이아웃 개편 — v1.07 (cinematic-storyboard-studio)
- **개선 내용**:
  - 기존 구형 화이트 박스 로그인 화면으로 인한 테마 불일치를 해소하고 시네마틱 아틀리에 스타일(`bg-[#0b0f17]` 딥 차콜 + 24px 앰버 모눈 격자, 카드 다크 글래스모피즘 `#0e1422`/90)로 전면 통일.
  - `threads-comment-reply` 표준 규격에 맞춘 `[로그인]` / `[회원가입]` 2탭 세그먼트 토글 컨트롤(앰버-오렌지 그라디언트 활성 탭) 탑재.
  - 헤더 안내의 잘못된 타 프로그램 복사 문구를 정정하고, 오래된 회원가입 URL을 `https://aimaster.buylife.xyz/signup`으로 최신화.
  - 메일/자물쇠 아이콘(42px 패딩), 우측 비밀번호 찾기 링크, 회원가입 모드 전환 시 단일 계정 안내 박스 및 혜택 3종 체크리스트, CTA 링크 버튼 배치.
- **버전 동기화**: `src/lib/version.ts`, `package.json`, Supabase DB `programs.version = 'v1.07'` 동기화 완료.
- **실세션 검수**: Microsoft Edge (`msedge.exe`) 전용 실세션 캡처 3종 검수 완료 (`edge_cinematic_login_desktop_v107.png`, `edge_cinematic_signup_desktop_v107.png`, `edge_cinematic_login_mobile_v107.png`).



## v1.08 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/storyboard/types.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-18 v1.09 — 이미지 생성 호출을 공용 기준 코드로 (이미지 4묶음 B · SDK 사용형, Claude Code 윈도우)
- **한 일**: `src/lib/gemini.ts` `generateImage`를 공용 호출로. 렌더 라우트 한도 300초 → 시간 제한 240초. 공용 오류는 기존 `explainError` 문구(Pro 결제 권한 안내 포함)로 연결, 시간 초과는 공용 안내.
- **왜**: ① SDK 호출에 시간 제한이 없어 Vercel 함수 한도에서 원인 모를 끊김(요금은 나갔을 수 있음) ② 응답의 첫 이미지만 꺼내 `gemini-3-pro-image`의 중간 초안(thought) 이미지를 결과로 쓸 위험 ③ 영어 오류 문장을 정규식으로 추측해 분류 — 공용 모듈은 시간 제한·최종 이미지 선택·상태 코드별 오류 구분·키 가리기·시간 초과 표준 안내(Google AI Studio 사용량 확인)를 갖췄다.
- **바꾸지 않은 것**: 프롬프트·모델 이름·비율·화질·화면·글 생성 호출(SDK 그대로). 유료 생성이라 재시도 0(이중 과금 방지).
- **검수**: tsc 0, 프로그램 테스트(15개 통과), `check-shared-modules` OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. eslint는 이 폴더에 설정 파일이 없어(이전부터) 실행 안 됨. 실제 이미지 생성 시험은 하지 않음(비용) — 오류가 나면 그때 검증.
- **주의(다음 CLI)**: `src/lib/geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 이 프로그램만 다르게 해야 하면 호출하는 쪽에서 덮어쓴다. 점검표: 루트 `docs/SHARED_MODULE_CHECKPOINTS.md`.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 Claude Code(윈도우) — 카테고리 이동(DB 값만)
- 주인님 결정(데이터수집|기획 병합 분석 보고서 §5)으로 `programs.category_id`를 「데이터수집|기획」 → 「이미지」(`b5cec438-a6cc-43e5-83bc-59368f8a2c4d`)로 바꿈. 코드·버전 변경 없음(v1.09 유지, 원칙 22: DB 값만 바꾼 작업은 버전을 올리지 않음).
- 백업: `D:\Antigravity\AIMaster_backup\category-move-20261021\cinematic-storyboard-studio_before.json`. 확인: 메인 「이미지」 카테고리에 노출, 「데이터수집|기획」에서 빠짐(크롬).

## 2026-10-22 v1.10 — 30일 자동 삭제 cron + 동시 렌더 덮어쓰기 방지 (Claude Code 윈도우, 이미지 재비교 W3)
- **30일 자동 삭제**(최상위 규칙 — 그동안 30개 상한만 있었음): `src/app/api/cron/cleanup/route.ts`(생성일 30일 지난 `storyboard_projects` → 프로젝트 폴더 파일 먼저, 행 다음), `vercel.json` cron `0 18 * * *`(03:00 KST), `CRON_SECRET` Production 등록(루트 `.env.local`과 같은 값, 비어 있으면 401).
- **동시 렌더(D-02-01)**: ① 렌더 시작 때 `claimProject`(읽은 `updated_at`이 그대로일 때만 새로 찍음)로 선점 → 같은 프로젝트에 동시에 들어온 두 번째 렌더는 **유료 생성 전에 409**. ② 결과는 매번 새 이름 `master-<시각>.jpg`로 올리고, 선점 값이 그대로일 때만 DB 반영(중간에 다시 분석 등으로 바뀌면 새 파일을 지우고 409). ③ 성공하면 옛 마스터 파일 삭제. 공용 함수 `src/lib/projects.ts`의 `newMasterPath`·`claimProject`·`removeProjectFolder`.
- 프로젝트 삭제도 `removeProjectFolder`로 폴더째 비움(이름이 바뀐 마스터까지). 마스터 파일을 쓰는 곳은 모두 `master_path` 값을 읽어 이름 변경 영향 없음.
- 검수: tsc 0, 시험 18개(새 `tests/renderCleanup.test.mjs` 3개 — 선점이 유료 생성보다 먼저·조건부 저장·정리 비밀값/생성일/예약), build, 배포 `cinematic-storyboard-studio-ow3kgjmgf` Ready, DB v1.10. 정리 작업 비밀값 없이 401·비밀값으로 200(30일 지난 프로젝트 0개라 지운 것 0), 로그인 없는 렌더 401, 크롬(시험 회원) v1.10·목록 API 200.
- 미확인(비용): 실제 동시 렌더 재현(유료 생성 2회 필요) — 정적 시험으로 순서만 검증. D-02-02(프로젝트·참조·마스터 만료 함께 추적)는 폴더째 삭제로 대부분 해소.

## 2026-10-22 v1.11 — AI 바나나 캔버스 결과를 참고 이미지로 받기 (Claude Code 윈도우, 이미지 재비교 L5)
- `/studio?src=<바나나 서명 주소>`: 새 `src/lib/importSource.ts`(`banana-canvas-files` 서명 주소만), `StudioWorkspace.tsx`가 브라우저에서 받아 직접 고른 파일과 같은 `pickFile`로 미리보기에 넣음(서버 업로드는 지금처럼 [스토리보드 생성] 때). 성공 안내(`role=status`). 서버 코드 변경 없음.
- 검수: 시험 19개(새 `tests/importSource.test.mjs`), build, 배포 `cinematic-storyboard-studio-o8wyi0zvi` Ready, DB v1.11. 크롬(시험 회원): 바나나 버킷 시험 그림 → 참고 이미지로 들어옴·안내 표시, 생성은 안 누름, 시험 그림 삭제.
- 남은 일: AI 이미지 스튜디오 결과 받기는 다른 세션의 이미지 스튜디오 작업 뒤 `IMPORT_SOURCES`에 `ai-image-generations` 추가 + 보내는 버튼.

## ✅ v1.12 배포 (2026-10-22, Claude Code 윈도우) — 보낸 곳 안내·돌아가기(`?via=`)
- 바나나 「🎬 스토리보드로」로 넘어올 때 `?via=banana-canvas`가 붙으면, 참고 이미지 안내 끝에 「↩ 바나나 캔버스로 돌아가기」(`data-via-back`). 이름표는 공용 사본 `src/lib/linkMark.ts`(공용 기준 코드 `link-mark`, 기준 바나나 — 직접 고치지 않음). 보낸 곳 저장은 하지 않음(프로젝트 표에 칸이 없어 DDL이 필요 — 주인님이 「안내 표시만」 선택).
- 검수: 시험 20개, tsc·빌드. 크롬 화면 검수는 로그인 세션 문제로 미확인.

## ✅ v1.13 배포 (2026-10-22, Claude Code 윈도우) — 보낸 곳을 프로젝트에 저장
- 운영 DB `storyboard_projects`에 `source text`(빈 값 허용) 칸 추가 — `supabase/migrations/0003_project_source.sql`, 2026-10-22 크롬 SQL 편집기로 적용(ref `esgxyikcnnvmlhygjkth`).
- 바나나 「🎬 스토리보드로」(`?via=banana-canvas`)로 받은 참고 이미지로 프로젝트를 만들면 화면이 `source: importVia.key`를 보내고, `POST /api/projects`가 공용 `link-mark` 이름표(`viaSource`)에 있는 값만 **프로젝트를 만든 뒤 따로** 저장한다 — 칸이 없는 DB(설치 키트 등)에서 실패해도 만들기는 성공(ERROR_LESSONS 2026-10-22 「운영 DB에 칸을 추가하면 설치 키트에서 저장 실패」 대응).
- 직접 파일을 고르면(`pickFile(file)`) 바나나 안내·보낸 곳을 지운다(`fromImport` 인자). 돌아가기 문구는 이름표의 `back`(조사까지 맞춤).
- 메인 관리자 연계 카드에 「바나나 → 스토리보드 · 넘김 → 만든 프로젝트 → 완성 이미지까지」 한 줄.
- 검수: 시험 21개, tsc·빌드. 크롬: 운영 v1.13에서 바나나 서명 주소 + `via=banana-canvas`로 열어 안내·「↩ 바나나 캔버스로 돌아가기」(→ 바나나 `/history`) 확인. 실제 프로젝트 만들기 뒤 `source` 저장은 회원 데이터가 생겨 화면 시험 안 함(코드 시험으로 고정) — 다음 실제 사용 때 DB로 확인.

## ✅ v1.14 배포 (2026-10-22, Claude Code 윈도우) — AI 4컷 만화 완성작도 참고 이미지로
- `src/lib/importSource.ts` 허용 목록에 `four-cut-comics-files`(AI 4컷 만화) 추가. 4컷 「🎬 스토리보드로」(`?via=four-cut-comics`)로 오면 안내·「↩ AI 4컷 만화로 돌아가기」, 프로젝트를 만들면 `source='four-cut-comics'`(v1.13 흐름 그대로). 관리자 카드 스토리보드 줄에 「4컷 만화 → 만든 프로젝트 → 완성 이미지까지」.
- 검수: 시험 22개, tsc·빌드. 크롬 화면은 로그인 세션 종료로 미확인.

## ✅ v1.15 배포 (2026-10-22, Claude Code 윈도우) — AI 인물사진 서버 보관 사진도 참고 이미지로
- `src/lib/importSource.ts` 허용 목록에 `portrait-photo-files`(AI 인물사진). 기존 시험의 「인물사진 주소는 거절」 기대값을 「AI 인물사진」으로 바꿈(시험은 유지). 보낸 곳 `via=portrait-photo` → 「↩ AI 인물사진으로 돌아가기」·`source='portrait-photo'`(v1.13 흐름).
- 검수: 시험 23개, tsc·빌드. 크롬 화면은 인물사진 보관 사진이 없어 미확인(코드 시험으로 고정).
