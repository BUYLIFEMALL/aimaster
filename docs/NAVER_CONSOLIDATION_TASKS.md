# 네이버 프로그램 기능 보강·정리 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 「네이버」 전담 역할이 아직 없다(역할이 정해지기 전에는 `docs/roles/unassigned.md`). 담당 세션이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 운영 프로그램은 `naver-cafe-poster`(v1.28) 하나이고, `naver-blog-auto-poster`(v1.12)·`naver-blog-auto-poster-web`(v1.13)은 관리자 전용 비공개다. 두 블로그 앱의 공개·병합은 [블로그 통합 작업표](BLOG_CONSOLIDATION_TASKS.md) 담당 결정이며 이 표에는 연결만 둔다.

## 현재 위치와 읽는 순서

1. [네이버 자동화 완성 기준](NAVER_COMPLETION_POLICY.md) — 끝났다고 말할 조건·회원이 고르는 게시 방식·하지 않을 것.
2. [네이버 기능 상세 비교표](NAVER_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치·문서와 코드 차이. 항목을 시작하기 전에 읽고, 배포한 기능은 그 표의 칸을 고친다.
3. 프로그램별 기록: `naver-cafe-poster/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`·`docs/DETAILED_REVIEW_20261019.md`.
4. 공통: [PLATFORM_PATTERNS §20](PLATFORM_PATTERNS.md), [예약 기능 지침](SCHEDULER_POLICY.md), [회원 연동 정보](MEMBER_INTEGRATIONS.md), [공용 네이버 엔진 제안](SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md)(블로그 확장 쪽).

**2026-10-24 요약:** 카페는 공식 API·회원 본인 네이버 앱·정기 실행 방식 선택·실행 직전 권한 확인까지 갖췄다. 남은 큰 빈칸은 **결과가 불확실한 게시의 자동 재시도(중복 게시)**, **공개 버킷·30일 정리 없음**, **당해 연도 주입 없음**, **시각 지정 예약 없음**이다. 미배포 대기로 기록된 2건은 v1.28 배포에 이미 포함됐을 수 있어 확인이 필요하다(아래 「미배포 대기」).

## 우선 처리 — 회원에게 실제 피해가 갈 수 있는 문제

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**로 구분한다. 아래는 모두 **대기**(2026-10-24 코드 검색으로 발견, 실제 발생 건수는 운영 DB 미조회로 미확인)다.

| ID | 문제 | 근거 경로 | 회원 영향 | 제안 방향(플랜 전 초안) |
|---|---|---|---|---|
| NV-P1 | **게시 시간 초과·게이트웨이 오류도 한 번 더 게시 시도** | `naver-cafe-poster/src/lib/posts/publish-core.ts` `MAX_PUBLISH_ATTEMPTS = 2`(실패 원인 구분 없이 재시도) | 첫 요청이 실제로는 네이버에 올라갔는데 응답만 늦은 경우 **같은 글이 카페에 두 번** 올라간다. 카페 API에는 삭제가 없어 회원이 손으로 지워야 하고, 도배 제재 위험 | 시간 초과·5xx처럼 결과가 불확실하면 재시도하지 않고 「결과 확인 필요」 상태로 남김. 재시도는 「요청이 네이버에 닿지 않았음」이 확실한 연결 실패만 |
| NV-P2 | **정기 자동 게시가 실패하면 5분 뒤 새 글을 만들어 다시 게시** | `naver-cafe-poster/src/lib/scheduledSource/dispatch.ts`(실패 시 `last_run_at`을 원래 값으로 되돌림) + `engine.ts` `runScheduledSource`(게시 실패를 throw → 매번 새 `ncafe_posts` 행 생성) | NV-P1과 겹치면 **5분마다 비슷한 글이 반복 게시**될 수 있고, 매번 회원 OpenAI·Perplexity 키로 다시 생성(회원 비용). 실패한 초안 행도 계속 쌓임 | 「생성은 됐고 게시만 실패」를 별도로 기록해 다음 실행에서 새로 만들지 않음. 결과 불확실 게시는 자동 재실행 대상에서 제외하고 회원에게 알림 |
| NV-P3 | **회원 이미지·영상이 공개 버킷** | `src/lib/actions/ai.ts` 149~156줄, `src/components/posts/DraftItem.tsx` 172~178줄, `src/components/posts/PostEditForm.tsx` 180~224줄(`post-images` `getPublicUrl`) | 주소를 아는 누구나 회원 생성·업로드 파일을 볼 수 있다(생성 데이터 회원 소유 격리 최상위 규칙). 버킷 이름 `post-images`가 다른 프로그램과 겹치는지 미확인 | 비공개 버킷 + 서명 주소(기준: `shop-detail-page/lib/storageImage.ts`). 카페 첨부는 서버가 서명 주소로 내려받아 `image[0]`로 보내므로 게시에는 공개 주소가 필요 없음 |
| NV-P4 | **생성 자료 30일 자동 정리 없음** | `naver-cafe-poster/vercel.json`(정기 게시 예약 하나뿐), 코드·마이그레이션에 정리 작업 없음 | 글감·초안·이미지·영상이 기한 없이 남음(생성일 기준 30일 삭제 최상위 규칙 위반) | 정리 예약 작업 + 회원별 정리 기록(공용 `cleanup-usage-log` 사본, 기준은 [이커머스 비교표](ECOMMERCE_FEATURE_MATRIX.md)). 게시 결과(글 주소)는 회원이 확인할 수 있게 유예 기간을 문서에 명시. 삭제 착수 전 주인님 승인 |
| NV-P5 | **당해 연도 주입 없음** | `naver-cafe-poster/src/lib/ai/cafeGenerator.ts`·`collector.ts`(`structureCafeCandidates`)에 `getFullYear` 없음. 비공개 두 앱 `web/lib/naverBlogAutoPoster/generate.ts`도 없음 | 정책·지원금·트렌드 글에 과거 연도(2023·2024년)가 현재처럼 들어간 채 카페에 게시될 수 있음 | 시스템 프롬프트에 `${currentYear}` 기준 연도 지시 추가(핵심 원칙 8). 프롬프트 내용은 프로그램 고유로 유지 |
| NV-P6 | **즉시 게시 서버 쪽 상태 확인 없음** | `src/lib/actions/posts.ts` `deployDraftAction`(이미 `published`·`publishing`이어도 그대로 `publishCafePost` 호출). 버튼은 `src/components/posts/DeployButton.tsx` `useFormStatus`로만 막음 | 탭 두 개·뒤로 가기·재전송으로 같은 초안이 두 번 게시될 수 있음 | `saveAndDeployDraftAction`처럼 상태 확인 + `draft`/`failed`일 때만 `publishing`으로 바꾸는 조건부 선점 |

## 확인 필요 (영향 판단 전)

| ID | 내용 | 근거 | 다음 첫 단계 |
|---|---|---|---|
| NV-Q1 | `post-images` 버킷 공개 설정·다른 프로그램 공유 여부 | 버킷 생성 SQL이 폴더에 없음 | 운영 DB 저장소 설정 읽기 조회(읽기만) |
| NV-Q2 | NewsBlur 비밀번호를 앱 공용 표 `newsblur_accounts`에 원문으로 저장하는지 | `src/lib/actions/newsblurAccount.ts` 35줄 `upsert({ user_id, username, password })`, `supabase/0002_candidates.sql` 2줄 주석 | 표 정의·RLS·암호화 여부 확인. 원문이면 세션 쿠키만 저장하는 방식 검토 |
| NV-Q3 | 이미지 프롬프트 작성 호출이 키를 주소(`?key=`)로 보냄 | `src/lib/ai/imageGenerator.ts` 29줄 | 머리글(`x-goog-api-key`) 전환 검토(이커머스 EC-E0와 같은 정리) |
| NV-Q4 | `publishing` 상태에서 서버가 죽으면 그대로 멈춤 | `publish-core.ts`(복구 경로 없음) | 오래된 `publishing`을 「결과 확인 필요」로 바꾸는 정리 검토(자동 재게시는 하지 않음) |
| NV-Q5 | 비공개 두 앱의 키 폴백 여부·30일 정리·화면 표준 | `web/lib/apiKeys.ts`(내용 미확인) | 블로그 담당이 공개 결정 때 확인 |

## 기능 보강 후보 (우선 처리 뒤)

| ID | 내용 | 근거·출처 | 현재 상태 |
|---|---|---|---|
| NV-F1 | 특정 초안을 특정 시각에 게시하는 시각 지정 예약(완성 기준 ⓒ 보완) | [완성 기준](NAVER_COMPLETION_POLICY.md) §3 — 지금은 주기형만 | 대기(플랜 필요, DB 칸 추가는 승인) |
| NV-F2 | 카페·게시판별 게시 가능 조건과 실패 안내(탈퇴 카페·쓰기 불가 게시판·만료 토큰) | `naver-cafe-poster/docs/DETAILED_REVIEW_20261019.md` D-31-02 | 대기 |
| NV-F3 | 회원이 입력한 게시판 규칙으로 원고 사전 점검(차단 회피 목적 아님) | 같은 문서 D-31-03 | 대기 |
| NV-F4 | 카페 게시판별 어투 프리셋, 모바일 미리보기, 예약 달력 | `naver-cafe-poster/docs/IMPROVEMENTS.md` §2 | 대기 |
| NV-F5 | 블로그 글 → 카페 공유용 요약 변환(`blog-workroom` 연계) | `IMPROVEMENTS.md` §3-1 | 대기(블로그 담당과 협의) |
| NV-F6 | 토큰 만료 전 미리 갱신·실패 알림 | `IMPROVEMENTS.md` §1-3 — 지금은 게시 때 갱신(`refreshNaverToken`) | 대기 |
| NV-F7 | 네이버 검색·데이터랩·쇼핑 키를 공용 연동 항목으로 등록해 재사용(새 기능이 필요할 때) | 완성 기준 §2-2, [MEMBER_INTEGRATIONS](MEMBER_INTEGRATIONS.md) | 필요 시 |
| — | 다중 부계정 로테이션 | `IMPROVEMENTS.md` §1-2 | **보류** — 도배 회피 목적이 되기 쉬움. 주인님 판단 전 만들지 않음 |

## 문서 정리 (코드 변경 없음)

| ID | 내용 | 근거 |
|---|---|---|
| NV-D1 | `naver-cafe-poster/AGENTS.md` 머리 버전 v1.24 → v1.28, v1.26·v1.28 이력 보완, 「예약 발행」을 「정기 자동 생성·게시」로, 공용 예약 기준 경로 `insta_auto_poster/…`로 정정 | [비교표](NAVER_FEATURE_MATRIX.md) §5 |
| NV-D2 | `naver-cafe-poster/docs/IMPROVEMENTS.md` 머리 버전 v1.20 갱신, D-31-01을 「v1.21 처리됨」으로 표시 | 같은 곳 |
| NV-D3 | `naver-blog-auto-poster_web/AGENTS.md` §0 루트 API·`lib/` 경로를 `web/` 아래로 정정(블로그 담당) | 같은 곳 |

## 미배포 대기

**확인 필요:** 아래 두 커밋은 모두 v1.28 커밋 `8e8455b4f`(2026-10-23 15:45, Next.js 보안 업데이트)보다 앞선다(`git merge-base --is-ancestor`로 확인). v1.28이 실제로 배포됐다면 이미 함께 나갔을 가능성이 크지만, `docs/PENDING_DEPLOYS.md` 38줄과 `docs/IMPROVEMENTS.md`에는 아직 「미배포 대기」로 남아 있다. 담당 세션이 운영 배포 시각·화면으로 확인한 뒤 대기 표시를 지우거나 유지한다.

| 내용 | 커밋 | 확인할 것 |
|---|---|---|
| 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로 | `22c6cda35`(2026-10-23 00:19) | 운영 화면 데스크톱·휴대폰 폭 계정 위치 → 반영됐으면 `docs/IMPROVEMENTS.md`·`docs/PENDING_DEPLOYS.md` 줄 지우기 |
| 공용 `member-scheduler` 사본 전환(내부 정리) | `41c39274e` | 예약 상태 화면·회원 실행 주소 가짜 토큰 401 → `naver-cafe-poster/AGENTS.md` 맨 아래 「미배포」 표기 정리 |

## 항목마다 지킬 완료 조건

1. 착수 직전 `node scripts/dev-requests.mjs list`, `docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](NAVER_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. **실제 카페 게시 시험은 주인님 승인 뒤에만** 한다(회원 계정의 외부 공개 행동, 삭제 API 없음). 그 전에는 가짜 응답·차례가 오지 않게 만든 시험 데이터로 확인한다.
4. 회원 본인 네이버 앱·키만, 회원별 비공개 저장, 생성일 기준 30일 정리를 지킨다. 공용 사본(`memberScheduler.ts`·`memberIntegrations.ts`·`geminiImage.ts`·`nanoBananaModels.ts`)은 기준만 고친다.
5. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 `src/lib/version.ts` + DB `programs.version`). 빌드는 비용이므로 사전 승인.
6. 완료 시 이 표의 상태·근거 커밋, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 루트 `docs/HANDOFF.md`(제목에 `[역할: <ID>]`)를 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md))에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다.

## 프로그램 주소

https://naver-cafe-poster.buylife.xyz

https://naver-blog-auto-poster.buylife.xyz (관리자 전용 비공개)

https://naver-blog-auto-poster-web.buylife.xyz (관리자 전용 비공개)

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 코드 검색으로 우선 처리 6건·확인 필요 5건·보강 후보 7건·문서 정리 3건·미배포 대기 2건 정리 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
