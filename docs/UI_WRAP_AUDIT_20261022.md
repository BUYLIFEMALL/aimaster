# 좁은 칸 버튼·문구 줄바꿈/잘림 전수 점검 (2026-10-22, Claude Code 윈도우)

> 계기: 메인 카탈로그 카드 하단 줄바꿈(`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md` 2026-10-22) → 주인님 「다른 서브프로그램 카드들도 같은 문제 있는지 점검」. 기준 규칙: `DESIGN.md` 최상위 원칙 19번.
> **점검만 함 — 코드 수정 없음.** 수치는 코드에서 계산한 추정(글자 크기별 한글 폭·여백·아이콘), 브라우저 실측은 아님. 수정 착수 시 프로그램마다 실제 화면(데스크톱 최소 폭 + 390px)으로 확인한다.

## 점검 방법
1. 정적 검사(저장소 전체 `.tsx/.jsx`, `node_modules`·`labs`·`extension` 제외): `flex … justify-between` 줄 안에 버튼/링크 2개 이상 + 한글 라벨 2개 이상이 있고 `whitespace-nowrap`·`flex-wrap`·`shrink-0`·`truncate`가 하나도 없는 곳 → **54곳**.
2. 위치마다 감싸는 폭(그리드 열·모달 최대 폭·사이드바)과 가장 긴 라벨 경우의 필요 폭을 비교해 등급을 매김.

## 결과 요약
| 등급 | 건수 | 뜻 |
|---|---|---|
| HIGH | 34 | 보통 화면 폭에서 꺾이거나 잘림(데스크톱에서도 약 10건, 나머지는 390px 휴대폰) |
| MEDIUM | 7 | 360px 이하 등 경계 폭에서만 |
| LOW | 10 | 폭이 넉넉함 — 그대로 둬도 됨 |
| FALSE / N/A | 3 | 같은 줄이 아니거나 미사용·미배포 파일 |

## A. 설정 화면 「API 키 한 줄」 `ApiKeyRow`·`CronjobKeyRow` (24곳)
- 공통 구조: 머리줄 = 라벨 `<p>` + `flex gap-3`(「수정」「삭제」 text-xs). 키가 등록된 상태에서만 버튼이 보임. nowrap/shrink-0 없음 → 라벨이 (줄 폭 − 약 60px)보다 길면 「수/정」처럼 꺾임.
- 공용 기준 코드가 아님(파일 내용 15종) → 24개 파일 머리줄에 각각 같은 클래스 4개를 넣어야 함: 머리줄 `gap-3`, 라벨 `min-w-0`, 버튼 묶음 `shrink-0`, 버튼 `whitespace-nowrap`.

| 프로그램 (파일:줄) | 가장 긴 라벨 | 폭 (쓸 수 있는 / 필요) | 등급 |
|---|---|---|---|
| `threads/src/components/settings/ApiKeyRow.tsx:29`, `threads-affiliate-poster/…:29`, `threads-comment-reply/components/settings/ApiKeyRow.tsx:62` | Threads 앱 ID 안내 65자 | 데스크톱 560~650 / 약 680 | **HIGH(데스크톱도)** |
| `stepmail/…/ApiKeyRow.tsx:43`, `kakao_auto_poster/…:31`, `naver-cafe-poster/…:29`, `booking-reminder/components/settings/CronjobKeyRow.tsx:43` | cron-job.org 안내 55~58자 | 데스크톱 약 556 / 약 550(경계), 폰 약 290 / 약 550 | **HIGH(폰 확실)** |
| `insta_auto_poster/…:31`, `trending-product-finder/…:47`, `youtube-auto-reply/…:62`, `crm-google-form/components/settings/CronjobKeyRow.tsx:43`, `instagram-comment-reply/…:62`, `shots/…:29`, `music/…:44` | 40~58자 | 폰 약 300 / 430~550 | **HIGH(폰)** |
| `tarot/…:41`, `mbti-character/…:41`, `real_estate_sales/…:29`, `longtail-keyword-expander/…:55`, `shop-detail-page/…:43`, `auto-detail-page/…:43` | 28~37자 | 폰 약 300 / 320~410 | **HIGH(폰)** |
| `ai-auto-blog/app/settings/ApiKeyRow.tsx:38`, `tistory-auto-blog/app/settings/ApiKeyRow.tsx:38`, `web-crawler/webapp/…:29`, `competitor-analysis/…:55` | 27~30자(영문 위주) | 폰 약 300 / 290~300 | MEDIUM |

