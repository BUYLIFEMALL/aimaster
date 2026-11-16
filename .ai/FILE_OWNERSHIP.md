# 파일 점유·수정 범위 — Master 조정표

2026-11-16 사용자 지시: 각 역할은 임의로 파일을 고치지 않는다. 편집 직전에 다른 세션의 작업 여부를 확인하고, 해당 파일이 비어 있을 때 자신의 배정 범위를 등록·재확인한 다음 수정/추가한다. 완료 판정은 Master가 한다.

## 매번 편집 직전

1. 배정 작업ID·허용 파일을 확인한다. 추가 파일이 필요하면 먼저 Master에게 파일 목록·이유·영향을 요청한다.
2. 최신 `docs/ACTIVE_WORK.md`, 이 표, 프로그램 상호 인수인계의 점유표, `git status --porcelain -- <파일>`, `git diff -- <파일>`, 최근 관련 커밋을 읽는다.
3. 다른 세션의 점유·미커밋 변경이 있거나 출처가 불명확하면 그 파일은 편집하지 않는다. Master에게 범위/차이를 보내고 독립 작업만 진행한다.
4. 비어 있고 배정 범위 안이면 기존 ACTIVE_WORK/프로그램 점유표의 자기 행으로 예약하고, 표와 대상 상태를 즉시 다시 읽는다. 동시 예약이 보이면 Master가 한 담당 또는 순서를 결정할 때까지 해당 파일을 멈춘다.
5. 실제 코드·diff를 다시 읽고 최소 수정한다. 저장/커밋 직전에도 HEAD·상대 변경을 재확인한다. 끝나면 자기 점유만 해제하고 SHA·파일·검증·한계를 제출한다.

이 표는 조정 기록이며 기술적 파일 잠금이 아니다. 예약만으로 충돌 방지가 보장됐다고 말하지 않는다. 다른 세션의 오래된 행도 임의로 지우지 않는다.

## 현재 조정 범위

ECOM-20261116-15 / CC-ECOM-01: 연결 모의검사 a0db00bac에서 재합성 saved 표시 유실 확인. ProductBatchBoard.tsx 시작 전 저장완료 식별 보존·결과병합 최소수정, 본인 회귀/연결검사와 고유결과만. 상품/저장대상/작업 정체성 구분·다른상품 오표시 방지. 편집전 점유 예약, 실저장/AI/외부/DB/빌드/배포 금지. v1.49 해결 및 독립 검수까지 보류, DEC004 기존 요청 유지.

B2B-20261116-11 / CC-B2B-BACK-01: B2B10 수동SQL 묶음 제출 뒤 messages/page.tsx·message-form.tsx·settings/page.tsx 세 파일의 미동의 광고선택 UI·명시라벨·비용 안내만 수정. 서버 동의필터 유지, 미확인 20/50원 고정 금지, 정확 단가 없으면 산출불가/본인계약 기준 명시. 점유 재확인 후 본인 예약. DB/실발송/빌드/배포 없음, v1.16 분리소스 제외.

MOV-20261116-10 / CC-MOVIE-01: FRONT09 13049d0bd 대표139/143/144의375px Lab 미리보기 읽기전용 독립검수. 타인 브라우저/서버 점유 확인, 저장/게시/제품수정/DB/외부호출/설치/빌드 없음. 고유 결과만 수정.

DES09 판정: 서버 미동의필터는 유지되어 UI 선택 모순으로 분류. 미확인 단가·placeholder 절대불가·텍스트있는 페이지링크의 aria-label 필수 주장은 근거 보정 요청, 정적 모바일 추정은 실제 재현과 구분. 제품 수정 권한 없음. FRONT09 구현 접수·점유 해제, DESIGN139~144 Master 등록·MOV10 검수 후 최종완료.

B2B-20261116-10 / CC-B2B-BACK-01: 기본모드0.3초취소로자동모드가설기각,전역Elicitation훅문제는미확정. 훅제거/권한확대/에이전트의다른경로실행우회없이, 사용자가직접실행할정확0100 LF원문/해시·성공읽기검증·현재실제schema_migrations구조에맞는기록방법·실패복구를고유SQL/인수인계로준비한다. 0101제외,추정칼럼SQL금지,새래핑변경은로컬검증후. 운영실행은여전히0,사용자실행뒤Master읽기판정후기승인1빌드.

DES-20261116-09 / AG-UI-01: DES08 중간폭픽스처PASS접수후 M2-12a 5e750cdcf 메시지3화면·메뉴를D1~D5합의와읽기정적검토. Lab0101미적용이므로실화면/실발송검증아님. 동의/미리보기/야간·상한·불확실/오류/키보드·모바일구조 최소구현명세만고유결과에반환. 제품/DB/실문자/배포/새시안없음.

ECOM12 후보판정: 사용자지정 M1·F09 수정인80786070b 실제diff/기존Mac정적검토를 확인해 v1.49에포함(기존6+807=7커밋). 운영연결모드실물미검수는유지하고 모의연결목록/첫미리보기/saved보존 검사 허용. 신규1빌드요청은 DEC004/cb1725c2-13f0-44d7-964b-9c084c77520a 한건으로Master등록,과거승인재사용없음.

threads-affiliate 기존점유표: 사용자가직접옛쇼핑제휴항목삭제·새ECOM배정을지시한현재행의 설명 안 backtick 경로가 deploy.mjs의행전체경로검사에오탐된다. Ecom은해당설명대상명만 plain text로정정가능,다른3폴더/역사·다른행/남의diff보존. 실제배포중이면중복실행/중단없음. owner우회flag를쓰지않는다.

