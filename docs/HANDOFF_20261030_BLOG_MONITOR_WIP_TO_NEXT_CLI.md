# 블로그 이웃 소통 자동화 — 다음 CLI 인수인계 (2026-10-30)

> **2026-11-01 갱신:** §4·§5의 WIP는 `9b2fba448`에서 마무리되어 격리 DB까지 검증했고, 탭 전용 설계는 회원 cron-job.org 상시 확인으로 바뀌었습니다. 8시간·RSS 100회 기준은 7일·40,000회로 대체됐습니다. 최신 상태는 `docs/HANDOFF.md` 2026-11-01 항목을 봅니다. §6의 실제 검수·배포는 아직 남아 있습니다.


**최우선: §1 → §4 → §5 순서로 읽고 구현을 이어간다. 프로젝트 완료 아님.**

- 공식 운영: https://blog-neighbor-care.buylife.xyz
- Vercel 보조: https://blog-neighbor-care.vercel.app
- 관리자 결과함: https://www.buylife.xyz/admin/dev-docs/requests
- 직전 완료 기능의 정적 확인 화면: [반복 수락 팝업](/D:/Antigravity/Design/릴레이_데스크_네이버_그린/blog-neighbor-care/accept-schedule-20261030/popup.html)
- 영구 자산: `D:/Antigravity/Design/릴레이_데스크_네이버_그린/blog-neighbor-care/accept-schedule-20261030`

위 로컬 화면은 서버 연결 없는 보존본이며 실제 Edge 캡처가 아니다. 현재 자동 RSS/AI WIP 화면은 아직 영구 보존·실브라우저 확인 전이다. 운영에는 아래 미배포 변경이 없다.

## 1. 지금 멈춘 지점

사용자가 **기능 구현 먼저 계속 진행**을 지시했다. 자동 RSS 감시·동의/예산 기반 AI 초안 준비를 작성하던 중 토큰 1%를 알리고 **지금까지 작업·앞으로 할 작업을 인수인계 파일로 남기라**고 요청했다.

- 마지막 정상 완료 기능: `4ee7dc674` 받은 신청 반복 수락. 단위303, 신규 격리 PostgreSQL9/243SQL, 정리DB11, 타입 통과. 실제 Edge/Naver 검수 전.
- 현재 WIP 체크포인트: **`b3fcfaabf`** RSS 감시·AI 준비 소스. **타입 검사 PASS, 전체 단위308/308 PASS(신규 MON01~05 포함)**.
- **새 SQL은 격리 PostgreSQL에도 아직 적용·검증하지 않았다.** 자동 감시 기능을 완료 처리하지 말 것.
- `tests/monitor-database.mjs`는 마이그레이션 로딩/fixture만 있는 뼈대다. 끝의 `MONITOR_DATABASE_WIP` 예외는 의도적인 미완성 표시다. 예외만 지우고 성공으로 보고하지 말고 실제 검수 항목을 작성해야 한다.
- 소스는 로컬 커밋했으나 **푸시·배포 안 함**. 운영 버전/공개 ZIP은 **v1.03 보존**.
- 기존 완료 변경16묶음 + 현재 WIP1묶음. 운영 미적용 SQL은 기존9개 + WIP1개이며 **10번째는 적용 준비 완료가 아니다**.
- 이번 WIP 작업: 유료AI0, 실제RSS0, 검색API0, 운영업무SQL0, 원격빌드0, 배포0, 푸시0. 테스트 공급자는 모의 응답이다. 관리자 보고/현황 메타 기록은 별도다.

## 2. 사용자 확정사항과 작업 규칙

