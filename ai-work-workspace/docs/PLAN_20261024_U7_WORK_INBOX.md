# U7 업무 받은편지함 — 상세 개발 플랜 (2026-10-24)

- 대상: AI 업무 워크스페이스 자동화(`ai-work-workspace`) · ① AIMaster 운영 · DB ref `esgxyikcnnvmlhygjkth`
- 역할: `workspace` · 세션 `claude-win-20261024-workspace`
- 근거: 확장 로드맵 `docs/PLAN_20261024_EXPANSION_ROADMAP.md` §3-1(연계 방식)·§5(U7)
- 상태: **주인님 승인 대기**(공용 DB에 표 1개 추가 = 스키마 변경)

## 1. 무엇을 만드나 (한 줄)
다른 AIMaster 자동화 프로그램의 결과물(회의 분석·할 일·번역본·수집 자료 등)이 **회원 본인의 「받은 업무」함에 모이고**, 워크스페이스에서 버튼 하나로 **페이지로 만들거나 데이터베이스 표의 행으로 넣는** 기능입니다. 노션에 없는 AIMaster만의 차별점(로드맵 §2-4)입니다.

## 2. 왜 공용 표인가
- AIMaster 규칙상 프로그램끼리 서로의 API를 부르지 않고 각자 독립 배포합니다. 그래서 공용 DB에 **회원별 받은편지함 표 하나**를 두고, 보내는 프로그램은 표에 한 줄을 넣기만, 워크스페이스는 읽기만 합니다.
- 회원 연동 정보 공용 규칙(`docs/MEMBER_INTEGRATIONS.md`)처럼, 나중에 다른 프로그램도 같은 표를 재사용합니다(U8~U10).

## 3. DB 설계 (승인 필요)
```sql
create table public.work_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_slug text not null check (source_slug ~ '^[a-z0-9-]{2,60}$'),   -- 보낸 프로그램 programs.slug
  kind text not null default 'note' check (kind in ('note','task','meeting','document','table','link')),
  title text not null check (char_length(title) between 1 and 200),
  body_md text not null default '' check (char_length(body_md) <= 200000), -- 본문(마크다운)
  data jsonb not null default '{}'::jsonb,                                -- 표 행으로 넣을 구조 데이터(선택)
  source_url text,                                                         -- 원본 결과 화면 주소(선택)
  created_at timestamptz not null default now(),
  imported_at timestamptz,                                                 -- 워크스페이스로 가져간 때
  imported_ref text                                                        -- 만든 페이지 id
);
create index work_inbox_user_created on public.work_inbox (user_id, created_at desc);
alter table public.work_inbox enable row level security;
create policy work_inbox_select_own on public.work_inbox for select using (auth.uid() = user_id);
create policy work_inbox_update_own on public.work_inbox for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy work_inbox_delete_own on public.work_inbox for delete using (auth.uid() = user_id);
-- insert 정책 없음: 보내기는 각 프로그램 서버가 로그인 회원을 확인한 뒤 서버 키로만 넣는다(내용 검증을 서버 한곳에서)
```
- **회원 데이터 격리**: 모든 읽기·고치기·지우기는 본인 줄만(RLS). 서버 코드도 항상 `user_id`로 거른다.
- **30일 자동 삭제**: 받은편지함 줄은 생성일 기준 30일 뒤 삭제(가져가지 않았어도). 워크스페이스로 가져가 만든 페이지는 회원 업무 자료라 삭제 대상이 아닙니다(1단계 결정 §7-1과 같음). 삭제는 워크스페이스의 하루 1회 운영 정리 작업(`/api/cron/jobs`)에 붙입니다.
- 마이그레이션 파일: `ai-work-workspace/supabase/migrations/20261024001700_work_inbox.sql`(승인 뒤 크롬 SQL 편집기에서 적용).

## 4. 워크스페이스 화면
1. 좌측 메뉴에 **「📨 받은 업무」**(새 항목 수 배지). 기존 「보관함」(알림)과 이름이 겹치지 않게 했습니다.
2. 목록: 보낸 프로그램 이름·종류 아이콘·제목·받은 때·가져감 표시. 위에 「안 가져간 것만 보기」.
3. 항목을 누르면 오른쪽에 본문 미리보기 + 3D 버튼 3개
   - **「페이지로 만들기」**: 「내 페이지」 아래(또는 고른 위치)에 새 페이지를 만들고 본문 마크다운을 블록으로 넣음 → 만든 페이지로 이동
   - **「표에 행으로 넣기」**: 데이터베이스를 고르면 제목 = 이름, `data`의 키가 같은 이름의 속성으로 들어감(없는 속성은 본문으로)
   - **「삭제」**
4. 비어 있을 때: 「다른 자동화 프로그램에서 『업무 워크스페이스로 보내기』를 누르면 여기로 모입니다」 안내와 연계 예정 프로그램 목록.
5. 매뉴얼(`/guide`)에 「받은 업무」 사용법 구역 추가(3단계 카드).

## 5. 다른 프로그램이 쓰는 방법 (U8 이후, 이번에는 문서·기준 코드만)
- 기준 코드 `ai-work-workspace/src/lib/workInbox.ts`의 `sendToWorkInbox({ userId, sourceSlug, kind, title, bodyMd, data, sourceUrl })` — 서버 전용, 길이·형식 검사, 서버 키로 insert.
- 다른 프로그램은 이 파일을 사본으로 가져가 결과 화면에 「업무 워크스페이스로 보내기」 버튼을 답니다(공용 기준 코드 규칙, `docs/SHARED_MODULES.md` 등록).
- 사용 안내 문서: `docs/WORK_INBOX.md`(표 구조·보내는 법·주의).

## 6. 시험 방법
- 아직 보내는 프로그램이 없으므로, **시험 계정에 시험 항목 2개를 SQL로 넣어** 확인합니다(메모 1개, 할 일 표 데이터 1개). 시험 뒤 지웁니다.
- 연결부 시험: 다른 회원 줄이 안 보임(격리), 가져가기 뒤 `imported_at` 기록, 30일 지난 줄 삭제.
- 크롬(시험 계정): 받은 업무 목록 → 페이지로 만들기 → 페이지 내용 확인 → 표에 행으로 넣기 → 행 확인.

## 7. 순서
1. 승인 → SQL 적용(운영 DB, 크롬 SQL 편집기) + 마이그레이션 파일
2. 서버: 받은편지함 목록·가져가기·삭제 명령(로그인 + 프로그램 권한 확인, `user_id` 필터), 30일 삭제를 운영 정리 작업에 추가, `sendToWorkInbox` 기준 코드
3. 화면: 좌측 메뉴·목록·미리보기·버튼·매뉴얼
4. 시험(연결부·로컬 빌드) → 배포 → 크롬 확인 → 문서(공용 안내 `docs/WORK_INBOX.md`, 비교표, 아이디어 표, 인수인계)

## 8. 비용
| 항목 | 내용 | 비용 |
|---|---|---|
| 개발·시험 | 유료 AI 호출 없음 | 없음 |
| 배포 | Vercel 빌드 1회(v1.18) | 빌드 1회 |
| 운영자 인프라 | 공용 DB 표 1개(작은 글 데이터, 30일 삭제) | 사실상 없음 |
| 회원 부담 | 없음 | 없음 |

## 9. 주인님 결정 필요
1. **공용 DB에 `public.work_inbox` 표 추가**(위 SQL) — 승인 여부
2. 가져간 줄도 30일 뒤 받은편지함에서 지우는 방식(만든 페이지는 남음) — 추천안 그대로 갈지