## B. 개별 화면 (30곳)
| 파일:줄 | 화면 | 폭 (쓸 수 있는 / 필요) | 등급 | 수정안 |
|---|---|---|---|---|
| `components/admin/AddMembersToGradeModal.tsx:162` (메인 관리자) | 등급 이동 모달 하단 | 528 / 약 630 | **HIGH(데스크톱)** | 부모 `flex-wrap gap-y-3`, 버튼 묶음 `shrink-0 ml-auto`, 버튼 nowrap |
| `ai-audio-analyzer/src/components/studio/SpeechReportView.tsx:432` | 문서 탭 머리 | 640~1200px에서 560~660 / 약 850 | **HIGH(데스크톱)** | 오른쪽 묶음 `shrink-0`, 버튼 nowrap, 왼쪽 `min-w-0` 또는 `lg:flex-row` |
| `ai-prompt-studio/src/components/ResultSection.tsx:86` | 결과 액션 바 | 768~1000px에서 448 / 약 504 | **HIGH(데스크톱 md)** | 버튼 묶음 `shrink-0 flex-wrap`, 버튼 nowrap |
| `ai-webtoon-studio/src/components/ScriptEditorSection.tsx:201` | 콘티 결과 머리 | lg 약 362 / 약 380, 폰 310 / 380 | **HIGH** | 버튼 묶음 `shrink-0`, nowrap, 부모 `flex-wrap` |
| `ai-image-studio/components/Header.tsx:11` | 상단 헤더 | md~lg 720 / 약 860, 폰 358 / 약 385 | **HIGH** | 메뉴를 `lg:flex`로, 「AIMaster 메인」 nowrap+`shrink-0` |
| `ai-influencer-studio/src/components/Header.tsx:24` | 상단 헤더 | 폰 358 / 약 530 | **HIGH(폰)** | 폰에서 API 버튼 글자 숨김/축약, nowrap |
| `ai-auto-blog/app/posts/[id]/edit/page.tsx:303`, `tistory-auto-blog/app/posts/[id]/edit/page.tsx:304` | 글 수정 머리 | 폰 342 / 약 458 | **HIGH(폰)** | 버튼 `shrink-0 whitespace-nowrap`, 제목 `truncate` |
| `ai-prompt-studio/src/components/templates/PromptFormModal.tsx:260` | 모달 필드 머리 | 폰 310 / 약 435 | **HIGH(폰)** | 힌트 `hidden sm:inline`, 버튼 nowrap |
| `naver-blog-agent/src/app/(dashboard)/page.tsx:2127` | 이미지 컷 줄 | 제목이 길면 400+ / +180 | **HIGH(폰, 긴 제목은 데스크톱도)** | 캡션 `min-w-0 truncate`, 버튼 묶음 `shrink-0` |
| `naver-blog-agent/src/components/BlogSmartEditorModal.tsx:456` | 편집기 모드 전환 | 폰 294 / 약 395 | **HIGH(폰)** | 버튼 nowrap+`shrink-0`, 폰 글자 축약 |
| `react-ui-showcase/…/CodeViewerModal.tsx:33`, `ui-canvas/…/CodeViewerModal.tsx:33` | 코드 보기 모달 | 폰 310 / 약 340 | **HIGH(폰)** | `flex-wrap gap-y-2`, 버튼 nowrap |
| `allinone-graphic/src/app/guide/page.tsx:173` | 가이드 머리 | 폰 358 / 약 453 | HIGH(폰) — 병합으로 은퇴, 우선순위 낮음 | 배지 `hidden sm:flex` |
| `ai-auto-blog/app/write/ai-form/page.tsx:1376` | 문단 이미지 줄 | 폰 266 / 256~276 | MEDIUM | 버튼 묶음 `shrink-0` |
| `stepmail/components/leads/LeadsTable.tsx:60` | 일괄 선택 바(삭제 확인) | 폰 358 / 약 510 | MEDIUM | `flex-wrap`, 버튼 nowrap |
| `video-to-gif/components/ConverterWorkspace.tsx:621` | 미리보기 모달 하단 | 360px 폰 280 / 약 290 | MEDIUM | 버튼 묶음 `shrink-0`, `flex-wrap` |
| LOW 10곳 | `ai-image-studio/app/guide/page.tsx:17`, `app/(main)/page.tsx:326`, `app/admin/programs/page.tsx:24`, `components/admin/CategoryManagerButton.tsx:202`, `components/guides/GuideHub.tsx:341`, `components/home/UserWorkspace.tsx:91·194·256`, `naver-blog-allinone/…/LibrarySection.tsx:153`, `style-dna-analyzer/…/dashboard/page.tsx:113` | 폭 여유 | LOW | 그대로 |
| FALSE/N/A | `detail-page-12p/…/ProductInputForm.tsx:211`(같은 줄 아님), `allinone-graphic/…/AllInOneGraphicApp.tsx:683`(현재 미표시), `scratch/…/Header.tsx:46`(미배포) | — | — | 없음 |

