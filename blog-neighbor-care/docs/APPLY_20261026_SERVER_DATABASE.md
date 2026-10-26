# 서버/DB 1단계 — 운영 적용 검수본

> **적용 완료 — 생성 SQL을 다시 실행하지 않습니다.** 2026-10-26 23:47 운영SQL 적용·읽기검수 완료: 신규6표 RLS=true, runtime=false, RPC는service_role만, 회원직접쓰기/서버runtime수정불가, jobs/settings0. 프로그램등록·실제SSO/계정·UI/AI/확장·30일정리·배포는 미완료. [상세결과](IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md). 아래 직접Run 순서는 당시 준비 절차이며, 사용자 후속지시로 이번 검수본은 Codex가 적용했습니다. 이후 확인에는 `verify_server_queue.sql`의 SELECT만 사용합니다.

**대상① AIMaster 운영 ref `esgxyikcnnvmlhygjkth`만. 현재 적용 완료입니다.** [검수·한계](IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md)를먼저읽습니다. 원본[인수인계§4](../../docs/analysis-naver-blog-neighbor-20261024/HANDOFF_20261024_BLOG_NEIGHBOR_CARE.md)는 **「운영 DB 쓰기는 주인님 승인 뒤, 크롬 SQL 편집기에 넣어 두고 Run은 주인님」**이라고지정했습니다. 당시Claude담당기록의브라우저표현과현재CLI배정을구분하며Codex는Edge만사용합니다. 이전 직접Run 지정은 당시 절차이며, 이번 적용은 상단 후속지시 기록을 따릅니다.

## 실행할 파일·범위

[검수된SQL](../supabase/migrations/20261026103202_bnc_server_queue.sql)

UTF-8·CRLF→LF정규화SHA256:

```text
a5b3f68d53497b16a1e2c35a92b9afb13db5b374caf4418010b8b2eb1472d52e
```

- 생성: 신규`bnc_runtime`·`bnc_settings`·`bnc_jobs`·`bnc_daily`·`bnc_comment_slots`·`bnc_neighbors`6표, `bnc_private`스키마/보조함수, `bnc_dispatch`RPC·인덱스·RLS/권한.
- 기존`auth.users`/`member_platform_accounts`는참조만하며기존행/스키마를수정하지않습니다. 프로그램등록/요금제/권한행/키·환경변수/확장토큰도수정하지않습니다.
- runtime라이브게이트false, 초기설정OFF/review. 새로운네이버신청·공감·댓글·AI호출을켜지않습니다. 일반회원의직접상태변경/RPC와서버의runtime변경은차단합니다.
- 전체`BEGIN/COMMIT`, 잠금대기5초·문장30초제한. 같은객체가이미있으면실패시키며기존테이블을삭제/초기화하지않습니다. 임의DROP/권한우회로해결하지않습니다.

## 주인님 실행 순서

1. [운영 SQL 편집기](https://supabase.com/dashboard/project/esgxyikcnnvmlhygjkth/sql/new)에서프로젝트이름/ref가위대상과같은지확인합니다.
2. 아래읽기전용확인으로같은이름의기존객체가없는지확인합니다. 결과가있으면본문을실행하지말고담당에게알립니다.

```sql
select nspname from pg_namespace where nspname='bnc_private';
select tablename from pg_tables where schemaname='public' and tablename like 'bnc_%';
select to_regprocedure('public.bnc_dispatch(uuid,text,jsonb)');
```

3. 위검수SQL파일 **전체**를새쿼리에넣고Run합니다. 테스트파일`tests/database.mjs`의bootstrap/가상계정SQL은운영에넣지않습니다.
4. [적용후읽기검수SQL](../supabase/verify_server_queue.sql)을실행하거나담당에게완료를알립니다. 담당은운영읽기검수를이어갑니다.

기대결과:6표RLS=true, runtime.live_allowed=false, RPC EXECUTE는anon/authenticated=false·service_role=true, service_role의runtime UPDATE=false, authenticated의jobs UPDATE=false, 함수SECURITY INVOKER·빈search_path. 신규jobs0건이정상입니다.

이적용으로UI/프로그램권한/실제확장·네이버검수가완료되지않습니다. 실제네이버허용근거·회원naver_blog연결·안전한worker가준비되기전라이브게이트를켜지않습니다. 같은SQL을재실행해실행모드를초기화하거나운영데이터를정리하지않습니다.
