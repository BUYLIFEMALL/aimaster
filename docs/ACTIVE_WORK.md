WORK.md) — 동시 작업 | `esm-register/` (새 프로그램) | [역할: ecommerce-image] Claude Code(윈도우, ego) · 세션 `claude-win-sdp` | 2026-11-15 | G마켓·옥션 등록기 트랙 1(크롬 확장) 단계 1 웹 뼈대 v1.01 → 단계 2 확장. 플랜 `docs/PLAN_20261115_ESM_EXTENSION.md` |
방지




> [역할: blog] **후속: 반복 설정 저장·후보 동의 초기화 로컬 완료 / 실제 실행 미완료** (2026-10-28T14:28:35.542Z) — 8번 반복 주기·KST시간대 저장/재조회·예상시각(실제실행아님), 동시수정revision검사·RLS/API입력검증 구현. 5번 후보주소/제목/본문수정시이전권한/AI동의/선택초기화. 단위180·격리DB10(137SQL,네트워크none)·타입/로컬빌드통과. 운영SQL은누적3개미적용·웹/ZIP묶음미배포, 실제예약/반복실행기와6/7번실행기는미완료. 기존Edge21169596 새탭만사용하여최신확장재로드/본인이웃우선배치실확인, /neighbors로그인정상·0명반영/기존43명expired확인. 팝업버튼native대상상실로실제새읽기683b74de만직접요청; 활성요청91fa9442는해결. 새수신/최종저장미완료·AI/검색/원격빌드0·전체읽기/소통OFF유지.


> [역할: blog] **독립 작업 진행: 8번 중단관리·9번 문장정리·1/4번 안내 개선 — 로컬완료/미배포** (2026-10-28T13:12:36.994Z)
> 사용자 “할수있는것은하고안되는것만요청/9번까지계속” 후속: 1번실읽기대기와분리해 ①8번작업조회·취소API/설정UI/가이드, draft·ready·claimed중단/claimed예약반환·armed는uncertain+회원OFF·성공/불확실중복방지유지·늦은성공보고수용 ②9번소통문장30일정리(신규bnc_work_cleanup,회원설정→작업잠금/바쁜회원건너뜀·100회원×500작업상한,문장/승인/관찰/허가만정리·claimed반환·armed불확실/예약유지·최초기한/타회원미만료유지) ③1번웹확인기한표시/열린상태만료시반영차단·확장본인이웃관리시동의/읽기상단배치 ④4번AI거절/형식/저장실패안내구분(본문/키비노출·동일불확정요청재호출차단) 구현. 단위174/174,격리PostgreSQL17.11 DB8/8(잠긴회원건너뜀·다른회원정리·다음회정리 실제동시성포함)(2가상회원,네트워크none·호스트포트0)·타입/로컬Next빌드통과. 신규migration20261028123000/20261028124500은미적용: 다음승인묶음때두RPC/index먼저적용후웹배포해야함. 운영메타읽기확인:소통작업0·신규이웃run0·기존43명expired·새RPC없음·전체읽기/소통OFF. 버전v1.02유지/웹·ZIP미배포/푸시없음·이번실AI/검색/원격빌드0. 확장3파일기존설치소스·보조폴더동기화, 최종다시로드는Edge활성거절로미완료(이전cd292d2b1다시로드와구분). 요청91fa9442:현재Edge창한번클릭맨앞으로. 실제43명최종저장·다중/빈목록·실AI성공·후보전체흐름·실신청수락/공감댓글답방답글·예약반복·운영Cron/배포는미완료.








2026-10-16 주인님 지시. **같은 프로젝트·같은 서브프로그램(폴더)을 두 CLI가 동시에 작업하지 않는다.** 윈도우 PC·맥미니의 Claude Code·Codex·Antigravity CLI(`agy`) 모두 적용한다. 규칙 원문: 루트 `CLAUDE.md`·`AGENTS.md` 최상단.

## 사용법

1. **시작 전 확인** (셋 다 비어 있어야 시작):
   - 아래 표에 내가 맡을 폴더가 있는가
   - `git status --porcelain -- <폴더>` — 다른 CLI의 미커밋 변경이 있는가
   - `docs/HANDOFF.md` 맨 위 — 그 폴더를 "진행 중"으로 남긴 항목이 있는가
   - 하나라도 해당하면 **시작하지 않고 주인님께 알린다**("○○가 `<폴더>` 작업 중").