DES-20261116-08 / AG-UI-01: YVS DES07 합성UI검수 범위회수 후 바나나현재실컴포넌트 격리하네스로768/900/1023px 반응형·넘침·완료상자·AXtree/TAB 순서를 읽기전용 검수. 320/375/MOV09는 반복없음. 제품/CSS/DB/로그인/외부API/설치/앱build/배포변경없음. 임시fixture/고유결과만, 실제낭독·운영틀·실기기는미검수로유지.

ECOM-20261116-12 / CC-ECOM-01: MOV09 독립320/375·최종blob색/전체흐름PASS 수락 후 바나나v1.49 6커밋 릴리스 명세·기존빌드승인요청ID/응답·공통고지/위젯·배포뒤무과금검수계획만 준비. 고유결과/본인개선·역할문서만, 실제버전/build/deploy/DB/유료호출·새제품수정없음. 10월예전승인은미사용잔여증명없이재사용하지않고 현재승인기록은Master로취합한다.

DES-20261116-07 / AG-UI-01: DES06 픽스처·3210 측정범위조건부PASS 수락 후 YVS87ebcae7d 떡상탐색UI 독립검수 배정. 기존finder-fixture 실컴포넌트/합성데이터·기존CSS/설치도구 재사용, 1440/375·넘침/산점도/필터/문구/키보드/상태 관찰. 자기임시서버/고유결과만, 제품/API/회원키/외부호출/설치/앱build/배포 변경 없음. Movie사용자직접배포범위 보존.

DES-20261116-06 / AG-UI-01: DES05는 독립 격리픽스처 범위의 조건부 수락, 완전한 운영검증/배포승인 아님. 실제fixture/실행기/측정JSON/캡처 경로를 반환하고 PC1365/900에서 innerWidth-clientWidth(스크롤바 점유), 옛/새코드 같은마크업조건, 그림자/링/반투명배경 픽셀 또는 캡처 근거를 보강한다. PC gap0이면 고전스크롤바 재현 범위를 분리하고, 3210복구 후 저장없는 실제렌더경로 비교가 가능하면그범위만 측정. 제품/DB/게시/배포/설치/다른창변경없음, 자기결과/임시fixture만. 기존자료의 '완벽/결함전혀없음/100%'를 확인범위별 표현으로 정정한다.

23:05 후속 판정: WS11 독립엄격37/37·역할권한·rollback 보존/되살리기 근거로 현재0100/rollback1·2의P1 해결 기술판정. B2B-20261116-09는 CC-B2B-BACK-01이 `mall-builder/scripts/qa/run-0100-independent.mjs` 한파일의 has 부분포함판정을 실제열동등비교로 보강하고 수정전/1차/현재3판의 실패·통과를 qa_격리DB에서 증명한다. 원래42조건보존, 운영/공유DB·실외부·제품SQL 변경없음. 현재SQL판정과 검증기결함을 혼동하지 않는다. v1.16 소스분리·Supabase실행확인창·기승인1빌드 범위는 별도로 유지한다.

