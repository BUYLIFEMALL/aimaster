# 블로그 작업 인수인계 — Claude Code → Codex (이어받기)

작성: 2026-10-28 KST · 역할 `blog` · 세션 Claude Code(윈도우) `claude-win-20261027-analysis`(한시 Edge 사용).
사유: 주인님 지시 — Codex 토큰 회복으로 Codex가 blog-neighbor-care 1번 「기존 이웃 가져오기」를 이어받는다. 이 문서는 [Codex→다음 CLI 인계](HANDOFF_20261028_BLOG_CODEX_TO_NEXT_CLI.md)의 **후속**이며, 그 문서 §2 재개 절차를 그대로 따르되 아래 **새 발견**을 반드시 먼저 읽는다.

## 0. ★ 핵심 발견 (0명의 직접 원인 — Codex가 반복 겪던 captured=0)

**확장 추출기는 네이버 이웃 목록을 `https://admin.blog.naver.com/BuddyListManage.naver?blogId=buylifemall` 주소에서만 읽는다.** 주인님이 처음 열었던 `https://admin.blog.naver.com/buylifemall`(관리 홈)은 추출기 코드상 **shell(껍데기)로 분류돼 소유자 확인만 하고 목록은 0명**으로 넘어간다.

- 근거(코드 `blog-neighbor-care/extension/neighbor-extractor.mjs`):
  - line 22~25: URL이 `/{blogId}`(=`/buylifemall`)이면 **shell** → 「내 블로그 통계」 링크로 소유만 확인하고 `{ok:true, context}` 반환(목록 추출 없음).
  - line 26~65: URL이 **`/BuddyListManage.naver`**(+`blogId=`)여야 실제 테이블(`caption=이웃관리목록`) 행을 추출한다. `정렬된 이웃 N명`·`그룹전체/이웃전체/새글소식전체`·검색어 비움을 확인한다.
  - line 66~105: 레거시 `ManageMyBuddy.naver` 경로.
- 즉 **주인님이 `BuddyListManage.naver?blogId=buylifemall` 주소를 직접 열고** 그 화면에서 확장 「전체 이웃 목록 읽기」를 눌러야 목록이 읽힌다. 화면에 43명이 보여도 주소가 `/buylifemall`(shell)이면 0명이다.
- **미검증**: 올바른 주소로 열어 읽었을 때 실제 43명이 추출·전송·저장되는지는 아직 확인 못 함(아래 §2 단계에서 Codex가 검증). 네이버는 claude-in-chrome 안전 제한으로 에이전트가 직접 못 열어, 주인님이 Edge에서 직접 조작해야 한다.

## 1. 허가(permit) 발급 방법 — service_role로는 불가, SQL Editor에서만

- `bnc_neighbor_import_permits` 테이블은 설계상 **service_role의 INSERT가 막혀 있다**(`grant select,delete to service_role`만, 마이그레이션 `20261028042655_bnc_member_import_permit.sql` line 28~29). 발급 함수 `bnc_neighbor_import_dispatch`에도 허가 생성 operation이 없다(operation: get/cancel/confirm/start/reserve/page/status/directory/runs/configure/cleanup).
- **따라서 허가는 운영 Supabase SQL Editor(postgres 권한)에서만 발급된다.** 에이전트 Bash(service_role)로는 `permission denied for table`.
- 발급 SQL(비밀값 없음):
```sql
insert into public.bnc_neighbor_import_permits
(user_id,account_id,device_id,purpose,reference,policy_revision,max_pages,max_neighbors,valid_until)
values('4a82ff77-97f7-474d-866e-8e9431858ed3','283df085-d92a-4d9a-8727-14600a5d662b',
'e520e32c-cd86-44fa-9391-eae3ae33415a','member_initiated_own_list','회원 본인 기존 이웃 1회 가져오기(43명)',
(select revision from public.bnc_neighbor_import_policy limit 1),5,50, now()+interval '15 minutes')
returning id,valid_until;
```
- 주의: Supabase SQL Editor의 Run(실행)은 Claude Code 자동 보호에서 막힐 수 있어, 그 한 번은 주인님이 Run을 눌러 주셔야 했다. Codex(Edge)는 Supabase 로그인된 브라우저에서 실행한다. **Edge엔 Supabase 로그인이 없어 로그인 페이지로 튕겼다** — Edge에서 Supabase 로그인을 먼저 하거나, 로그인된 브라우저에서 발급한다.