- 이 세션은 **블로그 전담**, 우선 범위 `blog-neighbor-care`의 3~9번. 다른 프로그램으로 이탈하지 않는다.
- **웹 프로그램 + 확장 프로그램이면 된다. PC 설치/Native Messaging은 폐기했다.** 되살리지 않는다.
- 기능 구현 우선, 구현 과정에 필요한 검사부터 진행한 뒤 실제 검수를 한다. 끝난 하위 작업만 완료 처리한다.
- 브라우저는 Codex=실제 포그라운드 Edge. 기존 창의 새 탭 사용, 새 창 금지. 다른 CLI는 루트 지침의 배정 브라우저를 따른다.
- 프로그램명과 확장명은 **AI 블로그 이웃 소통 자동화**로 맞춘다. 버전은 별도 표시. 디자인은 승인된 릴레이 데스크 네이버 그린, 기존 좌측 메뉴 기준 유지.
- 작은 변경은 모아서 배포한다. 미배포 중 버전 올리기/ZIP 재생성 금지. `npm run build`는 prebuild가 ZIP을 다시 만들므로 주의한다.
- 회원 본인 계정·회원이 선택한 플랫폼/모델·본인 키를 사용한다. CLI 외부 API가 필요한 경우 사용자가 지정한 Claude Code용 Claude API 연동 지침을 따른다. 구독 $200 크레딧을 API 잔액으로 가정하지 않는다.
- 기존 비용/조작 승인을 새 기능에 전용하거나 소진된 승인을 재사용하지 않는다.
- 작업 전 `dev-requests list --role blog` → `docs/roles/blog.md` → 카테고리 지침/비교표 → ACTIVE/HANDOFF를 확인한다. 마지막 조회 시 새 지시0.
- 역할/표/인수인계를 작업 후 갱신하고 관리자 결과함에도 보고한다. 공용 문서는 `safe-commit --begin ... --as codex-win-20261026-blog-check`를 먼저 실행한다.
- 공용 스테이징 사용 중. 경로 지정 커밋, 자신의 커밋 stat 확인. add-all/reset/stash/index 삭제/force push 금지. 이번 인수인계에서 새 CLI에 대한 푸시·배포 승인을 뜻하지 않는다.

## 3. 지금까지 로컬 구현 완료한 주요 기능

| 커밋 | 기능 | 한계 |
|---|---|---|
| `f20ada675` | PC 설치 설계를 제거하고 웹+확장 HTTPS 실행 연결로 전환 | 실제 운영 연동 검수 별도 |
| `b056ca71a` | 보낸 신청 관계·원댓글 ID/작성자·답방 글 읽기 미리보기/재확인/저장 | 실제 DOM profile 필요 |
| `ab26e4627` | 회원 모델/키·전문으로 신청/댓글/대댓글 생성, 정확 인용/사실/중복/품질 검사, 명시 채택→미승인 초안 | 실제 AI 성공·품질·저장 검수 잔여 |
| `20c3eced4` | 전문 완전성/해시/문자 수 확인, 최소30초·분량비례 정독 대기, 탭/계정 변경 중단 | 사람의 이해도 검증은 아님 |
| `7afd15d6a` | 현재 글의 검토 완료 작업을 확장 알람→웹 공용 예약커서로 반복 | 다른 글 탐색은 다음 커밋에서 추가 |
| `c9cb569c2` | 받은 신청 별도 읽기 허가/미리보기/저장→웹 검토→1회 수락, 불확정 읽기 재확인 | 실제 신청 관리 경로/selector 미검수 |
| `ed1c6bd86` | RSS/제공 XML 자료 준비, 전문 권한 확인 저장→AI 화면 전달, 일반 초안 정확본문 승인, 회원 실행 설정, 기존 창 전용 새 탭의 승인 글 순회 | 자동 RSS/AI는 현재 WIP |
| `4ee7dc674` | 받은 신청 반복 수락도 일반 소통과 같은 예약커서/상한 공유, 동시차단/불확정 복구, ready 재검토 | 실제 Edge/Naver 미검수 |

실제 본인이웃43명 저장/재조회는 과거 완료했다(서로17/일반26). 이번에 운영 DB를 다시 조회한 것은 아니다. 기존 이웃 가져오기 전체를 0명 실패 상태로 되돌려 말하지 않는다. 다중 페이지/빈 목록은 별도 본인 계정이 없어 실제 검수 미완료이며 사용자가 추가 계정이 없다고 답했다. 이웃 추가·삭제를 요구하지 않는다.

## 4. 자동 RSS·AI WIP 파일과 설계

### 현재 작성된 파일