2. **시작할 때**: 표에 내 줄을 추가한다(이 파일은 두 PC가 같은 폴더로 보므로 저장만 하면 바로 보인다. 시작 시점에 커밋할 필요는 없다).
   - **「에이전트(장비)」 칸 맨 앞에 역할 ID를 넣는다(2026-10-24)** — ``[역할: blog] Claude Code(윈도우, 크롬) · 세션 `…` ``. 역할 ID는 `docs/roles/` 역할 파일 이름(전담이 없으면 `[역할: 미지정]`). 상세: [`docs/roles/README.md`](roles/README.md) 「역할 이름으로 기록하기」.
   - **「에이전트(장비)」 칸에 세션 이름을 꼭 넣는다(2026-10-23)** — `` Claude Code(윈도우, 크롬) · 세션 `claude-win-20261023-작업` `` 형식(이름은 멀티세션 규칙 §2 `<CLI>-<장비>-<날짜>-<작업>`, 커밋 도우미 `--as`와 같은 이름). 다른 세션이 「이 폴더 쓰는 세션」을 정확히 찾아 메시지를 보낼 수 있다. 빠진 줄은 세션 시작 점검(`node scripts/index-watch.mjs session-check`)에 ⚠로 나온다.
   - **줄을 올리면 주소도 등록(Claude Code, 2026-10-23)** — `node scripts/index-watch.mjs register <세션명>` 한 번. 아직 커밋 전이어도 다른 세션이 `node scripts/index-watch.mjs who <세션명>`으로 메시지 주소를 보고 바로 문의할 수 있다(주소는 같은 장비에서만 통함, Codex·agy는 주소가 없어 이름만 남음).
   - **폴더의 일부 파일만 맡으면 범위를 적는다(선택, 2026-10-23)** — 폴더 칸 끝에 `(범위: package.json·package-lock.json·src/lib/version.ts)`처럼 **폴더 안 경로를 `·`로 이어** 적는다(여러 폴더면 모든 폴더에 같은 경로로 적용, 폴더 경로도 됨 예 `src/app`). 세션 점검의 「다른 세션이 이 폴더를 고침」 경고가 그 경로를 고친 커밋만 본다. 「잠금 파일만」 같은 말로 적으면 스크립트가 알아보지 못해 폴더 전체로 본다.
3. **끝날 때**: 작업 내용·인수인계 문서(폴더 `AGENTS.md`/`README.md` + `docs/HANDOFF.md` 맨 위 항목)를 남기고, 표에서 **내 줄을 지운 뒤** 작업 커밋에 이 파일도 함께 넣는다.
4. **오래된 줄**: 시작한 지 24시간이 넘었고 그 폴더에 미커밋 변경도 없으면, 지우지 말고 주인님께 확인한다.
5. 루트 공용 문서(`CLAUDE.md`·`AGENTS.md`·`GEMINI.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`·이 파일)는 여러 CLI가 함께 쓴다 — 표에 올리지 않고, 내 항목만 추가한다(남의 내용 삭제·덮어쓰기 금지).

## 작업 중




