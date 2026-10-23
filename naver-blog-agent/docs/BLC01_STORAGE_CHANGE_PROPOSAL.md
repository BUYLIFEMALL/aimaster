# BLC-01 운영 저장소·권한 변경안 — 검토용, 미적용

> **승인 후 적용됨:** 주인님 「진행해줘」 승인 후 운영 ref `esgxyikcnnvmlhygjkth`에 본문의 버킷 1개·정책 1개를 적용했습니다. 원격 migration `20261020093222_nba_private_photos`, 속성/RLS·익명 업로드 403·실제 회원 API 9개 확인. [최신 적용/릴리스 결과](IMPROVEMENT_HANDOFF_20261020_BLC01_RELEASE.md). 아래 미적용/승인 전 표시는 제안 당시 이력입니다.

2026-10-20 Codex. 대상 **AIMaster 운영 ref `esgxyikcnnvmlhygjkth`**. Lab이 아니다. 이 문서에 SQL을 적은 것은 실행/승인이 아니다.

## 승인 대상과 변경 범위

| 항목 | 추가할 내용 | 기존 대상 영향 |
|---|---|---|
| 비공개 저장소 1개 | `nba-private-photos`, 공개=false, 파일당 4MB, JPEG/PNG/WebP | 기존 `ai-image-generations`와 다른 프로그램 버킷 변경 없음 |
| Storage 제한 정책 1개 | `nba_private_photos_server_only`, `AS RESTRICTIVE`, anon/authenticated의 이 버킷 직접 접근 차단 | 다른 버킷은 이 제한 조건이 참이므로 기존 정책 결과 유지 |
| 접근 방식 | 프로그램 이용 권한을 확인한 서버만 회원 본인 경로에 저장/조회. 확장은 회원 토큰·현재 실행·연결 사진까지 확인 | 회원/관리자 권한, 계정/API 키, 환경변수 변경 없음 |
| 만료 | 최초 업로드일부터 30일에 조회 차단, 기존 일일 Cron에서 Storage API로 파일과 메타데이터 삭제 | 스케줄 변경 없음. 미연결 업로드도 포함. 기존 파일 대량 이관/삭제 없음 |

**왜 직접 SELECT 허용 정책을 쓰지 않는가:** 소유자라도 Storage API를 직접 부르면 앱이 정한 임시 주소 수명을 넘기는 서명을 요청할 수 있다. 이번 설계는 서버가 소유자·원래 생성일·주소 수명을 함께 강제한다. 기존 공유 DB에 넓은 허용 정책이 있을 수 있어 새 버킷을 그 정책에서 보호하는 제한 정책을 추가한다. 서버용 secret/service_role은 서버에만 두고 프런트/확장에 전달하지 않는다.

## 적용 전 확인

2026-10-20 Codex 새 세션의 읽기 확인: 운영 ref `esgxyikcnnvmlhygjkth`, 새 버킷/동명 정책 모두 없음, `storage.objects` RLS 활성, 기존 정책 61개, 프로그램/확장 v2.00. [재개 사전 확인 증거](evidence/blc01-private-photos/resume-preflight-20261020.json). 구체 변경 승인은 질문한 상태이며 아직 migration 생성/적용·DB 쓰기는 하지 않았습니다. 승인 후 실행 직전에 이 상태를 다시 조회합니다.

1. 주인님이 **위 버킷 1개 + 제한 정책 1개 추가**를 승인했는지 확인한다. 루트 `AGENTS.md`의 「환경변수/DB 스키마 변경 사전 승인」 대상이다.
2. 현재 DB ref, `storage.buckets`의 같은 ID 유무, `pg_policies`의 `storage.objects` 정책 목록과 RLS 활성 상태를 읽기 전용으로 확인한다. 결과에는 비밀값/사진 URL을 적지 않는다.
3. 같은 ID/정책이 이미 있으면 **아래 SQL을 실행하지 말고** 실제 설정·다른 CLI 의도를 비교한다. 아래는 신규 생성 전용이며 기존 버킷을 고치지 않는다.
4. 승인 후 Supabase CLI `migration --help`를 확인하고 `supabase migration new nba_private_photos`로 이력 파일을 만든다. CLI가 만든 파일명만 사용한다. 아래 승인된 SQL을 넣고 검토·적용·검증한다. 이 세션에서는 migration 생성/적용하지 않았다.

## 적용 SQL 제안

```sql
begin;

-- 같은 이름이 있으면 멈춘다. ON CONFLICT UPDATE로 기존 설정을 바꾸지 않는다.
do $$
begin
  if exists (select 1 from storage.buckets where id = 'nba-private-photos') then
    raise exception 'nba-private-photos already exists; inspect it before applying';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nba-private-photos', 'nba-private-photos', false, 4194304,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy nba_private_photos_server_only
on storage.objects
as restrictive
for all
to anon, authenticated
using (bucket_id <> 'nba-private-photos')
with check (bucket_id <> 'nba-private-photos');

commit;
```