| 작업 | 책임 세션 | 허용 수정/동작 | 상태·경계 |
|---|---|---|---|
| OPS-20261116-001 | CX-MASTER-01 | AI_TEAM_RULES.md·.ai/TEAM/PROJECT/TRANSPORT/FILE_OWNERSHIP/CHANGELOG·tasks/decisions·총괄플랜·루트지침3종 본인블록·공용문서 본인항목·문서목록 | Master 전용 공식배정/완료상태 |
| WS-20261116-02 | CC-WORKSPACE-01 | ai-work-workspace/src/litpage/server/agents/runs.ts·agents/tools.ts·api/modules/agents.ts, tests/integration/agentMcp.test.ts, 본인 개선문서 항목 | runs.ts/API 모듈 추가는 msg_de4219836a9e로 승인. 새스키마 없음. QA 전 배포 안 함 |
| B2B-20261116-02 | CC-B2B-BACK-01 | 본인 3210 Lab 서버 점유확인·1회 재개·상태/로그/본인 문서 | 코드추가·DB·외부결제 없음, 다른 프로세스 종료 없음 |
| FRONT-20261116-01 | CC-B2B-FRONT-01 | 본인 tracker/상호인수인계 자기항목·Lab E3 검수 | 공용 주문/결제파일은 백엔드 소유. 새 템플릿 구현 아직 미배정 |
| ECOM-20261116-02 | CC-ECOM-01 | banana-canvas ProductBatchBoard.tsx·globals.css·본인 개선문서 | 7b5d3b053 제출, 추가 수정은 재배정 후 |
| MOV-20261116-01 | CC-MOVIE-01 | video-to-gif ConverterWorkspace.tsx·ProductVideoStudio.tsx·lib/shopInbox.ts·shopPayload.ts·shopPayload.test.ts·본인 개선문서 | efc72da60 제출, 독립 검토 대기 |
| RE-20261116-02 | CC-REALTY-01 | realty-listing-alert 확장 background/notify/telegram/popup·kakaoFail시험·package.json의 시험연결·본인 개선문서, real_estate_sales auth local/서버UA 대상 | 26e774a8e·7823a692b 제출, 추가 경로는 Master 재배정 |
| BLOG-20261116-01 | CC-BLOG-01 | tistory generator/extensionContent의 소제목 정규화와 국소시험, blog-neighbor-care background/context-bridge/popup·국소시험·본인 개선·재시험요청 | a27861137·e35947191 제출. 남의 AGENTS 변경 보존 |
| MUS-20261116-02 | CC-MUSIC-01 | 배정 브라우저에서 MP41회/곡0개 화면 검증·본인 개선/역할 항목 | 제품코드 수정 없음, 보고 완료 |
| DES-20261116-01 | AG-UI-01 | 읽기 전용·자기 고유 결과파일 | 제품코드 수정 없음. 정적 지적은 담당 재대조 후 채택 |
| QA-20261116-01 | CX-QA-01 | 읽기 전용 코드/가벼운 검사·자기 결과파일·mac-mini 본인 검수기록 | 코드/도구설치/dev/build/DB/유료호출 없음 |
| FRONT-20261116-02 | CC-B2B-FRONT-01 | mall-builder/src/lib/builder/templates-extra-2.ts·tests/templates-extra-2.test.mjs 신규, 기존 templates.ts 연결2줄·admin/design/templates/template-gallery.tsx 도식·DESIGN_BUILDER_TRACKER.md 본인행·고유결과 | E3 Lab검수 먼저. DESIGN.md는 Master만 결과 후 갱신. DB/배포 없음 |
| MOV-01 릴리스 준비 | CC-MOVIE-01 | video-to-gif/extension/NOTICE 신규·lib/version.ts·extension/manifest.json·public/downloads/local-renderer의 해당 ZIP/version.json, 해당slug version/extension_version, PENDING/HANDOFF/본인역할 해당항목 | 사용자 직접 빌드1회 승인 확인, Master msg_44fad028c623로 필수범위 추가. QA 치명지적 확인 전 배포 대기 |
| DES-20261116-02 | AG-UI-01 | 읽기 전용 7b5d3b053 대조, DES-01 본인결과 정정·DES-02 고유결과 | Master 검토 후 정적범위 done. 제품파일 수정 없음 |
| FRONT-20261116-03 | CC-B2B-FRONT-01 | mall-builder/src/app/s/[store]/admin/design/my-sections.tsx의 넣기 피드백 국소 수정, 기존 tests/my-sections.test.mjs(의미 있는 회귀가 필요할 때만), 본인 결과·개선문서 항목 | 다른 부모/공용 파일이 필요하면 편집 전에 목록·이유를 Master에게 제출. 추가 템플릿 확대 없음 |
| FRONT-20261116-04 | CC-B2B-FRONT-01 | mall-builder/src/app/s/[store]/admin/design/design-editor.tsx의 Puck headerActions 식별성·해당 인스턴스 상태 연결, my-sections.tsx의 전역 UI 저장소 제거/국소 상태·요청 수명 관리, 기존 my-sections.test.mjs 및 필요한 고유 회귀시험·본인 결과/개선문서 | 685fed7da 실제diff·422시험/타입0·Lab회귀 근거로 Master 검토 완료. FRONT-03 방안은 대체됨. 운영 배포는 별도, 새 파일 수정은 재배정 후 |
| B2B-20261116-04 | CC-B2B-BACK-01 | 본인3210 PID34104/24328/35520·기존로그·HTTP응답·메모리/캐시상태 읽기, 고유 결과 .ai/results/B2B-20261116-04-CC-B2B-BACK-01.md | Master가로그인200/몰500·Jest worker 재현. 소스/env/캐시 변경·종료/재시작·설치/build/DB/운영배포 없음. 원인 근거와 최소복구범위 제출 후 Master 재배정 |