| 폴더 | 에이전트(장비) | 시작 | 작업 |
|---|---|---|---|
| `free-music-studio/engine/` (범위: `src/queue.mjs`·`src/gateway.mjs`·`src/security.mjs`·`src/imageArt.mjs`·`src/main.mjs`·`tests/` 국소 시험 — IMG-P1 PR-A 엔진 격리, 운영 출처 등록·설치판·빌드 없음) | [역할: music] Claud(Music) Claude Code(윈도우) · 세션 `claude-win-20261024-music` | 2026-11-19 | 무료 이미지 P1 PR-A: 새 범위 토큰·대기열 분리, 손상 시 차단, 합산 단일 실행, 접수 ID, 크기 3종 |
| `real_estate_sales`(범위: `src/lib/news/radarCore.ts`·`src/lib/news/runner.ts`·`tests/newsRadar.test.mjs`·`src/lib/realestate/crossWatch.ts`·`tests/crossWatch.test.mjs`·`src/app/(dashboard)/districts/page.tsx`·`docs/PLAN_20261119_*.md`·`docs/IMPROVEMENTS.md`) · `commercial-land-trade-alert`(범위: `src/lib/crossWatch.ts`·`tests/crossWatch.test.mjs`·`src/app/(dashboard)/districts/page.tsx`·`package.json` test 줄·`docs/IMPROVEMENTS.md`) · `realty-listing-alert`(범위: `lib/crossWatch.ts`·`tests/crossWatch.test.ts`·`app/targets/{page,TargetsClient,RegionPicker}.tsx`·`package.json` test 줄·`docs/IMPROVEMENTS.md`) · `realty-client-desk`(범위: `src/lib/desk/tradeHint.ts`·`tests/tradeHint.test.mjs`·`src/app/(dashboard)/listings/[id]/page.tsx`·`src/components/desk/SendAdForm.tsx`·`package.json` test 줄·`docs/IMPROVEMENTS.md`·`docs/PLAN_20261119_DESK_CANDIDATES.md`) RE-20261119-DESK | Claude Code(윈도우) `[역할: realty]` Claude(RealEstate) claude-win-20261024-realty | 2026-11-19 | 주인님 「순서대로 진행해」 — 실거래 뉴스(사설칼럼 뒤로·알림 요약 지역당 상한, 8767db0a8·63e7c429f) 끝 · 관심 지역 3개 프로그램 연계 1단계 실거래(a6544db4e) 끝 · 2단계 상가(dab9d80e1)·3단계 매물 알림(a6e11f679) 끝 → 고객관리 L-1(c8d479cb9) 끝 → L-2·U-1. 로컬 구현·시험만, 빌드·배포·DB·push 0 |
| `crm-google-form`(운영 DB 변경·v1.18 배포·실검수) | Claude Code(윈도우) `[역할: mall-builder]` CC-B2B-BACK-01 claude-win-20261025-workspace | 2026-11-18 | CRM 중복 접수 방지 릴리스(주인님 승인) — **배포 중**, 결과 문서 35절 |
| `mall-builder` 메이커 M1(범위: `src/app/s/[store]/admin/products/page.tsx`·새 `banana-send.tsx`·새 `src/lib/mallPhotoJob.ts`+`tests/mallPhotoJob.test.mjs`·공용 사본 `src/lib/productPhotoHandoff.ts`(sync 생성)·`scripts/check-shared-modules.mjs`·`docs/SHARED_MODULES.md` 사본 칸) | Claude Code(윈도우) `[역할: mall-builder]` CC-B2B-BACK-01 claude-win-20261025-workspace | 2026-11-19 | Master msg_336575c1b8e9 승인 — 로컬 구현·시험만(빌드·배포·DB 0, 단독 배포 0) |
| `mall-builder` 메이커 M2 데이터 계층(범위: 새 `supabase/migrations/0106_photo_proposals.sql`·새 `scripts/scenario-0106-photo-proposals.sql`·새 `scripts/check-0106-local.mjs`·`docs/PLAN_20261119_MAKER_M2_PROPOSALS.md`) | Claude Code(윈도우) `[역할: mall-builder]` CC-B2B-BACK-01 claude-win-20261025-workspace | 2026-11-19 | Master msg_ad4382dd5bb2 승인 — 격리 Docker 구현·시험만(Lab·운영·빌드·배포 0) |
| `mall-builder` 메이커 M2 화면 연결(범위: 새 `src/lib/mallPhotoSave.ts`·`src/lib/mallPhotoJob.ts`·`src/app/s/[store]/admin/products/{page,banana-send}.tsx`·새 `admin/products/proposals/{page,preview}.tsx`·`src/app/s/[store]/supplier/products/page.tsx`·새 `tests/mallPhotoSave.test.mjs`·`tests/mallPhotoJob.test.mjs`) | Claude Code(윈도우) `[역할: mall-builder]` CC-B2B-BACK-01 claude-win-20261025-workspace | 2026-11-19 | Master msg_c506ba34f9a0 승인 — 로컬 코드·모의 시험만(Storage·Lab·운영·빌드·배포 0) |
| `mall-builder` 메이커 M3 1차 데이터 계층(범위: 새 `supabase/migrations/0107_photo_apply.sql`·새 `src/lib/applySignature.ts`·새 `tests/applySignature.test.mjs`·새 `scripts/scenario-0107-photo-apply.sql`·새 `scripts/check-0107-local.mjs`·`docs/PLAN_20261119_MAKER_M2_PROPOSALS.md`) | Claude Code(윈도우) `[역할: mall-builder]` CC-B2B-BACK-01 claude-win-20261025-workspace | 2026-11-19 | Master msg_617ae29305b4 승인 — 격리 Docker·합성 열쇠만(sharp·라우트·Storage·Lab·운영·빌드 0) |
| (문서만 — 프로그램 소스·시험 점유 없음) `ai-influencer-studio/docs/IMPROVEMENTS.md` · `docs/analysis-ai-influencer-20261118/W00_BASELINE.md` · `docs/roles/sns.md` (A2I 4개 경로는 3776d54f7 고정으로 검수 중) | [역할: sns] Claude Code(윈도우 GT1_Mega) · 세션 `claude-win-20261118-sns` · `CC-SNS-01` · 호칭 Claude(SNS) | 2026-11-18 | 원본 자산 W01 묶음(A1·보관 정리 R1·복구 P1·P2 SQL·P2 런타임 W01s 최종 1a3832e7b) 로컬 구현·검수 종결, 전부 미배포·스위치 off. **AIF-20261119-W01-V4 진행 중(Master `msg_0b10f8b59272`)**: 일반 회원 한도·권한 무과금 선행 검증 — 운영은 **읽기만**(식별자·사용량 원문 출력 0), 한도 경계는 기존 격리 시험 대조. 운영 DB/Storage 쓰기·생성·발행·ON·배포·유료 V3·접속 설정 복사 0 |
| `threads/` (범위: 독립 모드 스위치·`KIT/` 신규 — `src/lib/version.ts`는 남의 미커밋이라 안 건드림) → 다음 `insta_auto_poster/KIT`·`ai-auto-blog` | [역할: support] Claude Code(윈도우) · Claude(Support) `CC-SUPPORT-01` · 세션 `claude-win-20261112-policy` | 2026-11-16 | 수강생 배포 키트 3종 — 지금: Threads 키트(`auto-threads-posting`) 신규 작성. 운영 동작 변화 없음·배포 없음 |
| `mall-builder/` (옛 `labs/mall-builder/`) | [역할: mall-builder] Claude Code(윈도우, ego) · 세션 `claude-win-20261025-workspace`(2026-11-12 주인님 지시로 쇼핑몰 담당 인계) | 2026-11-10 | [Claude(B2BBackend) CC-B2B-BACK-01] 운영 v1.16(2026-11-17 `5c229f968`, DB 0100까지). 지금(B2B-20261118-01): 운영 0101~0104 묶음(v1.17) **사전 준비 문서만** — 작성 범위 `mall-builder/docs/handoff-0101-0104-prod/README.md`(커밋 `dabbc23ce`, Master 검토 대기). **제품 경로 점유 없음**(`src`·`supabase/migrations`·`theme`/`globals` 등 Front 범위 손대지 않음). 교환비 카드 결제는 Lab 적용·Lab 빌드 `7609748ad` 완료, Mac QA037 화면 검수 대기 (2026-11-18 갱신) |
| `mall-builder/` (범위: 디자인 UI 빌더 — `src/lib/builder/**`·`theme.ts`·`blocks.ts`·`admin/design/**`·`admin/home/**`·`home-blocks.tsx`) | [역할: mall-design-builder] Claude Code(윈도우, ego) · 세션 `claude-win-20261114-mall-design` = Claude(B2BFront) | 2026-11-16 | 대기 — HOMETABS `489c888e6`+P3 `9f6b1c131`·S70 `50d3e6162`+`ee35d6eb1`(0105 묶음) 제출, P3 `90248e5b1`·`86e5ad1bf`·`77c50f27c` 미배포. 제품 파일 점유 없음 |
| `instagram-comment-reply/` → `threads-comment-reply/` → `threads/` (2026-11-16 주인님 「그 줄 지워」로 쇼핑제휴 항목만 뺌 — v1.86 11-06 배포·v1.87 배포 완료, 세션 목록에 없음, 정리 `claude-win-sdp`) | [역할: 미지정] Claude Code(윈도우, ego) · 세션 `claude-win-20261106-ytreply` | 2026-11-06 | **연속 배포 중(4개, 주인님 「순서대로 진행해」)** — 미배포 대기 묶음(모델 교체 A/B·30일 열외·설정 바로가기)을 프로그램당 빌드 1회로 순서대로 배포. 지금: 쓰레드 쇼핑제휴 v1.86 |