## 실행 결과 (2026-10-22, 주인님 B안 승인 — 데스크톱 HIGH만 지금 배포, 나머지는 코드만)
커밋 `f0871e568`(코드 24 + 버전 6 + AGENTS 6). 기능·문구 변경 없음(AI 인플루언서 헤더만 휴대폰에서 「API 키」로 줄여 표시). 로컬 `tsc` 8개 프로그램 오류 0.

### 지금 배포함 (7)
| 프로그램 | 버전 | 배포 | 확인 |
|---|---|---|---|
| `threads/` (`auto-threads-posting`) | v1.28 | `threads-e0rlfeslb` Ready | DB v1.28 |
| `threads-affiliate-poster/` | v1.80 | `threads-affiliate-poster-l5g96xvja` Ready | DB v1.80 |
| `threads-comment-reply/` | v1.25 | `threads-comment-reply-s1qsfy78u` Ready | DB v1.25, 크롬(시험 계정) 설정 화면 API 키 5줄 버튼 한 줄·잘림 0(데스크톱 698px·390px iframe), 사이드바 v1.25, 대시보드 7일 그래프 정상 |
| `ai-audio-analyzer/` | v1.12 | `ai-audio-analyzer-mwd5l66fc` Ready | DB v1.12. 문서 탭은 분석 결과가 있어야 보여 화면 미확인(유료 호출 필요) |
| `ai-prompt-studio/` | v1.09 | `ai-prompt-studio-2dbl0wmva` Ready | DB v1.09. 결과 바는 생성 결과가 있어야 보여 화면 미확인(유료 호출 필요) |
| `ai-webtoon-studio/` | v1.28 | `ai-webtoon-studio-bdm7en4mj` Ready | DB v1.28, 사이드바 v1.28, 대시보드 7일 그래프 정상. 콘티 결과 머리는 콘티가 있어야 보여 미확인 |
| 메인 관리자 등급 이동 모달 | (메인, 버전 없음) | `aimaster-duqiiqj09`(푸시 자동 빌드) Ready | 화면 미확인(관리자 회원 선택 필요) |
- 함께 나간 다른 세션 변경: `threads-comment-reply`·`ai-webtoon-studio`에 저장소에만 있던 공용 「최근 7일」 그래프 글자 크게(`weekChart` 사본) — 각 `AGENTS.md` 「⏸ 보류」 항목에 「✅ 배포됨」 표시.

