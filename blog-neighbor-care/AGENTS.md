# AI 블로그 이웃 소통 자동화 — 담당 지침

> **최신 본문입력:** 2026-10-27 회원제공 후보본문 파일입력 로컬완료(소스 `b323fda03`, 미배포): 글별UTF-8 TXT/MD·일괄JSON→본문미리보기→확인후입력/원자적합치기·충돌거절→권한/AI동의재확인. 파일선택시네트워크/저장/AI없음. 단위93(파일11)/HTTP32·타입/Next빌드 통과, ReactDOM파일→확인→반영검수. Edge화면접근성만확인·캡처실패/실브라우저파일선택은미검수. **타인본문자동수집은허용근거미확인으로미구현·운영차단유지**. 운영SQL/실회원/실제AI/배포·관계/소통/반복은남음. v1.01·묶음배포대기·비용0. [인계](docs/IMPROVEMENT_HANDOFF_20261027_CANDIDATE_BODY_FILES.md). 자동본문확보완료로바꾸지않습니다.

> **최신 후보검색:** 2026-10-27 후보 검색 요약 연결 로컬 완료(소스 `3deb42409`, 미배포): 확인한 프로필 키워드→회원 본인 NAVER API HUB 키/사용량 동의→1회 최대20개 요약검색→본인/중복/날짜/주소 사전선별→주소·제목만 후보 입력. 본문/권리확인은 빈칸·미확인 유지, AI점수/관계확인 아님. 단위82/로컬HTTP31·타입/빌드/키조회사본 동일성 통과. 실제 검색API/AI/운영SQL·권한/배포 변경0. 본문 자동확보·관계·실제소통·반복·새UI 실회원/실제AI·운영반영은 남음. [인계](docs/IMPROVEMENT_HANDOFF_20261027_CANDIDATE_SEARCH.md). 아래 후보검색미구현은 이전 단계 기록.

> **최신 UI:** 2026-10-27 사용자선택 3번 **릴레이 데스크 — 네이버 그린 변형** 및 플랫폼→모델 선택 반영. 프로필/확인본·후보 본문제공/평가/선택·매뉴얼·설정·기존reader메뉴 로컬구현. 단위74/실제격리DB14/로컬HTTP29·타입/Next빌드·ZIP 통과. **운영SQL·새UI실회원/실제AI·배포 미완료**, 후보검색/자동수집·실제소통/반복은후속. v1.01유지·명칭수정과묶음배포대기, 추가AI/Vercel0. [구현·검수·후속](docs/IMPROVEMENT_HANDOFF_20261027_RELAY_UI.md). 아래 서버단계/UI대기는 당시 기록.

> **최신 서버 단계:** 2026-10-27 프로필·후보 평가 서버 로컬 구현 완료(미배포): 회원 본인 키·별도 AI 전송 동의·출처 인용 검사·회원 프로필 수정본·후보 잠정 주제점수/선택·원본 수명 상속·중복 호출 방지·대기 취소. 단위70/실제 격리DB14/로컬 HTTP25·타입/빌드·공용사본9곳 통과. 운영 신규2표/RPC·실제 AI·정식 UI는 미적용/미검수. v1.01 유지, 명칭70f146a6c와 묶음 배포 대기. 다음 배포 전 신규SQL 필수(Cron 정리 연계). AI/Vercel 비용0·네이버 외부동작0. [상세](docs/IMPROVEMENT_HANDOFF_20261027_PROFILE_CANDIDATES.md).

> **최신 실제검수(2026-10-27):** 2026-10-27 13:21 본인 글1건 읽기 연결 전체 흐름 실검수 완료: 실제Edge에서 reader의연결·받은글새로고침→제목클릭→받은본문열림메시지·원문224427408654주소·만료2026-11-26 12:53:19 KST 확인. 표시본문과운영저장본문은공백정규화MD5 6cd039bf07e7b9cf740b92de52d6ec0e 일치, 저장3,727자·자료1건유지. 회원연결→미리보기3,738자→사용자확인후전달→completed/소유자일치/원래720시간→웹재열기까지통과. 원문본문을공유문서에복사하지않음. 이완료는해당계정/해당단일글1건검수이며다른회원분리/정지·핸드폰·모바일·구형에디터·반복자동읽기·AI/자동소통·Cron실행/만료삭제실물까지완료한것은아님. 다음주력은기존플랜의프로필/후보처리. 명칭70f146a6c는소스/설치폴더/로컬ZIP만반영·작은수정묶음배포대기유지, 추가배포/AI/네이버게시0. 프로그램재조회요청f506cdbd완료.

