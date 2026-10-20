# 개발 플랜 겸 인수인계 — 병합 D: AI 유튜브 썸네일 프로 → AI 썸네일 마스터 (2026-10-20, Claude Code 윈도우)

> **다른 CLI가 이어받을 때 이 문서부터 읽는다.** 진행 상태는 맨 아래 「8. 진행 상황」 표가 기준이다.
> 근거: `../../docs/analysis-youtube-consolidation-20261020/REPORT.md`(표 https://claude.ai/artifact/7Ad6WiRz8ykhuXTZ9PYCqx). 같은 방식으로 끝낸 병합 C: `../../youtube-viral-studio/docs/PLAN_20261020_MERGE_C_CONSULTANT.md`(3단계 방식·스크립트·문서 갱신 목록 참고).

## 0. 주인님 지시·결정
- 2026-10-20 병합 C 완료 후 「진행해줘」 → 병합 D 착수. 이름 후보 「AI 유튜브 썸네일·SEO 자동화」(최종 이름은 2단계 전 주인님 확인 — 병합 C 때 「너무 길어」로 짧게 바꾼 전례 있음, 짧은 후보 「AI 썸네일·SEO 마스터」도 함께 제시).
- 요금·권한 그대로, **회원 본인 계정·본인 API 키 최상위 규칙 유지**. 다른 CLI가 이어받을 수 있게 인수인계 문서로 남길 것.

## 1. 대상
| 구분 | 기준(남는 앱) | 들어오는 앱 |
|---|---|---|
| 프로그램 | AI 썸네일 마스터 자동화 `thumbnail-master` v1.07 · new | AI 유튜브 썸네일 프로 `seo-thumbnail-pro` v1.11 · new |
| 주소 | https://thumbnail-master.buylife.xyz | https://seo-thumbnail-pro.buylife.xyz |
| 구조 | 여러 화면(`/dashboard`·`/project/[id]`·`/settings`·`/guide`·`/setup`·`/open`) + **서버 API**(`/api/strategy`·`/api/generate`·`/api/edit`·`/api/projects`·`/api/keys`), 프로젝트 DB `thumbnail_master_projects` + 이미지 버킷 | **한 화면**(`/` → `components/Workspace.tsx`), API는 `/api/user/key`뿐, **AI를 브라우저에서 직접 호출**(`src/lib/gemini.ts`) |

기준을 마스터로 한 이유: 서버에서 회원 키로 호출(키가 브라우저로 나가지 않음), 프로젝트 저장·버전, 타겟·브랜딩, 이용 권한 확인이 갖춰짐.

## 2. 조사 결과 (2026-10-20 확인)
- **프로의 문제(병합으로 해소)**: ① `GET /api/user/key`가 회원 Gemini 키 **원문을 브라우저로 내려보내고** 브라우저 `localStorage`에도 보관(`Workspace.tsx` 77·86·94행) ② 키 조회·저장 API가 `getUser()`(로그인)만 확인하고 **프로그램 이용 권한(`checkProgramAccessApi`)을 확인하지 않음**(루트 CLAUDE.md 멀티테넌시 원칙 1) ③ 텍스트 모델 예비 목록에 종료 예정 `gemini-1.5-flash`(`gemini.ts` 92행).
- **옮길 핵심(프로 `src/lib/gemini.ts` 312줄)**: `generateStrategies(apiKey, script)` — 대본 → 호기심/가치/스토리 3전략 × (제목·SEO 설명·해시태그·스튜디오 태그 500자·고정 댓글) + 공통 메타데이터(당해 연도·한국 시간 규칙 포함), `analyzeSeoData(...)` — 이미 올린 영상 메타데이터 역분석·개선안, `buildThumbnailPrompt`·`generateThumbnailImage` — 전략별 16:9 썸네일 1장(마스터의 이미지 생성과 겹침 → 마스터 것 사용).
- **프로 화면 부품**: `SettingsColumn`(입력, 331줄)·`StrategyColumn`(전략 표시, 341)·`ResultColumn`(결과, 204)·`Workspace`(394)·`GuideModal`(259)·`ApiKeyModal`(145, 병합 후 불필요)·`FullscreenModal`·`Header`.
- **마스터 AI 구조**: `src/lib/gemini.ts`(`TEXT_MODELS` = gemini-3.5-flash·2.5-flash, `IMAGE_MODELS`, `toUserError`, `makeStrategy`, `makeImage`), `src/lib/aiRoute.ts`(API 공통 처리), `src/lib/tmb/{prompts,strategy,audience,types,validate}.ts`. **새 API는 `/api/strategy/route.ts`(24줄) 패턴 그대로** 만든다.
- **DB**: 프로는 결과를 저장하지 않음 → 1·2단계는 **DB 구조 변경 없음**(SEO 결과는 화면에서 복사·내보내기). 저장이 필요하면 별도 승인(스키마 변경).
- **키**: 둘 다 `user_api_keys`의 `gemini` → 회원 재등록 불필요.
- **이용 권한**: 마스터 143명, 프로 148명, 공통 143명, **프로에만 5명** → 3단계에서 이 5명에게 마스터 권한을 프로와 같은 `expires_at`으로 부여(관리자 권한 부여와 같은 방식, `user_program_access`, 백업 후). 구독 두 앱 모두 0.
- 외부 등록 주소(OAuth·웹훅) 없음. 두 폴더 미커밋 변경·다른 CLI 작업 없음(2026-10-20 확인).

## 3. 단계
### 1단계 — SEO 전략 기능 이식 (마스터 v1.08)
1. 서버 함수: 프로 `generateStrategies`·`analyzeSeoData`의 프롬프트·결과 형식을 마스터 `src/lib/seo/seoStrategy.ts`로 옮기고, 호출부는 마스터 `gemini.ts`의 텍스트 모델 목록(`TEXT_MODELS`)·오류 변환(`toUserError`)을 쓰게 바꾼다(옛 `gemini-1.5-flash` 제거, 키를 URL 쿼리에 넣지 말고 마스터 방식 그대로).
2. API: `/api/seo/strategy`(대본 → 3전략), `/api/seo/analyze`(역분석) — `/api/strategy/route.ts`처럼 `checkProgramAccessApi` + 회원 본인 `gemini` 키(없으면 등록 안내), `dynamic`·`fetchCache` 두 줄.
3. 화면: `/seo`(「SEO 전략」) — 대본 입력(txt·md 업로드 포함) → 3전략 카드(제목·설명·해시태그·태그·고정 댓글, 항목별 복사) → 「이 전략으로 썸네일 만들기」(전략 제목·후킹 문구를 주제로 새 마스터 프로젝트 생성 → `/project/[id]`) + 역분석 탭. 프로 `StrategyColumn`·`SettingsColumn`의 표시 구조를 참고하되 마스터 디자인 토큰으로.
4. 좌측 메뉴/대시보드에 「SEO 전략」 추가.
5. 검수: tsc·build·기존 테스트, 배포, 크롬(관리자)에서 SEO 전략 1회 생성(**유료 Gemini 텍스트 1회 — 최저가 모델로 1회만**, 비용 규칙), 썸네일 만들기 연결은 프로젝트 생성까지만(이미지 생성은 생략 가능).
### 2단계 — 이름·매뉴얼·대시보드 (v1.09)
- 이름(주인님 확정값), 매뉴얼에 SEO 전략 단계·프로 `GuideModal` 내용 합치기, 공지 띠 사본(`program-notice-banner`) 함께(배포 누락 방지).
### 3단계 — 옛 프로 정리 (주인님 확인 후)
- 프로 `next.config.ts`: 화면 `/`→마스터 `/seo`, `/login`, API `/api/*` rewrite는 `/api/user/key`만 있으므로 **전달하지 않고 410/안내**도 검토(키 원문 반환 API를 남기지 않는 것이 안전 — 화면 redirect 후 이 API를 부를 곳이 없음). 참고 `../../youtube-channel-consultant/next.config.ts`.
- DB: 두 `programs` 줄 백업(`docs/analysis-youtube-consolidation-20261020/backup-programs-before-merge-d.json`) → 프로 `is_active=false`·[병합됨], 마스터 이름·소개 다시 쓰기, **프로에만 있는 5명 마스터 권한 부여**(백업 후), 메인 `next.config.mjs`에 `/programs/seo-thumbnail-pro` → `/programs/thumbnail-master`.
- 공용 점검 스크립트: 프로 폴더가 사본으로 등록된 항목(`image-file-check` 등 `scripts/check-shared-modules.mjs`에서 `seo-thumbnail-pro` 검색) 정리. 역량 지도·공용 기능 지도·DESIGN.md·HANDOFF. Vercel 프로젝트·도메인 삭제 안 함.

## 4. 비용
- 개발 시험: Gemini 텍스트 1~2회(회원 본인 키, 최저가 모델). 이미지 생성 시험은 생략(마스터 기존 기능). Vercel 빌드 단계마다 1회 + 3단계 옛 앱 1회.

## 5. 위험·주의
- 프로 프롬프트는 **프로그램 고유 내용 — 공용화하지 않고 마스터 안으로만 옮긴다**(이미지 프롬프트 규칙 `docs/IMAGE_PROMPT_RULES.md`).
- 회원 키를 브라우저로 내려보내는 코드를 마스터에 가져오지 않는다(`/api/user/key`·`ApiKeyModal`·`localStorage` 키 보관은 이식 대상 아님).
- 배포 직전 `docs/SHARED_MODULES.md` 「미배포 사본」 확인. 공용 문서는 다른 CLI 미커밋 내용이 있으면 내 줄만.
- 상세 교훈: `../../docs/ERROR_LESSONS.md` 2026-10-20 항목들.

## 6. 결과물(완료 시)
- 마스터 `AGENTS.md`·`README.md` 7대 항목, `docs/IMPROVEMENT_HANDOFF_<날짜>.md`, 프로 `AGENTS.md` 「병합됨」, 루트 `docs/HANDOFF.md`, 역량 지도.

## 7. 다음 첫 단계 (이어받는 CLI)
1. `docs/ACTIVE_WORK.md` 확인.
2. 주인님 플랜 확인 여부를 아래 표에서 확인(미확인이면 이 플랜을 보여 드리고 「진행」을 받는다).
3. 1단계 1번: 프로 `src/lib/gemini.ts`의 `generateStrategies`·`analyzeSeoData` 읽기 → 마스터 `src/lib/seo/seoStrategy.ts`로.

## 8. 진행 상황
| 날짜 | CLI | 한 일 | 상태 |
|---|---|---|---|
| 2026-10-20 | Claude Code(윈도우) | 병합 D 조사(구조·키 노출 문제·옛 모델·권한 겹침 143/프로만 5), 이 플랜 작성 | ✅ 분석·플랜 완료 / ⏳ **주인님 플랜 확인 대기, 코드 변경 없음** |
