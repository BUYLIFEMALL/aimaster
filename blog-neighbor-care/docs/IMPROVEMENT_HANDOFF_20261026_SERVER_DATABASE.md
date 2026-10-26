# 서버·DB 1번 — 구현·검수 인수인계

2026-10-26 · Codex `codex-win-20261025-blog` [역할: blog]. 주인님의 「순서대로 하나씩 진행해」에따라1번만진행. ① AIMaster 운영대상 ref `esgxyikcnnvmlhygjkth`, **운영은기존객체중복여부읽기만했으며스키마/프로그램/회원/키변경0**. 현재로컬구현/검수완료·운영Run대기입니다.

## 결과와 검수

| 항목 | 결과·범위 |
|---|---|
| API/공용권한 | `npm test` **14개통과**. 본인ID결합·동일출처/입력·회원worker금지·오류상세비노출, 공용정지/전화/FREE/구독/등급·기간순서 |
| 실제PostgreSQL | `npm run test:database` **28개통과**, PostgreSQL17.11, [JSON](evidence/database-20261026.json). 실제독립연결40개→30예약/10거절, 회원설정1건경합/이웃당일슬롯/RLS/privilege·펜싱/성공불명/30일만료/허가재확인 |
| 실제Next HTTP | `npm run test:http` **6개통과**, [JSON](evidence/http-20261026.json). 세션없는401/no-store·다른출처403·JSON외415·Origin누락403·GET405. 가짜공개키만사용, 실제회원SSO검수아님 |
| 타입/빌드 | typecheck및최종`npm run build`통과. 로컬빌드총3회시도(초기상위설정실패1·수정후성공2), Vercel빌드/배포0 |
| 합계 | 신규백엔드검수 **14+28+6=48**. 이전메모리모의32개·원래출시40개와별도, 네이버/확장/UI/운영로그인완료아님 |

DB검수는기존캐시Docker이미지에`--network none`·호스트포트0·가상회원만생성했습니다. Supabase의기본ALL권한을가정해명시권한회수도검사했습니다. RLS는로컬auth.uid 호환fixture로검증했으며실제JWT서명·PostgREST인증·운영프로그램회원검수는아닙니다. DB27의HTTP처리→SQL검수도인증은가상회원으로주입한계층검수입니다. 임시컨테이너/HTTP서버종료확인, 실제환경파일/키복사0.

## 구현 범위

- `src/lib/work-api.ts`·`src/app/api/work/route.ts`: 세션소유자·프로그램권한검사후서비스RPC, JSON8KB·필드/상한·동일출처·캐시금지·한국어오류. 본인HTTP는settings/list/configure/create/approve/edit만.
- 인증은Supabase`auth.getUser()`와기존공용권한·전화판정사본을사용합니다. 프로그램비활성/미등록시403. Supabase새/구키이름우선순위와공용SSO쿠키사본유지.
- [SQL](../supabase/migrations/20261026103202_bnc_server_queue.sql):6표·RLS/소유자SELECT·카운터/상태직접변경금지, 서비스전용SECURITY INVOKER RPC. 회원설정행잠금→작업→일일원장/이웃슬롯의잠금순서.
- 전체회원기기/계정합산20/100/30, 이웃당댓글/후속답글합계KST일1개, 전송전60초선점·세대펜싱·최대30초/자정전허가, 최종verify_permit.
- 확정근거없는완료는uncertain/예약유지·회원계정중단. 시간만료로armed/uncertain을재선점하지않음. 성공중복계산/늦은실패되돌림방지. 실계정해제시FK SET NULL로작업/중복기록보존.
- 공용계정은`member_platform_accounts(platform='naver_blog')`만참조. 새계정저장소나별도회원체계는만들지않았습니다. 실제naver_blog카탈로그/연결은4번단계, 현재공용키/연결행미수정.
- runtime라이브게이트초기false, 일반회원/서버역할의runtime변경차단. 승인된운영자SQL의별도정책근거없이켜지않음. 이번소스에네이버발행/댓글실행코드없음.

## 원본·차이와 보완 이유

권한원본`lib/access/checkProgramAccess.ts`·`lib/utils/phone.ts`, Supabase사본은`blog-keyword/src/lib/supabase/{server,admin,cookieDomain}.ts`와정규화내용일치확인했습니다. UI기준으로참고한SEO폴더는읽기만했으며agy파일은수정하지않았습니다. 신규Next설정누락시상위root설정을가져오는문제와내부URL/Host차이를실제빌드/HTTP에서발견해자기폴더설정/Origin검증·회귀검수로수정했습니다. 첫API검수의UTF8크기413/필드400기대값차이는검수입력을분리해정정했습니다.

## 미완료·다음 첫 단계

1. **운영SQL은주인님Run대기.** [적용안내](APPLY_20261026_SERVER_DATABASE.md)·[읽기검수SQL](../supabase/verify_server_queue.sql). 원본인수인계§4의Run주체규칙을유지했습니다. 대상ref확인·SQLhash대조→실행→운영읽기검수. 아직신규6표/RPC가운영에있다고표시하지않습니다.
2. 프로그램/기본요금제등록·실제SSO/프로그램권한/핸드폰·정지E2E, 공용naver_blog연결·확장기기/계정실측·정책허용은후속단계입니다. worker HTTP를회원권한으로개방하거나verified를회원payload로받지않습니다.
3. 프로필/AI·후보전체적합도·확장/실제신청/공감/댓글·예약/품질/예산·30일삭제Cron/UI/배포는미구현. 현재30일만료시실행차단은있지만실제정리정책완료아님. 정책/계정/정리미완료상태로프로그램을공개하지않습니다.
4. 1번운영확인후나머지를순서대로진행합니다. 디자인담당4화면3시안·승인조건/다른세션5번제외/기존Edge·SEO대기는보존합니다.

비용리포트: 무료의존성설치·로컬빌드3회시도/검수, 유료AI·네이버호출·Vercel빌드/배포0. 운영DB읽기1회(충돌/slug확인), 관리자요청/결과메타는별도. 버전실배포/ZIP/프로그램DB버전수정0. **배포: 미배포대기(개발1단계·운영Run/후속구현미완료)**.