- `blog-neighbor-care/src/lib/neighbors/monitor.ts`: 회원/동일출처/JSON 크기/operation 허용목록, 운영 RSS 게이트, 유효한 가격표+모델+예산+동의 검증. RSS 고정 호스트 읽기→메타데이터만 저장. 확인 전문/프로필→기존 메시지 계약/공급자/품질 검사 재사용. 예산 예약 뒤 회원 권한·DB 상태 재확인→AI1회→기존 메시지 결과 저장. 실패·유실은 paused/uncertain, 자동 재호출 없음.
- `src/app/api/neighbors/monitor/route.ts`: 위 handler 연결, `maxDuration=60`, 기존 회원 키/공급자 재사용. namespace를 서버 고정 RPC로만 매핑.
- `src/components/analysis/FeedMonitor.tsx`: 기존 웹 작업공간에 추가. 사용자 시작 후 화면에 보이는 웹 탭에서30초마다 tick. 이웃 최대50명, RSS 제목/주소 동의와 AI 전문 전송/예산 동의 분리. 진행/건수/예약액/전문 대기 수·중단/미확정 확인 UI.
- `src/components/analysis/CommunicationWorkspace.tsx`: 위 UI 삽입.
- `supabase/migrations/20261030160000_bnc_monitor.sql`: **미검증 WIP**. 새2표 `bnc_monitors`, `bnc_monitor_attempts`, RLS/service-only invoker RPC. 회원별 잠금71031·2분 작업 lease·generation·8시간 세션·RSS100회·AI최대20회·가격해시/예상비용 예약상한. 같은 회원/이웃/글은 다른 세션·계정에서도 자동 재생성하지 않도록 unique guard. 기존 수동 생성의 queued/running/succeeded/uncertain 글도 제외하도록 작성했다.
- `src/lib/cleanup.ts`, `tests/cleanup.test.mjs`, `tests/cleanup-database.mjs`: monitor를12번째 독립 정리 단계로 추가. 단위검사 개수 기대값11→12 보정. **새 migration을 포함한 정리DB 재검사는 아직 안 함**.
- `tests/monitor.test.mjs`: MON01~05 PASS. 가격 유효성/입력경계/회원·출처·동의/고정RSS·메타만저장/예산선예약·본인키/성공중복차단/실패비노출을 모의 검사.
- `tests/monitor-database.mjs`: **실제 검수 내용 미작성**. 기존 post-target DB 검사에서 준비 부분을 복사했다. 필요 없는 import/helper를 정리해도 된다.

### 중요한 동작 경계

- **현재 구현은 웹 탭이 열리고 화면에 보일 때의 감시**다. 24시간 서버 Cron이나 확장 알람으로 감시하는 기능은 아니다. 탭 숨김은 중단을 요청하고, 닫기/재시작 뒤 자동 재개하지 않는다. 화면 닫기 시 진행 중인1회 서버 요청은 끝날 수 있고, 후속 tick은 실행하지 않는다. 이 차이를 매뉴얼/보고에 정확히 밝힐 것.
- 공개 RSS의 발췌를 전문으로 간주하지 않는다. RSS 자동 읽기는 제목·주소만 저장한다. **PostPlanner에서 사용자가 전문/권한을 확인한 기존 자료만** 자동 AI 대상으로 쓴다. 확인 전 자료는 대기 표시한다.
- AI 결과는 기존 `bnc_message_jobs`에만 저장하며 **adopt/approve/네이버 등록을 자동 호출하지 않는다**. 기존 문장 생성 화면에서 결과 조회→수정·채택→작업 검토를 재사용한다.
- 사용자 새 시작마다 예산/호출수 상한을 명시 동의한다. 내부 microUSD는 보수적 예상비용의 예약 상한이며 공급자의 실제 청구액을 보장하지 않는다. 실패/불확정은 예약금을 자동 환불·재사용하지 않는다.
- `monitorQuotes`는 기존 플랫폼·모델 카탈로그와 일치하고 유효기한/HTTPS reference가 있는 운영 확인 가격표만 받는다. 하드코딩된 최신 단가를 주장하지 않는다. 입력량은 UTF-8 prompt bytes+8192, 출력6000토큰을 보수적으로 예약하도록 작성했다. 토큰/가격 추정·모델 파라미터가 실제 공급자별 상한에 맞는지도 추가 검토할 것.
- 운영 환경 변수(아직 설정하지 않음): 기존 `BNC_FEED_READ_ENABLED=true` + `BNC_FEED_READ_POLICY_REFERENCE`, 신규 `BNC_AUTO_MESSAGE_ENABLED=true`, `BNC_AUTO_MESSAGE_PRICES`.
- 가격표 JSON 배열 항목: `provider`, `model`, `inputUsdPerMillion`, `outputUsdPerMillion`, `validUntil`, `reference`. **키 값은 설정·문서·로그에 쓰지 않는다.** 실제 단가는 공식 자료로 확인하고 만료기한/근거를 붙인다. 유효 가격표가 없으면 AI 자동 시작 차단.