> **최신 미배포 대기(명칭):** 2026-10-27 명칭 실제 수정(70f146a6c): 공식 프로그램명 「AI 블로그 이웃 소통 자동화」와 extension manifest.name/default_title·팝업 title/상단 프로그램명·웹 reader 상단명을 통일. 기능명은 내부 제목/버튼으로 유지. 로컬 ZIP2종 8271bytes·원본7파일/버전 일치 및 타입검사 통과. D:/Antigravity/Extensions/blog-neighbor-care-v1.01 설치폴더의 manifest/popup도 갱신. 버전v1.01유지·운영 다운로드/웹은 미배포 대기, Edge 실제 재로드/새표시명은 확인 전. 다음담당은이름대기수정을다음릴리스에포함하고ZIP/실제설치본까지확인합니다.

> **최신 운영(2026-10-27):** 2026-10-27 운영 반영 완료: reader4표/RLS·서비스전용RPC·naver_blog카탈로그, 기본3등급 coming프로그램 등록, Vercel배포1회 Ready(v1.01), 도메인/서버환경4개·일일Cron활성. 운영HTTP/ZIP원본7파일·DB/확장/ZIP버전검수통과. 실제회원SSO/확장설치·본문전달·Cron첫실행은미검수, 자동소통OFF. [결과/남은시험](docs/IMPROVEMENT_HANDOFF_20261027_READER_EXTENSION.md). 아래 미배포 기록은 이전상태.

> **2026-10-27 읽기확장 준비:** 회원·확장 연결/본인글1개 읽기 소스·ZIP·단위54/SQL16/HTTP23·타입/빌드검수 완료. **신규reader운영SQL/프로그램등록/배포/설치검수는아직미완료.** 다음담당은 [설치본/SQL·배포안/한계](docs/IMPROVEMENT_HANDOFF_20261027_READER_EXTENSION.md)를 먼저 읽습니다. 기존6표운영완료와 새reader4표미적용을구분합니다. v1.01은첫배포예정값이며릴리스완료표시가아닙니다.

> **2026-10-27:** 회원제공자료 사전선별 API를 추가했습니다. 다음자료작업전 [미리보기 계약/검수·한계](docs/IMPROVEMENT_HANDOFF_20261027_MATERIAL_PREVIEW.md)를 읽습니다. 단위31/HTTP12·타입/빌드통과, 미배포. 실제본문/계정/AI 검수는미완료.

> **최신 상태:** 2026-10-26 23:47 운영SQL 적용·읽기검수 완료: 신규6표 RLS=true, runtime=false, RPC는service_role만, 회원직접쓰기/서버runtime수정불가, jobs/settings0. 프로그램등록·실제SSO/계정·UI/AI/확장·30일정리·배포는 미완료. 사용자 후속 실행 지시에 따라 Codex가 적용했습니다. 생성 SQL 재실행 대신 [완료검수/다음단계](docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md)를 확인합니다.

2026-10-26 · 담당 `codex-win-20261025-blog` [역할: blog]. 루트 지침 우선. ① AIMaster 운영용 신규 독립 기본 프로그램 `blog-neighbor-care`, 운영ref `esgxyikcnnvmlhygjkth`.

## 목적·현재 상태

본인 블로그에 맞는 후보 선별→서로이웃 신청/수락→새 글 공감/분석/댓글→외부 결과 기록. [원문 D1~D9](../docs/analysis-naver-blog-neighbor-20261024/HANDOFF_20261024_BLOG_NEIGHBOR_CARE.md) 유지. 현재 **1번 서버/DB와 자료미리보기API 구현**, 기존6표운영SQL 적용·검수완료, 추가reader4표운영미적용·프로그램등록/배포/실제확장읽기 미검수. 연결시험용 /reader 화면·읽기확장은준비됐으나미배포, 정식4화면UI·AI생성은아직없습니다. 자료미리보기는회원제공입력만 처리하며 외부수집/저장없음. 계획 초기버전v1.01(package1.1.0), 실제릴리스 아님.

## 구조·도구