## 2. 현재 상태 (2026-10-28 06:50 KST 기준)

| 항목 | 값 |
|---|---|
| 활성 허가 | **`d421b77c`** valid_until `2026-10-28T07:02:23Z`(약 12분 유효), 미철회, max_pages 5·max_neighbors 50 |
| 지난 허가 | `83cf9d2b` 만료(06:43), `3c70d78f` 철회 |
| 마지막 가져오기 요청 | `b4ba8df6` state=`capturing`·captured 0·page 0 → **shell 주소에서 눌러 0명**(원인=§0). 허가 만료로 자동 풀림 |
| 디렉터리(반영 이웃) | 0명 |
| 읽기 게이트 | `bnc_neighbor_import_policy.read_allowed=false` |
| 자동 소통 | `bnc_runtime.live_allowed=false` |
| 운영 웹·설치 확장 | v1.02, 연결 블로그 `buylifemall`, 로그인/설치/연결 완료 |

- DB 식별자(기존 문서와 동일): 회원 `4a82ff77-97f7-474d-866e-8e9431858ed3`, 연결계정 `283df085-d92a-4d9a-8727-14600a5d662b`, Edge 기기 `e520e32c-cd86-44fa-9391-eae3ae33415a`, 블로그 `buylifemall`.

## 3. Codex 다음 단계 (바로 재개)

1. 활성 허가 `d421b77c`가 아직 유효한지 먼저 조회(§2 SQL, [Codex→다음 CLI 문서] §3 조회). **만료됐으면 §1 SQL로 새 허가 발급**(SQL Editor, 15분).
2. 만료·capturing 잔여 요청이 `start`를 막으면(`BNC_IMPORT_BUSY`) 먼저 `cancel`하거나 만료를 기다린다.
3. **주인님에게 Edge 주소창에 `https://admin.blog.naver.com/BuddyListManage.naver?blogId=buylifemall`를 직접 열도록 안내**(이게 핵심 — shell `/buylifemall` 아님).
4. 그 화면에서 확장 「기존 이웃 가져오기」 동의 체크 → 「전체 이웃 목록 읽기」 1회 → **완료까지 Edge 전경 유지**(채팅 복귀 시 중단).
5. DB `bnc_neighbor_imports`에서 `state=ready`·`captured_count=43`·`total_count=43` 확인. 페이지가 여러 장이면 `bnc_neighbor_import_pages`·`advanceVisibleNeighborPage`로 다음 페이지(최대 5페이지 허가).
6. 프로그램 `/neighbors`에서 「확인→반영」 → `bnc_neighbor_directory` 43명(서로이웃17/일반26) 대조.
7. 허가 철회 + 게이트/소통 OFF 재확인. 문서·요청함 갱신.

**1번 실제 완료 조건은 기존 문서 §2와 동일**: 설치 확장이 실제 43명을 전송·회원 확인·DB 43명 반영·웹 재조회·관계 구분·게이트OFF까지. 그 전엔 미완료.

## 4. 이 세션이 한 일 / 안 한 일

- 한 일: 블로그 역할 인수·§2 재개 착수, **0명 원인(BuddyListManage 주소) 발견**(§0), 허가 발급 경로 확정(§1), 허가 2건 발급(83cf9d2b 만료·d421b77c 활성), DB 상태 재확인. 별건으로 ai-auto-blog 카테고리 회원별 전환(v1.84)·블로그 전체 카테고리 점검·Claude Code API 크레딧 지침은 앞서 완료(루트 HANDOFF).
- 안 한 일: **실제 43명 추출·전송·반영 미완료**(핵심 미완). 올바른 주소로의 읽기 성공은 미검증.
- 브라우저: 이 세션은 한시적으로 Edge 사용(주인님 지정). ego-lite는 다른 Claude Code 세션이 사용 중이라 쓰지 않음. 네이버는 claude-in-chrome 안전 제한으로 에이전트가 못 엶 → 주인님 Edge 직접 조작 필수.
- 비용: 이번 이웃 작업은 유료 AI·검색·Vercel 빌드·배포 0. 운영 DB에 허가 INSERT만(SQL Editor).