### 코드만 반영, 아직 배포 안 함 — 그 프로그램을 다음에 배포할 때 함께 나감(그때 버전 +0.01)
`stepmail/`(ApiKeyRow·LeadsTable), `kakao_auto_poster/`, `booking-reminder/`(CronjobKeyRow), `insta_auto_poster/`, `crm-google-form/`(CronjobKeyRow), `instagram-comment-reply/`, `music/`, `tarot/`, `mbti-character/`, `real_estate_sales/`, `auto-detail-page/`, `ai-influencer-studio/`(Header), `react-ui-showcase/`·`ui-canvas/`(CodeViewerModal), `video-to-gif/`(미리보기 하단).

### 이번에 건너뜀 — 다른 CLI 작업 중이라 손대지 않음(그 작업이 끝난 뒤 같은 방식으로 처리)
- 작업 중 표: `ai-image-studio/`(헤더 HIGH)·`shots/`(ApiKeyRow)·`tistory-auto-blog/`(ApiKeyRow·수정 화면)
- 다른 세션 미커밋 변경: `naver-cafe-poster/`·`trending-product-finder/`·`youtube-auto-reply/`·`longtail-keyword-expander/`·`shop-detail-page/`·`ai-auto-blog/`(ApiKeyRow·수정 화면·문단 이미지 줄)·`web-crawler/`·`competitor-analysis/`·`naver-blog-agent/`(이미지 컷 줄·편집기 모드 전환)
- 은퇴: `allinone-graphic/`

### 비용 리포트
| 항목 | 횟수 | 계정 | 승인 범위 |
|---|---|---|---|
| Vercel 프로덕션 빌드(서브프로그램 CLI 배포) | 6 | Vercel 팀 `buylife` | B안 6~8회 안 |
| 메인 사이트 GitHub 푸시 자동 빌드(`f0871e568`) | 1 | Vercel 팀 `buylife` | B안 안 |
| 유료 AI 호출 | 0 | — | — |
합계 빌드 7회. 문서만 바꾼 푸시(`a32e08131`·`efe20cd89` 등)는 메인 빌드 건너뜀(취소 상태, 비용 없음).

## 수정 플랜(주인님 승인 대기 → 2026-10-22 B안 승인·실행, 위 「실행 결과」)
- 범위: HIGH 34 + MEDIUM 7 = 약 30개 프로그램(+메인 사이트 관리자 모달 1곳). 기능·문구 변경 없이 클래스만 추가.
- 순서(묶음별, 묶음마다 크롬 데스크톱·390px 확인 → 커밋): ① 데스크톱에서도 꺾이는 곳(threads 계열 3, 메인 관리자 모달, ai-audio-analyzer, ai-prompt-studio, ai-webtoon-studio, ai-image-studio 헤더) ② 나머지 `ApiKeyRow`·`CronjobKeyRow` ③ 휴대폰 전용 HIGH·MEDIUM.
- 배포 비용: 프로그램마다 Vercel 빌드 1회(약 30회). 급한 버그가 아니라 화면 정돈이므로, `CLAUDE.md` 배포 비용 규칙대로 **코드만 반영해 두고 각 프로그램을 다음에 배포할 때 함께 내보내는 방식**도 가능(이 경우 버전은 그 배포 때 +0.01).
- 다른 CLI 작업 중 폴더(`docs/ACTIVE_WORK.md`·미커밋 변경)는 건너뛰고 표에 표시.
- 재발 방지: 새 `ApiKeyRow`를 복사해 만들 때 위 4개 클래스가 들어간 사본을 기준으로 삼도록 `DESIGN.md` 원칙 19번 사례에 이 문서를 연결.