## 5. 다음 첫 작업 — 구현 마무리 순서

1. 위 WIP 소스/SQL을 다시 읽는다. 아직 PostgreSQL에서 파싱/실행해 보지 않았으므로 성공 가정 금지.
2. `tests/monitor-database.mjs`의 의도적 WIP 예외 전 위치에 실제 검수를 작성한다. DB는 기존과 같이 Docker postgres17-alpine, `--network none`, 호스트 포트0, fixture 회원/키만 사용. `finally` 컨테이너 종료를 유지한다.
3. 최소 검수: anon/authenticated 표/RPC 접근 차단·타회원/계정 격리, 시작만으로 호출0, 회원+이웃 RSS15분 예약 공유, 본문 발췌 미저장·기존 전문/TTL 보존, 확인 전문만AI선택, 프로필 revision/기한/대상OFF/계정끊김, 2작업자1회선점, 예산 초과/호출상한에서 공급자0, 호출 전 예산예약, 결과유실/lease만료/중단 뒤 자동재시도0·재시작 중복0, 성공 저장 후 기존 메시지 조회와 수명 상속.
4. HTTP handler→실제 격리DB→모의 RSS/AI까지 연결한 검수를 추가한다. 실제RSS/AI/Naver 비용 호출은 하지 않아도 된다. SQL 결과와 `reserveEstimate` 전/후 prompt bound 비교가 맞는지 확인한다.
5. `npm run test:cleanup-database`로 migration10을 포함한12정리 단계 회귀를 확인한다. 현재 테스트 시나리오 수는11이지만 정리 데이터셋 수는12다. 새 monitor 데이터 만료/attempt guard/원래수명 보존 검사를 추가한다.
6. FeedMonitor의 실제 React 동작 검사: 조회/모델선택만으로 외부호출0, 별도 동의, 한 번의 루프만, 중단/탭숨김/언마운트/늦은응답이 재실행하지 않음, 응답유실 뒤 결과 확인. `acknowledge`의 언마운트 후 상태 변경 등 비동기 UI 정리도 검토한다.
7. `npm run typecheck`·`npm test`를 다시 실행한다. 필요할 때만 추가 검사한다. `monitor-database` npm script는 아직 추가하지 않았으므로 검수 완성 후 등록한다.
8. guide에 자동 RSS/AI 사용법·환경 준비·실제 요금과 예약 상한의 차이·전문 확인 경계·foreground 웹 탭 제한을 반영한다. 초기 정적 HTML/소스/스펙·증거를 기존 영구 디자인 경로의 `monitor-20261030` 하위에 저장한다. 실제 캡처 여부를 구분한다.
9. 통과 후에만 자동 감시 하위 구현을 로컬 완료 처리하고 역할/작업표/비교표/미배포 표/관리자 결과를 갱신한다. 현재 **미완료/WIP**를 지우는 것만으로 완료로 만들지 않는다.
10. 그 뒤 §6 실제 검수·묶음 배포를 진행한다. 새 확인·비용 승인이 필요한 시점에 구체적 준비 결과와 함께 사용자에게 요청한다. 지금 추가 사용자 조작 요청은 없다.

## 6. 프로젝트 남은 작업 3~9

