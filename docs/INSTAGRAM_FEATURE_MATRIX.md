# 인스타 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 칸은 코드 검색(파일 경로 확인)으로 채웠고 실제 화면·실제 게시 검수는 하지 않았다. 담당 세션이 확인하면 이 줄을 지운다.

> **인스타 프로그램을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서와 [인스타 자동화 완성 기준](INSTAGRAM_COMPLETION_POLICY.md)을 먼저 읽는다.**
>
> - 대상: AIMaster 운영 인스타 카테고리 4개(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「인스타」 줄. 병합된 2개는 §1에만 적는다.
> - 기준 시점: **2026-10-24**, 코드 버전 INSTA v1.69 · 인플루언서 v1.24 · 웹툰 v1.31 · 댓글·DM v1.36(각 폴더 `version.ts`).
> - 근거: 4개 폴더 현재 코드(파일 목록·기능 검색), [인스타 통합 분석](analysis-insta-consolidation-20261020/REPORT.md), [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 병합 플랜 2개, `scripts/check-shared-modules.mjs` 등록부.
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다.
> - 관계 문서: 통합 작업 목록 [`INSTAGRAM_CONSOLIDATION_TASKS.md`](INSTAGRAM_CONSOLIDATION_TASKS.md), 회원 연동 [`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md), 예약 [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md), 공용 기준 코드 [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md)·[`SHARED_MODULES.md`](SHARED_MODULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾고, 있으면 §4 기준 코드를 가져다 쓴다.
2. **넣을 곳 판단:** 게시물 제작은 INSTA(피드·카드뉴스) / 인플루언서(가상 인물) / 웹툰(연재), 응대는 댓글·DM. 병합 원본에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 고치고(칸에 버전 표시), 새 기준 코드는 §4, 이력은 §7에 한 줄. 배포 전 기능은 칸을 바꾸지 않고 §6에 「미배포」로.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/INSTAGRAM_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/INSTAGRAM_FEATURE_MATRIX.md --as <세션>`.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전 · 배지) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| INSTA | INSTA 포스팅 자동화 (`auto-instagram-posting` · 폴더 `insta_auto_poster` · v1.69 · FREE) | 인스타 연결 출발점 · 피드·카드뉴스 **기준** | 주제 수집·인기글 수집 → 캡션·해시태그 → 피드 1장 또는 카드뉴스 4~10장 → 즉시·예약 게시 | 서버(`insta_posts`·`cns_*`) / OpenAI·Claude·Gemini·Perplexity / 본인 키 | 수집 경로가 가장 많음, 글자 깨짐 없는 카드뉴스, 릴스 분석·문구 겹침 검사, 게시 엔진 공용 기준 | Meta 앱 준비가 어려움, 릴스·스토리 게시 없음, 피드 글 30일 정리 없음, 배포판에는 카드뉴스 없음 | 독립(기준) |
| 인플루언서 | AI 인플루언서 자동화 (`ai-influencer-studio` · v1.24) | 가상 인물 화보 | 외형 → 하루 일과 → 표정·연출 → 화보·캡션 3종 → 게시 | 서버 기록 30개·30일 / Gemini / 본인 키 | 같은 얼굴 유지, PPL 컷, 캡션 3종 | 얼굴 유지가 이미지 결과에 좌우, 하루 일과 자동 예약은 꺼 둠(`ROUTINE_SCHEDULE_MODE="off"`) | 독립 |
| 웹툰 | AI 웹툰 자동화 (`ai-webtoon-studio` · v1.31) | 장편 웹툰 → 인스타 연재 | 시놉시스 → 캐릭터 시트 → 콘티 → 세로 원고 → 컷을 인스타 판으로 → 게시·회차 묶음 예약 | 프로젝트는 브라우저·JSON 파일 / Gemini(서버가 회원 키로 호출) / 본인 키 | 캐릭터 시트 일관성, 회차 묶음 예약 | 프로젝트 서버 보관 없음, 캡션은 AI가 아닌 기본 문구, 묶음 예약은 창을 닫으면 멈춤 | 독립 |
| 댓글·DM | INSTA 댓글·DM 자동화 (`instagram-comment-reply` · v1.36) | 응대 **기준** | 댓글 주기 수집·DM 웹훅 → AI 초안 → 웹·텔레그램·받은편지함 승인 → 게시·발송 | 서버 / AI(모델 선택) / 본인 키·본인 Meta 앱 | 연결 한 번에 댓글·DM, 이중 게시 방지, 7일 응대 그래프 | 게시물별 최근 댓글 20개, DM 24시간 창, 텔레그램 봇 2개, 연결 대체 표가 둘(`ig_accounts`·`dm_accounts`) | 독립(기준) |
| (병합됨) | INSTA Cardnews (`cardnews-studio` v1.32) | → INSTA `/cardnews/*` | 옛 주소 이동·API 전달만 | – | – | – | 병합 완료 |
| (병합됨) | INSTA DM답변 (`instagram-dm-reply` v1.17) | → 댓글·DM `/dm/*` | 옛 주소 이동·API 전달만 | – | – | – | 병합 완료 |

관련(다른 카테고리, 같은 게시 엔진 사본): AI 4컷 만화 `four-cut-comics` v1.36(이미지 카테고리), YOUTUBE Shots `auto-shorts-posting`(유튜브 카테고리, 릴스 업로드는 이 표 범위 밖).

## 2. 기능 상세 비교표

○ 있음(코드 근거 확인) · △ 일부 · × 없음 · 「미확인」은 문서에는 있으나 코드 위치를 찾지 못한 칸 · – 해당 없음.

### 2-1. 소재·자료

| 기능 | INSTA | 인플루언서 | 웹툰 | 댓글·DM |
|---|---|---|---|---|
| URL 웹페이지 수집 | ○ `lib/ai/collector.ts` | × | × | – |
| RSS 수집 | ○ NewsBlur 계정 방식 `collector.ts` | × | × | – |
| AI 트렌드 검색(Perplexity) | ○ `collector.ts`·`actions/candidates.ts` | × | × | – |
| 다른 계정·해시태그 인기 게시물 수집 | ○ 공식 API 또는 회원 Apify `cardnews/collect.ts`·`api/cardnews/remake/collect` | × | × | – |
| 릴스 영상·말소리 분석 | ○ Gemini 파일 `cardnews/ai/geminiFiles.ts`, 받아쓰기 `remake/collect/route.ts` | × | × | – |
| 다른 프로그램 결과 받기 | ○ 상세페이지 이미지 `lib/shopDetailImport.ts` | × | × | – |
| 시놉시스·캐릭터 설정 | × | ○ 외형·일과 `lib/influencer-engine.ts` | ○ `CharacterSection.tsx` | – |

### 2-2. 문구·캡션

| 기능 | INSTA | 인플루언서 | 웹툰 | 댓글·DM |
|---|---|---|---|---|
| AI 캡션 | ○ `lib/ai/generator.ts`·`api/cardnews/caption` | ○ 3종 `api/generate-caption` | △ 기본 문구 `lib/instagram/slides.ts` `defaultCaption` | – |
| 해시태그 생성 | ○ `generator.ts` | ○ `lib/gemini.ts` | × | – |
| 카드 장별 문구 | ○ `api/cardnews/copy`·`cardnews/ai/copyPrompts.ts` | – | – | – |
| 원문 베끼기 방지(겹침 검사) | ○ `cardnews/referenceCopy.ts` | × | × | – |
| AI 답글·DM 답장 초안 | – | – | – | ○ `lib/ai/reply.ts`·`lib/dmApp/ai/reply.ts` |
| 답변 말투 설정 | – | – | – | ○ `lib/tonePresets.ts`·`lib/dmApp/tonePresets.ts` |

### 2-3. 이미지

| 기능 | INSTA | 인플루언서 | 웹툰 | 댓글·DM |
|---|---|---|---|---|
| AI 이미지 생성 | ○ `lib/ai/geminiImage.ts`·`cardnews/ai/image.ts` | ○ `lib/geminiImage.ts` | ○ `lib/imageGen.ts`·`geminiImage.ts` | – |
| 글자 없는 배경 + 한글 합성 | ○ 카드뉴스 `cardnews/render.ts`·`renderClient.ts` | × | ○ 컷+말풍선 판 `lib/instagram/slideRender.ts` | – |
| 장별 배치·글꼴 편집 | ○ `components/cardnews/studio/LayoutEditor.tsx` | × | △ 말풍선·레이아웃 선택 | – |
| 무료 사진 배경(회원 Pixabay·Pexels 키) | ○ `cardnews/photoSearch.ts` | × | × | – |
| 내 사진 넣기 | ○ `lib/actions/upload.ts`·`importImage.ts` | ○ 레퍼런스 사진 | ○ 캐릭터 사진 | – |
| 같은 인물 유지(참고 이미지) | × | ○ | ○ 캐릭터 시트 `lib/cutRefs.ts` | – |
| PNG·ZIP 내려받기 | ○ `cardnews/zip.ts` | 미확인 | ○ 긴 JPG·ZIP `WebtoonCanvasSection.tsx` | – |

### 2-4. 게시

| 기능 | INSTA | 인플루언서 | 웹툰 | 댓글·DM |
|---|---|---|---|---|
| 피드 1장 게시 | ○ `lib/instagram/publish.ts` | ○ 사본 | ○ 사본 | – |
| 캐러셀 2~10장 게시 | ○ 카드뉴스 | ○ 최대 10장 | ○ 최대 10장 | – |
| 릴스 게시 | × | × | × | – |
| 스토리 게시 | × | × | × | – |
| 즉시 게시 | ○ `PublishButton.tsx`·`api/cardnews/instagram/publish` | ○ `InstagramPublishPanel.tsx` | ○ `InstagramPublishPanel.tsx` | – |
| 예약 게시 | ○ `api/posts/dispatch-scheduled`·`api/cardnews/instagram/dispatch` | ○ `api/instagram/dispatch` | ○ `api/instagram/dispatch` | – |
| 예약 실행 방식 회원 선택(Vercel / 내 cron-job.org) | ○ `SchedulerModePicker.tsx`(피드·카드뉴스 한 곳) | ○ `ScheduleSettings.tsx` | ○ `ScheduleSettings.tsx` | ○ 댓글 수집 주기 `lib/schedulerMember/*` |
| 여러 회 묶음 예약 | × | △ 하루 일과 예약(꺼 둠) `lib/routineSchedule.ts` | ○ 회차 묶음 `EpisodeBatchSchedule.tsx` | – |
| 게시 결과 기록(`permalink`·시각·실패 사유) | ○ `publish.ts` `getPermalink`·`cardnews/instagram/posts.ts` | ○ `lib/instagram/posting.ts` | ○ `lib/instagram/posting.ts` | ○ 게시·발송 상태 |
| 「게시 중」 멈춤 → 실패 처리 | ○ 30분 `cardnews/instagram/posts.ts` | ○ `posting.ts` | ○ `posting.ts` | 미확인 |
| 중복 게시 방지(실행 선점) | ○ `lib/posts/dispatch.ts`·`publishStatus.ts` | ○ `posting.ts` | ○ `posting.ts` | ○ `lib/comments/post.ts`·`lib/dmApp/dm/post.ts` |
| 시간 초과 때 게시 재요청 | △ `postGraphWithRetry`가 `media_publish`도 최대 2회 다시 보냄(완성 기준 ④와 충돌 가능) | △ 사본 동일 | △ 사본 동일 | – |
| 최근 7일 게시 그래프 | ○ `weekChart/InstaWeekPosts.tsx`(여러 프로그램 합계는 비교표 카드 설명, 합산 대상 코드 미확인) | ○ 사본 | ○ 사본 | ○ 응대 그래프 |

### 2-5. 응대(댓글·DM)

| 기능 | INSTA | 인플루언서 | 웹툰 | 댓글·DM |
|---|---|---|---|---|
| 댓글 가져오기 | × | × | × | ○ `lib/comments/sync.ts`(게시물별 20개) |
| DM 즉시 받기(웹훅) | × | × | × | ○ `api/instagram/dm-webhook/[userId]` |
| DM 24시간 창·자동 응답 고지 | – | – | – | 미확인(문서·화면 설명 있음, 코드 위치 미확인) |
| 승인 후 게시·발송 | – | – | – | ○ `components/PendingReviewList.tsx` |
| 텔레그램 승인 | – | – | – | ○ `lib/telegram/client.ts`·`lib/dmApp/telegram/client.ts` |
| 통합 받은편지함 연결 | – | – | – | ○ 사본 `comment-inbox/lib/comments/instagramPost.ts` |
| 자동 게시·발송(동의 후) | – | – | – | ○ `AutoApproveSettingsForm.tsx` |

### 2-6. 연결·저장·공통

| 기능 | INSTA | 인플루언서 | 웹툰 | 댓글·DM |
|---|---|---|---|---|
| 인스타 연결 화면(OAuth) | ○ `api/instagram/callback`·`callback/byok` | × INSTA 연결 재사용 | × INSTA 연결 재사용 | ○ 메시지·댓글 권한 `api/instagram/callback` |
| 공용 연결값 먼저 읽기(`member_platform_accounts`) | ○ `lib/instagram/memberAccount.ts` | ○ → 대체 `insta_accounts` | ○ → 대체 `insta_accounts` | ○ → 대체 `ig_accounts`·`dm_accounts` |
| 작업 서버 보관 | ○ `cns_projects`·`insta_posts` | ○ 30개 `api/history` | × 브라우저·JSON `lib/storage.ts` | ○ |
| 게시 기록 30일 정리 | △ 카드뉴스만 `cns_insta_posts`, 피드 `insta_posts`는 플랜 대기 | ○ `posting.ts`·`api/history` | ○ `posting.ts` | 미확인 |
| 이용 안내 화면 | ○ `/guide`·`/cardnews/guide` | ○ `GuideView.tsx` | ○ `GuideSection.tsx` | ○ `/guide` |

## 3. 고유 기능 (한 곳에만 있는 것)

| 프로그램 | 그곳에만 있는 기능 | 상태 |
|---|---|---|
| INSTA | URL·RSS·Perplexity 수집, 인기 게시물 수집, 릴스 영상·말소리 분석, 문구 겹침 검사, 카드뉴스 배치 편집, 무료 사진 배경, 상세페이지 이미지 받기 | 기준이라 그대로 |
| 인플루언서 | 피부 텍스처·외형, 하루 일과 기획, PPL 컷, 캡션 3종, 하루 일과 자동 예약(꺼 둠) | 독립 |
| 웹툰 | 캐릭터 시트, 화·컷 콘티, 세로 원고, 컷 → 인스타 판, 회차 묶음 예약 | 독립(4컷과 엔진 공유) |
| 댓글·DM | 댓글·DM 응대 전체, 텔레그램 봇 2개, 통합 받은편지함 사본 원본 | 기준이라 그대로 |

## 4. 기능별 기준 코드 위치

| 기능 | 기준 파일 | 사본·비고 |
|---|---|---|
| 인스타 게시(피드·캐러셀·`permalink`) | `insta_auto_poster/src/lib/instagram/publish.ts` | 사본 인플루언서·웹툰·4컷(`instagram-publish`) |
| 게시 기록·예약·멈춤 처리 | `ai-webtoon-studio/src/lib/instagram/posting.ts` | 사본 인플루언서·4컷(`insta-posting`) |
| 예약 화면 동작(상태 줄·취소) | `insta_auto_poster/src/lib/cardnews/instagram/postsClient.ts` | `insta-posts-client` |
| 예약 시각 처리 | `insta_auto_poster/src/lib/cardnews/schedule.ts` | `insta-schedule-time` |
| 회원 예약 실행 방식 | `insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts` | `member-scheduler`, 값은 각 `schedulerConfig.ts` |
| 회원 cron-job.org 작업 | `insta_auto_poster/src/lib/cardnews/instagram/cronJobOrg.ts` | `insta-cronjob-org` |
| 회원 연동 공용 읽기 | 공용 `memberIntegrations.ts`(등록부 기준 위치 참조) | INSTA·인플루언서·웹툰·댓글 사본 |
| 7일 게시 그래프 | `insta_auto_poster/src/components/weekChart/InstaWeekPosts.tsx` | `insta-week-posts` |
| 카드뉴스 한글 합성 | `insta_auto_poster/src/lib/cardnews/render.ts`·`renderClient.ts` | 공용 등록 없음 |
| 무료 사진 검색 | `insta_auto_poster/src/lib/cardnews/photoSearch.ts` | `free-photo-search` |
| 사진 검색 낱말 사전 | `photo-keywords` 기준(등록부 참조) | INSTA는 사본 `cardnews/photoKeywords.ts` |
| 문구 베끼기 방지 | `reference-copy-guard` 기준(등록부 참조) | INSTA는 사본 `cardnews/referenceCopy.ts` |
| 릴스 파일 처리 | `insta_auto_poster/src/lib/cardnews/reelsMedia.ts` | 등록부 기준 |
| 댓글 답글 게시 | `instagram-comment-reply/lib/comments/post.ts` | 사본 `comment-inbox` |
| DM 답장 발송 | `instagram-comment-reply/lib/dmApp/dm/post.ts` | 사본 `comment-inbox` |
| 텔레그램 승인 | `instagram-comment-reply/lib/telegram/client.ts` | 사본 `lib/dmApp/telegram/client.ts` 등 |
| 검토 대기 목록 | `instagram-comment-reply/components/PendingReviewList.tsx` | 등록부 기준 |

사본은 직접 고치지 않는다 — 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 합칠 프로그램 → 기준 | 가져온 기능 | 상태 |
|---|---|---|---|
| A 카드뉴스 | `cardnews-studio` → INSTA | 카드뉴스 스튜디오 전체(`/cardnews/*`), 게시글 관리 통합, 예약 실행 방식 한 곳 | ✅ INSTA v1.35~v1.39 · cardnews v1.32 옛 주소 전달 |
| B 응대 | `instagram-dm-reply` → 댓글·DM | DM 화면·기능(`/dm/*`), 연결 한 번, 대시보드·기록 통합 | ✅ 댓글 v1.18~v1.23 · DM v1.17 옛 주소 전달 |
| 독립 | INSTA·인플루언서·웹툰·댓글·DM | 게시 엔진·예약·그래프는 공용 사본으로 공유 | – |
| 재검토 | 웹툰 ↔ 4컷 | 사용자가 늘면 웹툰 「짧은 형식」으로 합칠지 다시 판단(보고서 §2) | 대기 |

원칙: 「병합」은 좋은 기능만 기준 프로그램에 더하는 것이다. 원본 데이터 삭제·권한 이동은 따로 결정한다.

## 6. 확장 후보·로드맵 (추천 — 구현 전)

| 단계 | 기능 | 넣을 곳 | 근거 | 상태 |
|---|---|---|---|---|
| 1차 | 시간 초과 때 `media_publish` 자동 재요청을 멈추고 결과 확인 뒤 판단 | 게시 엔진 기준 → 사본 3곳 | 완성 기준 ④ | 후보(담당 확인) |
| 1차 | 피드 글·이미지 30일 정리 | INSTA | `insta_auto_poster/docs/PLAN_20261022_MEDIA_RETENTION.md` | 승인 대기 |
| 1차 | 댓글·DM 기록 30일 정리 확인·보완 | 댓글·DM | 최상위 규칙(생성 데이터 30일) | 미확인 |
| 2차 | 웹툰 AI 캡션·해시태그 | 웹툰 | INSTA `generator.ts` 방식 | 후보 |
| 2차 | 웹툰 프로젝트 서버 보관 | 웹툰 | 비교표 카드 단점 | 후보 |
| 2차 | 하루 일과 자동 예약 켜기 | 인플루언서 | `routineSchedule.ts` 스위치 | 주인님 결정 |
| 3차 | 릴스 게시 | INSTA(→ shots와 경계 확인) | 비교표 카드 단점 | 후보 |
| 3차 | `insta_accounts`·`ig_accounts`·`dm_accounts` 대체 표 정리 | 전체 | `MEMBER_INTEGRATIONS.md` | 후보 |

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 4개 운영 프로그램 코드 검색 기준 기능 표, 기준 코드 위치, 병합 A·B 완료 반영 | claude-win-dotori [역할: analysis-planning] |