| B2B-20261116-05 | CC-B2B-BACK-01 | 현재3210 본인 프로세스 트리 식별·확인된 트리만 종료, mall-builder 기존 Lab명령을 Orca 전용터미널에서1회 실행, 로그/HTTP 읽기·고유결과 | 소유/생성시각/포트 재검증 필수. 캐시/env/소스/DB/운영배포 변경 없음. 404/실패 재발은 재시도하지 않고 보고 |
| QA-20261116-02 | CX-QA-01 | efc72da60 영상 diff·shopPayload/shopInbox·기존 시험 읽기/가능한 가벼운 검사, 고유결과 | 지금 실제 검토·판정 반환. ACK만으로 끝내지 않음. 코드/설치/배포/운영쓰기 없음 |
| MUS-20261116-03 | CC-MUSIC-01 | Workspace d8290ffb6 및270f87b20 권한/한도/승인소모 독립 읽기검토·기존 국소검사, 고유결과 | 현재 운영v1.52에 대한 작성자 외 검토. 실제MCP/유료호출/운영DB쓰기/제품수정 없음 |
| FRONT-20261116-05 | CC-B2B-FRONT-01 | templates-extra-3.ts·tests/templates-extra-3.test.mjs 신규, templates.ts 연결2줄·template-gallery.tsx 새도식·DESIGN_BUILDER_TRACKER 본인행·고유결과 | 131~138 예약(식품4/디지털4). 기존정적블록·스킨만. DESIGN.md는Master,결제/DB/설치/운영배포 없음. Lab확인은서버복구뒤 |
| SUP-20261116-01/02 | CC-SUPPORT-01 | 이미 사용자 지정 Threads/INSTA KIT 및 IS_STANDALONE 분기 작업 결과·고유결과 정리 | 현재ready_review, 검토자가 지적한 추가 파일은Master 조정후. 출처불명 version/남의AGENTS 보존 |
| SUP-20261116-03 | CC-SUPPORT-01 | 사용자 지정 ai-auto-blog/KIT/**·확장 포함 독립 배포키트에 필요한 파일목록을 먼저 제출, 본인 고유결과 | 기존지시로 진행중인 키트자료 보존. 추가 원본/공용 경로는목록대조 후 Master 확인, 새로운 무승인 설치/빌드 시작 없음 |
| DES-20261116-03 | AG-UI-01 | Threads v1.02/INSTA v1.10 고정 ZIP·KIT문서 읽기, 고유결과 | 첫설정·콜백/삭제/사용자이해 점검. 제품/KIT수정·새시안·서버/브라우저조작 없음 |
| ECOM-20261116-03 | CC-ECOM-01 | INSTA v1.10 고정 ZIP·ea06cda63 diff·KIT/schema/env/의존성 읽기·기존 읽기전용 검증, 고유결과 | 비밀값은 값 대신 존재/종류/건수만. 설치/build/운영DB/SNS쓰기/제품편집 없음 |
| BLOG-20261116-02 | CC-BLOG-01 | ai-auto-blog 확장포함 KIT 검토기준 작성·Support가반환한 고정SHA/ZIP 독립읽기검토, 고유결과 | Support 진행중 파일을수정하지않음. 계정/확장설치·실제발행·DB쓰기·설치/build 없음 |

| MOV-20261116-02 | CC-MOVIE-01 | video-to-gif/lib/shopInbox.ts·lib/shopInbox.test.ts 신규(기존 시험체계), 본인 고유결과/개선문서 항목 | QA P1 중복송신·cleanup중await·payload거절 수정. payload/호출부/버전/ZIP/배포 변경은 추가범위승인후. 회귀를 먼저 실패시키고 최소보완→Tester 재검토 |
| WS-20261116-03 | CC-WORKSPACE-01 | v1.52운영의 본인시험계정/공개가이드 읽기·보호기능 차단 확인·고유결과/본인 역할문서 항목 | 배포는사용자직접지시완료. 실제MCP쓰기·새배포/DB/환경변수변경없음. 독립검토는Music 담당 |
| RE-20261116-03 | CC-REALTY-01 | 본인4프로그램 미배포/기배포 SHA·릴리스/승인 이력 읽기·고유결과 | 이미v1.44 local signOut 적용확인,같은수정재실행안함. 코드/버전/ZIP/설치/build/실알림/DB변경없음 |

| FRONT-05 시험 추가범위 | CC-B2B-FRONT-01 | tests/templates-extra-2.test.mjs의 기존19종보존 검사1곳 | 기존13종+2차6종 보존/업종최소조건 유지, 전역19고정만확장가능한하한으로. 신규3차는27고유ID/기존보존 고정. 기대값무근거완화금지 |
| SUP-20261116-04 | CC-SUPPORT-01 | insta_auto_poster/KIT/schema.sql의 profiles 권한열 보호, 다른2 KIT/schema.sql도 동일문제확인시 같은보호, 본인 kit.json/README 판번호·신규ZIP재포장·고유결과 | 일반회원 is_admin/is_suspended/보호정책열 직접변경 막기. 회원 정상수정 필드만허용. 로컬격리DB/정적검증만·기존공유DB리셋없음·원본운영/실키/외부회원변경없음 |
| SUP-03 로컬 리허설 자원 | CC-SUPPORT-01 | 확정 Blog KIT 새 격리작업폴더 npm ci/build/start1회 및 본인성공/실패로그, 로컬격리DB 스키마 검증 | 3210 Master 재확인통과후허용. 포트/경로/메모리 확인, 3210·다른세션DB/프로세스 무침범. Vercel/외부연결·게시없음 |
| WS-20261116-04 | CC-WORKSPACE-01 | ai-work-workspace/src/app/guide/page.tsx 및 본인 개선문서의 MCP 승인안내만 | 기존코드정책변경없음. 비서대화/AI채팅/무인실행의 실제차이·읽기표시기준 정확히. code/API/schema/배포/DB쓰기없음 |

작업자가 공용 `.ai/` 등록부·tasks·decisions·총괄표를 직접 바꾸지 않는다. `.ai/results/<작업ID>-<세션ID>.md` 고유 결과는 쓸 수 있으며, 추가 결과 파일도 파일명을 Master에게 알린다. 자기 프로그램 문서/ACTIVE_WORK 본인 항목은 기존 안전 편집 규칙대로 관리한다.

## 18:25 재지휘·사용자 변경 (앞선 같은 작업 범위보다 우선)

- 키트 3종의 Lab 프로젝트 생성·DB 초기화·설치·Vercel 배포는 **사용자가 직접 진행**한다. 세션의 자동 실행 배정을 철회한다. 기존 6회 예산을 다른 운영 배포에 전용하지 않는다. Support는 실행 여부·인수인계만 반환하며 SUP-04 코드 권한 보완은 계속한다.
- QA-20261116-03 / CX-QA-01: `2ae34fbdc` 영상 수정 읽기 전용 독립 재검증, 자신의 고유 결과 파일만 작성. 원본 11개 시험·중복 ready/cleanup/실패/새 클릭 재현. 운영·설치·빌드·DB 변경 없음.
- FRONT-20261116-06 / CC-B2B-FRONT-01: `mall-builder/src/app/s/[store]/home-slots.tsx`의 timesale dark 스킨 색상만 국소 보완, 필요시 고유 회귀 시험 파일 `mall-builder/tests/timesale-dark.test.mjs`, 본인 tracker/결과. 편집 직전 점유/status/diff 재확인. 공통 테마 CSS·스키마·API·다른 블록 수정 금지. 밝은/어두운 테마에서 dark/rose 스킨 제목·설명·카운트다운 가독성 및 375px 확인, 저장·게시·배포 없음. 새 템플릿 범위 확대 없음.
- WS-20261116-05 / CC-WORKSPACE-01: `ai-work-workspace/src/litpage/server/agents/tools.ts`의 무인 MCP 검토 조건에 destructive 표시 우선 반영 및 기존 `tests/integration/agentMcp.test.ts` 해당 회귀, 본인 개선문서·고유결과. 먼저 실제 필드 전달 여부 확인; 다른 파일 필요시 편집 전 Master에 경로/근거 제출. readOnly+destructive 모순 도구는 무인 실행 금지·검토로. 대화 중 정책·callKey·스키마·배포 변경 없음. 시험 DB 공유 점유 확인 후 필요한 파일만 검사.
- ECOM-20261116-04 / CC-ECOM-01: 기존 `7b5d3b053` 바나나 수정의 읽기 전용 실화면 375px·직접 입력 25MB 경계·빈 상태·키보드/레이블 확인, 자기 결과만. 운영 데이터 저장·유료 생성·빌드·배포·제품 수정 없음. 안전하게 열 수 있는 기존 로컬/미리보기 환경이 없으면 구체적인 제약 반환.

## 완료 처리

## 18:44 역할 재배정 — Support는 사용자 직접 작업 전담

### 19:07 대기 해소·다음 작업

QA-20261116-07 / CX-QA-01: B2B修正 `355193d75`·`49d3eab46` 0100/scenario/rollback1 3파일을 우선 독립검토. P1~P8 상태전이·중지후POST0·권한/중복호출을 확인, 기존 설치 로컬격리DB 가능할 때만 모의볼타 시나리오 실행(공유/운영DB·새설치없음). 실행불가항목은 미검수로 반환. 그다음 QA-20261116-08에서 WS09 `ed7a5f200` 동치승인CAS 수정 독립검증. 고유결과는 각각 분리하고 DB점유조정 필수.

B2B07 추가: 새 helper `cash_receipt_target`에 맞춰 `rollback-0100-step2-remove.sql` 해당함수 제거 한곳만 추가 허용, 삭제순서/의존확인·모의 rollback 적용후잔존객체 확인. 기존영수증/주문기록 삭제범위 확대 금지. 이 추가 SHA는 QA07에 따로 반환.

ECOM-20261116-09 / CC-ECOM-01: MOV07 재현 P2 긴 공용서브 파일명 문서넘침/미리보기순번줄바꿈 P3를 ProductBatchBoard.tsx 해당 span/표시만 최소수정. 같은하네스에긴파일명고정조건 추가해320/375 정상/키보드·25MB/2건합성 보존 검증, 제품다른경로/공통CSS/배포없음. 고유결과 제출.

WS-20261116-10 / CC-WORKSPACE-01: Blog에게운영읽기연결이없으므로 Workspace의기존운영연결이있는경우에만 website-scraper 프로그램메타1행(slug/version/is_active/카테고리공개여부) 읽기확인을 인계. 실제스키마먼저확인·다른회원/키접근없음·새연결/운영쓰기/배포없음. 고유결과를Master와Blog에반환, 연결없으면미확인유지.

BLOG-20261116-06 / CC-BLOG-01: Movie `cd83a1daf`로 공용비교표 본인미커밋2줄을 정리한 뒤, `docs/PROGRAM_CAPABILITY_MAP.md` website-scraper 요약행/카드주소행만 v1.15·병합/숨김·11-12 배포기록·현재live미확인과 일치하게 정정. 다른현재diff있으면중지. 그뒤 `docs/SCRAPING_CONSOLIDATION_TASKS.md` T11 문서정합성 완료만 갱신, T12담당결정/제품/DB/PENDING_FREE는 그대로. safe-commit 기준사본/재확인 필수.

MOV-20261116-07 / CC-MOVIE-01: Tester가 B2B 중요검토 중이고 AGY수락이 확인되지 않아, 바나나45e04a14d 모바일수정의 독립 읽기검토를 가용Movie에 배정. ProductBatchBoard.tsx 실제diff/고정하네스결과·접근이름/키보드/320·375줄바꿈·의도된표안가로스크롤과문서넘침 구분 검토, 필요시 기존격리하네스만 재사용(비용없는국소실행). 제품수정·배포·운영쓰기없음. 고유결과만, Ecom추가수정은 Master를 통해 조정.

B2B07 추가 범위: `mall-builder/scripts/rollback-0100-step1-stop-auto.sql`도 수정 허용. QA05 P1-2(중지 뒤 recheck 취소완료 경로가 issue POST를 일으킬 수 있음)를 보완해 step1이 실제 신규발급/재발급을 중지하게 하고, 남는 조회/취소 기능과 제한을 명시한다. 운영 실행은 금지, 격리DB에서 중지 후 POST0을 검증한다. 그 밖 cancel_failed 불확실응답 새ref 재시도·직원 recheck권한 지적도 같은0100/시나리오 범위에서 먼저 판정해 미해결위험을 반환한다.

WS-20261116-09 / CC-WORKSPACE-01: `tools.ts`·`agents/runs.ts`·`tests/integration/agentMcp.test.ts`의 같은 실행 내 canonical/legacy 동치 승인 집합 소진 보완. 제품판정: 옛 허용 미실행 후 순서변경 재검토·재허용은 동일 논리 호출의 재확인이며, 별도 실행횟수2를 허용한 것으로 취급하지 않는다. 정상화 동치 키를 메모리/DB에서 함께 제거하고 실제payload CAS 성공자만 1회 실행한다. 다른연결/도구/회원/실행/다른인자 승인 보존·단일키호환·새허용 이후정상재호출·동시실행/실패시재호출금지 회귀. 새스키마/실MCP/배포 없음. 공유시험DB 점유 확인 필수, QA06은 이 보완 전단계 검토로 보존하고 수정후 새 독립검증을 배정한다.

B2B-20261116-07 / CC-B2B-BACK-01: QA05 P1을 Master가0100의142/242/271/330행 경로로 확인. `mall-builder/supabase/migrations/0100_cash_receipts.sql`의 취소·상태재조회/취소완료 뒤 재발급 판정 및 `scripts/scenario-0100-cash-receipts.sql` 회귀 시나리오만 수정 허용. unknown→주문취소/반품·부분환불→뒤늦은ISSUED의 취소/현재유효잔액 일치와 불확실시 중복외부호출금지·멱등성·권한을 함께 검증. 옛 상태/금액으로 취소 뒤 재발급하지 않는다. 기존 설치된 로컬 격리DB·볼타 모의응답만 사용, 운영DB/실발급/공유DB리셋/새설치/빌드 없음. 실제 미해결 위험이 있으면 재현·최소범위 반증부터 보고. 별도 새 스키마/API/UI는 편집 전 조정. 운영적용과v1.16배포는 P1 수정·독립재검증 및 도구확인창 해소 전 보류.

QA-20261116-06 / CX-QA-01: `74e179bbe` WS08 callKey 정규화·legacy 호환 실제diff 읽기독립검토, 기존국소시험은 공유시험DB점유 조정된 경우만. 원시값/중첩/배열/연결·도구·회원 경계, 신·구 키 동시 보유 때 승인1회 의미와 재실행/동시소진을 중점 확인. 제품수정·실MCP·운영DB 없음. QA05 중요결함 확정 보고 후 착수한다.

ECOM-20261116-08 / CC-ECOM-01: ECOM07 실제하네스에서 재현한 모바일 세로 쪼개짐/320px 넘침/이름없는2단계 입력 보완. 제품 범위는 `banana-canvas/src/components/batch/ProductBatchBoard.tsx` 한 파일, 기존 격리시험2파일·본인 IMPROVEMENTS·고유결과만. 공통CSS/서버/상품계약 변경 없음. 375/320px 완료상자·알약/단추/표제목 가독성·줄바꿈·초점/레이블 검증과 25MB경계 유지. 실패 재현→국소수정→같은 실제컴포넌트하네스 재검증. 새예산/build/배포/로그인/DB 없음.

RE-20261116-06 / CC-REALTY-01: `commercial-land-trade-alert/src/lib/actions/auth.ts`·`realty-client-desk/src/lib/actions/auth.ts`의 signOutAction만 프로젝트 공통정책 `scope: local`로 수정, 본인2개프로그램 IMPROVEMENTS/고유결과. 다른인증/UA/위젯은 이번범위밖. 이미변경됐으면중복수정않고보고. 0번고지확인·해당타입/관련기존검사, 실제회원로그아웃/다른기기세션시험은수행하지않음. 새버전/build/배포/DB쓰기 없음.

QA-20261116-05 / CX-QA-01: B2B0100 migration 및 scenario/rollback1·2 읽기전용 독립검토. 권한·회원/몰격리·발급중복/불확실재호출방지·취소/부분환불·기존0099의존 대조. 사용자승인과 Supabase도구창 차단은 별개. SQL실행·DB접속·제품수정없음, 고유 결과만. 위험확인시 즉시Master보고, Backend실행을우회하지않음.

WS-20261116-08 / CC-WORKSPACE-01: `ai-work-workspace/src/litpage/server/agents/tools.ts`의 callKey 객체 키 순서 정규화와 `tests/integration/agentMcp.test.ts` 해당 회귀만 허용. 중첩 객체 키 정렬·배열 순서/타입/값 보존, 다른연결/도구/회원/인자의 승인 불일치 유지, 기존 승인·검토 기록 호환·승인1회 소진/CAS·무인검토 보존. 추가 모듈/스키마는 편집 전 Master 조정. 공유시험DB 점유 확인 후 검사. 배포/운영DB/실외부호출 없음. 자기 ACTIVE_WORK행은 공통지침의 기존 허용 범위에서 최신화하며 매번 재승인을 기다리지 않는다.

19:15 MOV-20261116-06 / CC-MOVIE-01: 현재 공용 비교표 미커밋 중 본인 v1.33 배포 자동갱신(영상 요약/상세2줄) 출처를 확인해 해당2줄만 안전커밋. 다른 diff 유입 시 중지. `docs/PENDING_DEPLOYS.md` 본인 공용인코더 항목은 lyric v1.15 포함이 확인된4커밋을 완료기록으로 정정하고 신규4936c5e72·다른앱 미배포는 유지. 제품/배포 변경 없음. 이 작업 전까지 공용 비교표의 website-scraper 정정은 대기한다.

WS-20261116-07 / CC-WORKSPACE-01: 사용자 직접 승인 v1.53 기배포의 실제 배포ID/소스/검사/운영가이드/비용 근거를 고유 결과로 남기고 자신의 역할/미배포 표기만 일치 확인. 새 검사/배포/실외부호출 없음. 기존본인보고 재사용.

19:12 추가: BLOG-20261116-05 / CC-BLOG-01에 `ghost-scraper/AGENTS.md` 개요 버전 v1.15 및 `docs/SCRAPING_CONSOLIDATION_TASKS.md` T11 이미 병합 완료 범위/근거 정정만 배정. 실제 DB/live 미확인과 T12 담당 결정은 유지. `docs/PROGRAM_CAPABILITY_MAP.md`는 현재 출처 미확인 미커밋이 있어 Blog 편집 금지, Master가 그 변경 출처를 조정한 뒤 공식 정정한다. 공용 PENDING_DEPLOYS도 별도 배정 전 수정 금지. 제품/DB/배포 변경 없음.

- ECOM-20261116-07 / CC-ECOM-01: 바나나 실제375px 검수의 로그인/운영DB 의존을 끊는다. 기존 `banana-canvas/tests/browser.mjs`의 격리시험 방식을 참고해 실제 `ProductBatchBoard`를 렌더하는 고유 `tests/productBatch.browser-entry.tsx`·`tests/productBatch.browser.mjs`만 추가 가능. 실제 현재CSS는 기존 설치 도구로 국소 생성하고 앱 전체 build/배포는 하지 않는다. 모의 localhost API/Storage·합성파일만, 실제 네트워크는 허용 localhost 외 차단. 375px 가로넘침/빈상태/키보드·레이블/25MB±1 경계 확인. 사용자 브라우저 기존창에 간섭하지 않고 자신이 만든 페이지/프로세스만 정리. ProductBatchBoard/공통CSS 제품 수정은 재현 후 별도 배정. 기존 단위시험을 화면검수로 포장하지 않는다.
- FRONT-20261116-08 / CC-B2B-FRONT-01: FRONT07 전체폭100vw 넘침을 공개화면과 같은 렌더 경로의 **저장 없는 격리 fixture**로 재현·원인·최소수정안을 제출. `home-blocks.tsx` 등 제품파일은 읽기만, 본인 고유 결과/저장소 밖 임시 하네스 허용. 실제PC 스크롤바/375px·블록 full/boxed 조합 실측, 현재 B2B 승인 배포 후보를 변경하지 않는다. 새예산/build/운영게시 없음. 재현되면 Master가 제품 수정 담당/파일을 확정한다.
- BLOG-20261116-04 / CC-BLOG-01: 총괄표에 남은 website-scraper 운영/병합·API410 상태 충돌을 기존 카테고리 지침·`ghost-scraper/`·비교표·관련 인수인계에서 읽기전용 대조. 기존 담당을 확인하고 SHA/실행가능근거와 '확정/미확인'을 반환. 원본/정책/프로그램 비교표 수정·외부수집·운영API실행 없음. Support에 요청하지 않는다.
- MUS-20261116-07 / CC-MUSIC-01: MUS06 독립PASS 결과를 토대로 가사영상만 다음 릴리스할 최소 묶음/필수 검사/추가1빌드 필요/남은 실제저장창·맥 한계를 자기 고유 결과로 정리. 버전/코드/배포/DB 변경·유료호출 없음. 사본뿐인3프로그램은 이 수정만으로 따로 배포하지 않는다.

### 18:51 재현 결함 우선 배정

18:59 추가: MOV05 `4936c5e72` 제출 후 MUS-20261116-06을 CC-MUSIC-01에 배정한다. 수정 SHA의 인코더/호출부 읽기 및 독립 격리 브라우저 OPFS 시험(A 정상/B 취소/D 하드웨어멈춤→소프트웨어1회/대체실패)만 허용. 실제회원파일·운영업로드·맥실하드웨어까지 검증했다고 말하지 않는다. 기존 설치 도구를 이용한 임시 시험 하네스/국소 번들만 가능하며 새 의존성 설치·프로그램 전체 build·배포·공유DB/다른서버 변경은 불가. 임시 서버가 필요하면 포트/메모리 확인 후 본인 식별 가능한 프로세스로만 실행·정리. 안전한 수정소스 실행 경로가 없으면 BLOCKED로 반환. Music은 기존 5개 제품 소스와 아래 문서를 편집하지 않는다.

Movie는 MOV05 관련 미배포 기록만 추가 가능: `shorts-onestop-studio/docs/IMPROVEMENTS.md`·`shots/docs/IMPROVEMENTS.md`·`lyric-video-studio/docs/IMPROVEMENTS.md`·`docs/SHARED_MODULES.md` 공용모듈 본인 변경 한 항목. 기존 다른 세션 기록 보존, 파일별 편집 전 점유/status 재확인, 다른 공통 본문/버전/배포 목록을 일괄 재작성하지 않는다. 배포 승인 추가 없음.

MOV-20261116-05 책임은 CC-MOVIE-01 한 명이다. MUS05에서 파일 직접 저장 + 하드웨어 인코더 멈춤 때 소프트웨어 대체가 없는 문제가 재현됨. 허용: 공용 기준 `shorts-onestop-studio/src/lib/render/mp4Encoder.ts`, 동일 사본 `shots/src/lib/render/mp4Encoder.ts`·`lyric-video-studio/src/lib/render/mp4Encoder.ts`·`video-to-gif/lib/mp4Encoder.ts`, 실제 호출부 `lyric-video-studio/src/lib/render/export.ts`의 스트림 재생성 연결, 국소 회귀 `shorts-onestop-studio/tests/mp4FileFallback.test.ts` 신규, 각 자기 변경 관련 개선문서·고유결과. 다른 Music 파일은 수정하지 않는다. Music은 이 5개 소스를 편집하지 않고 검증 담당으로 남는다.

설계 기준: 기존 호출 호환을 유지하는 선택적 새 스트림 생성 콜백을 사용해 실패 스트림 abort 후 같은 사용자가 고른 파일 핸들에서 새 스트림으로 한 번만 소프트웨어 인코딩한다. 파일 선택 창 재호출·메모리 전체버퍼 대체·무한 재시도 금지. 취소/비하드웨어 오류에는 재시도하지 않으며 재시도/close/abort 오류에서도 자원을 정리한다. 실패→수정 회귀, 정상/대체/취소/대체실패/콜백없음 검증·공용사본 동일성 확인. 실행 전 매 파일 점유 재확인. 새 설치/빌드/배포/운영DB/외부쓰기 없음. Music 독립 재현 검증은 수정 SHA 회수 후 별도 배정.

Support에 신규 업무·검토 대응을 배정하지 않는다. 아래 배정은 각각 독립 범위이며 제품 코드를 수정하는 작업은 WS06/MOV04의 지정 안내 문구뿐이다. 모든 담당은 편집/검사 전 점유·status·diff·관련 SHA를 다시 확인하고 자기 고유 결과 `.ai/results/<작업ID>-<팀ID>.md`로 반환한다. 새 설치·유료 빌드·배포·실제 외부 쓰기는 이 배정에 포함되지 않는다.

| 작업 | 책임 | 범위·완료 조건 |
|---|---|---|
| QA-20261116-04 | CX-QA-01 | FRONT06 e5896b01f/e03138fb9 읽기 독립검토·기존 timesale-dark 시험만, 두테마/두스킨 보존과 국소범위 판정. 제품 수정 없음 |
| DES-20261116-04 | AG-UI-01 | FRONT05/06 고정 결과·캡처·현재 템플릿 읽기전용 시각 검토. 대비/포커스/가독성 누락을 확인범위와 구분해 반환. DES03 키트검토는 재배정으로 종료, Support 접촉/키트작업 없음 |
| FRONT-20261116-07 | CC-B2B-FRONT-01 | 기존3210 Lab 갤러리/편집기 모바일375px 읽기전용. 신규8종 도식·필터·넘침/터치/타임세일 확인, 저장/게시/코드변경 없음 |
| B2B-20261116-06 | CC-B2B-BACK-01 | 최신 미배포 커밋·SQL0100 적용/검증/실패복구 순서·현재 실제 시험수 근거를 읽어 단일 릴리스 명세 반환. 기존DEC002 승인 요청 중복 없음·운영실행 없음 |
| WS-20261116-06 | CC-WORKSPACE-01 | ai-work-workspace/src/app/guide/page.tsx의 무인 도구 안내 한 곳에 WS05 삭제가능 표시 우선 검토 규칙 반영, 자기 IMPROVEMENTS 항목. 코드정책/스키마/배포 변경 없음 |
| MOV-20261116-04 | CC-MOVIE-01 | video-to-gif/app/guide/page.tsx·docs/IMPROVEMENTS.md의 송신 안내만 실제1호출1전송/재클릭/실패·10MB 규칙과 대조, 틀린 안내만 국소 수정. 정확하면 수정 없음. 운영왕복 미검수 유지 |
| ECOM-20261116-06 | CC-ECOM-01 | 배포된 shop-detail-page 수신부와 영상2ae34fbdc 계약을 읽기전용 대조. 허용origin/source·형식·크기·로그인·새클릭·중복방지/실패 경계 판정, 실제상품 저장 없음 |
| MUS-20261116-05 | CC-MUSIC-01 | 가사영상 직접저장/중단/timeout/fallback 잔여 중 아직 실행 안 된 조건의 코드·기존시험을 읽고 가능할 때만 비용없는 격리 검사. 유료생성/실제업로드/설치/빌드/제품수정 없음. 재현한 결함만 보고 |
| RE-20261116-05 | CC-REALTY-01 | 지정 브라우저 본인 기존시험계정에서 v1.45/v1.61 로그인뒤 버전·오류표시 읽기전용 확인. 로그인/인증 없으면 중지보고, 새수집·알림·DB쓰기 없음 |

Claude(Blog)는 B1의 사람 직접 클릭 선행조건 대기. 확장 설치/주인님 대신 클릭/수락·댓글을 자동 실행하지 않고 기존 인수인계 유지. 새 코드 범위 배정 없음.

18:30 추가 배정: MUS-20261116-04(Music, `4e64c8cbd` WS05 읽기전용 독립검토), ECOM-20261116-05(ecommerce, INSTA1.11 고정ZIP 권한 보강 읽기검토), BLOG-20261116-03(Blog, Blog1.07 고정ZIP env읽기/확장치환 읽기검토). 각 담당은 `.ai/results/<작업ID>-<팀ID>.md`만 작성하고 제품/공통파일을 고치지 않는다. FRONT06은 같은 timesale 블록 안에서 rose 스킨의 `mall-mode=dark` 한정 색상 보정 A안을 추가 허용했다. 공통CSS·다른블록·템플릿 수정은 금지한다.

작업자는 `ready_review`로 제출한다. Master가 요구·실제SHA·파일범위·충돌·검증·남은 문제를 확인하고 승인/보완/다음지시를 기록한다. 작업의 완료조건이 충족된 경우만 `done`으로 닫는다. 구현 완료·독립검토 통과·배포 Ready·운영 검수는 별개 상태이며, 배포가 목표인 상위 작업을 코드 구현만으로 닫지 않는다.
