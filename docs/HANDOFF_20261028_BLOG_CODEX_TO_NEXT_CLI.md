# 블로그 작업 상세 인수인계 — Codex → 다음 CLI

작성: 2026-10-28 13:49 KST · 역할 `blog` · 이전 세션 `codex-win-20261026-blog-check`.
사유: 사용자가 크레딧 소진으로 다른 CLI가 이어받도록 상세 파일 작성을 요청했고, 진행 중인 작업의 마무리도 요청했습니다.

확인 링크: [공식 운영](https://blog-neighbor-care.buylife.xyz/neighbors) · [Vercel 보조](https://blog-neighbor-care.vercel.app/neighbors) · [관리자 결과함](https://www.buylife.xyz/admin/dev-docs/requests) · [로컬 결과 HTML](file:///D:/Antigravity/Design/릴레이_데스크_네이버_그린/blog-neighbor-care/v1.02-release-20261028/index.html).
영구 자산: `D:\Antigravity\Design\릴레이_데스크_네이버_그린\blog-neighbor-care\v1.02-release-20261028`.

## 1. 재개 시 가장 먼저 확인할 사실

**최우선은 1번 「기존 이웃 가져오기」입니다. 실제 43명 추출·전송·저장은 아직 완료하지 못했습니다.** UI·DB·격리 검사 통과를 실제 네이버 성공으로 보고하지 마세요. 사용자는 이 작업이 남았는데 다른 작업으로 넘어가거나 완료한 것처럼 설명한 점을 지적했습니다.

2026-10-28 13:51 KST 최종 재조회(요청취소·허가철회 후):

| 항목 | 확인 상태 |
|---|---|
| 운영 웹·설치 확장 | v1.02, 정식 명칭 일치, 연결된 블로그 `buylifemall` |
| 실제 네이버 본인 목록 | 43명 표시, 앞선 행 대조에서 서로이웃17·일반이웃26 |
| 실제 가져오기 요청 | 1건 생성, 받은 페이지0·받은 이웃0 → 중단 확인 후 **cancelled** 처리 |
| 회원 이웃 디렉터리 | 0명 |
| 단기 1회 허가 | 1건 발급 후 **철회** 완료. 재사용 불가 |
| 전체 이웃 읽기 게이트 | `bnc_neighbor_import_policy.read_allowed=false` 유지 |
| 자동 소통 | `bnc_runtime.live_allowed=false` 유지 |
| 설치·로그인 | 이미 완료. 다시 로그인·재설치가 필요한 상태라고 말하지 않음 |
| 마지막 실제 장애 | 확장 메시지 「Edge 창이 앞에 있지 않아 목록 읽기를 멈췄습니다.」 |
| 이번 인수인계 작업 | 유료 AI·검색·Vercel 빌드·웹 배포0. 메타 조회·중단 요청 취소·허가 철회만 수행 |

사용자의 마지막 조작 흐름: 팝업 하단 화면 제공 → 「전체 이웃 목록 읽기」 클릭 → 초기에는 동의 미적용 메시지. 네이티브 Toggle 후 읽기 시작 메시지 확인 → Edge 전경 이탈로 중단. 이후 요청이 실제로 생성된 것을 마지막 DB 재조회에서 발견하여 아래 ID를 취소했습니다. **앞선 「요청0」 기록은 그 조회 시점의 사실이며 최종 상태는 취소1건입니다.**

## 2. 첫 재개 절차와 완료 조건

1. 루트 `AGENTS.md`와 관리자 요청부터 확인합니다.
   - `node scripts/dev-requests.mjs list --role blog`
   - `node scripts/index-watch.mjs session-check`
   - `docs/roles/blog.md`, `docs/CATEGORY_GUIDE_MAP.md` 블로그 줄, 작업 중 표, 루트 HANDOFF 상단.
   - 이 문서가 이전 역할 파일의 누적된 「현재」「다음 단계」 문구보다 최신입니다. v1.01/배포승인 대기는 과거 기록이며 재배포·기존 SQL 재적용 근거가 아닙니다.
2. DB의 최신 요청 상태·디렉터리 건수·활성 허가를 먼저 조회합니다. 아래 취소 상태가 바뀌었는지 확인합니다. 이 문서만 믿고 성공이나 실패를 추정하지 않습니다.
3. 실제 사용 브라우저와 전경 상태를 확인합니다. **읽기 버튼을 누른 뒤 완료 메시지가 나올 때까지 해당 브라우저·탭을 앞에 유지**해야 합니다. 사용자가 채팅으로 즉시 돌아오면 중단될 수 있습니다. 조회 도구가 전경에 영향을 주는지도 분리해서 확인합니다.
4. 기존 연결을 유지하고 본인 이웃 관리 전체 목록 첫 페이지를 엽니다. 그룹전체·이웃전체·새글소식전체, 검색어 없음, 본인 `buylifemall`, 총 인원과 페이지 수를 다시 확인합니다.
5. 읽기 직전에만 관리자 SQL로 **현재 활성 회원·계정·기기에 한정된 새 허가**를 발급합니다. 최대15분·1회·실제 확인한 페이지/인원 범위. 기존 허가는 철회·소진되어 재사용 불가입니다. 전체 읽기 게이트를 켜서 대체하지 않습니다.
6. 팝업 「기존 이웃 가져오기」의 본인 목록 읽기/임시 전송 동의 체크 → 「전체 이웃 목록 읽기」1회. 「현재 글 1개 읽기」는 다른 기능입니다. 기존 취소 상태는 확장의 `neighbors_status` 조회 후 새 요청 생성 경로로 넘어갑니다.
7. 완료 메시지와 서버 `state=ready`, 페이지1/1, 수신43/표시43을 대조합니다. `capturing`이나 일부 수신을 완료로 표시하지 않습니다. 오류면 메시지·서버 상태를 확인하고 무작정 재클릭하지 않습니다.
8. 기존 프로그램 탭 `/neighbors`에서 「가져온 목록·진행 상태 조회」 → 해당 요청 열기 → 범위·43명·서로/일반 구분 대조 → 확인 체크 → 「확인한 이웃 목록 반영」.
9. DB `confirmed`, 디렉터리43명, 서로이웃17/일반26, 새글·답방 기본값(서로ON/일반OFF) 확인. 기존 설정이 있으면 재가져오기 때 보존되는지 확인합니다. `bnc_neighbors`에 신뢰 관계를 자동 생성하지 않습니다.
10. 새 허가 철회 후 전체 읽기/자동소통OFF를 재확인합니다. 실제1페이지43명 완료와 실제 다중페이지/빈 목록 미검수를 구분해 문서·요청함을 갱신합니다.

**1번 실제 완료 조건:** 설치 확장이 네이버의 실제43명을 전송하고, 회원 확인을 거쳐 프로그램 DB에43명이 반영되며, 웹에서 재조회하고 관계 구분·대상설정·게이트OFF까지 대조한 경우입니다. 그 전에는 계속 미완료입니다.

## 3. DB 식별 정보와 현재 요청

운영 Supabase ref: `esgxyikcnnvmlhygjkth`. 아래는 비밀키가 아닌 내부 식별자입니다. 토큰/쿠키/키 원문은 이 파일에 없습니다.

| 용도 | 값 |
|---|---|
| 현재 프로그램 회원 | `4a82ff77-97f7-474d-866e-8e9431858ed3` |
| 본인 연결계정 | `283df085-d92a-4d9a-8727-14600a5d662b` |
| Edge 연결기기 | `e520e32c-cd86-44fa-9391-eae3ae33415a` |
| 본인 블로그 ID | `buylifemall` |
| 마지막 가져오기 | `8e02b353-2643-44e0-9d56-d7504f20f224` — cancelled |
| 마지막 허가 | `3c70d78f-f6cc-43e7-85be-35fdc711e519` — revoked、원래 만료13:57:53 KST |
| 회원 웹 로그인 확인값 | `buylifemall@naver.com` |

**회원 로그인 이메일과 CLI용 Claude 키 귀속 이메일은 서로 다릅니다.** 자동화 회원을 Gmail 계정으로 바꾸거나 키를 복사해서 회원 소유권을 바꾸지 않습니다.

읽기 전용 상태 확인 예시:

```sql
select id,state,total_pages,total_count,captured_count,last_page,valid_until,confirmed_at
from public.bnc_neighbor_imports
where device_id='e520e32c-cd86-44fa-9391-eae3ae33415a'
order by created_at desc limit 5;

select relation_type,new_posts_enabled,return_visits_enabled,count(*)
from public.bnc_neighbor_directory
where user_id='4a82ff77-97f7-474d-866e-8e9431858ed3'
  and account_id='283df085-d92a-4d9a-8727-14600a5d662b'
group by 1,2,3;

select read_allowed,revision from public.bnc_neighbor_import_policy;
select live_allowed from public.bnc_runtime;
```

SQL 실행은 연결된 Supabase 도구를 사용합니다. 새 기기·계정으로 이어받으면 위 ID를 그대로 사용하지 말고 현재 인증된 회원/활성기기/연결계정을 재결합합니다. 키 해시·토큰·본문 원문을 조회 결과에 섞지 않습니다.

## 4. 이번에 적용한 1회 허가 변경

커밋 `49a1901ce`.

- 파일: `blog-neighbor-care/supabase/migrations/20261028042655_bnc_member_import_permit.sql`.
- 운영 적용 이름: `bnc_member_import_permit_20261028`, 성공 확인. **다시 적용하지 않습니다.**
- 새 표 `bnc_neighbor_import_permits`: 정확한 회원·계정·기기·policy revision, 최대15분, 페이지/인원 제한. 한 허가당 한 요청만 허용합니다. 취소해도 소진 상태를 유지합니다.
- RLS ON. `anon/authenticated` 접근 없음. `service_role`은 SELECT/DELETE만, INSERT/UPDATE 불가. 허가는 관리자 SQL로 발급합니다.
- 기존 RPC는 SECURITY INVOKER 유지. 기존 함수 본문 MD5 `29e6e8f303750bb84c56291317948f0d` 일치 때만 변경하도록 원본 검사 포함.
- 예약/페이지전송/최종반영 시 만료·철회·범위·revision을 검사. 전체 읽기OFF에서 이 한정 허가만 수락합니다.
- 만료 정리 시 참조 중인 허가 감사기록은 보존하고, 참조 없는 만료 허가만 정리합니다. 디렉터리 최소설정 보존.
- 기존 API·확장 payload와 호환되어 이 SQL에 웹 재배포/확장 재설치는 필요하지 않았습니다. v1.02 유지.
- 이 허가는 **프로그램 내부의 본인 목록1회 수신 범위**이며 NAVER 공식 허락을 얻었다는 의미가 아닙니다. 타인 전문·주기적 관계감시·신청/공감/댓글/반복의 미확인 범위를 확대하지 않습니다.

원래 운영 migration `20261027141316_bnc_neighbor_import.sql`을 수정하거나 전체 예전 SQL을 다시 실행하지 마세요. 기존 원본18항목 검사 후 새 migration을 적용해 추가7항목을 검사하는 회귀 구조입니다.

## 5. 완료한 것과 검수 근거

| 기능 | 실제 상태 |
|---|---|
| 정식 명칭 | 프로그램·확장 모두 「AI 블로그 이웃 소통 자동화」 |
| UI | 사용자 선택3번 「릴레이 데스크 — 네이버 그린 변형」 적용 |
| AI 선택 | 플랫폼 선택 → 해당 플랫폼 모델 선택 UI 적용 |
| 회원·확장 연결 | 실제 로그인/설치/연결 및 v1.02 재로드 확인 |
| 본인 글1건 | 읽기→미리보기→전송→저장→웹 재열기 실제 검수 완료 |
| 프로필·후보 서버 | 회원 본인키·AI전송 동의·원본 수명·중복호출 차단·수정본/후보평가/선택 구현, 실제AI 성공은 미완료 |
| 후보 검색·본문 파일 | 검색 요약 연결 및 회원 제공 TXT/MD/JSON 본문 입력 구현. 검색 요약을 전문으로 취급하지 않음 |
| 이웃 디렉터리 | 저장/명시확인/대상 설정 구현·격리 검수 완료. 실제 네이버 저장0 |
| 1회 허가 | SQL 운영 적용, 제한/권한 격리 검수 완료. 실제 수신0 |

본인 글 검수 자료: 원문 ID `224427408654`, 제목 「AI수익화, 지금 시작하는 5가지 방법」, 저장3727자, 자료1건. 최초 수명2026-10-27 03:53:19Z → 2026-11-26 03:53:19Z. 재조회로 수명을 늘리지 않습니다. 본문을 공유 문서에 복사하지 않습니다.

최근 검사:

- `npm test` — 152/152 통과.
- `npm run test:neighbor-import-database` — 격리 PostgreSQL17、네트워크none/호스트포트없음、25/25 통과、컨테이너 종료 확인.
- 3페이지125명/빈 목록/중단·계정 변경/권한·범위/만료·철회/한 번만 사용/확인 전 미반영 검사 포함. **설치 확장의 실제 네이버 다중페이지 검수와 별개입니다.**
- `blog-neighbor-care/docs/evidence/neighbor-import-database-20261027.json` — 격리25항목 결과.
- `blog-neighbor-care/docs/evidence/neighbor-import-permit-20261028.json` — 최초 SQL 적용 직후 스냅샷(허가0/요청0); 이후 실제1건·취소/철회는 이 인수인계가 최신입니다.
- 보안 advisor: 서버전용 허가 표의 RLS/no-policy INFO 확인. 회원 정책을 추가해서 경고를 없애지 않습니다.

주요 코드: `extension/neighbor-importer.mjs`(전경/탭·단계 제어), `extension/neighbor-extractor.mjs`(DOM·프레임·페이지검증), `extension/background.mjs`(인증·호출경계), `extension/popup.mjs`(동의/읽기/결과), `tests/neighbor-import-database.mjs`(실제SQL 통합검사).

## 6. AI 실패와 CLI API 지시

실제 프로필 생성1회를 승인 범위 내 실행했으나 요청 `e207aead-b540-4ec5-af46-8b371dafc30c`는 `uncertain/GENERATION_UNCONFIRMED`, 저장된 분석 결과 없음. 원래1회 승인은 소진됐으며 동일 요청 자동 재생성은 차단해야 합니다. 실제 공급자 요청 수·토큰·청구액은 독립 확인되지 않았습니다.

동일 회원 키로 본문 없는 모델 목록GET은200, Haiku4.5-20251001 확인. 이것이 과거 생성 성공이나 과금·잔액 정상 증거는 아닙니다. 실제 실패 원인은 미확정입니다.

사용자 최종 지시: **CLI가 외부 API를 사용해야 할 때 `buylifemall@gmail.com` 귀속 Claude Code용 Claude API 연결을 적극 활용**. 사용자 설명은 월간 $200 크레딧 연동이며 실제 차감 경로/잔액을 확인한 것은 아닙니다. 월 구독과 일반 API 과금이 자동 공유된다고 단정하지 않습니다. 키 원문은 문서·채팅·명령 출력에 기록하지 않습니다.

관련 정책: 루트 AGENTS/CLAUDE 상단, `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md#cli-api-claude-code`; 정책 커밋 `5cd10546a`, `8fd0021c5`. 회원 서비스는 해당 회원 본인 키를 사용한다는 원칙을 유지합니다.

진단 도구 `blog-neighbor-care/scripts/diagnose-profile-once.mjs`는 기본 준비모드이며 명시된 소진/철회 승인 재사용을 거절합니다. 별도 진단 요청 `df361204-55e4-4f74-967d-eb99b7967f14`는 **철회됨**. 기존 원장에 승인 대기로 남은 문구는 과거 상태입니다. 이웃 가져오기에는 AI가 필요하지 않습니다.

## 7. 배포 상태·미배포 소스

운영 웹/DB등록/확장 표시 v1.02, package/manifest1.2.0. READY 배포 `dpl_9AoWhXoq7SZTEJykyR6UQgjzSFve`.
Vercel 프로젝트 `prj_sofdvYyCKAKO5ymLTRZ0vHwYK9q8`、팀buylife `team_orq6xPe9P3c1uMQdKlJsQ6k9`.

사용자 지시로 작은 수정은 모아 배포합니다. **현재 새 Vercel 빌드 승인은 남아 있지 않습니다.** 이전 승인2회는 실패1회/성공1회로 사용됐습니다. 이번 1회허가SQL에 Vercel빌드는 없었습니다. master 푸시도 메인사이트 빌드를 만들므로 이번 작업은 커밋만 하고 푸시하지 않았습니다.

미배포 보완3건:

| 커밋 | 내용 | 상태 |
|---|---|---|
| `c4315e9f4` | 3종 자료 만료정리 실패 격리·부분실패 응답 | 로컬 검수, 묶음 미배포 |
| `eac6b05f8` | 분석 실패 단계/고정사유/HTTP상태 기록 | 로컬 검수, 묶음 미배포 |
| `bc647bfcf` | 공급자 거절사유 분류·제한된 진단도구 | 로컬 검수, 묶음 미배포 |

SQL허가 운영적용을 이3건 웹 수정 배포로 보고하지 않습니다. 버전은 다음 실제 배포 때 한 번만 올리고 manifest/ZIP/DB를 함께 맞춥니다.

확장 설치 폴더: `D:\Antigravity\Extensions\blog-neighbor-care-v1.01` — 이름은 옛 버전이지만 내용은v1.02. **폴더를 옮겨 확장ID/연결을 바꾸지 않습니다.** ID `dnhdiinhfknkonedobhgbfjimojdhnij`.
마지막 배포 ZIP SHA256: `cb609b81f23f892e68874b15cdf34aa23ba887cecc27401b7c1875a14c76bccc`、원본9파일 일치 검수 완료.

## 8. 브라우저와 전경 문제

Codex는 실제 Edge만 사용하며 기존 창의 새 탭을 사용합니다. 새 창을 띄우지 않습니다. 마지막 HWND `1838288`, PID `36584`는 시점 값이므로 재조회합니다.

- 본인관리 상위 URL: `https://admin.blog.naver.com/buylifemall`.
- 실제 목록 프레임: `https://admin.blog.naver.com/BuddyListManage.naver?blogId=buylifemall`.
- 팝업: 위 확장ID의 `popup.html`; 설치확장 툴바 클릭을 통해 정상 권한으로 엽니다.
- 현재 탭: AIMaster 내구독/로컬결과/네이버관리/프로그램/확장관리. 다른 CLI 탭은 건드리지 않습니다.
- `orca computer get-app-state --app msedge --window-id <현재ID> --no-screenshot --json`으로 실제 UI 접근 가능. 인덱스는 매번 새 상태에서 얻습니다.
- JSON 앞 crashpad 경고가 붙을 수 있습니다. 첫 `{`부터 파싱. 실행이 session_id를 반환하면 완료를 기다린 뒤 파싱합니다.
- `perform-secondary-action ... --action Select` 탭 선택은 실제 UI 변화로 검증했습니다. `Toggle` 동의 후 읽기 시작 메시지도 확인했습니다. 호출 성공 자체는 상태변경 증거가 아니므로 재조회합니다.
- 일부 시점 GetForegroundWindow=0, 화면캡처실패、toolbar synthetic click 미전달. 창이 실제로 앞에 있다는 뜻으로 tree 접근을 사용하지 않습니다.
- 확장 `neighbor-importer.mjs`의 `active()`가 매 단계 `windows.get(...).focused`를 검사합니다. 중단은 현재의 보수적 동작입니다. 이 검사를 제거해 성공으로 만들지 않습니다.

**다른 CLI가 이어받는 경우:** 루트 CLI별 브라우저 규칙을 따릅니다(Claude Code=Chrome, agy=Whale). 사용자에게서 그 세션의 Edge 사용 지정을 받지 않았다면 이 문서가 Edge 예외 허가를 대신하지 않습니다. 기존 Edge 연결은 보존합니다. 새 브라우저 연결이 꼭 필요할 때만 현재 계정·기기를 확인해 연결하고, Edge 토큰/쿠키를 복사하지 않습니다.

## 9. 이후 남은 작업 순서

1. 실제 기존이웃43명 추출→전송→회원확인→저장→웹재조회.
2. 실제 다중페이지·빈목록·중단/계정전환 검수(합성 통과와 구분).
3. 실제 AI프로필 실패 원인 확정·저장된 분석 성공 확인.
4. 후보검색→이용범위가 확인된 본문 확보→실제평가·선택 전체 흐름 검수. 타인본문 자동확보는 미구현/허용범위 미확인.
5. 가져온 실제이웃의 새글·답방 대상설정/재가져오기 보존 검수.
6. 이웃신청·수락확인 실제 확장 실행/결과기록.
7. 공감·댓글·답방·대댓글 실제동작/중복방지/불확실 결과 확인.
8. 예약·반복 실행/활성시간/중단·재개·이중실행 방지.
9. 운영Cron 만료정리 실물·소통 생성문장 정리 및 미배포3건 묶음배포.

사용자는 이 세션을 블로그 전담으로 지정했습니다. 전체 블로그 관련 폴더는 `docs/roles/blog.md`에 있으며, 다른 카테고리 작업을 남은 목록에 섞지 않습니다. 워크스페이스·플래너 상태연결/이미지 수정 후 원고복귀(과거 목록5번)는 다른 세션 담당으로 이 세션 범위에서 제외합니다. 블로그 본문/이미지 웹완성→확장 자동입력→회원 선택 발행전/즉시/예약→결과기록의 공통 완성 기준도 유지합니다.

## 10. 요청함·문서·공유 저장소 주의

- 팝업열기 요청 `9ad39d88-d7d6-4f48-844a-e97688db6219`: 사용자가 실제 팝업을 열어 스크린샷 제공함. 재개 때 요청상태를 확인하고 필요한 경우 처리합니다. 로그인/설치 요청으로 바꾸지 않습니다.
- 기존 공식수단 확인 요청 `3e257d73-f19e-407b-b625-9cb757deb332`는 반복감시/타인자료/소통의 미확인 범위와 구분. 이번 내부1회허가를 NAVER 승인으로 기록하지 않습니다.
- 최근 결과: `e09e3831-302a-462d-b1bf-b2cde0dde008` SQL적용/실전송대기, `02cc1dc7-beb2-43ad-83f3-a52e41b7e08e` 허가발급, `0a0e7e5a-fe32-4367-8c55-c9712343f221` 전경중단. 이 문서의 취소/철회 상태가 더 최신입니다.
- 작업 후 역할·ACTIVE_WORK·루트HANDOFF·블로그 기능 비교표/프로그램 비교표를 최신화하고 결과를 `dev-requests.mjs report`로 남기며 채팅에도 같은 결과를 설명합니다.
- 공유 파일은 `scripts/safe-commit.mjs --begin ... --as <새세션>` 후 수정·safe-commit. 일반 소스도 경로 지정 커밋. `git add .`/`-A`, 경로없는commit, stash/reset-hard/index삭제/강제푸시를 사용하지 않습니다. 본인 커밋 SHA의 stat를 확인합니다.
- **기존 타작업 변경 보존:** `blog-neighbor-care/docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md`의 미커밋25줄은 이번 작업 변경이 아닙니다. 다른 프로그램의 변경도 포함하지 않습니다.
- 이 세션 scratch 생성기/문서편집 helper는 실행하면 중복 문서 추가/이미 적용된 SQL 재생성 우려가 있습니다. 자동 재실행하지 않습니다. 실소스·migration·검수결과·이 인수인계를 기준으로 합니다.
- 신규 문서 등록은 `node scripts/build-dev-docs-manifest.mjs`로 갱신합니다.

관련 상세: `blog-neighbor-care/docs/IMPROVEMENT_HANDOFF_20261028_NEIGHBOR_IMPORT.md`, `blog-neighbor-care/docs/IMPROVEMENTS.md`, `docs/BLOG_FEATURE_MATRIX.md`, `docs/PROGRAM_CAPABILITY_MAP.md`, `docs/analysis-naver-blog-neighbor-20261024/SPEC_20261026_BLOG_NEIGHBOR_CARE_0A.md`.

## 다음 CLI에 전달할 시작 문장

> `docs/HANDOFF_20261028_BLOG_CODEX_TO_NEXT_CLI.md`를 먼저 읽고 blog 역할을 인수해 주세요. 최우선은 기존 이웃43명 실제가져오기입니다. 운영v1.02/로그인/설치/연결은 완료됐고, 단기허가SQL도 적용됐지만 전경 이탈로 수신0명이며 마지막요청은 취소/허가는 철회됐습니다. 현재 DB와 브라우저를 대조한 뒤 본인 목록1회 허가부터 정확히 재개해 주세요. 작은 수정은 묶음배포하며 실제 성공 전에는 완료로 보고하지 마세요.