- Next16.4.2 API-only `/api/work`, Supabase SSR0.12.7/JS2.117.3, TypeScript5.9.3. 개인 환경파일/키를 복사하거나 하드코딩하지 않습니다.
- 회원인증 `auth.getUser()`→활성프로그램 확인→공용 `checkProgramAccess`→서버전용RPC. 소유자는 세션에서 결합하며 요청의user_id/성공증거/작업상태를 믿지 않습니다.
- `bnc_dispatch`: 서비스 역할 전용·SECURITY INVOKER·고정search_path, 회원설정행 잠금으로 상한/이웃슬롯/상태를 원자적으로 처리. 관찰/claim/arm/verify_permit/result는 회원HTTP에 노출하지 않습니다.
- 회원SELECT는본인RLS만, 직접상태/카운터변경·RPC호출불가. 서버 역할도runtime업데이트불가. 라이브게이트는 **초기false**이며 운영자 SQL로 정책근거를 별도로 확인하기 전 켜지 않습니다.
- 본인공용 `member_platform_accounts`의 `naver_blog` 연결 참조만 받습니다. 이 플랫폼 연결/카탈로그 등록·실제기기 검증은4번 확장단계에서 필요하며, 네이버로그인OAuth를 블로그쓰기 권한으로 취급하지 않습니다.
- Postgres17.11 Docker격리검수: 네트워크none·호스트포트0·가상회원만, 검수후본인컨테이너삭제. 운영DB를 로컬검수에 쓰지 않습니다.

## 공용 사본 원본

`src/lib/programAccess.ts`←루트`lib/access/checkProgramAccess.ts`; `src/lib/utils/phone.ts`←루트`lib/utils/phone.ts`; Supabase server/admin/cookieDomain←`blog-keyword/src/lib/supabase/`의 동명파일. 사본규칙은루트를따르며 직접규칙을변경하지않습니다. 다른CLI는 원본변경시여기도함께대조합니다. 별도`access.ts`에서프로그램활성/운영ref를확인합니다.

## 검수·운영 적용

```powershell
npm ci --ignore-scripts
npm test
npm run test:database
npm run build
npm run test:http
```

명령은 **이폴더**에서만 실행. DB검수는캐시된`postgres:17-alpine` 필요(`--pull never`), 실제DB/회원키연결없음. HTTP검수는빌드뒤실행, 가짜공개키/세션없음 경로만 확인. 실제Supabase로그인/Edge E2E통과로보고하지않습니다. [검수·인수인계](docs/IMPROVEMENT_HANDOFF_20261026_SERVER_DATABASE.md)와`docs/evidence/`참고.

**운영SQL:** [적용안내](docs/APPLY_20261026_SERVER_DATABASE.md)·검수SQL을 먼저제시합니다. 원본 직접Run 절차는 이번 검수본에 한해 사용자 후속지시로 변경해 Codex가 실행했습니다. 신규6표/함수/RLS/권한만 적용했으며 기존키/회원권한/프로그램행은 미수정입니다.

## 기능·장단점·이력

- 구현: 설정/작업준비·승인/수정/목록, 회원합산상한20/100/30, 이웃당댓글·답글합계1/KST일, 선점세대·30초허가재확인, 결과불명중단·재전송방지, 연결해제시작업보존.
- 로컬검수: API14·SQL28·실제NextHTTP6=48. 메모리모의32개와별도이며 원래출시40개전체완료아님.
- 한계: 실제JWT/SSO·프로그램권한운영E2E·정책허용·외부계정관찰·확장·UI·AI·30일삭제Cron미구현. 생성물만료실행차단만현재구현.
- 2026-10-26: 서버/DB 1단계 최초작성, 운영미적용/미배포. 사용범위는[플랜](docs/PLAN_20261026_SERVER_DATABASE.md).

## 대기·연계·디자인

1번운영적용/읽기검수 완료. 다음은 허용자료·본인Edge 읽기검수와2번프로필/AI·3번디자인·4번확장순서로진행합니다. UI는디자인담당의4화면3시안/승인후. 다른세션5번워크스페이스/플래너·이미지원고복귀는제외. 기존Edge에이전트/SEO대기기록보존. [개선원장](docs/IMPROVEMENTS.md)·[대기목록](docs/IMPROVEMENT_BACKLOG.md)·[디자인전달](docs/DESIGN_HANDOFF.md).