| 번호 | 남은 내용 |
|---|---|
| 3 | 실제 재가져오기→회원 확인/반영 후 대상 설정·생성시각 유지 확인. 기존43명 보존. |
| 4 | JSON 설정 보강 후 실제 프로필 AI 생성 성공·품질·저장·재조회. 별도 비용 승인 대기. |
| 5 | 후보 검색→권한 확인 전문→AI 평가→선택 전체 흐름 실검수. |
| 6 | 신청/수락의 검수된 실제 관리 경로/DOM profile·동의·한도·성공/미확정 결과 실검수. |
| 7 | 공감/댓글/답방/대댓글 실제 등록 연결·품질·대상·결과 기록 실검수. |
| 8 | **현재 RSS/AI WIP 구현 마무리**, 실제 Edge 반복/중단/복구·재시작 검수. |
| 9 | 준비 완료 SQL만 순차 적용·소스 묶음 배포·버전/manifest/ZIP/DB 동기화·정시 Cron 만료삭제·최종 기준 확인. |

조건부 다중페이지/빈 목록 실제 검수는 별도 본인 블로그가 없어 미완료 유지. 로컬 fixture 통과를 실Naver 성공으로 바꾸지 않는다.

## 7. SQL·버전·승인·운영 식별 정보

운영 미적용 순서(1~9는 직전 로컬 검수 단계까지, 10은 WIP):

1. `20261029044735_bnc_schedule_cursor.sql`
2. `20261029140000_bnc_engagement_inbox.sql`
3. `20261030001500_bnc_extension_execution.sql`
4. `20261030094500_bnc_extension_context_reads.sql`
5. `20261030101500_bnc_message_generation.sql`
6. `20261030120000_bnc_extension_schedule.sql`
7. `20261030133000_bnc_incoming_accept.sql`
8. `20261030143000_bnc_post_targets.sql`
9. `20261030150000_bnc_accept_schedule.sql`
10. **WIP `20261030160000_bnc_monitor.sql` — 運用適用禁止(운영 적용 금지), 검증부터.**

10번은 Supabase CLI `migration new bnc_monitor`로 생성된 `20261030054215` 이름을 선행 pending SQL 뒤로 정렬했다. 이미 운영 적용한 retention/cancel/preferences/evidence4개는 재실행하지 않는다.

- 운영 v1.03, package/manifest1.3.0. 직전 배포 `dpl_FM3zxNjsfHPYB4GrTe2q7LLRXZBu`.
- 공개 ZIP19764bytes, SHA256 `398a10d2d387e2071d1e32bc4b55aab3d7845186a54246f36c071fddedd5a7c6` 보존. 미배포 소스와 ZIP이 다른 것은 의도된 대기 상태.
- Supabase project `esgxyikcnnvmlhygjkth`.
- 회원 `4a82ff77-97f7-474d-866e-8e9431858ed3`, program `e641f213-5062-4f64-83ec-c4650ccaa3e8`, account `283df085-d92a-4d9a-8727-14600a5d662b`, device `e520e32c-cd86-44fa-9391-eae3ae33415a`, blog `buylifemall`(과거 확인값, 이번 운영 재조회 안 함).
- 요청 `668992b9-4d8d-4f57-96db-e0fdf1fb8c7b`: 프로필 JSON 수정 뒤 실생성1회/회원Anthropic/Haiku4.5/최대USD0.05 승인 대기. **새 댓글 자동 생성 승인으로 사용 금지.**
- 요청 `fe166de3-d156-45b8-8563-2a4221387157`: 기존 본인이웃 탭에서 확장 재읽기1회. 수신 후 설정유지 검수. 같은 요청을 중복 생성하지 말고 상태·허가 만료를 먼저 재확인한다.
- 전체 프로젝트 완료 보고 금지. 현재 실제 기능/읽기 게이트를 임의로 켜지 않는다.

## 8. 공유 작업 폴더에서 건드리지 않을 변경

다른 CLI 변경으로 남아 있던 `blog-neighbor-care/docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md`, `docs/evidence/messages-20261030.json`, `public/blog-neighbor-care-thumbnail.jpg`를 이번 WIP 커밋에 넣지 않았다. `scratch/`는 여러 임시 자료가 있으므로 폴더 통째로 커밋하지 않는다. 작업에 필요한 실제 diff를 보고 자기 변경만 처리한다.

신규 이 인수인계 문서 때문에 `node scripts/build-dev-docs-manifest.mjs`를 실행해 목록도 갱신한다. 다음 CLI는 이 파일과 `docs/roles/blog.md`의 최신 요약부터 이어간다.
