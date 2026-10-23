# AI 썸네일 마스터 자동화 (thumbnail-master) — 작업 지침 및 인수인계 규격서

> 먼저 루트 `CLAUDE.md`·`AGENTS.md`·`GEMINI.md`·`docs/HANDOFF.md`를 읽습니다.
> 최신 배포 URL: [https://thumbnail-master.buylife.xyz](https://thumbnail-master.buylife.xyz)

---

## 1. 프로그램 사용 목적 및 대상
- **사용 목적**: 영상 주제나 대본을 입력받아 직관형(A안)과 호기심 유발형(B안) 전략 문구를 자동 도출하고, 고대비 폰트 및 감각적 그래픽이 결합된 유튜브 썸네일 2종을 한 번에 생성·편집·저장하는 유튜브 크리에이터 전용 자동화 솔루션.
- **주요 대상**:
  - 유튜브/쇼츠/릴스 크리에이터 및 채널 운영자
  - 영상 기획 및 디지털 마케팅 담당자
  - 클릭률(CTR) 개선 및 A/B 테스트가 필요한 콘텐츠 제작자
  - 시니어 및 고령층 맞춤형 고대비/대형 글꼴 썸네일이 필요한 제작자

---

## 2. 개발 구현 도구 / 기술 스택 / 스킬
- **프레임워크**: Next.js 16.4.0 (App Router, Turbopack)
- **라이브러리**: React 19.3.0, TypeScript 5.9.3, `@google/genai` 1.21.0, `sharp` 0.35.5
- **인프라 & 백엔드**: Supabase (PostgreSQL, Auth, Storage), Vercel 배포
- **디자인 시스템**: 크리에이티브 아틀리에 스타일 — 썸네일 매거진 변형 (딥 매거진 다크 `#0c0f17`, 카드 `#131722`, 악센트 바이올렛 `#8b5cf6`, 오렌지 `#f97316`)
- **브라우저 검수 도구**: Playwright (Microsoft Edge 전용, 화면 최전면 포그라운드 노출)

---

## 3. 핵심 기능, 시스템 아키텍처, 장점 및 단점

### 핵심 시스템 구조
- `src/lib/tmb/`: 전략 및 프롬프트 생성 순수 비즈니스 로직 (11개 단위 테스트 무결성 보장)
- `src/lib/gemini.ts`: 텍스트(`gemini-3.5-flash`), 이미지(`gemini-3-pro-image`, `gemini-nano-banana-2.1`) 듀얼 호출 파이프라인
- `src/lib/images.ts`: Sharp 기반 무손실 JPEG 변환 및 Supabase 비공개 버킷 서명 URL 발급
- DB 테이블: `thumbnail_master_projects` (RLS 회원 본인 격리, `images_a`, `images_b` 컬럼 분리로 동시 병렬 생성 충돌 방지)

### 장점
1. **A/B 듀얼 전략 동시 도출**: 단일 요청으로 직관형/호기심형 2가지 카피와 비주얼을 동시에 비교 검토 가능.
2. **시니어 및 타겟 맞춤형 모드**: 10대~시니어까지 4대 타겟에 최적화된 글자 크기 및 색상 대비 가이드 제공.
3. **무결성 CSS 토큰 격리**: 기존 레이아웃을 파괴하지 않고 `:root` 변수와 하단 덮어쓰기 방식으로 세련된 매거진 룩 완성.

### 단점 및 개선 여지
1. 이미지 인페인팅 미지원: 부분 영역 수정이 아닌 전체 재생성 방식이므로 프롬프트 기반 재생성 필요.
2. 모바일 프로젝트 편집 캔버스의 확대/축소 및 텍스트 미세 오버레이 조절 툴 부재.

---

## 4. 버전별 변경 히스토리
- **v1.07 (2026-10-18, Antigravity CLI)**:
  - 크리에이티브 아틀리에 — 썸네일 매거진 변형 디자인 리뉴얼 (`#0c0f17`, `#131722`, 바이올렛/오렌지 포인트).
  - 비주얼 가토리얼 가이드북 (`/guide`) 신설 보강 (히어로 배너, A/B 파이프라인, 스타일 칩 4종, 빠른 바로가기).
  - Microsoft Edge 최전면 포그라운드 실세션 6종 검수 완료 및 10분 화면 유지.
- **v1.06 (2026-10-18, Claude Code)**: 이미지 생성 공용 기준 코드 적용 (`gemini-nano-banana-2.1` 연동 최적화).
- **v1.05 (2026-10-17, Claude Code)**: 이미지 모델 최신화 (`gemini-3-pro-image`, `gemini-nano-banana-2.1`).
- **v1.04 (2026-10-16)**: 최상위 Supabase 데이터베이스 연동 변수 호환 작업.
- **v1.03 (2026-10-14)**: 모바일 반응형 셸 CSS 및 한국 현재 월 기준 프롬프트 주입.
- **v1.00 (2026-10-13)**: 최초 정식 릴리즈.

---

## 5. 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내용은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조.
- 캔버스 내 텍스트 스티커/뱃지 수동 추가 기능 (예: 'LIVE', '속보', '충격').
- 생성된 썸네일 히스토리 그리드에서 바로 유튜브 스튜디오 업로드 프리뷰 모달 연동.

---

## 6. 기존 타 자동화 프로그램과의 연계 / 기능 병합 제안
1. **`youtube-golden-engine` (유튜브 채널 컨설턴트) 연계**: 황금 키워드 및 영상 대본 도출 즉시 원클릭으로 썸네일 마스터 프로젝트를 생성하고 A/B 썸네일 제작 파이프라인으로 연결.
2. **`viral-finder` (바이럴 영상 발굴) 연계**: 실시간 떡상 썸네일의 구도와 텍스트 스타일을 분석하여 썸네일 마스터 프롬프트로 전송하는 프리셋 추출 기능.
3. **`ai-image-studio` (AI 이미지 자동화) 연계**: 레퍼런스 이미지 모델 어댑터 공유 및 고해상도 업스케일링 파이프라인 공유.

---

## 7. 사용자 편의성 증대를 위한 UI/UX 개선안
1. **실시간 CTR 예측 게이지**: AI가 텍스트 가독성, 피사체 시선 방향, 명도 대비를 계산하여 예상 CTR 점수(0~100점)를 시각화하는 위젯 도입.
2. **썸네일 폰트 프리셋 라이브러리**: 배달의민족 한나체, 여기어때 잘난체 등 유튜브 인기 폰트 스타일 텍스트 칩 제공.
3. **유튜브 다크모드/라이트모드 피드 프리뷰**: 실제 유튜브 모바일/데스크톱 검색 피드 화면에 썸네일을 합성해 보여주는 실전 모의 테스트 뷰.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 병합 D 준비 — AI 유튜브 썸네일 프로(seo-thumbnail-pro)를 이 앱 안으로 (Claude Code 윈도우, 플랜 확인 대기·코드 변경 없음)
- 플랜 겸 인수인계: [`docs/PLAN_20261020_MERGE_D_SEO_PRO.md`](docs/PLAN_20261020_MERGE_D_SEO_PRO.md) — SEO 전략 생성·역분석을 서버 API로 이식, 프로의 키 원문 브라우저 전달·권한 미확인 문제 해소, 프로에만 있는 회원 5명 권한 부여 필요.

## 2026-10-20 v1.08 — 병합 D 1단계: SEO 전략 이식 (Claude Code 윈도우)
- 썸네일 프로의 「대본 → A/B/C SEO 전략」을 **서버**로: `src/lib/seo/seoStrategy.ts`(프롬프트·결과 형식은 프로 그대로, 호출은 이 앱 `TEXT_MODELS`·`AiError`, 옛 `gemini-1.5-flash` 제거), API `/api/seo/strategy`(`guardAi` — 로그인·프로그램 권한·회원 본인 gemini 키, 키를 브라우저로 내보내지 않음), 화면 `/seo`(`components/seo/SeoStudio.tsx`: 대본·txt/md → 전략 3개 카드(제목·설명·해시태그·스튜디오 태그·고정 댓글·연출안 항목별 복사) + 종합 메타데이터, 「이 전략으로 썸네일 만들기」 = 기존 `POST /api/projects`로 제목·연출안을 주제로 새 프로젝트 → `/project/[id]`). 좌측 메뉴 「업로드 준비 › SEO 전략」. 스타일 `globals.css` `.seo-*`.
- **역분석(`analyzeSeoData`)은 옮기지 않음** — 프로 자체 썸네일 설정(장르·분위기)을 채우는 용도라, 이 앱의 「주제·타겟 → 전략」 단계와 겹침. 필요하면 「올린 영상 메타데이터 → 프로젝트 입력값 채우기」로 다시 설계.
- **공지 띠 미적용** — 이 앱은 Tailwind를 쓰지 않아 공용 `ProgramNoticeBanner`(Tailwind 클래스)가 맞지 않음(`docs/SHARED_MODULES.md` 기록).
- 검수: tsc, build(`/seo`·`/api/seo/strategy`), 테스트 11개.

## 2026-10-20 v1.09 — 병합 D 2단계: 이름 「AI 썸네일·SEO 자동화」·매뉴얼 (Claude Code 윈도우)
- 주인님 「AI 썸네일·SEO자동화 이걸로 해」 → `APP_NAME`(메뉴·로그인·브라우저 제목) 변경, slug·주소 그대로. 다른 프로그램 이름처럼 「SEO 자동화」 띄어 씀.
- 매뉴얼 `/guide`: 「⑥ SEO 전략으로 업로드 준비」 절(위치·결과 항목·썸네일로 이어 가기·저장 안 됨), FAQ 2개(옛 썸네일 프로 회원·비용), FAQ 번호 ⑦.
- 1단계 크롬 검수(2026-10-20, 관리자 로그인): `/seo`에서 영어 공부 아이디어로 3전략 생성 성공(관리자 본인 Gemini 텍스트 1회), 「이 전략으로 썸네일 만들기」 → 새 프로젝트 생성·주제 칸에 제목+연출안 채워진 `/project/[id]` 열림(이미지 생성은 안 함). 시험 프로젝트 1개 남음(관리자 계정).

## 2026-10-20 병합 D 3단계 완료 — 카탈로그 「AI 썸네일·SEO 자동화」 (Claude Code 윈도우)
- DB 이름·소개 갱신, 썸네일 프로 노출 중지·옛 화면 이동(키 API 410), 프로에만 권한이 있던 5명에게 같은 사용기간으로 이 프로그램 권한 부여. 상세 플랜 §8.

## 2026-10-22 v1.10 — AI 쇼츠 원스톱 대본 받기(「SEO 전략」) (Claude Code 윈도우)
- 플랜 `../shorts-onestop-studio/docs/PLAN_20261022_SCRIPT_TO_THUMBNAIL.md`(주인님 승인).
- 공용 `reference-copy-guard` 4번째 사본 `src/lib/reference.ts`(기준 `shorts-onestop-studio/src/lib/reference.ts`, 직접 고치지 말고 `--sync`) — 넘기기 형식 `#ref-transcript=…&ref-from=이름`만 사용.
- `src/lib/refHandoff.ts`(새, 탭 저장소 키 `thumbnail-ref-handoff`): 로그인 양식이 열릴 때 보관·주소 `#` 지움, 로그인 뒤 보관분 있으면 `/seo`(없으면 예전처럼 `/open`). `SeoStudio.tsx`: 대본 칸 채움(30,000자) + 「📥 「○○」에서 넘긴 대본을 넣었습니다…」, 주소 `#` 지움. AI 호출은 회원이 「SEO 전략 3가지 만들기」를 눌러야 함.
- 검수: tsc, `npm test` 13개(`tests/refHandoff.test.mjs` 2개 추가), 배포 `thumbnail-master-gl0dxb9ah` Ready, DB v1.10. 크롬: 시험 주소·원스톱 실제 링크 클릭 둘 다 대본 칸·안내 확인. 못 한 것: 로그아웃 상태에서 로그인을 거쳐 오는 흐름(비밀번호 입력은 주인님 몫).

## 2026-10-22 v1.11 — 「SEO 전략」 대본을 썸네일 제작 참고 문서로 자동 첨부 · 쇼츠 바이럴 대본 받기 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_SEO_DOC_AND_SOURCES.md`(주인님 승인).
- `src/lib/refHandoff.ts`: `stashSeoDoc(프로젝트 id, {name, text})`·`takeSeoDoc(id)`(탭 저장소 키 `thumbnail-seo-doc:<id>`, 꺼내면 지움). `SeoStudio.tsx`: 「이 전략으로 썸네일 만들기」로 프로젝트를 만든 직후 대본 보관(넘겨받은 대본이면 이름 「○○ 대본」). `Studio.tsx`: 처음 열 때 꺼내 참고 문서 칩(「대본 문서 올리기」 옆, ✕)으로 붙이고 안내. 새로 고침하면 사라지는 점은 파일로 올린 참고 문서와 같음(저장하지 않음).
- 받는 쪽 추가: 쇼츠 바이럴 v1.15 「📤 썸네일 만들기」(`ref-from=쇼츠 떡상 분석·대본 자동화`).
- 검수: tsc, `npm test` 14개(1개 추가), 배포 `thumbnail-master-nk3x4o5aa` Ready, DB v1.11. 크롬(시험 회원): 쇼츠 바이럴 「여행」 프로젝트 12씬 대본 → 링크 클릭 → `/seo` 대본 915자·안내 → 「SEO 전략 3가지 만들기」(Gemini 1회, 시험 회원 키) → 전략 A 「이 전략으로 썸네일 만들기」 → 제작 화면 참고 문서 「쇼츠 떡상 분석·대본 자동화 대본 · 0.9K자」·안내 확인. 「전략 생성」(A/B 문구)은 누르지 않음. 시험 회원 썸네일 프로젝트 1개(`b725bfeb-…`)가 회원 본인 데이터로 남음.

## 2026-10-22 v1.12 — 참고 문서를 프로젝트와 함께 저장 · 「SEO 전략」 출처 표시 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_SAVE_DOC_ORIGIN.md`(주인님 승인). DB 칸 추가 없음(`inputs` jsonb 안).
- `src/lib/tmb/types.ts` `RefDoc`·`Inputs.doc?`·`Inputs.origin?`. `src/lib/tmb/validate.ts` `cleanInputs`가 `doc`(글 있을 때만, `cleanDocText` 30,000자, 이름 80자)·`origin`(60자)을 지킴.
- `Studio.tsx`: 참고 문서를 `inputs.doc`에서 읽고 씀 → 자동 저장(PUT)으로 저장, 다시 열어도 그대로, ✕는 지움. 1단계 제목 아래 「🔗 ○○에서 시작한 프로젝트」. `SeoStudio.tsx`: 프로젝트를 만들 때 `inputs.doc`(대본)·`inputs.origin`(「SEO 전략 A · 호기심 유발형」)을 바로 실음. v1.11 탭 저장소 경유 함수 삭제(같은 동작을 저장으로 대체).
- 검수: tsc, `npm test` 14개(`cleanInputs` doc·origin 시험 추가, v1.11 보관 시험 삭제), 배포 `thumbnail-master-f965hqdwx` Ready, DB v1.12. 크롬(시험 회원, AI 0회): SEO 화면과 같은 요청으로 프로젝트 생성 → 제작 화면 전략 표시·참고 문서 칩 → 새로 고침 뒤 유지 → ✕ → 「저장됨」 → 새로 고침 뒤 문서 없음·전략 표시 유지. 시험 프로젝트 `019916f5-…`가 회원 본인 데이터로 남음. 못 한 것: 파일 올리기로 붙인 문서 저장(같은 `setDoc` 경로라 코드로만 확인).
- 발견: 참고 문서 칩 글자 수가 `(길이/1000).toFixed(1)K자`라 짧은 대본은 「0.0K자」 — `docs/IMPROVEMENTS.md`.

## 2026-10-22 v1.13 — 세로 9:16(쇼츠·릴스 표지) · 목록 출처 표시 · 참고 문서 글자 수 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_VERTICAL_RATIO.md`(주인님 승인).
- `types.ts` `Ratio`·`Style.ratio`(기본 「16:9」, `EMPTY_INPUTS`), `validate.ts` `cleanInputs`가 「9:16」만 허용·`charsLabel`. `gemini.ts` `makeImage(…, ratio)` → `imageConfig.aspectRatio`. `prompts.ts` `ratioLine`(세로: 쇼츠·릴스 표지, 위 15%·아래 20% 피해 가운데)·`editPrompt(instruction, ratio)`. `/api/generate`는 보낸 입력값, `/api/edit`는 저장된 입력값의 비율 사용. `Studio.tsx` 해상도 옆 「화면 비율」, 세로 결과 칸 높이 제한, 칩 글자 수. `GET /api/projects` 출처·비율만 읽어 `ProjectList` 카드에 「🔗 …」·「세로 9:16」.
- 검수: tsc, `npm test` 15개(비율·프롬프트·글자 수 시험 추가), 배포 `thumbnail-master-3gw3s1d3h` Ready, DB v1.13. 크롬(시험 회원): 목록(`/dashboard`)에 「🔗 SEO 전략 B · 가치 제안형」, 「프랑스 신사…」 프로젝트 「전략 생성」(Flash 1회) → 「화면 비율」 세로 9:16·1K 선택·저장 확인 → A안만 `/api/generate` 1회 → **768×1376(≈9:16), gemini-3-pro-image, 22초**. 못 한 것: 새로 고친 뒤 로그인이 풀려(로그인 화면, 비밀번호는 입력하지 않음) 세로 결과 칸 모양을 화면으로 보지 못함 — 다음 확인 때 주인님 로그인 뒤 같은 프로젝트(`b725bfeb-…`) 3단계 결과 칸 확인.
- 비용: 빌드 1회, Gemini 전략 1회(약 $0.01 이하)·이미지 1회(3 Pro Image 1K 약 $0.13), 시험 회원 본인 키.

## 2026-10-22 v1.14 — 세로 9:16 문구 전략 짧게 · 세로 목록 표지 전체 보이기 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_VERTICAL_COPY.md`(주인님 승인).
- `src/lib/tmb/prompts.ts` `verticalCopyRule(ratio)`를 `strategySystem` 공통 규칙 아래에 넣음(세로만, 가로는 빈 줄). `ProjectList.tsx` 세로 카드 `tm-cover--v`, `globals.css` `.tm-cover--v img{object-fit:contain}`.
- 검수: tsc, `npm test` 16개(세로/가로 지침 시험 추가), 커밋 `5c294037d`, 배포 `thumbnail-master-187xas2t8` Ready, DB v1.14. 크롬(시험 회원): 목록 세로 카드 `contain`으로 이미지 전체 보임. 「프랑스 신사…」(`b725bfeb-…`, 9:16) 「전략 새로 만들기」 1회(Flash) — A 「시골 할머니집 3일 잔치 / 단 72시간 만에 +4kg 달성」→「3일 만에 +4kg?! / 프랑스 사돈의 폭풍 먹방」, B 「프랑스 신사가 비명 지른 이유 / 체중계 폭발시킨 K-할머니의 고봉밥」→「벨트 터진 진짜 이유 / 할머니 밥상에 기절한 사돈」. v1.13에서 못 본 3단계 세로 결과 칸도 확인(360×640, 768×1376 이미지 전체 표시).
- 한계: 서브 문구는 띄어쓰기 포함 12~13자로 「10자 이내」를 조금 넘음(AI 지시라 강제 아님). 이미지(A안)는 다시 만들지 않아 예전 문구가 그대로 들어 있음.
- 비용: 빌드 1회, Gemini 전략 1회(Flash, 약 $0.01 이하), 시험 회원 본인 키. 이미지 0회.

## 2026-10-22 v1.15 — 세로 문구 길이 안내 · 결과 칸 「문구가 바뀌었습니다」 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_COPY_HINTS.md`(주인님 승인).
- `src/lib/tmb/strategy.ts` `mainWarning(main, ratio)`(세로: 4단어·띄어쓰기 뺀 12자), `subWarning(sub, ratio)`(세로만 10자), `textChanged(ver, now)`. `types.ts` `ImageVersion.main?/sub?`, `images.ts` `cleanSet` 유지, `/api/generate`가 문구 기록, `/api/edit`는 원본 문구 이어받음. `Studio.tsx` 서브 칸 아래 안내, 결과 칸 「문구가 바뀌었습니다」.
- 검수: tsc, `npm test` 17개(길이 안내·문구 비교 시험 추가), 커밋 `519739bed`, 배포 `thumbnail-master-up7rqjvnl` Ready, DB v1.15. 크롬(시험 회원, AI 0회): 「프랑스 신사…」(9:16) B안 서브 「할머니 밥상에 기절한 사돈」(11자)에만 안내, A안 「프랑스 사돈의 폭풍 먹방」(10자)은 없음. 결과 칸 표시는 예전 이미지라 문구 기록이 없어 안 뜸(의도) — 다음 이미지 생성 때 화면 확인 필요.
- 비용: 빌드 1회, AI 0회.

## 2026-10-22 v1.16 — 원래 문구 표시 · 세로 길이 확인 창 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_COPY_COMPARE.md`(주인님 승인).
- `src/lib/tmb/strategy.ts` `changedTextLine`·`lengthConfirmText`, `Studio.tsx` 결과 칸 비교 한 줄·「2종 생성」 전 확인 창.
- 검수: tsc, `npm test` 18개, 커밋 `b9d6480de`, 배포 `thumbnail-master-217geow2b` Ready, DB v1.16. 크롬(시험 회원, AI 0회): 「프랑스 신사…」(9:16)에서 「썸네일 2종 다시 생성」 → 확인 창 문장 확인, 취소 시 `/api/generate` 0건. 결과 칸 비교 한 줄은 예전 이미지(문구 기록 없음)라 화면 미확인 — 다음 이미지 생성 때 확인.
- 비용: 빌드 1회, AI 0회.

## 2026-10-22 v1.17~v1.18 — 세로 결과에 릴스 표지 안내 링크 (Claude Code 윈도우)
- 플랜 `docs/PLAN_20261022_REELS_COVER_LINK.md`(주인님 승인). `Studio.tsx` `SHOTS_POSTING_URL`(https://shots.buylife.xyz/videos) — 세로 9:16·이미지 있을 때만 결과 칸 안내 + 「릴스 표지로 쓰기 ↗」(새 창). YOUTUBE Shots 자동화 v1.35 릴스 표지 올리기와 연결.
- v1.17 커밋 `aca079447` 배포 `thumbnail-master-2tlwl5gv2`. 크롬에서 링크가 설명 글과 같은 색·밑줄 없음 발견 → v1.18 `1c1d63637` 배포 `thumbnail-master-q9xblcqq0`(브랜드 보라·밑줄·굵게, 계산값 rgb(139,92,246)·underline·600 확인). DB v1.18.
- 검수: tsc, `npm test` 18개, 크롬(시험 회원) 「프랑스 신사…」 A안(이미지 있음)에만 안내·링크, B안(없음)은 없음.
- 비용: 빌드 2회(v1.17·v1.18 — v1.18은 주인님 추가 승인), AI 0회.

## 2026-10-22 미배포 대기 — 세로 결과 쇼츠 표지 안내 (Claude Code 윈도우)
- 커밋 `de99b1ca9`(버전 v1.18 그대로). 내용·근거·다음 배포 때 할 일: `docs/IMPROVEMENTS.md` 「미배포 대기」 줄. 배포하지 않은 이유: 2026-10-22 23:17 주인님 배포 지침(작은 소스 수정은 모았다가 배포).

## 2026-10-22 v1.19 — 프로젝트 30일 자동 삭제(크론) + 쇼츠 표지 안내 배포 (Claude Code 윈도우)
- 최상위 규칙(생성 데이터 30일 삭제) 미처리 P1 해소. `src/lib/tmb/retention.ts`(순수: 기준 시각·이미지 경로·회원별 개수), `GET /api/cron/cleanup`(`CRON_SECRET` — 2026-10-22 주인님 승인으로 운영 환경변수 새로 추가, 민감 값), `vercel.json` 크론 `50 18 * * *`(03:50 KST). 만든 지 30일 지난 프로젝트의 이미지 폴더(`<회원>/<프로젝트>/`, 기록에 없는 남은 파일 포함)를 지우고 행 삭제 → 회원별 `usage_logs` `cleanup_expired`(metadata `projects`·`images`, YOUTUBE Shots와 같은 이름). `?dry=1` 미리보기.
- 함께 배포: 미배포 대기였던 쇼츠 표지 안내(`de99b1ca9`).
- 검수: tsc·`npm test` 19개·build, 커밋 `85aff6a76`, 배포 `thumbnail-master-igdw03s0t` Ready, DB v1.19, `vercel crons ls` 등록 확인, 정리 경로 비밀값 없음·틀림 401, 30일 지난 프로젝트 0건(가장 오래된 2026-10-13 → 첫 실삭제 2026-11-12 무렵). 크롬(시험 회원) 세로 결과에 릴스·쇼츠 안내와 링크 2개 확인.
- 비용: 빌드 1회, AI 0회, 환경변수 1개 추가.