이 제한 정책은 접근을 허용하는 정책이 아니다. 기존 허용 정책과 AND로 결합되므로 이 버킷의 직접 SELECT/INSERT/UPDATE/DELETE를 차단한다. 인증된 앱 서버의 우회 권한을 쓰는 만큼 `privatePhotos.ts`의 회원 경로 검사와 `checkProgramAccessApi`/확장 실행 검증을 제거하면 안 된다. 회원 소유권은 `회원 UUID/파일 UUID.ext` 경로와 인증된 회원 ID를 정확히 대조한다.

## 승인 후 검수와 배포 순서

1. 제한 정책·버킷 비공개·용량/MIME 값을 읽기 전용 조회로 확인하고 Supabase 보안 점검을 실행한다. SQL 구문 검증과 실제 RLS 검수는 아직 미실행이다.
2. 원본 변경사항·Git 스테이징·ACTIVE_WORK를 다시 확인한다. 최신 앱 버전 +0.01, 확장 manifest/ZIP/DB 버전을 함께 맞춰 한 번 배포한다. 현재 v2.00 운영과 로컬 미배포 코드를 구분한다.
3. 보이는 Edge에서 일반 회원 `buylifemall@naver.com`이 본인 로그인한 세션으로 작은 시험 사진 1장 등록→미리보기→주소 갱신을 확인한다. 사진 UI는 BLC-02 예정이므로 이번 기반 검수는 인증된 API 흐름을 사용한다.
4. 로그아웃 401, 다른 회원 경로 404, 직접 Storage 공개 URL 접근 거부, 익명/회원 JWT로 직접 업로드·서명 거부를 확인한다. 운영자 서버 키를 브라우저에 넣지 않는다.
5. 본인 시험 원고에 정적 사진 참조를 연결하고 기존 검수/준비 모드로 확장 전달·사진 다운로드·주소 갱신을 확인한다. 타 실행·만료 실행 갱신 거부도 확인한다. 실제 최종 발행 금지, 유료 AI 호출 없음.
6. Cron `dry=1`에서 새 버킷 인식과 대상 수를 확인한다. 실제 30일 보관 검증은 운영 시계/파일 생성일을 바꾸지 않고 모의 시험 증거와 운영 관찰을 구분한다. 운영 회원 사진을 시험 삼아 삭제하지 않는다.

## 복구·미완료와 한계

- 실패하면 업로드/새 사진 작업 노출을 중단하고 검증된 이전 앱/확장 버전으로 복구한다. 새 버킷은 비공개·제한 정책을 유지한다. **버킷/정책/기존 사진을 임의로 삭제하는 복구는 하지 않는다.** 정책을 제거하면 기존 넓은 허용 정책이 적용될 수 있다.
- 임시 주소를 가진 사람은 만료 전까지 사진에 접근할 수 있다. 주소는 no-store 응답으로만 전달하고 로그/원고 DB에 저장하지 않는다. 기본 최대 5분, 보관 종료가 가까우면 더 짧게 발급한다.
- 일일 Cron은 한국 시간 03시 실행(`0 18 * * *`, UTC). 30일 시점에 앱 조회를 차단하고 실제 파일 삭제는 다음 Cron에서 처리한다. 지연/실패는 모니터링해야 한다.
- SDK 파일 정보의 `createdAt`(SDK가 `created_at`을 camelCase로 변환)을 기준으로 한다. `updated_at`, 프런트 전달 `expiresAt`, 원고 재저장일을 만료 기준으로 쓰지 않는다.
- 사진 형식 검사는 MIME+파일 헤더 검증이며 완전한 이미지 디코더/유해 파일 검사기를 구현한 것은 아니다. 업로드 사진 수·해상도·재정렬 UI 검수는 BLC-02에서 수행한다.
- 지금은 운영 Storage/RLS 조회·적용·실제 Edge 회원·확장 검수가 미완료이므로 BLC-01 전체 완료로 표시하지 않는다.

## 확인한 공식 자료

2026-10-20 조회. [Supabase 변경 이력](https://supabase.com/changelog)과 [비공개 버킷](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control), [파일 정보](https://supabase.com/docs/reference/javascript/storage-from-info), [임시 주소 발급](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)을 확인했다. Markdown 주소는 웹 도구가 content-type을 지원하지 않아 같은 공식 HTML 문서로 확인했다. 설치된 `@supabase/storage-js` 소스에서 `info()` 반환값 변환과 타입을 대조했다. 정책 조합은 [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)도 확인한다.

서비스: https://naver-blog-agent.buylife.xyz
