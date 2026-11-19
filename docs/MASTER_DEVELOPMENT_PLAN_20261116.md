# AIMaster 총괄 개발 플랜·작업 지휘표

기준: 2026-11-19 13:33:14 KST · 총괄: Codex(Master), CX-MASTER-01 · 최종 결정권자: 주인님

이 문서는 비교표 전체와 실제 담당 보고를 함께 정리한 작업판이다. 완료율은 산출하지 않는다. 담당 보고·Git·문서 확인과 Master의 제품 실동작 재시험을 구분한다. 실시간 화면이 아니라 아래 명령으로 갱신하는 스냅샷이다.

Master 마지막 실제 점검: 2026-11-19 14:31:50 KST · 실행 중 5분 · 턴 밖 30분 메시지 · 103개 프로그램/19분류 증분 및 미완료 28건 점검.
이번 점검에서 B2B 빠른 메뉴와 블로그 모델 복원의 로컬 검수를 수락했고, Q8 이미지 품질 화면을 확인했다. 몰 사진 용량 집계 설계는 백엔드 읽기 검토를 배정했다.

점검 범위: 13:01:14 KST 이후 증분. 103개 프로그램·19개 분류, 미완료 26건(진행 3·검수 5·순번 5·사용자 단계 13). Git·점유·사용자 지시·결과/인수인계 대조. 부동산 문자 안내·AIF 격리 실행기 검수 수락. 블로그 최신 모델과 이미지 엔진 로컬 구현 진행. 신규 운영 배포·DB·키·유료 호출 승인 없음.

후속 배정: IMG 음악 담당 엔진 로컬 소스만, 새 출처 운영 등록·설치판 별도. Blog 최신 목록 Mac 검수. B2B 공간39 로그인/제어 반환 뒤 관리자 검수·공간29 순차.

미확인: IMG 엔진 실제 구현·저사양 장비 지원·출시 기준, Blog 실제 계정 호출 및 빌드, B2B 로그인 뒤 화면, AIF Windows 후속 실기동 · 운영 전수 실측 및 오래된 미추적 파일 재검증 미실행

범위: 비교표 102개 + 신규 ESM 1개 = 103개. 병합·폐지·비공개 기록도 누락 없이 포함한다. 메인 사이트·공통 보안/저장 정책은 별도 공통 업무다. 비교표의 '운영'은 지금 모든 기능이 검수 완료됐다는 의미가 아니다.

[팀·실제 연결](../.ai/TEAM.md) · [수정 전 점유표](../.ai/FILE_OWNERSHIP.md) · [사람의 결정함](../.ai/decisions/DEC-20261116-001.md) · [전체 목록 CSV](MASTER_DEVELOPMENT_PLAN_20261116.csv) · [전체 목록 JSON](MASTER_DEVELOPMENT_PLAN_20261116.inventory.json)

## 지금 내린 지휘와 우선순위

| 순서 | 담당 | 진행 단계 | 다음 작업·통과 기준 |
| --- | --- | --- | --- |
| 1 · ESM | Ecom + Mac Tester | ESM1.02실검수대기·감성승인배포범위사고복구 | emotion1.29별칭복구·1build소진/실AI0·정확후속manifest/검수 |
| 2 · Workspace | Workspace + Master | v1.57운영·E3/GmailOFF/WS23/요일칩 소스수락·미배포 | GCP완료신호수신·ClientID/시험사용자/공개방식·빌드질문대기, MasterSQL/배포0 |
| 3 · B2B | Backend + Master + Mac Tester | Lab0104/앱반영·운영준비지정검수완료·시험waiting1건 | 주인님main243시험키결제1회(실카드0)→Backend읽기,Mac29 QA037은읽기만 |
| 4 · B2BFront | B2BFront + Mac Tester | FRONT03/04 소스독립PASS·7609748ad B2B Lab신규배포에포함 | 77c50f27c QA045소스수락/미배포·QA037고객실화면별도 |
| 5 · 블로그 | Blog | T05 robots/DNS·T07공용폴러 소스독립PASS·미배포 | 다음web-crawler묶음에통합·외부/빌드0 |
| 6 · 영상 | Movie | YVS1단계 실검색/AI1회 담당운영검수완료 | 동일검색/AI재호출0·공용encoder다음묶음·추가기능별도 |
| 7 · 음악 | Music | 운영6프로그램 보고확보·가사취소안내1건미배포 | 공용encoder사본소스PASS/미배포·가사문구와다음묶음·실MP4사람대기 |
| 8 · 부동산 | Realty | 알림v1.46 운영보고·자연회차18:16 ok811/10:37 ok110 담당읽기, 기기/확장상태는미확인 | RE07독립자료없음·개발표본반복0·자연회차근거만 |
| 9 · 디자인 | AGY | 이미지코드동결·PORT19문서매핑배정 | 19프로그램담당/잔여근거수락대기·제품수정/새시안/외부호출0 |
| 전담 · 키트 | Support + 주인님 | 주인님 직접 작업 전담 | Master 타업무 배정 제외·다른 빌드예산 전용0 |

## 카테고리별 현재 단계와 남은 작업

카테고리 이름은 비교표의 분류이며 운영 DB 분류를 새로 조회하거나 변경한 결과가 아니다. 담당 확인 전 프로그램을 임의로 맡기거나 개발 완료로 처리하지 않는다.

| 카테고리 | 프로그램 수 / 담당 근거 확보 | 현재 단계·확인 수준 | 남은 작업·재개 조건 | 조정 책임 |
| --- | --- | --- | --- | --- |
| 업무자동화 | 9 / 2 | Workspace v1.58 Gmail ON/E3·예약수정 배포 | OAuth redirect설정대조→공통실검증·Mac독립 | Workspace / Master |
| 이커머스 | 10 / 7 | B2B운영1.16/Lab0104·ESM1.02·마켓기배포정정 | QA037/ESM사람단계→실범위검수·운영승인별도 | B2BBackend/Front·Ecom / Master |
| 이커머스 (현재 비공개) | 1 / 1 | ESM1.02운영·지정웹QA016PASS | 공간19확장/계정/시험상품입력만·API승인회신전트랙2미구현 | Ecom·MacTester |
| 이미지 | 10 / 2 | 감성v1.37 alias/meta확인·Cloudflare모의소스PASS/실무문자미확인·SNS A1 SQL초안재검수 | 감성최신실행manifest회수·SNS85 정적판정·main공용push/빌드승인별도 | Ecom·AGY / Master |
| 쓰레드 | 5 / 1 | 쇼핑제휴1.89반영·나머지목록기록 | 실확장수집/대기열검수·다른Threads현담당/잔여확정 | Ecom(제휴) / Master |
| 음악 | 11 / 6 | 6프로그램운영버전보고·가사2건미배포·공용권한분리 | 실MP4사람선택·가사다음기능묶음·나머지현담당근거확인 | Music·Movie / Master |
| 영상 | 3 / 2 | GIF1.33/AI영상1.36 기록·공용인코더소스PASS미배포 | 실기기/왕복범위선행·유료생성승인별도 | Movie / Master |
| 유튜브 | 9 / 4 | YVS1단계실검색/AI 담당운영완료·Shots1.51/원스톱1.59/플레이리스트1.42 | 기완료검색/AI재실행0·공용인코더미배포/나머지개별문서현담당확인 | Movie·Music / Master |
| 블로그 | 10 / 3 | 이웃1.21/티스토리1.97·후속1.22/1.98미배포 | B1사람클릭/C3계정·기능묶음·백업5개제외 | Blog / Master |
| 네이버 | 4 / 1 | 카페1.04운영기록·SEO/블로그앱은개별기록 | 본인가입카페/계정조건·기완료초대재실행0 | Blog(기존범위) / Master |
| 데이터수집 | 1 / 1 | web-crawler v1.13 배포확인·T04/05/07 지정소스PASS·T03회원별결정/T08정리후속 | 로그인기존자료실화면·T08정확백업/태그범위·T03DB/Render플랜별도 | Blog(문서·요청조정) / Master |
| 데이터수집\|기획 | 4 / 1 | 원문옛분류·website-scraper백업비공개확인 | T12조정근거연결·비활성라이브/별칭은미확인·재활성화0 | Blog(문서·요청조정) / Master |
| 부동산 | 4 / 4 | 4운영버전근거·실거래/매물정상회차기록·C독립미검증 | 상가/고객공통다음묶음·미사용기간표본뒤별도평가 | Realty / Master |
| 디자인 | 3 / 0 | 146인계/운영구현마감·DES04요일명세완료 | AGY명세→Workspace/QA043·기존개별디자인툴현담당확인 | AGY(배정된디자인범위) / Master |
| AI 프롬프트 | 2 / 0 | Prompt/리버스의기존문서·docbot역할이력확인, 현세션미확정 / PORT19 문서인용69개대조(운영/현재담당확정아님) | 정책/병합완료/제안과잔여분리·현재성확인후작업화 | Master (기존docbot-prompt 역할재연결) |
| CRM | 2 / 0 | crm-google-form v1.18 운영소스/DDL반영보고·alias직접·실폼/SMS사람대기 | 주인님직접응답1/SMS1·동일재전송0 검수·예산추가0 | Master (담당확인) |
| 마케팅(홍보) | 5 / 0 | 5프로그램목록·개별문서표식확인, 현담당회신없음 / PORT19 문서인용69개대조(운영/현재담당확정아님) | 정책/병합완료/제안과잔여분리·현재성확인후작업화 | Master (담당확인) |
| 인스타 | 6 / 0 | 6프로그램목록/개별문서·AGY과거배포이력은존재, 현총괄미확정 / PORT19 문서인용69개대조(운영/현재담당확정아님) | 정책/병합완료/제안과잔여분리·현재성확인후작업화 | Master (담당확인) |
| 성격·운세 | 4 / 0 | 4프로그램목록/개별문서·현재담당회신없음 / PORT19 문서인용69개대조(운영/현재담당확정아님) | 정책/병합완료/제안과잔여분리·현재성확인후작업화 | Master (담당확인) |

## 수집된 개선사항·후속 작업

완료된 구현, 미배포 수정, 실검수 대기, 제안을 구분한다. 각 항목의 담당·선행조건·완료 조건을 확인한 뒤 실행하며 이 표 자체는 새 비용·배포·운영 변경 승인이 아니다.

| ID / 분류 | 대상·담당 | 현재 상태·근거 | 다음 단계·선행조건 | 완료 조건 |
| --- | --- | --- | --- | --- |
| IMP-WS-01 / 미배포수정 | 예약초회DDL경합 · CC-WORKSPACE-01 | v1.58배포·실동작독립미확인 · d7895f6d4·QA028 | 신규반례때만재검증 | 기존최상위거래조건유지·운영릴리스확인 |
| IMP-WS-02 / 미배포기능 | E3 결재/출처/재시도 · CC-WORKSPACE-01 | v1.58배포·실AI/실결재별도 · e668caf32·6f166ec8f·QA030/033/034/035 | 실비용승인없이AI재호출0 | 결재자규칙/앱알림·수동외부검색/출처저장요청·owner예외고지 |
| IMP-WS-03 / 운영활성승인 | Gmail OFF 소스 · CC-WORKSPACE-01 | v1.58 ON배포·OAuth redirect대조 · 3c820f2b6+8069f60df·체크리스트a44c792ad·f4a6854e9 | 실Gmail세트미완료 | 동일묶음서버/UI·metadata만·기대계정·동의/실응답확인 |
| IMP-WS-04 / 구현/검수 | 예약요일 칩 · CC-WORKSPACE-01 | v1.58배포·실375/focus/dark대기 · DES04 f4063ae82·QA043·msg_97ed2e3647bf | Mac독립화면검수 | 7칩44x36·busy차단·키보드포커스·타칸불변 |
| IMP-WS-05 / 꺼진기능 | 손님포털 · CC-WORKSPACE-01 | 소스/QA009 완료·OFF · a09825904·b2715fcd6 | 활성요청시표추가승인/권한재검토,현재켜지않음 | 권한철회/만료/토큰교체·금지속성미노출 |
| IMP-DES-01 / 미배포수정 | emotion-writer 접근성 · AG-UI-01 | 국소QA042 PASS · 121317458 | 다음감성글귀기능묶음·단독빌드0 | Tab/토글이름·hover대비·실375/위젯은후속 |
| IMP-ECOM-01 / 실검수 | ESM 입력만 · CC-ECOM-01 / CX-QA-01 | 운영1.02·웹QA016완료 · 4d31d626e·QA016 | 주인님공간19 로그인/확장1.02/제어반환 | 시험상품82deeddc 입력1회·임시저장/등록0 |
| IMP-ECOM-02 / 실검수 | Threads 네이버수집 · CC-ECOM-01 / CX-QA-01 | 운영1.89·격리소스검수완료 · ECOM17-01·WS17-04 | 공간19본인로그인·확장1.89·실브랜드커넥트링크 | 수집/대기열만·등록/AI생성0 |
| IMP-B2B-01 / 실검수 | Lab 교환비 고객/직원화면 · CX-QA-01 | QA037 읽기대기·Lab waiting교환1건준비완료 · Lab0104/7609748ad·공간29·420bfb91… | Mac 공간29 고객·직원 로그인/Return 뒤 화면·권한만 확인. 시험 키 결제 최종 단계 | 권한/교환상태/375읽기·실결제/상태변경0 |
| IMP-B2B-02 / 운영반영승인 | 0101~0104/Front묶음 · CC-B2B-BACK-01 | 준비파일/문구9668a2a6c+7a0800203 마감 · d43255f8f·c6931bfbe | 운영실행승인/선행조건 확정전적용0 | 운영0100기준보존·옛0102 rollback사용0 |
| IMP-FRONT-01 / 신규발견/미확인 | navCls hover7색 · CC-B2B-FRONT-01 | 77c50f27c QA045소스PASS·미배포 · 77c50f27c·QA045 msg_b36218feed71 | 운영/Lab반영은다음묶음·실시각범위별도 | 미달색4.5이상·비대상theme회귀·143추측수정0 |
| IMP-FRONT-02 / 제안/미착수 | 갤러리누름크기·원래가격·S70 · CC-B2B-FRONT-01 | 제안단계 · c6931bfbe | 우선순위/실근거·S70결제흐름범위확정후배정 | 각변경완료조건 별도정의·기존승인으로임의확대0 |
| IMP-BLOG-01 / 미배포수정 | 이웃1.22·티스토리1.98 · CC-BLOG-01 | 소스완료·실조건대기 · 3bb238398/e35947191/a27861137 | 다음묶음승인·이웃B1사람/계정·Tistory기존미리보기 | 소제목기호수정·진단근거·실발행0 |
| IMP-BLOG-02 / 미배포수정 | web-crawler T05/T07 · CC-BLOG-01 | QA023/029소스PASS · 8172d8084/fc48ebcba/40662e6ae/1a54bdd06 | 다음기능묶음→화면확인 | robots/DNSabort·권한거절폴링정지·중복요청0 |
| IMP-MEDIA-01 / 미배포공용수정 | MP4인코더4사본 · CC-MOVIE-01 (공용) / CC-MUSIC-01 (소비자) | QA032소스PASS · 2b9a06c9c | 각프로그램다음기능묶음·하나의공용소유자만수정 | 대체성공뒤기본방식·실하드웨어별도·4사본동일 |
| IMP-MUSIC-01 / 미배포수정 | 가사영상취소안내 · CC-MUSIC-01 | MOV17-05소스PASS · fe402b1df | 공용인코더와다음가사기능묶음 | 취소를오류로단정0·실저장선택은QA002 |
| IMP-REALTY-01 / 미배포공통 | 상가2/고객관리3변경 · CC-REALTY-01 | 소스완료 · 3a1d7fbb4/7f97c00e6 | 각다음기능배포·공통만단독빌드0 | local로그아웃/기기정보/위젯실로드범위구분 |
| IMP-REALTY-02 / 분석완료/검증대기 | 뉴스후보 C · CC-REALTY-01 | 개발237·독립표본없음 · 7ef7f547c·RE17-07 | 미사용기간 정상저장자료확보후고정후보별도배정 | 라벨먼저고정·개발자료재평가를독립PASS로표기0 |
| IMP-PORTFOLIO-01 / 담당/문서공백 | detail-page-12p 및현세션없는카테고리 · CX-MASTER-01 | 현문서근거/담당확인대기 · 103폴더대조·CATEGORY_GUIDE_MAP | 역할/개별문서기준대조→소관확정후구현배정 | 담당불명=폐지/완료로추정0·부재목록명시 |
| IMP-IMAGE-02 / 直接지시/구현중 | 감성글귀3사AI 선택 · CC-ECOM-01 | v1.30운영·3모델실호출성공작성자 · PLAN1ece3747d·msg_b8292d9e0030·공용openai사본바이트일치/검사등록 | 나머지6모델실호출미검증 | OpenAI/Claude/Gemini 선택·본인키/서버허용목록·재시도0·기존기본유지 |
| IMP-IMAGE-03 / 미배포수정 | Pexels 선택/가이드제거 · AG-UI-01 | v1.30운영반영 · de49e96e9+62189915b | Pexels서버옛호환과UI제거구분 | UI선택제거·구초안pixabay·기존키/서버호환보존 |
| IMP-IMAGE-04 / 직접지시/미배포수정 | 배경외부링크 버튼화 · AG-UI-01 | v1.30운영반영 · msg_10b55a37b895 | 독립실모바일배치미검수 | 두링크/본문인계·키보드/넘침·저장버튼불변 |
| IMP-IMAGE-05 / 직접추가요구/동결검토 | NanoBanana/OpenAI/무료FLUX 이미지엔진 · AG-UI-01 / CX-MASTER-01 | 1a1f64dba 지정소스독립PASS·미배포/free=false · msg_97466d3e6af4·INC18-01·fc7536040 | 무료정책/실생성/추가빌드별도 | 회원권한/본인키·무료방식근거·timeout/응답MIME/크기/URL·실지원/비용·명시릴리스manifest |
| IMP-CRM-01 / 현행확인필요 | 웹훅 response_id 중복 발송 F007 · CC-B2B-BACK-01(단기검증) | 운영결함미해결·순수키/SQL초안/UI준비완료 · crm-google-form/docs/IMPROVEMENTS.md:7·PORT18-02·53d66404f·route/SourceCard Master대조 | 주인님불확실후속알림정책선택→route/dispatch구현범위·운영DDL/빌드/실문자별도 | 이미해결F011재배정0·실SMS/DB0 |
| IMP-CRM-02 / 기존오류처리한계 | 대시보드 전체/발송실패/최근7일 count 조회실패 0건오인 · CC-B2B-BACK-01(단기) | 7b002047d 지정실SSR독립PASS·미배포 · 405ebdb8c 결과msg_7e48457823e8 | 다음승인묶음·실운영조회미검수 | 조회실패와정상0구분·기존정상개수회귀 |

## 담당별 현재 상태·인수인계

전송·수락·완료와 작성자 문서 대조·독립 검수·운영 확인을 구분한다. 연결만 된 세션을 작업 중으로 간주하지 않는다.

| 담당 | 현재 작업·점유 | 완료/대기·다음 행동 | 확인 근거 |
| --- | --- | --- | --- |
| CC-WORKSPACE-01 | v1.58 Gmail ON 배포, GCP 콜백 저장 및 Client ID 일치 보고 수신 | 기존 시험 계정에서 주인님 동의 후 §11-3 단일 검증 | msg_ac60ef28f478 |
| CC-B2B-BACK-01 | 운영준비QA047문구마감·Lab시험교환1건준비 | 샘플몰 뒤 Lab0101 읽기·운영 준비 문서 정정. 시험 키 결제는 최종 단계 | 9668a2a6c/7a0800203·msg_bdbf073001ca |
| CC-B2B-FRONT-01 | hover77c50f27c QA045소스수락·미배포 | 다음묶음/QA037대기 | c6931bfbe / 55368bd4c |
| CC-ECOM-01 | 재배포선택질문대기·후속메시지전달보류·운영1.29 | 追加빌드1예산결정전0·안전후보59cb고정·실3회기승인잔여 | 26e1353c5 / msg_c6e462ca244b·msg_b8292d9e0030/ACTIVE_WORK |
| CC-BLOG-01 | 현재요약정정완료·점유0 | 다음묶음/사람계정조건·T12문서조정, 새생성0 | 2f15cafc9 / msg_de0bdb33dbeb |
| CC-MOVIE-01 | YVS실검색/AI기획안1회 담당운영완료·점유0 | 재호출0·새배정대기 | a3f39764b/00a2c9efa·별도실청구미확정 |
| CC-MUSIC-01 | 현재기록정정완료·점유0·기존icon변경보존 | lyric2건다음묶음·Mac실MP4사람선택 | a8333ca84/a5a96ab42 / msg_c4bd9b21150b |
| CC-REALTY-01 | 문서정정완료·점유0 | 독립자료미확보차단·정상회차이외새수집0 | 18b206cbe / msg_7c94f8433b21 |
| AG-UI-01 | emotion제품동결유지·PORT19문서매핑배정 전송/수락미확인 | 문서JSON19건반환→Master근거판정·다른프로그램코드변경0 | f4063ae82 / msg_cc05e5f53915·msg_bd9dfa2f47ed |
| CX-QA-01 | QA049画像provider/응답/URL 반례확인중 | 최종고정SHA보고·QA037읽기단일연결·추가테스트결제0 | msg_637d0a9f128b/msg_edc3ed674d46/msg_9a4e8d3e50c8 |
| CC-SUPPORT-01 | 주인님직접키트작업전담·이번상태미조회 | Master다른작업배정제외·완료신호만취합 | 주인님전담지시·SUP05 |

## 이번 대조에서 정정한 상태와 남은 불일치

| 항목 | 정정·판정 | 근거 |
| --- | --- | --- |
| Workspace | v1.55/146구현중 표기→운영v1.57·E3/WS23/GmailOFF 미배포로정정 | f6e6b1da3·WS22/24/25 |
| B2B | 0104입력/빌드대기→Lab적용/빌드1/1완료·운영v1.16/0100와분리, QA037로그인대기 | d43255f8f·c6931bfbe·85f5e0c4f |
| 소규모기배포 | 바나나M1/상세WebP/11번가markPosted/스마트스토어markPosted·music메뉴는배포됨. 옛미배포 재실행종료 | 26e1353c5·a8333ca84·a5a96ab42 |
| 영상 | shots1.50→1.51·AI영상1.36·YVS초기이식87ebcae7d는v1.30반영됨 | dacd987cc |
| 쇼핑제휴 | 전체목록누락이아니라#45의v1.88/담당미확정이오류→v1.89 CC-ECOM-01 | 26e1353c5·ECOM17-01 |
| 데이터수집 T12 | 미배정→Blog문서/요청조정배정완료. 라이브조회/제품권한은별개 | c3a7d77b7·2f15cafc9 |
| 부동산 | 08시대조/카카오사람단계옛대기종료·층진단복구실패마감, 후보C독립평가미완으로분리 | 18b206cbe·RE17-06/07 |
| 143 탭 | 4.15지적은현재재현안됨·추측수정0. 신규7색hover미달은작성자발견·독립확인전 | 55368bd4c |
| 프로그램문서 공백 | detail-page-12p AGENTS/IMPROVEMENTS 미발견. 프로그램폐지/완료로추정하지않음 | 이번103폴더/문서존재대조 |
| 실행중직접지시 회수 | YVS로그인/검색대기해소·Pexels제거수락·감성3사AI/Fronthover/Backend운영준비 후속단일배정 | a3f39764b·de49e96e9/62189915b·후속dispatch5건 |
| 파일점유 불일치 | Workspace옛E3-2진행행 본인삭제확인·Backend옛v1.06행 본인현재docs범위정정요청. Support/타세션옛행은보존/미확인 | 5f9e66d7f·msg_8e68bba959ef |
| 최신직접지시 추가회수 | YVS실AI1회까지완료·Gmail활성추진은준비/GCP설정단계로진전·음악MP4요청QA002연결 | 00a2c9efa·f4a6854e9·b9c115b01 |

문서 범위 확인: 103개목록/19분류·265개문서파일수집/표식대조, 미종료작업판정·담당8개자체정합성회신·AGY/Tester/주인님직접지시취합. 개별전체기능코드/운영재검증0. 전체 프로그램 운영 검증이나 전체 기능 코드 검토를 뜻하지 않는다.

## 운영 순서

1. 담당 보고를 실제 SHA·현재 파일·기배포 근거와 대조한다. 잘못 보고된 전역 HEAD와 실제 작업 커밋을 구분한다.
2. 기본 기술 판단은 Master가 승인하고, 담당 한 명·정확 경로·완료조건으로 배정한다. 다른 역할 파일을 임의로 수정하지 않는다.
3. 작업자는 변경·검증·한계와 함께 ready_review로 반환한다. Master가 범위별 done/보완/다음 작업을 결정한다.
4. 유료 빌드·외부 쓰기·운영 DB·사람 인증은 이미 받은 승인 이력을 먼저 대조한다. 기존 승인에 없는 필수 결정만 사용자에게 취합한다.

## 현재 릴리스 통제

새 배포가 READY여도 공식 도메인이 그 배포를 가리키는지는 별도로 확인한다. 롤백은 이미 사용한 빌드 예산을 복원하지 않는다.

| 프로그램·담당 | 상태 | 빌드 사용 / 승인 | 실모델 호출 사용 / 승인 | 현재 공식 별칭 대상 | 다음 조건 |
| --- | --- | --- | --- | --- | --- |
| ai-work-workspace · CC-WORKSPACE-01 | deployed_validation_pending | undefined / undefined | undefined / undefined | — | 주인님본인로그인/OAuth→Workspace 공통1세트실검증→Mac 독립읽기/375, 실패조건시OFF복구1회 |

## 완료를 정정한 항목

- B2B v1.09·v1.14 대기 표는 v1.15 배포 증거로 정정. 기존 프론트 5건/0095/S61은 재구현하지 않는다. 새 프론트 미배포는 5bfed663d로 분리했다.
- 음악 공통 6곳은 이미 배포됐다. 11-16의 사용자 직접 승인 5회 배포도 Ready 보고를 회수했고, 가사 MP4/플레이리스트 곡0개 화면은 실제 검증 근거를 받았다.
- ESM 웹 v1.01·11번가 실제 전송·영상v1.32 검수·단지2936·플레이리스트 첫30일 정리는 완료 기록이 있다. 옛 대기를 재요청하지 않는다.
- MOV/Blog의 커밋 보고가 같은 시각 다른 세션 HEAD를 가리켜 실제 파일 커밋으로 정정했다. 영상 efc72da60, 이웃 e35947191, 티스토리 a27861137이 기준이다.
- AG 정적 지적은 담당이 대조해 사실·추정을 구분했다. 실제 25MB 입력 검사 누락과 모바일 그리드는 수정, 자동 최적화/모든 WebP 애니메이션이라는 가정은 채택하지 않았다.

## 현재 작업 ID와 Master 처리

작업 기록 285개: done 264개 · cancelled 7개 · ready_review 1개 · running 1개 · waiting_human 7개 · superseded 1개 · reviewing 2개 · dispatched 1개 · queued 1개. 아래 done은 해당 작업의 완료조건만 닫은 것이며 제품 전체 개발·배포 완료율이 아니다.

| 작업 ID | 담당 | 상태 / 전달 | 완료·진행 범위 | Master의 다음 지휘 |
| --- | --- | --- | --- | --- |
| MUS-20261116-01 | CC-MUSIC-01 | done / integrated | 음악 기배포5건·공통6곳 포함 여부 정정 | 재배포 없음; 외부조건은 유지 |
| MUS-20261116-02 | CC-MUSIC-01 | done / integrated | 가사 MP420초·플레이리스트 곡0개 운영 검증 | 직접파일저장·멈춤/fallback·맥은 검수한계로 별도 |
| ECOM-20261116-01 | CC-ECOM-01 | done / integrated | WebP 수신 계약·ESM 상태 정정 | 수신부v1.46 Ready, 영상측 송신 연결 후 실제왕복 |
| ECOM-20261116-02 | CC-ECOM-01 | done / integrated | 바나나 M1 모바일·25MB가드·빈상태 보완 | 코드/104시험/정적독립검토 완료; v1.49 배포·실화면375px는 별도대기 |
| DES-20261116-01 | AG-UI-01 | done / integrated | M1 정적 품질 명세·잘못된 단정 정정 | 실기기·낭독 검수로 확대하지 않음 |
| DES-20261116-02 | AG-UI-01 | done / integrated | 7b5d3b053 정적 독립 재검토 | 필수 남은 정적결함0; 실화면 별도대기 |
| MOV-20261116-01 | CC-MOVIE-01 | done / integrated | GIF/WebP 송신·0/10MB·origin/source 보완 | 초기 구현·수정·독립QA 완료; MOV03 배포 완료, 실왕복 미검수 |
| ECOM-20261119-WEBP | CC-ECOM-01 | done / live_webp_verified_owner_retains_test_data | 영상에서 상세페이지로 WebP 한 건 실검수 | 원본 72프레임과 ZIP 확인 완료. 주인님 지시로 시험 상품 이미지 파일·DB 행 각 1건 보존. |
| WS-20261116-01 | CC-WORKSPACE-01 | done / integrated | Agent MCP 연결4개·회원한도·무인쓰기검토 | v1.52 운영 사용자 직접 배포 완료. 외부 MCP 실제 쓰기는 미검수 |
| WS-20261116-02 | CC-WORKSPACE-01 | done / integrated | 영속 승인1회 소모·동시재개1회 보완 | MUS03 독립12시험 통과. 운영 전체 무결함 의미 아님 |
| B2B-20261116-01 | CC-B2B-BACK-01 | done / integrated | v1.15 정정·M2-8~11/0100 준비·415시험 | 준비/최종422시험·Front합의 검토완료. 실제배포는B2B-20261116-03/DEC-002로분리 |
| B2B-20261116-02 | CC-B2B-BACK-01 | done / integrated | 3210 Lab 재개·Front 검수환경 | 2회재개 예외기록·보관캐시유지·추가재시작없음 |
| FRONT-20261116-01 | CC-B2B-FRONT-01 | done / integrated | v1.15/0095/S61 정정·S74 배포합의 | E3 실화면은FRONT-02에서 완료조건별 계속 |
| FRONT-20261116-02 | CC-B2B-FRONT-01 | done / integrated | E3 Lab검수→식품/키즈/뷰티 각6종 템플릿 | 6종구현/420시험/E3·갤러리Lab확인·Master카탈로그등록 완료. v1.16배포는별도대기 |
| RE-20261116-01 | CC-REALTY-01 | done / integrated | L-6 기술안·뉴스미배포정정·17시험 | 대안1 채택, 구현은RE-02로 분리 |
| RE-20261119-EXT | CC-REALTY-01 | running / three_program_linkage_independent_accepted_crm_plan_routed | 부동산 추가 개선 순차 진행 | 매물 알림 8 blob·독립 3/3, 관심 지역 3프로그램 연계 로컬 수락. 실 화면·DB 권한 검증 및 배포 대기. 고객관리 플랜 이동. |
| RE-20261119-DESK | CC-REALTY-01 | done / u1_independent_review_accepted_undeployed | 부동산 고객관리 화면 개선 | U-1 1c52f4e37 Mac 독립 수락. 중립 배지·합성 3종 본문/발송 연결·광고 규칙 6/6 확인. 기존 90자 안내는 별도 개선, 미배포. |
| RE-20261119-DESK-U1A | CC-REALTY-01 | done / sms_estimate_mac_review_accepted_undeployed | 부동산 고객관리 미리보기 문자 바이트 안내 | 1f55c38f2 Mac 독립 11/11, 16자 예시·90/91·본문 비치환·상시 추정·발송 경로 유지 확인. 미배포. |
| RE-20261119-DESK-REL | CC-REALTY-01 | done / live_and_isolated_versioned_source_tree_recorded | 부동산 고객관리 v1.11 푸시·배포 후보 | 운영 v1.11. 원격 af36bb467 기준 폴더 한정 후보 751bd8dfe, 기존 후보와 버전 한 줄 차이. 푸시 대기. |
| RE-20261116-02 | CC-REALTY-01 | done / integrated | 카톡실패상태·끊긴토큰재발송방지·local로그아웃/UA | 사용자 직접 승인 배포 v1.45/v1.61. 카카오 실물·08:00 뉴스 대조 별도 |
| BLOG-20261116-01 | CC-BLOG-01 | done / integrated | 티스토리 소제목##·이웃 전경거절 진단 보완 | 코드검증범위 완료, 이웃재시험/배포/실제소통은별도대기 |
| QA-20261116-01 | CX-QA-01 | cancelled / integrated | 종합 QA를 영상/Workspace로 분리 | 중복 배정 종료, 검증 완료 의미 아님 |
| FRONT-20261116-03 | CC-B2B-FRONT-01 | done / integrated | 내 섹션 넣기 성공·다른몰안내 표시 국소보완 | 임시전역상태방안은후속685로대체·FRONT-04 검토로종결.674단독출시안함 |
| FRONT-20261116-04 | CC-B2B-FRONT-01 | done / integrated | Puck 헤더 재생성 원인 보완·편집기별 상태와 비동기 수명 보호 | 구현/Lab검수범위완료·운영배포별도.5bfed663d+7ed5880ef+674+685 최종상태를B2B0100묶음에연결 |
| B2B-20261116-03 | CC-B2B-BACK-01 | done / integrated | 쇼핑몰 v1.16 운영0100+빌드1회 묶음배포 | 운영0100/58mmx0v2e Ready/DBv1.16수락, 관리자육안·실볼타미검수·0101운영미적용 |
| B2B-20261116-04 | CC-B2B-BACK-01 | done / integrated | 3210 몰500 진단 | 원인 가설과 확인 사실 구분, B2B05 복구 완료 |
| QA-20261116-02 | CX-QA-01 | done / integrated | 영상 구버전 검증 FAIL: 중복 ready/cleanup P1 | 결함은 MOV02 수정→QA03 PASS로 해소; 기존 FAIL 기록 보존 |
| QA-20261116-03 | CX-QA-01 | done / integrated | 2ae34fbdc 영상 독립 재검증 PASS | 원본11+독립4 통과, 운영 실제 왕복 미검수 |
| MOV-20261116-02 | CC-MOVIE-01 | done / integrated | 영상 1호출 1전송·cleanup·실패 처리 | QA03 PASS, 승인된 배포는 MOV03 분리 |
| MUS-20261116-03 | CC-MUSIC-01 | done / integrated | Workspace 독립 검토 12/12 | 치명 없음, WS04 안내 반영·WS05 보강 독립검토 후속 |
| WS-20261116-03 | CC-WORKSPACE-01 | done / integrated | v1.52 운영 4명령 열림/2기능 차단 확인 | 실제 외부 호출 미검수, 사용자 지정 Edge 유지 |
| WS-20261116-04 | CC-WORKSPACE-01 | done / integrated | MCP 대화/무인 승인 안내 정확화 | 문서 수정 미배포, 다음 승인 배포에 묶음 |
| B2B-20261116-05 | CC-B2B-BACK-01 | done / integrated | Orca 전용 터미널 3210 복구 | Master 18:08 로그인200/몰200/편집기307 확인. 운영 배포 승인과 별도 |
| FRONT-20261116-05 | CC-B2B-FRONT-01 | done / integrated | 템플릿131~138 추가·기존19 보존 | 428시험/타입0·Lab 확인. 미배포, 다크 스킨 결함 FRONT06 별도 |
| BLOG-20261116-02 | CC-BLOG-01 | done / integrated | 블로그 KIT 고정ZIP 정적 독립 검토 | 정적 FAIL0. 사용자 설치 확인10개, 설치/게시 미검수 |
| ECOM-20261116-03 | CC-ECOM-01 | done / integrated | INSTA v1.10 ZIP 독립 정적 검토 | 정적검토 완료. Master가 profile 권한 보호를 SUP04 필수 보강 배정 |
| RE-20261116-03 | CC-REALTY-01 | done / integrated | 부동산 배포 전 소스·승인 상태 대조 | 배포 전 기록 보존, 후속 직접 승인 RE04로 갱신 |
| MOV-20261116-03 | CC-MOVIE-01 | done / integrated | v1.33 승인된 1빌드 배포 | video-to-38pox5t03 Ready 보고·릴리스DB/ext/ZIP1.33일치. 실수신DB 왕복은 시험상품 범위 미확정으로 미실행 |
| WS-20261116-05 | CC-WORKSPACE-01 | done / integrated | 무인 destructive 표시 우선 검토 | Master 실제diff 및 MUS04 독립15시험 근거 수락. 보강코드 미배포, 안내 보충은 다음 묶음 |
| FRONT-20261116-06 | CC-B2B-FRONT-01 | done / integrated | 다크 타임세일 가독성 국소 수정 | Master 두 커밋diff·433시험/타입0·두테마×두스킨 대비근거 검토 수락. 휴대폰실측376px, 코드 미배포. |
| ECOM-20261116-04 | CC-ECOM-01 | cancelled / returned | 바나나375px·빈상태·입력경계 실제화면 검수 | 실화면검수 완료를뜻하지않음. 로그인/DB의존없는 ECOM07 실제컴포넌트격리하네스로대체 |
| DES-20261116-03 | AG-UI-01 | cancelled / queued | 키트 온보딩 읽기 전용 검토 | 사용자/Support 키트 직접작업 전담으로 DES04 B2B 시각검토로 변경 통보. 이전요청 수락/실행은 확인되지 않음 |
| SUP-20261116-03 | CC-SUPPORT-01 | ready_review / returned | 3종 KIT 작성·블로그 확장 독립 빌드 치환 | 키트 작성 근거 검토. 사용자 직접 설치로 자동 리허설 중단 통보 |
| SUP-20261116-04 | CC-SUPPORT-01 | done / integrated | KIT profiles 보호열 자기변경 차단 | INSTA1.11 profiles열보호22시험·Blog1.07 env읽기 보완. ECOM05/BLOG03 독립검토 대기. 클라우드실행0 확인 |
| SUP-20261116-05 | 사용자 | running / acknowledged | 3종 KIT Lab 설치·배포 사용자 직접 진행 | 사용자와 Support 키트설치 전담. Master 신규타업무/검토대응 배정 제외, 단계완료만 회수 |
| RE-20261116-04 | CC-REALTY-01 | done / integrated | v1.45/v1.61 직접 승인 배포 증거 정리 | 사용자 직접 승인 배포2건 근거 검토 수락. 로그인뒤화면·카카오끊기·08:00대조 미검수 |
| MUS-20261116-04 | CC-MUSIC-01 | done / integrated | WS05 파괴 표시 보강 독립검토 | 4e64c8cbd 전달경로·모순도구 검토·일회승인 확인 |
| ECOM-20261116-05 | CC-ECOM-01 | done / integrated | INSTA1.11 profiles 권한 보강 ZIP 재검토 | 고정ZIP/SHA·열권한·정상회원수정·업그레이드 SQL 확인 |
| BLOG-20261116-03 | CC-BLOG-01 | done / integrated | Blog1.07 env로딩·확장 ZIP 치환 독립검토 | 고정ZIP/SHA·env우선순위·주소유출방지·로그비밀값 확인 |
| QA-20261116-04 | CX-QA-01 | done / integrated | B2B 가독성 수정 독립검토 | 독립정적+기존국소5시험PASS. 실제375/376화면·사용자배경별대비는미검수 |
| DES-20261116-04 | AG-UI-01 | cancelled / queued | B2B 템플릿 시각 독립검토 | 착수미확인초기배정은DES05/06후속검토로대체·중복배정취소 |
| FRONT-20261116-07 | CC-B2B-FRONT-01 | done / integrated | 신규8템플릿 375px 읽기전용 검수 | 375px갤러리·376px시간블록 검수근거 수락. 전체폭낮은심각도문제는FRONT08 별도 |
| B2B-20261116-06 | CC-B2B-BACK-01 | done / integrated | 후속 단일 릴리스 명세 확정 | 단일릴리스명세·433/타입0/bundle100/운영선행의존 검증 및도구차단원문 수락. 실제0100/v1.16배포는B2B03별도미완료 |
| WS-20261116-06 | CC-WORKSPACE-01 | done / integrated | 무인 삭제가능 표시 검토 안내 일치 | 실제경로git log로SHA정정. 문구/정책일치 수락, 다음배포묶음·운영화면미검수 |
| MOV-20261116-04 | CC-MOVIE-01 | done / integrated | 송신 매뉴얼 1호출1전송 계약 일치 | 실제송신/상품섹션선택/재클릭/로그인·10MB안내diff 검토수락. 미배포 |
| ECOM-20261116-06 | CC-ECOM-01 | done / integrated | 배포 송신·수신 계약 최종 대조 | 계약대조·송신18/수신4 시험 근거 수락. 두창실물/실저장 미검수; source검사·DB중복·권한차단안내·수신ACK는 권고4건, 즉시구현아님. 배포시각과 ancestry/clean 작업폴더 근거 구분 |
| MUS-20261116-05 | CC-MUSIC-01 | done / integrated | 가사영상 저장·중단·fallback 예외 검증 | MUS06 수정실소스OPFS·7회귀·전체decode PASS로개발결함해결. 운영미배포·실저장창/맥/30분곡미검수 |
| RE-20261116-05 | CC-REALTY-01 | done / integrated | 운영 로그인뒤 버전 읽기전용 검수 | 기존시험계정 로그인뒤v1.45/v1.61실표시보고수락. 시험브라우저확장v1.44업데이트안내정상, 새확장실동작미검수 |
| MOV-20261116-05 | CC-MOVIE-01 | done / integrated | 파일 직접저장 hardware stall 소프트웨어1회대체 보완 | MUS06 수정실소스OPFS·7회귀·전체decode PASS로개발결함해결. 운영미배포·실저장창/맥/30분곡미검수 |
| MUS-20261116-06 | CC-MUSIC-01 | done / integrated | 4936c5e72 파일저장 소프트웨어 대체 독립 재검증 | MUS06 수정실소스OPFS·7회귀·전체decode PASS로개발결함해결. 운영미배포·실저장창/맥/30분곡미검수 |
| ECOM-20261116-07 | CC-ECOM-01 | done / integrated | 바나나375px 격리 실제화면 검수 | 로그인/DB차단해소·실제컴포넌트/375px·25MB/키보드 확인. 새모바일문제ECOM08수정/독립검토별도 |
| FRONT-20261116-08 | CC-B2B-FRONT-01 | done / integrated | 전체폭100vw 넘침 재현·비절단대안 검토 | ba41312d9/86828231c 실측수락. border-image대안fixture에서수직링/그림자보존. 제품미수정·v1.16범위외 |
| BLOG-20261116-04 | CC-BLOG-01 | done / integrated | website-scraper 라이프사이클 충돌 대조 | 병합/숨김·4API410 코드를확인, v1.15배포는문서기록·현재DB/live미확인. BLOG05정정배정 |
| BLOG-20261116-05 | CC-BLOG-01 | done / integrated | 기존2문서 버전·병합근거 정정 | 2706fc0b5 두문서2줄/633e04310결과 수락. 공용비교표는Movie미커밋2줄해소후정정 |
| MUS-20261116-07 | CC-MUSIC-01 | done / integrated | 가사영상 최소릴리스 확정 | 실소스2파일4936c5e72·기존미배포4건은v1.15포함 확인. 추가1빌드DEC003로취합 |
| MUS-20261116-08 | CC-MUSIC-01 | done / integrated | 가사영상v1.16 운영반영1빌드 | 주인님직접승인1빌드 v1.16배포완료; 중복대기요청종료·새배포없음 |
| MOV-20261116-06 | CC-MOVIE-01 | done / integrated | 공용비교표 영상2줄·기배포인코더대기 정정 | cd83a1daf+e14437967 실제본인2줄/기배포4커밋ancestry근거수락 |
| WS-20261116-07 | CC-WORKSPACE-01 | done / integrated | 사용자직접승인v1.53 운영배포 증거 | kffwahde1/dpl_5nPtYdj7hwjAKVEyuZKkN3ikaYep Ready·205시험/타입·Edge가이드확인. 실MCP쓰기미검수 |
| WS-20261116-08 | CC-WORKSPACE-01 | done / integrated | callKey 깊은정렬·legacy호환 | 초기정렬은WS09로통합·ed7a5f200 및QA08수정범위수락·v1.54기배포; 기존혼합키결함이력보존 |
| RE-20261116-06 | CC-REALTY-01 | done / integrated | 상가·고객관리 로그아웃 local범위 보완 | Master 실제두함수diff검토·65/24시험·타입0 근거수락. 미배포/실다른기기미검수 |
| ECOM-20261116-08 | CC-ECOM-01 | done / integrated | 모바일 가독성·레이블 보완 | MOV09 독립320/375·실합성blob색/긴이름/단계전환 PASS 근거 수락. 운영미배포/실기기·낭독·바깥틀미검수 |
| QA-20261116-05 | CX-QA-01 | done / integrated | 0100 SQL 권한·상태전이 독립검토 | 검토FAIL보고완료·지적은B2B07/WS11실SQL검증으로해소; 원FAIL판정이력보존 |
| B2B-20261116-07 | CC-B2B-BACK-01 | done / integrated | 0100 취소누락·rollback발급중지 보완 | P1-1/P1-2는WS11 엄격독립SQL37로해결판정. rollback2같은파일trigger선삭제+transaction필수확대수락. 운영적용은별도미완료 |
| QA-20261116-06 | CX-QA-01 | done / integrated | WS08 canonical/legacy 승인 독립검토 | 검토FAIL보고완료·혼합키지적은WS09/QA08후속해소; 원FAIL이력보존 |
| WS-20261116-09 | CC-WORKSPACE-01 | done / integrated | 동일호출 canonical/legacy 동치 승인 CAS일괄소진 | ed7a5f200+QA08 정적/모의CAS 독립수락·v1.54기배포·실MCP쓰기/실멀티프로세스미검수 |
| MOV-20261116-07 | CC-MOVIE-01 | done / integrated | 바나나 모바일45e04a14d 독립검토 | 원P2긴파일명지적은ECOM09~11/MOV09후속해소·v1.49기배포; 당시검수이력보존 |
| BLOG-20261116-06 | CC-BLOG-01 | done / integrated | 공용비교표 병합·배포기록 정합성 정정 | bcbac9645 두문서3위치정정/T11문서완료 근거수락, 현재DB/live는미확인유지 |
| BLOG-20261116-07 | CC-BLOG-01 | done / integrated | website-scraper 운영프로그램 메타 읽기확인 | 당시읽기접속차단보고보존·WS10대체운영메타/ BLOG17-01문서통합으로조사완료 |
| DES-20261116-05 | AG-UI-01 | done / integrated | B2B 전체폭 독립격리 UI검수 | fixture범위보고수락·과장/스크롤바근거는DES06으로보강완료·운영전체PASS아님 |
| WS-20261116-11 | CC-WORKSPACE-01 | done / integrated | 0100독립엄격 SQL37·권한/rollback검증 | 현재SQL독립37/37·anon/authenticated/보존/되살리기PASS 기술판정. 시나리오NOTICE와실행기has거짓통과는B2B09별도보완. 실Supabase/볼타미검수 |
| B2B-20261116-09 | CC-B2B-BACK-01 | done / integrated | 0100 공유검증기 기대문구 거짓통과 제거 | Master 실제diff/현재43PASS·전15/중간8FAIL 근거수락. 검증기거짓통과해소·독립WS11합쳐기술게이트해제 |
| DES-20261116-06 | AG-UI-01 | done / integrated | 전체폭 fixture·스크롤바/픽셀근거 보강 | 픽스처/3210측정범위PASS,15px스크롤바는시뮬레이션·실라이브gap0과구분. 실기기/구형브라우저미검수,배포승인아님 |
| B2B-20261116-08 | CC-B2B-BACK-01 | done / integrated | 3210 Lab 서버 복구 | Orca term_c892e40b-1844-4194-a7fe-4de5df54ef6f·PID9392·3경로200/200/307 보고와Master리스너확인. Lab DB식별, 운영아님. 0101미적용messages메뉴검수제외 |
| ECOM-20261116-11 | CC-ECOM-01 | done / integrated | 첫미리보기 단계 의존 보완 | MOV09 독립320/375·실합성blob색/긴이름/단계전환 PASS 근거 수락. 운영미배포/실기기·낭독·바깥틀미검수 |
| MOV-20261116-09 | CC-MOVIE-01 | done / integrated | 바나나 최종 묶음 독립 재검증 | MOV09 독립320/375·실합성blob색/긴이름/단계전환 PASS 근거 수락. 운영미배포/실기기·낭독·바깥틀미검수 |
| DES-20261116-07 | AG-UI-01 | done / integrated | YVS 떡상탐색 UI 독립검수 | YVS실컴포넌트 합성fixture1440/375 넘침0·필터/문구/23SVG/라벨보고 측정범위수락. 실API/실기기미검수 |
| YVS-20261116-01 | CC-MOVIE-01 | done / integrated | 사용자직접 YVS1단계 기능·v1.30 운영배포 | 배포/DB2표 적용완료수락. 실제검색/AI/계정은개선목록과사람결정함으로분리 |
| ECOM-20261116-09 | CC-ECOM-01 | done / integrated | 긴 파일명·순번 줄바꿈 보완 | MOV09 독립320/375·실합성blob색/긴이름/단계전환 PASS 근거 수락. 운영미배포/실기기·낭독·바깥틀미검수 |
| ECOM-20261116-10 | CC-ECOM-01 | done / integrated | 공용서브 단독·동명파일 선택 보완 | MOV09 독립320/375·실합성blob색/긴이름/단계전환 PASS 근거 수락. 운영미배포/실기기·낭독·바깥틀미검수 |
| ECOM-20261116-12 | CC-ECOM-01 | done / integrated | 바나나v1.49 릴리스명세·기존승인 확인 | 7커밋후보확정(807포함)·현재승인없음확인·DEC0041건등록. 운영배포는별도waiting_human,연결모드실물미검수유지 |
| DES-20261116-08 | AG-UI-01 | done / integrated | 바나나768/900/1023 반응형 독립 UI검수 | 768/900/1023 실제컴포넌트격리측정PASS·표내스크롤vs문서넘침/AXtree/TAB확인. 운영틀/실기기/낭독미검수 |
| ECOM-20261116-13 | CC-ECOM-01 | done / integrated | 바나나v1.49 운영반영1빌드 | 주인님직접승인바나나v1.49배포완료·DEC004요청실제done·실저장후속확인 |
| B2B-20261116-10 | CC-B2B-BACK-01 | done / integrated | 운영0100 사용자 수동적용 묶음 | 수동적용 묶음 준비완료. 운영0100은 사용자직접실행 대기·빌드0 |
| DES-20261116-09 | AG-UI-01 | done / integrated | 메시지 정적UI 검토 | 보고 표현 보정 수신 msg_640a8593e47c; B2B11 산출물 후 검수 |
| ECOM-20261116-14 | CC-ECOM-01 | done / integrated | 사용자직접 쇼핑제휴1단계v1.88 배포 | 주인님직접TAP v1.88배포보고수락·이후v1.89순차완료, 당시실쿠팡검수미실행보존 |
| FRONT-20261116-09 | CC-B2B-FRONT-01 | done / integrated | 템플릿139–144 구현·모바일 독립검수 대기 | 6종구현/대표미리보기검수·공통P2수정완료, 남은P3/게시·실기기등별도·미배포/v1.16제외 |
| B2B-20261116-11 | CC-B2B-BACK-01 | done / integrated | 메시지 UI 동의·라벨·비용 안내 보완 | 실제설정원본·로컬CSS·이메일 비용안내 보완수락; UI 배정범위완료, 운영/DB0101/실발송/전체통합 미검수 |
| MOV-20261116-10 | CC-MOVIE-01 | done / integrated | 신규 템플릿375px 독립 검수 | 검수작업 완료: 공통 다크헤더 P2 FRONT10 배정. 375외부/390내부, 게시화면미검수 |
| ECOM-20261116-15 | CC-ECOM-01 | cancelled / returned | 재합성 저장완료 표시 유실·중복반영 방어 복구 | 중간수정FAIL원문보존·60860337b/87267c4cb ECOM17로대체·운영실저장후속확인 |
| DES-20261116-10 | AG-UI-01 | done / integrated | 메시지 수정 독립 fixture 검수 | 실제설정원본·로컬CSS·이메일 비용안내 보완수락; UI 배정범위완료, 운영/DB0101/실발송/전체통합 미검수 |
| FRONT-20261116-10 | CC-B2B-FRONT-01 | done / integrated | 공통 다크 머리글 상점명 대비 복구 | 독립 MOV12로배정P2 해결확인; 미배포·v1.16제외·남은P3유지 |
| MOV-20261116-11 | CC-MOVIE-01 | done / integrated | 저장응답 지연·입력변경 경합 독립검수 | 검수결과 FAIL 수락, ECOM15 해결미완료·ECOM16 계약조정 진행 |
| ECOM-20261116-16 | CC-ECOM-01 | done / integrated | 저장 ACK 계약·입력동일성 범위 조사 | 실제수신상세1개·쇼핑몰미구현정정; ECOM17 범위조정/구현지시 |
| MOV-20261116-12 | CC-MOVIE-01 | done / integrated | 다크 공통 머리글 수정 독립재검수 | 머리글 P2 해소 확인, 공유상세/PWA실화면·남은P3 미검수/후속 |
| DES-20261116-11 | AG-UI-01 | done / integrated | 템플릿140–142 실제 모바일·PC 미리보기 검수 | fixture검수/실Lab307차단기록완료, 실제3경로검수MOV-20261117-01재배정 |
| ECOM-20261116-17 | CC-ECOM-01 | done / integrated | 바나나·상세 저장응답 상관ID 계약 복구 | 상관ID·pending자동재전송차단독립검수수락·미배포, ECOM17-02릴리스준비 |
| RE-20261117-01 | CC-REALTY-01 | done / integrated | 주인님 직접 카카오해제 실물검수 부분결과 기록 | 주인님Telegram경고줄확인/재연결저장확인. 발송성공/표시해제원래18:04뒤읽기·same-token실물미검수 |
| ECOM-20261117-01 | CC-ECOM-01 | done / integrated | 주인님 직접 쇼핑제휴2단계 구현 | 소스/운영v1.89 수락. 실확장수집은별도검수개선항목으로유지 |
| WS-20261117-01 | CC-WORKSPACE-01 | done / integrated | 쇼핑제휴2단계 독립 읽기검토 | 독립검토완료·결함2건 WS17-02/TAP17-02 보완배정, 실제설치/RLS/동시성미검수 |
| WS-20261117-02 | CC-WORKSPACE-01 | done / integrated | 네이버 도착 URL 계정·포트 판정 보완 | URL판정보완완료, ZIP릴리스재생성·실설치미검수유지 |
| TAP-20261117-02 | CC-B2B-BACK-01 | done / integrated | 수집큐 동시등록 원자성·중복 방지 | 독립WS17-04로배정경합해소확인, 운영SQL미적용·TAP17-03준비 |
| MOV-20261117-01 | CC-MOVIE-01 | done / integrated | 140~142 실제 Lab 모바일 검수 | 실제Lab140~142 375/내부390 확인; 게시·실기기등미검수 |
| WS-20261117-03 | CC-WORKSPACE-01 | done / integrated | 쇼핑제휴 등록 원자성 독립검토 | 검토완료·제품수정필요반환; Backend후속결과후K2/G1/G2재검토 |
| MOV-20261117-02 | CC-MOVIE-01 | done / integrated | 바나나·상세 상관ID 계약 독립검수 | 검수 FAIL 수락: pending 재전송3회 확인, ECOM17 보완반환 |
| WS-20261117-04 | CC-WORKSPACE-01 | done / integrated | K2 수집저장·등록경합 수정 독립재검토 | 경합수정 독립검토완료·PostgREST운영미검수유지 |
| TAP-20261117-03 | CC-B2B-BACK-01 | done / integrated | 쇼핑제휴v1.89 로컬ZIP·릴리스명세 준비 | 준비작업완료·후속기승인운영배포Ready(REL001/003/005), 승인대기표시는과거이력; 실물한계후속별도 |
| MOV-20261117-03 | CC-MOVIE-01 | done / integrated | 미응답 pending 재전송 차단 독립재검수 | pending반례해소확인·실부모저장미검수 |
| RE-20261117-02 | CC-REALTY-01 | done / integrated | 부동산 공통 UA·저장위젯3건 미배포 보완 | UA2/위젯1 코드완료·미배포, 운영실로그인/위젯검수별도·다음기능배포묶음 |
| ECOM-20261117-02 | CC-ECOM-01 | done / integrated | 바나나1.49·상세1.47 최소 릴리스 준비 | 준비작업완료·후속기승인운영배포Ready(REL001/003/005), 승인대기표시는과거이력; 실물한계후속별도 |
| REL-20261117-001 | CC-ECOM-01 | done / integrated | 주인님 직접승인 상세페이지 v1.47 운영배포 | 운영실저장왕복시험상품1개 후속검수수락·대표사진원복, 실기기/낭독등별도미검수 |
| WS-20261117-05 | CC-WORKSPACE-01 | done / integrated | 주인님 직접 캘린더한국어·높이/현황판전체너비 | 구현/정적독립검토범위완료·실화면미검수, REL002기승인배포/운영검수별도 |
| DES-20261117-01 | AG-UI-01 | cancelled / queued | 캘린더 높이·한국어/전체너비 독립 읽기 검토 | 전달대기·착수미확인으로Movie이관, 취소공지대기·이미착수시부분반환요청 |
| MOV-20261117-04 | CC-MOVIE-01 | done / integrated | Workspace 캘린더/전체너비 독립읽기검토 | 정적조건부PASS·실렌더미검수·P3후속관찰Workspace전달 |
| REL-20261117-002 | CC-WORKSPACE-01 | done / integrated | 주인님 직접승인 Workspace v1.55 배포 | 운영v1.55·주인님캡처로ko/칸확인, 현황판전체너비미확인·90612778f소규모묶음대기 |
| REL-20261117-003 | CC-ECOM-01 | done / integrated | 주인님 직접승인 바나나v1.49 배포 | 운영실저장왕복시험상품1개 후속검수수락·대표사진원복, 실기기/낭독등별도미검수 |
| WS-20261117-06 | CC-WORKSPACE-01 | done / integrated | 주인님직접 DB전체페이지 여백96→24px 미배포묶음 | v1.56 묶음반영완료·추가중복개발0 |
| REL-20261117-004 | CC-B2B-BACK-01 | done / integrated | 주인님직접 B2B0100실행위임 취합 | B2B0100주인님확인직접승인·분리소스1.16배포완료, 추가빌드0·실볼타/관리자미검수 |
| QA-20261117-001 | CC-ECOM-01 | done / integrated | 주인님 직접시험상품1개 운영 저장응답왕복 검수 | resultId왕복/동일설정재전송방지확인·대표사진원복, 실기기/낭독별도·추가실행없음 |
| REL-20261117-005 | CC-ECOM-01 | done / integrated | 주인님 직접승인 쇼핑제휴v1.89 운영배포 | qkncpet55 Ready·ext/zip/DB1.89·실설치/네이버수집등록/쿠팡미검수 |
| FRONT-20261117-01 | CC-B2B-FRONT-01 | done / integrated | 갤러리 로빙키보드·필터선택 및fallback 정합성 | 코드완료·7609748ad Lab반영, 실고객/낭독은QA037 별도 |
| MUS-20261117-01 | CC-MUSIC-01 | done / integrated | 가사영상 회원취소 일반안내 보완 | 작성자36검사/독립실원본취소·실패분리PASS·미배포묶음, ACTIVE공용타인삭제충돌보존 |
| BLOG-20261117-01 | CC-BLOG-01 | done / integrated | 수집기 운영메타·블로그 미배포 누락 정정 | 문서정정완료·tistory타인ZIP삭제diff보존·T12미정별도 |
| RE-20261117-03 | CC-REALTY-01 | done / integrated | 읽기전용 뉴스측정·안정페이징 도구 | 동률2500루프모의검증수락·실PostgREST1000+미검수·recall판정불가/운영recent상한차이명시 |
| WS-20261117-07 | CC-WORKSPACE-01 | done / integrated | 뉴스측정기 독립읽기/안정페이징 후속검토 | 지적보완수락·DB/API0·실페이지경계누락실측아님 |
| RE-20261117-04 | CC-REALTY-01 | done / integrated | 지역·단지 감시 겹침 안내 | 신규경계Mac실background12+boolean2 PASS 수락·미배포. 정확릴리스묶음/기록격리화면영향·복구없는중단·업데이트횟수 준비,실수집/배포0 |
| MOV-20261117-05 | CC-MOVIE-01 | done / integrated | 갤러리키보드·가사취소 안내 독립검토 | 각실컴포넌트/실Lab PASS·운영미배포·fallback소규모후속코드대조 |
| B2B-20261117-01 | CC-B2B-BACK-01 | done / integrated | 메시지 safeupdate 미리보기·알림라벨 보완(Lab) | Mac정적PASS/동일Lab작성자preview증거 재사용. 운영0101·실발송·제품배포 미완료 유지 |
| WS-20261117-08 | CC-WORKSPACE-01 | done / integrated | 주인님 직접 소규모5건 캘린더·번역 묶음 | v1.56 묶음반영완료·추가중복개발0 |
| PLAN-20261117-01 | CC-WORKSPACE-01 | done / integrated | Workspace 큰기능4건 기존기능대조·확장계획 | E1 claimRetry보완우선. E2 PresenceLayer기존위치표시발견→새Badge/Block중복계획철회, sync복귀조회·기존말풍선현지화만. 예약/포털설계보완·운영DDL별도 |
| MOV-20261117-06 | CC-MOVIE-01 | done / integrated | Workspace소규모캘린더/번역/여백 독립검토 | 중복검토0·최신146화면은Workspace/독립시각검수별도 |
| QA-20261117-002 | CX-QA-01 | waiting_human / A_real_mp4_pass_B_save_dialog_pending | 실제Intel Mac MP4파일내보내기 보조검수 | 주인님기존20 저장창있으면mac-file.mp4→PDS/mus-mac저장·Return,없으면현재진행/완료확인후안내→Mac diag-B→Music검증 |
| QA-20261117-003 | CX-QA-01 | done / integrated | B2B Lab·RE계정격리·Workspace묶음 독립검수 | 배정검수범위완료·새E2/교환UI반환후새검수,같은시험반복없음 |
| QA-20261117-004 | CX-QA-01 | done / integrated | 교환0102 독립검토 | DB검수배정범위완료·맥DB/실UI/운영미검수;불가능복구문구후속정정. Lab0102/운영0 |
| B2B-20261117-02 | CC-B2B-BACK-01 | done / integrated | 교환0102 구현·독립지적 수정 | 코어가드범위완료·불가능한거절/재접수안내P2문구는후속UI와국소정정. Lab0102/운영미적용 |
| WS-20261117-10 | CC-WORKSPACE-01 | done / integrated | 보기 이름 저장값 보존 | v1.56 묶음반영완료·추가중복개발0 |
| WS-20261117-09 | CC-WORKSPACE-01 | done / integrated | 확장 E1·notify_me 중복 차단 | 독립경계완료·소규모미배포묶음유지. claim후enqueue실패소진/전체execute중복별도한계. E2축소진행 |
| DES-20261117-02 | AG-UI-01 | done / integrated | Workspace 전면디자인3안·12뷰 | 146선택·인계·WS13 운영구현완료. 기존145/147자산보존, 3안반복검수종료 |
| B2B-20261117-03 | CC-B2B-BACK-01 | done / integrated | 교환 접수·단계 UI 구현 | 교환UI소스/후속정합성완료·0103/0104 Lab반영. 실화면QA037대기 |
| QA-20261117-005 | CX-QA-01 | done / integrated | Workspace 디자인3안·독립뷰어 시각검수 | 디자인선택/기준검토 범위마감·제품실동작검수와구분 |
| WS-20261117-11 | CC-WORKSPACE-01 | done / integrated | E2-7-1 포커스복귀 동기화·기존말풍선 현지화 | 미배포묶음유지·기존disconnect poll타이머/inflight/currentPage잔류는별도한계,포털계속 |
| QA-20261117-006 | CX-QA-01 | done / integrated | 교환 UI 서버권한·단계·오류 독립검수 | 원UI 11모의/소스검토수락·실제Lab고객검수는QA037 |
| QA-20261117-007 | CX-QA-01 | done / integrated | E2 복귀동기화·리스너수명 독립검수 | 지정경계PASS수락·기존타이머취소/실네트워크/전체계정전환검수아님·재반복없음 |
| WS-20261117-12 | CC-WORKSPACE-01 | done / integrated | E2-7-3 손님 포털 구현·외부공개권한 경계 | 서버/UI OFF·운영aww_portals표0 유지. 활성배포는DB구조추가별도승인·기회정리/5분캐시한계기록 |
| ESM-20261117-01 | CC-ECOM-01 | done / integrated | 주인님 직접 ESM 썸네일 등록·사용자 매뉴얼 | 운영v1.02유지·동일배포재실행0·실ESM등록은추후범위지정 |
| QA-20261117-008 | CX-QA-01 | done / integrated | ESM 운영안내·매뉴얼 누락 독립점검 | 다음esm묶음배포뒤운영가이드반영확인만·같은소스재검수없음 |
| QA-20261117-009 | CX-QA-01 | done / integrated | OFF 포털 공유권한·토큰·속성투영 독립검수 | 만료토큰부활지정수정독립PASS 수락·실DB다중프로세스미검수·공개전환0 |
| WS-20261117-13 | CC-WORKSPACE-01 | done / integrated | 주인님 선택146 Professional Studio 전면리뉴얼 | 배포완료·후속QA021 Mac읽기전용독립검수. Alt/실인쇄/실기기/실발급未검수 유지 |
| REL-20261117-006 | CC-REALTY-01 | done / integrated | 주인님 직접승인 매물알림v1.46 운영배포 | QA010읽기확인배정·ZIP압축해시차이/내부파일동일근거보존,새수집/알림/추가빌드0 |
| QA-20261117-010 | CX-QA-01 | done / integrated | 매물알림v1.46 운영·확장버전 읽기확인 | Mac확장설치/실SW/첫격리/수집알림미검수·PC5대표시는다른PC상태,재반복0 |
| RE-20261117-05 | CC-REALTY-01 | done / returned | 주인님 직접 상가 층진단 n30 재측정1회 | 클라이언트15초타임아웃·응답지역변수라회수실패·HTTP/건수미확인·추가공공API호출0,향후결과보관실행기개선안만기록 |
| WS-20261117-14 | CC-WORKSPACE-01 | done / integrated | 주인님 직접 캘린더 달별 상자/색 구분 | v1.56 묶음반영완료·추가중복개발0 |
| ESM-20261117-02 | CC-ECOM-01 | done / integrated | ESM 카탈로그 썸네일 실등록 | 등록/독립공개이미지검수범위완료·backup비공개유지·이미지재생성/루트배포0 |
| B2B-20261117-06 | CC-B2B-BACK-01 | done / integrated | Lab0102 안전fixture·실행패키지 준비 | 0102실행패키지준비 수락. 옛cleanup/rollback은0104뒤재사용금지·새정리실행미승인 |
| B2B-20261117-07 | CC-B2B-BACK-01 | done / integrated | 주인님기승인 D5 교환비 카드결제 b3 mock구현 | QA037 Lab 실화면/인가 읽기 검수 별도, Backend 기록 갱신. 추가빌드0 |
| WS-20261117-15 | CC-WORKSPACE-01 | done / integrated | 주인님 직접 Alt/Option 달력카드 드래그 복사 | 배정코드검수완료·미배포묶음/146실화면으로연결,개발시험DB분리완료전DB시험재실행0 |
| QA-20261117-011 | CX-QA-01 | done / integrated | 달력 Alt복사·월구분 기능회귀 독립검수 | 취소/원자구조/엄격날짜/권한작성자증거지정검수완료·실DOM146시각미검수·같은검사재반복0 |
| QA-20261117-012 | CX-QA-01 | done / integrated | 교환비 카드결제 0103 모의/권한 독립검수 | Lab적용도구승인→검증→승인1빌드·테스트키실동작별도 |
| QA-20261117-013 | CX-QA-01 | done / integrated | 146 studio S0~2 라우트·실데이터·테마 독립검수 | 새로그인뒤실화면검수별도범위·동일effect/소스시험재반복0 |
| WS-20261117-16 | CC-WORKSPACE-01 | done / integrated | 로컬 개발·시험 DB 분리 및 기존자료 보존 | 래퍼 종료 보고 정정: Master TCP3457 LISTEN/PID44692 node 생존 직접확인, 재시작 불필요. 기존 로그인 안내 유효·로그인 후 로컬검수workspace 담당 생성·운영자료 이전0 |
| B2B-20261117-08 | CC-B2B-BACK-01 | done / integrated | 자동 구매확정과 교환7일 상태정합성 수정 | 0103적용/staff실RPC 검토마감·실유저7일/화면은QA037로분리 |
| DES-20261117-03 | AG-UI-01 | cancelled / superseded | 146 실제스타일 소스·명세·접근성 대조 지원 | WS13/QA019/운영v1.56에동일146검수범위통합·착수미확인옛배정중복종료 |
| B2B-20261117-09 | CC-B2B-BACK-01 | done / integrated | 교환비 결제 전용 화면·상태·직원 재확인 구현 | 소스동결·상위릴리스준비검토로연결,실Toss/Lab0104/빌드/배포0 |
| RE-20261117-06 | CC-REALTY-01 | done / integrated | N-1 지역 관련성 필터 오프라인 표본 평가 | 결과동결·운영규칙유지·공유HEAD잘못보고d54→실파일eb3정정. 별도기획전추가튜닝/대량읽기0 |
| QA-20261117-016 | CX-QA-01 | done / integrated | 주인님 직접지시 ESM 등록기 맥미니 실동작 테스트 | 웹운영검수마감·실ESM/확장연결은별도정확범위승인전0 |
| WS-20261117-17 | CC-WORKSPACE-01 | done / integrated | 주인님 직접지시 영수증 화면 메인 사이드바 연결 | 미배포묶음고정·WS13 메모리/로컬실화면보류와연결,서버재가동/전체시험/빌드0 |
| QA-20261117-017 | CX-QA-01 | done / integrated | 영수증 SPA 사이드바 연결 독립소스검수 | 미배포묶음고정·WS13 메모리/로컬실화면보류와연결,서버재가동/전체시험/빌드0 |
| ESM-20261117-03 | CC-ECOM-01 | done / integrated | ESM 모바일 메뉴 닫기·가격 오류 입력 보존 수정 | 주인님별도직접승인v1.02배포완료·Mac실모바일X/가격/상품이동回帰PASS·기존등록동작미검수 |
| WS-20261117-18 | CC-WORKSPACE-01 | done / integrated | 구글 캘린더 설정 연결 상태·연동 화면 버튼 | Workspace미배포묶음·실계정Google연결변경0·기존keys전체계정보호와구분 |
| QA-20261117-018 | CX-QA-01 | done / integrated | 캘린더 연결 상태·설정 이동 독립검수 | Workspace미배포묶음·실계정Google연결변경0·기존keys전체계정보호와구분 |
| FRONT-20261117-02 | CC-B2B-FRONT-01 | done / integrated | 어두운 테마 흰 글자 파랑 단추 대비 보정 | acb858a77 승인Lab1빌드묶음포함·별도빌드/추가소스0·LabReady뒤실Tab상태구분검수 |
| DOC-20261117-T12 | CC-BLOG-01 | done / integrated | 데이터수집 문서조정 담당·보관후속표 근거 정정 | 정정완료·다른미커밋/ZIP보존·실배포확인전완전배포표시0 |
| QA-20261117-014 | CX-QA-01 | done / integrated | 교환비 UI 독립검수 | 기승인Lab릴리스후실동작별도 |
| QA-20261117-015 | CX-QA-01 | done / integrated | Lab0104 실행자료 독립검수 | 주인님실적용승인유효·도구Accept後실검증 |
| WS-20261117-19 | CC-WORKSPACE-01 | done / integrated | 146 신규문구 ko/en·대시보드/영수증 제목 보완 | 소스동결·WS13/QA019 마지막viewport/상태누락증거보완·운영배포0 |
| QA-20261117-019 | CX-QA-01 | done / integrated | 146 실제캡처 독립시각검수 | 지정 시각 검수 종결. 실Alt·실인쇄·실기기 미검수,146 전체 완전일치 판정 아님 |
| QA-20261117-020 | CX-QA-01 | done / integrated | Front다크단추 대비 국소독립검수 | acb858a77 승인Lab1빌드묶음포함·별도빌드/추가소스0·LabReady뒤실Tab상태구분검수 |
| WS-20261117-20 | CC-WORKSPACE-01 | done / integrated | 워크스페이스 영수증 하단 스크롤 접근 복구 | 소스동결·WS13/QA019 마지막viewport/상태누락증거보완·운영배포0 |
| QA-20261117-021 | CX-QA-01 | done / integrated | Workspace v1.56 운영 읽기전용 독립 스모크 | 지정운영스모크종료·장애/DB정확성/발행끝/Alt/실인쇄/실기기미검수유지 |
| WS-20261117-21 | CC-WORKSPACE-01 | done / integrated | E2 예약7-2 현재코드대조 및 첫 구현범위 확정 | 소스구현/독립검토완료·OFF/미배포·활성화별도승인대기 |
| FRONT-20261117-03 | CC-B2B-FRONT-01 | done / integrated | 미달3색 대비 최소후보 분석 | 7609748ad 포함 Lab배포 dpl_CFgB5fC5NLdrye4K7esG1tWRktXQ 반영. 운영몰미배포·실고객/Tab검수QA037로그인대기, 재빌드0 |
| BLOG-20261117-08 | CC-BLOG-01 | done / integrated | T05 inspect robots 판정 구현준비 | 소스완료/미배포·실전송/route전체/운영未검수 |
| RE-20261117-07 | CC-REALTY-01 | done / integrated | 보수적 제외 후보 오프라인 실험 | 분석산출물 수락·운영필터미반영. 독립검증 대기는개선목록에서관리 |
| QA-20261117-022 | CX-QA-01 | done / integrated | FRONT03 대비보정·선택자·상태표시 독립검토 | hover P2 독립PASS·지정소스조건종결 |
| QA-20261117-023 | CX-QA-01 | done / integrated | inspect robots 가드 독립검토 | DNS P2 독립PASS·소스지정범위종결 |
| QA-20261117-024 | CX-QA-01 | done / integrated | 예약 서버1단계 OFF/상태/권한/동시성 독립검토 | 지정1단계소스검토종결·전체완성/실Google/운영未검수 |
| QA-20261117-025 | CX-QA-01 | done / integrated | 예약2A UI 계정/중복제출/unknown 독립검토 | 2A지정소스종결·배선/실서비스별도 |
| QA-20261117-026 | CX-QA-01 | done / integrated | 예약2B OFF배선 실제입구/보안경계 독립검토 | 지정OFF배선소스마감·실HTTP/Google/운영별도 |
| WS-20261117-22 | CC-WORKSPACE-01 | done / integrated | 예약 기능 운영 활성화·실연동 검증 | 활성화/실시험/합성1행정리완료·WS23초회DDL코드QA028대기/미배포 |
| QA-20261117-027 | CX-QA-01 | done / integrated | v1.57 예약활성 운영 읽기전용 스모크 | 지정운영읽기마감·public주소/실Google는작성자결과별도·DDL경합잔여유지 |
| WS-20261117-23 | CC-WORKSPACE-01 | done / integrated | 예약표 초회 초기화 경합 보완 | d7895f6d4 소스검토완료·미배포다음묶음·운영v1.57미반영/미래중첩tx한계유지 |
| QA-20261117-028 | CX-QA-01 | done / integrated | 예약표 초회DDL 직렬화 독립검토 | d7895f6d4 소스검토완료·미배포다음묶음·운영v1.57미반영/미래중첩tx한계유지 |
| WS-20261117-24 | CC-WORKSPACE-01 | done / integrated | E3-1 간단결재 요청관리 템플릿 | E3소스구현/독립/통합완료·WS23함께v1.58미배포·실검수/비용별도 |
| BLOG-20261117-09 | CC-BLOG-01 | done / integrated | T07 대시보드/작업목록 공용자동갱신 | 1a54bdd06소스완료·미배포·실HTTP/브라우저별도 |
| FRONT-20261117-04 | CC-B2B-FRONT-01 | done / integrated | P3 어두운테마 hover피드백 일관성 | 7609748ad 포함 Lab배포 dpl_CFgB5fC5NLdrye4K7esG1tWRktXQ 반영. 운영몰미배포·실고객/Tab검수QA037로그인대기, 재빌드0 |
| MOV-20261117-07 | CC-MOVIE-01 | done / integrated | 공용MP4 탭수명 fallback성공기억 P3 | 소스2b9a06c9c완료·미배포·실HW/MP4/AppleSilicon별도 |
| DES-20261117-04 | AG-UI-01 | done / integrated | 예약카드요일 체크박스 국소UI명세 | 명세수락·저대비주말색미채택 조건으로WS-20261118-01 구현인계, 제품동작완료아님 |
| QA-20261117-029 | CX-QA-01 | done / integrated | BLOG09 공용폴러 독립검토 | 국소독립검토종결·실계정전환미검수 |
| QA-20261117-030 | CX-QA-01 | done / integrated | WS24 템플릿/그룹/한계 독립검토 | 지정소스완료·미배포다음묶음/실운영미검수 |
| QA-20261117-031 | CX-QA-01 | done / integrated | dark hover 1규칙 국소독립검토 | 지정소스완료·미배포다음묶음/실운영미검수 |
| QA-20261117-032 | CX-QA-01 | done / integrated | 공용MP4 탭수명fallback P3 독립검토 | 독립검토종결·실HW미검수 |
| QA-20261117-033 | CX-QA-01 | done / integrated | E3-2 템플릿 앱알림/권한/부분실패 독립검토 | E3-2지정소스완료·미배포/전용결재권한별도 |
| QA-20261117-034 | CX-QA-01 | done / integrated | E3-3 결재ACL/신뢰경계/거래우회 독립검토 | E3-3지정소스완료·운영gallery/시각/실알림미검수 |
| QA-20261117-035 | CX-QA-01 | done / integrated | 셀AI웹출처 키·과금재시도·저장권한 독립검토 | 지정소스마감·실공급자/과금/사실성/운영UI·실DB미검수 |
| WS-20261117-25 | CC-WORKSPACE-01 | done / integrated | E4 Gmail함 기존기능/권한 대조와 최소범위 조사 | 소스동결·릴리스표QA041지정PASS갱신, 운영활성화WS27 별도승인/실검증 |
| WS-20261117-26 | CX-MASTER-01 | done / v158_released_runtime_checks_partial | E3+WS23 v1.58 묶음 배포/운영 실검수 | E3/요일칩 실화면·실AI별도 미검수경계유지 |
| QA-20261117-036 | CX-QA-01 | done / integrated | Gmail A1 OFF 서버 OAuth 독립 검수 | 0074소스준비수락·운영미적용/OFF, A2후속은별도검수 |
| QA-20261117-037 | CX-QA-01 | waiting_human / queued_after_adminui_waiting_test_role_login | B2B Lab 신규 배포 실제 화면·접근권한 읽기 검수 | Mac 공간39 관리자 검수 뒤 기존 공간29 고객·직원 로그인/제어 반환 대기. 교환비 안내·권한·375px 읽기, 실제 결제는 최종 단계. |
| QA-20261117-038 | CX-QA-01 | done / integrated | Gmail A2 원자 받은업무 전달 서버·SQL 독립검수 | 소스수락·고정, OFF배선통합은후속독립검수 |
| QA-20261117-039 | CX-QA-01 | done / integrated | Gmail OFF 패널 실제 TSX 모의 독립검수 | 소스수락·고정, OFF배선통합은후속독립검수 |
| QA-20261117-040 | CX-QA-01 | done / integrated | Gmail OFF 배선·실제 RPC 입구·어댑터·화면 통합 독립검수 | 배선소스수락·동결, 패널disconnect unknown후속별도 |
| QA-20261117-041 | CX-QA-01 | done / integrated | Gmail 연결 해제 재시도·계정교체 조건부삭제 독립검수 | 소스수락·두SHA같이배포, 활성화단계별도 |
| WS-20261117-27 | CC-WORKSPACE-01 | waiting_human / production_screen_disconnected_callback_unconfirmed | Gmail 운영 SQL 적용·실계정 검증·활성화 | v1.59 받은 업무 화면에서 Gmail 미연결 확인. 기존 콜백 결과 분류 미확인, 실검증 보류. |
| DES-20261118-01 | AG-UI-01 | done / integrated | 감성 글귀 이미지 직접지시 v1.28/v1.29 배포 회수 | P3 두건 DES02 다음묶음·375px/실위젯 미검수 유지 |
| QA-20261118-042 | CX-QA-01 | done / integrated | emotion-writer 메뉴·키설정 독립검수 | DES02 반환시 두건 재검수·실375/위젯/회원키는 미검수 |
| DES-20261118-02 | AG-UI-01 | done / accepted_pending_batch_deploy | 키보기 키보드 접근·키발급 링크 hover 대비 보완 | 다음 emotion-writer 묶음배포에 포함·운영반영 전까지 미배포 유지 |
| WS-20261118-01 | CC-WORKSPACE-01 | done / accepted_pending_batch_deploy | 예약요일 칩·busy·키보드 국소UI 보완 | v1.58묶음포함·375/390·다크/:has포커스실화면은배포후 |
| WS-20261118-02 | CC-WORKSPACE-01 | waiting_human / calendar_upgrade_plan_received_scope_decisions_pending | 워크스페이스 캘린더 업그레이드 계획 | 화면 기능/데이터 범위 및 데이터 포함 시 일회 가져오기/동기화 결정. 중복 메뉴는 v1.59부터 운영 반영. |
| WS-20261118-03 | CC-WORKSPACE-01 | done / sidebar_trim_production_screen_verified | 사이드바 예정된 일정 메뉴 숨김 | v1.59 운영 시험 화면에서 메뉴 숨김 확인. |
| WS-20261118-04 | CC-WORKSPACE-01 | done / four_views_production_desktop_verified | 워크스페이스 내부 네 화면 연결 | 네 화면·좌측 유지·본문 스크롤·뒤로가기 운영 확인. 767px 이하·주소 새로고침·타 공간은 운영 미검증. |
| WS-20261118-05 | CC-WORKSPACE-01 | done / production_ready_owner_desktop_checks_accepted | 워크스페이스 v1.59 승인 묶음 운영 배포 | 운영 v1.59 확인. 프로그램 목록 DB v1.58 보고는 운영 쓰기 범위 결정 대기. |
| WS-20261118-06 | CC-WORKSPACE-01 | done / calendar_and_dashboard_width_local_mac_checks_accepted_undeployed | 달력 월 구분 정리·업무 현황판 너비 | 로컬 완료·점유 해제·미배포. 실제 화면과 표 행 기본 폭 메뉴 제약은 별도. |
| WS-20261118-07 | CC-WORKSPACE-01 | reviewing / v160_deployed_calendar_verified_dashboard_page_unavailable | 워크스페이스 v1.60 캘린더·현황판 운영 배포 | 운영 달력 확인. 기존 시험 현황판 페이지를 찾을 수 없어 폭/메뉴 확인 보류. |
| WS-20261118-08 | CC-WORKSPACE-01 | done / collapsed_widget_spacing_static_mac_review_accepted_undeployed | 좌측 하단 저장공간 위젯과 푸터 겹침 | 미배포. 기본 위젯 겹침 국소 정적 검수 완료, 확장/좁은 폭·실화면은 별도. |
| WS-20261119-01 | CC-WORKSPACE-01 | done / saved_notion_html_recursive_fix_independent_review_accepted | 노션 공개 페이지 브라우저 저장 HTML 가져오기 구조 보존 | v1.61 배포 완료, 기존 가져온 본문 읽기 확인. 운영에서 노션 저장 HTML 다시 가져오기 시험은 미실행. |
| WS-20261119-REL | CC-WORKSPACE-01 | done / production_v161_live_verified_catalog_version_synced | Workspace v1.61 기존 중단 빌드 로그 진단 | 운영 v1.61·DB 버전 v1.61 확인. 수집 0.99초, 빌드 시간 DDL 0. 로그인 화면·inbox·위젯 읽기 확인. 실제 가져오기·cron/웹훅 남음. |
| WS-20261119-02 | CC-WORKSPACE-01 | waiting_human / decisions_six_to_eight_approved_one_to_five_pending | Workspace ZIP 50MB 안내와 대용량 가져오기 설계 | 최신 정정으로 결정 6~8만 승인. 결정 1~5의 사용자 답변 전 제품 코드를 쓰지 않음. 점유 확장 429f5b813, 50MB 문구 미배포. |
| MUSIC-20261119-IMG-COMPAT | CC-MUSIC-01 | done / five_music_flows_read_only_accepted | 무료 이미지 엔진 변경의 기존 음악 흐름 호환 검토 | 고정 2131089b7 음악 5경로·146/146 검토 수락. 새 범위 미사용 시 파일 미생성 정정. 실제 엔진은 미검증. |
| QA-20261118-043 | CX-QA-01 | done / production_v161_mobile_keyboard_verified_read_only | 예약요일 칩 지정소스/DOM·실브라우저 단계별검수 | Workspace 운영 v1.61 독립 읽기. 375/390px 요일 7칩 두 줄·넘침 0·Tab 3px 포커스. OS 다크 선호 확인, 앱 테마·저장 중 상태 미검증. |
| FRONT-20261118-01 | CC-B2B-FRONT-01 | done / integrated | 143 탭 대비 과거지적 대조 | 신규hover7색미달은제안/독립확인대기로기록·무근거143수정0 |
| OPS-20261118-01 | CX-MASTER-01 | done / integrated | 전체개발플랜·카테고리·누락개선/인수인계 정합성 대조 | 미확인68프로그램 현담당근거후속연결·제품전체검증과구분, 신규후속ID별진행 |
| DES-20261118-03 | AG-UI-01 | done / accepted_pending_batch_deploy | 주인님 직접 Pexels 사용자선택/가이드 제거 | DES02와다음emotion-writer묶음·ECOM18-01 소스공유조정·운영1.29미반영 |
| QA-20261118-044 | CX-QA-01 | done / integrated | Pexels UI/초안/가이드 제거 고정SHA검수 | 3사AI구현은별도·운영/실키미검수 |
| ECOM-20261118-01 | CC-ECOM-01 | done / accepted_pending_batch_deploy | 주인님 직접 글귀AI 3사/상세모델 선택 | 지정소스/fakefetch/TSX 검수수락·모델실지원/실키/운영/시각은미검수·다음묶음 |
| B2B-20261118-01 | CC-B2B-BACK-01 | done / integrated | 운영0101~0104 사전 실행표 | B2B18-02 정확실행파일준비·운영적용은미승인 |
| B2B-20261118-02 | CC-B2B-BACK-01 | done / prepared_not_authorized_to_execute | 운영전용 precheck/apply/verify 준비 | QA 화면과 최종 시험 결제·운영 승인 분리 기록 요청. 운영 미적용. |
| FRONT-20261118-02 | CC-B2B-FRONT-01 | done / accepted_pending_batch_deploy | navCls hover 미달7색 국소보완 | QA045 지정함수/CSS소스수락·미배포. compiled CSS/실시각은작성자증거와Mac미검수구분 |
| QA-20261118-045 | CX-QA-01 | done / integrated | nav hover7색/소비자범위 독립검수 | 다음몰기능묶음·실compile/브라우저Mac미검수·새설치0 |
| QA-20261118-046 | CX-QA-01 | done / integrated | 감성글귀3사AI/키/오류/취소 독립검수 | 지정소스/fakefetch/TSX 검수수락·모델실지원/실키/운영/시각은미검수·다음묶음 |
| QA-20261118-047 | CX-QA-01 | done / integrated | 운영0101~0104 실행준비파일 정적검수 | README원자성한정7a0800203담당정정수락·지정소스검토마감,실SQL/운영권한보장아님 |
| DES-20261118-04 | AG-UI-01 | done / accepted_pending_batch_deploy | 주인님 직접 배경링크 버튼화/줄바꿈 개선 | 링크/인계/기존저장로직소스수락·실320/375/외부수신未검수·롤백v1.29에는미반영 |
| QA-20261118-048 | CX-QA-01 | done / integrated | 배경제작 링크버튼 지정소스 검수 | 링크/인계/기존저장로직소스수락·실320/375/외부수신未검수·롤백v1.29에는미반영 |
| ECOM-20261118-02 | CC-ECOM-01 | done / released_author_verified_master_alias_verified | 감성v1.30 승인배포/3사실호출·범위사고복구 | 원격빌드추가/실호출잔여0·이미지엔진계획별도 |
| INC-20261118-01 | CX-MASTER-01 | done / contained_followup_required | HEAD추종배포 未검수포함·v1.29 복구 | 새이미지QA049·명시SHA릴리스manifest·추가빌드승인 별도, 재발방지미완까지사고전체종결로확대0 |
| DES-20261118-05 | AG-UI-01 | done / source_revised_qa_pass_unreleased_free_disabled | 주인님 직접 이미지 NanoBanana/OpenAI/무료모델 3엔진 | free=false유지·무료정책미결정/추가빌드미승인·다음묶음배포만 |
| QA-20261118-049 | CX-QA-01 | done / specified_source_scope_pass | 새이미지3엔진 소스/가짜통신·키/응답경계 검수 | 새Gemini반환보완SHA별도검수·현재실API/운영PASS아님 |
| B2B-20261118-03 | CC-B2B-BACK-01 | waiting_human / fixture_prepared | 주인님 직접 Lab 교환비waiting1건·토스시험흐름 | 사람시험제출/로그인신호없음·고정교환1건유지,현재주문상태는03:31자동확정가능해반복RPC없이다음읽기때판정 |
| B2B-20261119-LAB0101 | CC-B2B-BACK-01 | done / lab_catalog_definition_and_grants_matched | B2B몰 Lab 0101 메시지 정의·권한 대조 | Lab 0101 권한·safeupdate 일치. e20574f0f 인수인계 갱신. QA037 사람 로그인 대기, 결제 시험은 최종 단계. |
| B2B-20261119-FRONTQA | CX-QA-01 | waiting_human / windows_lab_gallery_verified_mac_execution_followup_pending | B2B Lab 프론트 키보드·대비·화면 검수 | Windows Lab 7609748ad 로그인 후 갤러리 로빙·라디오 방향키 작성자 확인. Mac 다크·VoiceOver·홈 탭·S70 대상 판 검수 대기. |
| B2B-20261119-HOMETABS | CC-B2B-FRONT-01 | done / tab_panel_independent_recheck_passed_undeployed | 홈 상품 탭 대비와 키보드 접근성 보완 | Mac 독립 모의 4/4. 일대일 ARIA·로빙·비활성 본문 미렌더 확인. Lab 다크 실화면·VoiceOver 검수 대기, 미배포. |
| B2B-20261119-FRONTP3 | CC-B2B-FRONT-01 | done / storefront_button_and_price_independent_review_accepted_undeployed | B2B몰 버튼 터치 영역과 원래 가격 대비 보완 | 두 변경 독립 15/15 수락. 미배포이며 Lab 7609748ad에 미포함. 주문서 S70은 별도 진행. |
| B2B-20261119-FRONTREL | CC-B2B-FRONT-01 | done / production_base_proven_ui_bundle_queued | B2B몰 UI 배포 범위와 순번 준비 | 운영 v1.16 READY. 가격 두 소스는 단독 적용 가능, 갤러리 90248e5b1은 7c8ee3a81·e4ba29947 동반 필요. 기존 다음 배포 묶음에 대기. |
| B2B-20261119-S70 | CC-B2B-BACK-01 | done / guard_rollback_independent_accepted_undeployed | 주문서 무통장 현금영수증 접수와 입금 확인 경합 처리 | 격리 21/21, Mac 롤백 정적 통과. 0105와 UI 배포 전 Lab 실검증 승인 대기. |
| B2B-20261119-S70-FRONT | CC-B2B-FRONT-01 | done / checkout_rpc_exception_independent_recheck_passed_undeployed | 주문서 UI에 무통장 현금영수증 접수 연결 | Mac 재검수 기존 6/6·별도 결제수단 3/3. 예외 때 완료 주문 상세 이동 및 기존 결제 경로 확인. 0105 롤백 보완과 Lab 검증 대기, 미배포. |
| B2B-20261119-S70-LAB | CC-B2B-BACK-01 | waiting_human / lab_readiness_verified_approval_pending | S70 Lab 적용 준비와 주문서 실화면·접수 검수 | Lab 0105 및 주문서 코드 미반영. Mac에서 Windows 로컬 3210 접근 불가. 격리 적용·빌드 승인과 양수 무통장·승인 사업자·설정 ON 시험 자료 필요. |
| B2B-20261119-SAMPLE-S1 | CC-B2B-BACK-01 | done / owner_direct_sample_content_update_reported | 운영 샘플몰 상품 사진과 설명 보완 | 담당 보고 기준 상품 16개 보완, 전체 상품 사진 25/25, 화면 이미지 33개 중 오류 0. |
| B2B-20261119-SAMPLE-QA | CX-QA-01 | done / public_sample_layout_verified_read_only | 운영 B2B 샘플몰 공개 화면 독립 검수 | Mac 1280/375에서 홈·5개 카테고리·상세 2개 확인. 깨짐·가로 넘침 0. Master 무쿠키 홈 HTTP 200·상품 링크 33개 확인. |
| B2B-20261119-MAKER | CC-B2B-BACK-01 | done / m1_stale_window_fix_independent_pass_undeployed | B2B 메이커 연계 M1~M3 선행 범위 대조 | Mac 12/12. 늦은 완료·실패 뒤 이전 창 작업 차단 및 공용 계약 보존. 실제 운영 창 미검증, M1 단독 배포 없음. |
| B2B-20261119-MAKER-M2 | CC-B2B-BACK-01 | done / data_layer_independent_accepted_undeployed_ui_design_dispatched | 메이커 M2 사진 제안 저장 범위 설계 | 0106 데이터 계층 Mac 독립 수락. UI 연결 계획 배정. 실제 Storage·Lab·운영 및 M3 미적용. |
| B2B-20261119-MAKER-M2-UI | CC-B2B-BACK-01 | done / m2_ui_independent_accepted_test_assertions_verified_undeployed | 메이커 M2 사진 제안 화면·저장 응답 연결 | 독립 제품 수락, 단언 5개 도달성 수정 후 Master 시험 18/18 통과. 실제 Storage·Lab 미검증, 미배포. |
| B2B-20261119-MAKER-M3 | CC-B2B-BACK-01 | reviewing / local_data_layer_review_passed_server_approval_pending | 메이커 M3 제안 적용·서버 바이트 검증 설계 | f0eaf784c Mac 로컬 데이터 계층 독립 검수 수락을 Backend에 회신. 점 경로 검증, 서버 구현·키·UI·Lab은 별도 승인 대기. |
| B2B-20261119-ADMINUI | AG-UI-01 | reviewing / lab_ready_authenticated_screen_pending | B2B몰 관리자 사이드바·대시보드·상품·주문 UI 인수인계 | 승인 4경로 사설 Lab 1회 READY. 상점 200·관리 상품/주문 307. 로그인 후 실화면·키보드는 사용자 제어 반환 뒤. 필터 aria-current 보완 후보 기록. |
| B2B-20261119-MALL-STORAGE | CX-MASTER-01 | running / backend_read_only_accounting_design_dispatched | 쇼핑몰 사진 중앙 사용량 집계와 추가 용량 안내 | 백엔드에 저장 경로·몰 소유자 귀속·중복 방지·용량 위젯 연결 설계 근거 요청. 등록 상품 1년 보관과 30일 삭제 취소 유지. 구현·운영 별도. |
| IMG-20261119-PLAN | CC-ECOM-01 | waiting_human / q8_review_screen_verified_user_quality_rating_pending | AI 무료 이미지 자동화 개발 플랜 | 내부 검토 화면 HTML 지문·이미지 48장 확인. 사용자 품질 기준 39/48 판정 대기. 실제 엔진 실기는 미검증. |
| ECOM-20261118-03 | CC-ECOM-01 | done / source_qa_pass_unreleased | 이미지3엔진 QA049 안전경계 보완 구현 | 미배포묶음보존·실모델/정책결정별도·Gemini반환검증 ECOM18-04 분리 |
| PORT-20261118-01 | AG-UI-01 | done / quote_registry_accepted_semantics_filtered | 미확인5카테고리19프로그램 담당/잔여근거 매핑 | 현재담당미확정유지·인용근거만수락·CRM F007 현행검증PORT18-02 별도 |
| ECOM-20261118-04 | CC-ECOM-01 | done / source_qa_pass_unreleased | Gemini 이미지 반환값 엄격검사 국소보완 | 1a1f64dba 다음승인묶음까지동결·Gemini전체JSON/완전디코드/실생성미검수 |
| PORT-20261118-02 | CC-B2B-BACK-01 | done / source_analysis_and_revised_plan_accepted | CRM F007 웹훅 중복발송 현행 소스 검증 | 순수검증은CRM18-01·route/dispatch/DDL은후속범위확정뒤 |
| CRM-20261118-01 | CC-B2B-BACK-01 | done / pure_functions_independent_pass_unwired | CRM v2 이벤트키 순수검증·시험 1단계 | 2A CRM18-02 DDL초안/격리검증·운영연결별도 |
| CRM-20261118-02 | CC-B2B-BACK-01 | done / ddl_source_author_pg_static_qa_accepted_unapplied | CRM 중복방지 DDL 초안·격리 DB 검증 2A | SQL/하네스동결·운영미적용·UI오류보완후route/dispatch/정책별도범위검토 |
| CRM-20261118-03 | CC-B2B-BACK-01 | done / specified_ssr_query_failure_qa_pass_unreleased | CRM 접수 새상태 화면·집계 준비 | 다른집계오류0은CRM18-04·운영미배포/발송연결0 |
| CRM-20261118-04 | CC-B2B-BACK-01 | done / specified_actual_ssr_counts_qa_pass_unreleased | CRM 기존3집계 조회실패 0건오인 국소보완 | 소스정리/점유해제·후속알림제품결정전발송연결보류 |
| DES-20261118-06 | AG-UI-01 | superseded / older_free_off_approval_question_superseded_by_owner_direct_v137_deployment | 감성 설정 화면 주인님 직접지시·새배포 상태 취합 | 새승인중복질문0·DES08최신manifest/실운영flag확인으로통합 |
| ECOM-20261118-05 | CC-ECOM-01 | done / primary_documents_read_no_real_api | 무료 이미지 공식지원/본인키 무료할당량 대안 읽기조사 | 후보/장수는조사범위·파생참고치로만, 무료실행방식 주인님 결정대기·실생성0 |
| CRM-20261118-05 | CC-B2B-BACK-01 | done / specified_source_review_accepted_unreleased | 미확정 접수 후속알림 기본보류·가시성 | 미배포 묶음 보존·실운영 보호 주장0, 후속 CRM18-06 웹훅 연결 읽기계획 검토 |
| CRM-20261118-06 | CC-B2B-BACK-01 | done / u1_u2_mitigation_source_accepted_unreleased_sdk_release_blocked | 웹훅 중복 방지 실제 연결 최소 단위 계획 | SDK재시도위험 운영차단은 CRM18-07로이관·미배포소스동결/운영보호완료아님 |
| BLOG-20261118-01 | CC-BLOG-01 | done / Excel_preview_source_and_deployment_prerequisites_integrated | T07 엑셀 미리보기 남은 단위 및 배포 선행 정리 | 운영반영/실화면은BLOG02최종배포에서추적 |
| QA-20261118-BLOG-01 | CX-QA-01 | waiting_human / b1_v122_mac_retest_dispatched_human_clicks_required | website-scraper 읽기·B1 사람 포커스 재시험 준비 | v1.22 재검수 전달. 확장 버전·활성 상태 수동 확인과 A/B 사용자 클릭 각각 1회 후 Mac lastProbe 기록. |
| RE-20261118-07 | CC-REALTY-01 | done / evaluation_deliverable_accepted_no_effectiveness_pass | 후보C 새기간40건 사전라벨 고정 평가 | 정상운영 새기간에서 목표소음이 포함된 검증조건 충족 시에만 별도배정·동일40건 규칙조정/재시험0 |
| ECOM-20261118-06 | CC-ECOM-01 | done / specified_mock_server_source_accepted_off_unreleased | Cloudflare 본인 공용키 무료 이미지 경로 검증·연결 계획 | 실키유효/잔여사람단계·AGY UI 연결계획·OFF미배포 보존 |
| ECOM-20261119-CFREL | CC-ECOM-01 | queued / role_docs_candidate_prepared_release_queued | 메인 API 설정 Cloudflare 카드 배포 선행 확인 | 원격 기준 역할 문서 단독 후보 1e5f23917(+6/-3) 준비. 푸시 전 Master가 비교 기준과 메인 빌드 영향 확인. Cloudflare 카드 빌드 1회는 별도 승인 대기. |
| ECOM-20261119-EMOTION-QA | CX-QA-01 | reviewing / source_comparison_delivered_composite_session_missing | 감성 글귀 합성 기존 결과 맥미니 화면 검수 | Mac 보관 원본 2장 검증 및 담당자 주인님 채팅 전달 완료. 기존 앱 합성 탭·링크 부재로 한글 배치·가독성 보류. |
| DES-20261118-07 | AG-UI-01 | done / emotion_cloudflare_status_card_source_review_accepted_unreleased | Cloudflare 공용키 설정 UI 연결 경로 계획 | 본인문서/점유정리·중앙82/e34와통합후보·메인선행/감성배포예산·실키검증별도 |
| AIF-20261118-W00 | CC-SNS-01 | done / static_contract_review_accepted_implementation_unverified | AI Influencer W00 기준·격차/공통계약 독립검수 | W01a별도검수·PLAN/권한선행병합전자산코드/DDL0·후속경합/RLS실검증별도 |
| CRM-20261118-07 | CC-B2B-BACK-01 | done / receipt_single_attempt_mock_source_review_accepted_unreleased | SOLAPI SDK 재시도 없는 공식 대안·최소 변경 계획 | 접수전용소스미배포보존·팔로우업동일위험은CRM18-08로이관·DDL/배포/실문자별도 |
| ECOM-20261118-07 | CC-ECOM-01 | done / central_keys_source_and_cross_platform_tests_accepted_unpushed | 메인 공용 Cloudflare 등록 카드·서버 최소계획 | 감성QA뒤정확묶음/중앙선행배포승인·토큰요청a2c0632b 한곳유지·미푸시 |
| AIF-20261118-W01a | CC-SNS-01 | done / four_ui_claim_corrections_source_ssr_review_accepted_unreleased | 실제 없는 seed 잠금 표시 4곳 정정 | 미배포묶음보존·실브라우저/모델품질미검수·다음W01b 기존보관예외 |
| AIF-20261118-W01b | CC-SNS-01 | done / retention_exception_existing_history_source_review_accepted_unreleased | 기존 히스토리 자동정리의 보관예외 보호 | 미배포묶음보존·새자산PLAN/권한병합전본체보류·기존insert불명삭제후속별도 |
| CRM-20261118-08 | CC-B2B-BACK-01 | done / followup_single_attempt_source_review_accepted_unreleased | 팔로우업 SOLAPI SDK 재시도 제거·검수 전송기 재사용 | 미배포묶음보존·U3/운영DDL/배포/실SMS조건후속, 다른공용SDK영향별도 |
| CRM-20261118-09 | CC-B2B-BACK-01 | done / versioned_script_and_server_field_preservation_source_accepted_unreleased | Apps Script v2 이벤트키 스니펫·legacy 안내 연결 | CRM18-10 명시릴리스준비·실AppsScript/DDL/배포/SMS승인별도 |
| AIF-20261118-W01c | CC-SNS-01 | done / reference_image_input_source_review_accepted_unreleased | 참고 이미지 MIME/서명 처리 독립 개선 범위 계획 | 미배포묶음·출력G5/실브라우저/공급자미검수·P0상위비교최종연기 |
| CRM-20261118-10 | CC-B2B-BACK-01 | waiting_human / production_v118_Ready_alias_verified_waiting_owner_real_form_SMS_trial | CRM 중복방지 묶음 명시소스·DDL·실검수 릴리스 준비 | 기존한곳주인님 폼SMS켜기/이메일끄기·시트v2·본인응답1/SMS1·동일행추가0 신호→Backend운영읽기 |
| AIF-20261118-W01d | CC-SNS-01 | done / revised_contract_accepted_for_source_only_A1_first_unit | 첫 원본 자산 단위 필드·권한·스토리지 구체 계약 | A1 SQL초안/순수paths 첫단위 배정·실DB/저장별도 |
| QA-20261118-ESM-01 | CX-QA-01 | waiting_human / existing_ego19_ready_for_esm_login | ESM v1.02 입력만·쇼핑제휴 v1.89 네이버 수집 실확장 준비/검수 | 맥미니 ego19 ESM+ 로그인 후 Return. v1.02 설치 확인 후 상품 입력만 1회. 기존 쇼핑제휴 경계 유지. |
| ECOM-20261119-BANANA-QA | CX-QA-01 | done / live_compose_verified_roundtrip_return_pending | Banana v1.49 운영 합성 기능 검수 | 운영 v1.49 합성 2/2·375px·ZIP·클립보드 통과. F-09 수신까지 확인, 자동 반환/ACK/상세 저장 미검증. |
| ECOM-20261119-11ST-QA | CX-QA-01 | waiting_human / v109_observed_waiting_admin_login | 11번가 기존 시험 상품 잠금 읽기 검수 | 운영 표시 v1.09. ego33 관리자 로그인 및 Return 후 등록 기록·잠금·375px 확인. 전송·전시 변경·삭제 없음. |
| ECOM-20261118-08 | CC-ECOM-01 | done / specified_source_review_pass_accepted_unreleased | Cloudflare 배경 생성 프롬프트 문자 혼입 보완 | 기존 배포후보 묶음에9ccfc8dfa 포함·실 무문자품질 추가생성은 별도승인·현재무료OFF소스유지 |
| AIF-20261118-W01e | CC-SNS-01 | done / pure_paths_and_fixed_SQL_specified_static_review_accepted | A1 자산 SQL 초안·순수 경로 검증 첫 구현 | 새격리SQL계약시험단위 W01f 진행·실SQL PASS는그결과와별도 |
| DES-20261118-08 | AG-UI-01 | reviewing / production_alias_SHA_verified_execution_ledger_pending | 감성 v1.34~37 주인님 직접지시 배포·모델확대 취합 | 이전 토큰실패/미배포 문서 최신사실 국소정정·운영flag/12모델실가용성 별도미검수 |
| AIF-20261118-W01f | CC-SNS-01 | done / isolated_author_15_pass_and_static_harness_review_accepted | A1 격리 PostgreSQL 계약시험 | W01g 저장계층 모의독립검수·실중앙/스토리지통합은별도 |
| AIF-20261118-W01g | CC-SNS-01 | done / mocked_store_specified_independent_review_pass_accepted | 생성 원본 저장 계층·주입 모의 시험 | OFF 기본 라우트 연결 W01h 모의통합 |
| AIF-20261118-W01h | CC-SNS-01 | done / default_off_route_mock_integration_specified_independent_PASS_accepted | 원본 저장 OFF 기본 라우트 연결·모의 통합 | W01i OFF 기본 원본 자산 조회 모의단위 |
| AIF-20261118-W01i | CC-SNS-01 | done / exact_signed_object_read_route_specified_mock_review_pass_accepted | 원본 자산 조회 OFF 기본 경로·모의시험 | A1 OFF소스완료표/운영보관정리 선행조건 취합 |
| BLOG-20261118-02 | CC-BLOG-01 | done / three_releases_complete_existing_data_screen_review_limited_accepted | 승인된 블로그3프로그램 순차묶음 배포 | T08승인정리정확백업/삭제범위검토·실Excel/폴러/T05분석·새생성효과미검수별도 |
| BLOG-20261118-03 | CC-BLOG-01 | done / approved_19_file_cleanup_backup_tag_static_and_limited_local_validation_accepted | T08 구형 ghost-scraper 백업후정리 승인범위 구체화 | 미배포유지·기존Next보안후속/실runtime미검수·T03회원캐시플랜진행 |
| BLOG-20261119-T08-TAG | CC-BLOG-01 | waiting_human / local_tag_and_remote_absence_verified_push_pending | Website Scraper 백업 태그 원격 보관 요청 | 로컬 태그와 원격 부재, 대상 커밋 origin/master 포함 확인. 태그 1개 업로드 승인 전 대기. |
| BLOG-20261118-04 | CC-BLOG-01 | done / member_cache_design_accepted_local_phase_one_separately_assigned | T03 도메인 구조 캐시 회원별 격리 결정 반영 | BLOG-20261118-06 로컬 1단계. 운영 전 기존 공용 인스턴스·진행 요청 배출 증거 필요. |
| BLOG-20261118-06 | CC-BLOG-01 | done / local_phase_one_and_mac_targeted_checks_accepted_undeployed | T03 1단계 캐시 우회·작업 소유자 확인 | 운영 전 사용자 AI 호출 증가·Render 이전 인스턴스와 작업 배출 확인 및 별도 승인. |
| AIF-20261118-W01j | CC-SNS-01 | done / OFF_source_completion_and_activation_blockers_reconciled | A1 OFF소스완료표·운영선행 보관/정리 조건 취합 | W01k 30일보관정리 첫계약·운영ON차단유지 |
| AIF-20261118-W01k | CC-SNS-01 | done / retention_R2_static_contract_accepted_with_implementation_conditions | 원본 자산 일반30일 정리 연결 첫계약 | W01l OFF 보관정리 SQL초안/실행기 모의첫구현 |
| QA-20261118-WEB-XLSX | CX-QA-01 | done / F01_F04_specified_independent_review_PASS_accepted | 최종배포 전 T07 엑셀 미리보기 소스 독립검수 | Blog최종manifest/큐대조후승인마지막1회배포 |
| AIF-20261118-W01l | CC-SNS-01 | done / default_off_retention_mock_and_static_contract_review_accepted | 보관정리 SQL초안·OFF실행기·모의 시험 | W01m 변경SQL격리실행/영향있는기존회귀·실Storage0 |
| AIF-20261118-W01m | CC-SNS-01 | done / new_SQL_isolated_author_execution_and_independent_evidence_review_accepted | 보관정리 새 SQL 격리 계약검증 | W01n 정리IO 유한대기/불명보존 좁은소스단위 |
| AIF-20261118-W01n | CC-SNS-01 | done / bounded_cleanup_and_remove_count_local_validation_accepted_undeployed | 정리 실행기 개별 I/O 유한 대기·불명 보존 | W01o 복구 설계. 미전송 이후 객체 잔존은 다음 회차 확인으로 delete_unknown 가능. |
| AIF-20261118-W01o | CC-SNS-01 | done / recovery_design_accepted_local_p1_separately_assigned | 정리·업로드 불명 상태 복구 설계 | W01p 국소 진입 시간 점검. P2·운영 복구 별도. |
| AIF-20261118-W01p | CC-SNS-01 | done / pre_delete_time_check_mac_validated_and_wording_accepted_undeployed | 삭제 진입 전 남은 시간 점검 | 미배포 유지. P2 및 운영 복구는 별도 범위. |
| AIF-20261118-W01q | CC-SNS-01 | done / bounded_missing_scan_design_document_accepted | 객체 없는 ready 자산 판정 설계 | W01r 신규 후속 SQL과 격리 시험 초안. A1 기존 파일 보존. |
| AIF-20261118-W01r | CC-SNS-01 | done / isolated_20_of_20_and_mac_static_review_accepted | 누락 자산 후속 SQL·격리 시험 초안 | W01s 정리 실행자 소스 연결. 운영 적용 별도. |
| AIF-20261118-W01s | CC-SNS-01 | done / local_integration_and_mac_budget_regression_accepted_undeployed | 누락 자산 정리 실행자 연결 | 로컬 검수 완료. 운영 SQL·PostgREST·cron/활성화 및 배포는 별도. |
| AIF-20261118-W01t | CC-SNS-01 | done / p3_read_only_aggregate_design_accepted | 멈춘 자산·삭제 예약 읽기 전용 집계 설계 | W01u 초안 범위 배정, 조회 한도와 잠금 설명 정정. |
| AIF-20261118-W01u | CC-SNS-01 | done / p3_isolated_17_of_17_and_mac_static_review_accepted | 자산 상태 집계 후속 SQL·격리 시험 초안 | 로컬 SQL 검수 완료. 호출 경로·영속 DB 적용·배포는 별도. |
| AIF-20261118-W01v | CC-SNS-01 | done / asset_save_indicator_local_and_mac_checks_accepted_undeployed | 생성 결과 원본 저장 상태 표시 | 로컬 검수 완료·점유 해제·OFF·미배포. |
| AIF-20261118-W01w | CC-SNS-01 | done / g5_response_evidence_and_guard_design_accepted | 생성 이미지 응답 크기 근거 및 G5 설계 | W01x 로컬 최소 보호 배정. 실제 크기/운영 응답 및 자산 참조 전환 별도. |
| AIF-20261118-W01x | CC-SNS-01 | done / g5_response_guard_local_mac_review_accepted_undeployed | 생성 이미지 응답 한도 및 비JSON 안내 보호 | 로컬 완료·점유 해제·미배포. 한도 초과 이미지 전달 및 실제 응답 검증은 별도. |
| AIF-20261118-W01y | CC-SNS-01 | queued / deferred_before_edits_for_member_feature_priority | 캡션 사진 전송 제거와 기록 요청 크기 보호 | 계획 밖 부가 보완 보류. 착수/편집 0, 순차 계획 유지. |
| AIF-20261118-W01z | CC-SNS-01 | done / operational_foundations_accepted_policy_unlimited_only | W01 운영 마이그레이션·비공개 버킷 적용 | 권한 정정·비공개 버킷·무제한 시험 계정 정책 확인. 일반 한도·실 Storage 통합 미확인, OFF. |
| AIF-20261119-W01-A2 | CC-SNS-01 | done / server_mediated_reference_upload_contract_accepted | W01 후반 참고 이미지 업로드 계약 | 서버 경유 POST 1개 채택, JSON 2 MiB·이미지 1 MiB. |
| AIF-20261119-W01-A2I | CC-SNS-01 | done / independent_source_review_accepted_local_undeployed | W01 참고 이미지 서버 업로드 구현 | 3776d54f7 독립 소스 검수 완료. 작성자 시험 근거 재사용. A2S·실 Storage 별도, OFF·미배포. |
| AIF-20261119-W01-A2S | CC-SNS-01 | done / isolated_reference_sql_contract_accepted | W01 참고 이미지 SQL 격리 계약 확인 | 6c4388e52 격리 9/9. ref 3종·크기·권한 확인. 실 Storage 미확인. |
| AIF-20261119-W01-G3D | CC-SNS-01 | done / asset_id_generation_contract_accepted_with_io_conditions | W01 자산 ID 기반 생성 API 계약 설계 | 8080ce604 조건부 수락. OFF 순서·다운로드 상한·I/O 예산 명확화. |
| AIF-20261119-W01-G3I | CC-SNS-01 | done / generation_api_local_review_complete_undeployed | W01 자산 ID 기반 생성 API 로컬 구현 | G3T·G3S 보완 재검수 종결. OFF·미배포. |
| AIF-20261119-W01-G3T | CC-SNS-01 | done / deadline_fix_independent_static_review_accepted | W01 생성 API 전체 시간·스트림 취소·오류 처리 보완 | 5eced061e 독립 소스 재검수 수락. 실제 마감·원격 취소 별도. |
| AIF-20261119-W01-G3S | CC-SNS-01 | done / monotonic_save_deadline_independent_mock_accepted | W01 생성 저장 시간 초과 시 자산 ID 보존 | dffa5c436 독립 지정 모의 3/3. 실제 저장소는 미검증. |
| AIF-20261119-W01-UID | CC-SNS-01 | done / generation_ui_contract_accepted_with_cors_gate | W01 자산 기반 생성 화면 연결 계약 | 3a41efdd0 계약 수락. 기존 보정/히스토리 유지, 브라우저 CORS 확인 필요. |
| AIF-20261119-W01-UIC | CC-SNS-01 | done / client_flow_bounded_stream_independent_mock_accepted | W01 화면용 자산 API 클라이언트 구현 | 547142805 독립 모의 11/11; 실제 CORS 미확인. |
| AIF-20261119-W01-UII | CC-SNS-01 | done / ui_integration_local_source_and_mock_review_accepted | W01 자산 기반 생성 화면 로컬 연결 | fdee03d5d 범위 내 소스/모의 14/14. 실제 React 검증 별도·OFF. |
| AIF-20261119-W01-UIV | CX-QA-01 | done / isolated_real_react_screen_check_accepted | W01 실제 React 화면 격리 확인 | fdee03d5d 격리 Chrome 통과. 실제 로그인/CORS/발행 별도. |
| AIF-20261119-W01-READY | CC-SNS-01 | done / v2_storage_signed_browser_read_and_ownership_verified | W01 운영 전 검증 계획과 V2 저장·다운로드 검증 | V2 서명 다운로드·권한 확인 완료. V3 유료 범위 별도, V4 시험 계정 지정 수신 및 실행 조건 미확정. |
| AIF-20261119-W01-NEXT | CC-SNS-01 | done / dependency_patch_verified_locally_undeployed | AI Influencer Next.js 보안 패치 | 16.4.6 파일 지문과 잠금 범위 대조 완료. 담당 시험 320/320·타입 통과·audit 0. 번들 및 운영 응답 확인은 배포 단계. |
| AIF-20261119-W01-V4 | CC-SNS-01 | done / finite_member_real_storage_verified_isolated_origin | 일반 회원 한도와 운영 다운로드 선행 검증 | 지정 일반 회원 실제 이용·합성 JPEG 1회 업로드·본인 조회·서명 다운로드 200. 일반 한도 초과·정리·운영 출처는 미검증. |
| AIF-20261119-W01-V3 | CC-SNS-01 | done / v3_success_and_isolation_guard_independent_accepted | AI Influencer 대표 생성 및 보정 검증 | 승인 이미지/캡션 성공 및 e3421c7a9 Mac 모의 18/18 수락. 추가 Windows 실기동·공급자 호출·운영 검증 없음. |
| AIF-20261119-W01-RETOUCH | CC-SNS-01 | running / direct_user_approved_sequential_isolated_validation | AI Influencer 히스토리 재표시·일반 회원 생성·보정 | 격리 서버에서 무료 히스토리 재표시 → 일반 회원 생성 → 같은 결과 보정 1회 → V5 변환. 공개 게시 범위 별도 확인. D1~D3은 앞 단계 통과 후 순차 진행과 빌드 조정. |
| DES-20261119-HERO | AG-UI-01 | done / isolated_production_release_live_verified | 메인 히어로 1차-3안 운영 배포 | 승인 두 경로 1회 빌드→promote. dpl_4L4gGdg2Y8af4ZmxTZPdbwbPrr1N 공식 도메인·이미지 확인. push 0. |
| DES-20261119-HERO-FOLLOWUP | AG-UI-01 | done / hero_followup_production_live_verified | 메인 히어로 하단 지표·버튼 제거 운영 배포 | 216c5e071, 공식 운영 지표 3·CTA 제거/이미지 확인. 1회 빌드, push 0. |
| DES-20261119-HERO-TRIM | AG-UI-01 | done / hero_trim_production_live_verified | 메인 히어로 표시 요소 4곳 정리 운영 배포 | 0b2835c07 공식 도메인·4곳 제거·이미지 확인. 1회 빌드, push 0. |
| AIF-20261118-W03 | 미배정 | queued / sequenced_after_w01_and_w02_by_owner_instruction | 회원용 인물 라이브러리·시트·버전 | 주인님 지시대로 W01·W02 이후 시작. 인물 라이브러리·일괄 이미지·영상 미착수. |
| BLOG-20261118-05 | CC-BLOG-01 | queued / existing_dependency_security_stop_recorded_no_patch_or_deploy_authorized_yet | 구형 안내앱 Next 보안 업데이트 후속 | 다음정당한범위/묶음승인때최소patch·현재T03플랜우선 |
| BLOG-20261119-MODELS | CC-BLOG-01 | done / strict_switch_independent_accepted_undeployed | 블로그 설정 플랫폼별 AI 모델 선택 | Mac 49/49와 원문 1회·정상 전환과 503 상한 2회 수락. 승인 실호출 9/9는 앞선 버전의 담당 결과. 미배포. |
| RE-20261119-PARTIAL | CC-REALTY-01 | waiting_human / partial_result_retention_plan_ready_decisions_pending | 상가·건물·토지 알림 부분 조회 결과 보존 | id 기준 이전 결과 보존 설계. 7일, 차단·오류 때도 보존할지, 배포 시점 결정 대기. 제품·확장·운영 변경 없음. |
| BLOG-20261119-MODELS-3 | CC-BLOG-01 | done / saved_provider_mac_review_accepted_undeployed | 블로그 3개 프로그램 모델 목록 동기화 | SEO 22/22·에이전트 복원/요청 일치 맥미니 수락. 사진 후기 선택지 및 기존 빠른 작성 응답 지연은 별도. 미배포. |
| FRONT-20261119-QUICKBAR | CC-B2B-FRONT-01 | done / mobile_quickbar_and_preview_mac_accepted_undeployed | B2B몰 모바일 빠른 메뉴 상품 카드 가림 | 고정 51d4b2207 Mac 28/28. 모바일 버튼·포커스 및 미리보기 빈 줄 제거 수락. 미배포 묶음 대기, 고정판 실제 편집기 미확인. |

## 현재 담당 회신이 확보된 프로젝트

| 프로젝트 | 담당 | 운영/후속 버전 (보고) | 단계 | 완료 근거 요약 | 다음 작업 |
| --- | --- | --- | --- | --- | --- |
| AI 할 일·성과 관리 | CC-WORKSPACE-01 | v1.14 | 운영배포기록·받은할일 분류/일괄추가 구현 | 457855225 받은할일3개 실제분류추가·배지소진 담당기록 | 새개발배정없음·Workspace와중복구현0 |
| Website Scraper | CC-BLOG-01 (문서·요청 조정) | v1.15 | 병합·비활성·백업비공개 | WS10 DB v1.15/is_activefalse/backup비공개·옛API410 코드 | T12 문서/요청조정Blog 배정완료·라이브화면확인은담당미정, 재활성화/운영변경0 |
| 웹 크롤링 자동화 | CC-BLOG-01 | v1.13 작성자DB·Masteralias/READY/metaSHA직접 | v1.13 운영·dashboard/jobs/widget실표시확인·실결과job0 | 1a03b9734 prodReady·T07독립소스/parser44+F04국소PASS·공지/위젯포함 | 실Excel/폴러/분석미검수·현재새크롤링/테스트행생성0·T08정확범위준비 |
| 부동산 실거래 투자분석 자동화 | CC-REALTY-01 | v1.61 | 운영v1.61·뉴스기존회차대조완료 | 08시옛대기 해소·11-17기존측정완료, 후보C는개발분석결과만 | 뉴스후보C 독립기간표본 확보후Master별도배정·새수집/기존개발표본반복0 |
| 티스토리 포스팅 자동화 | CC-BLOG-01 | v1.98 작성자 DB/ext확인·Master운영alias직접 | v1.98 운영·기존원고화면확인/생성시점정리효과실검수미완 | B4생성/보관완료,a27861137 소제목8시험 | 새생성효과는현재유료생성0/단위근거유지·옛원고표시정리는미배정후보 |
| Threads 쇼핑제휴 자동화 | CC-ECOM-01 | v1.89 | 네이버수집/원자등록 수정 운영·실확장검수대기 | URL/protocol/경합수정·WS17-01~04 및지정QA근거, qkncpet55배포 담당기록 | Mac공간19 설치1.89·네이버로그인·본인링크로수집/대기열만, 실제등록/글AI 별도범위 |
| AI 유튜브 떡상 분석 자동화 | CC-MOVIE-01 | v1.30 | 운영v1.30·1단계실검색/AI기획안 담당운영검수완료 | 주인님직접실검색+Claude Haiku기획안1회·cache67/68재사용·본문표시확인, 캡처미확보·약$0.03추정 | 1단계실검색/AI옛대기마감·반복유료호출0·추가기능은별도배정 |
| YOUTUBE 플레이리스트 자동화 | CC-MUSIC-01 | v1.42 | 운영·실화면 검증 | 곡0개 업로드기록/업무단추 확인, 30일정리11-14 확인 | 업무전달 재실행 안 함; 직접파일저장/예외검수는별도 |
| YOUTUBE Shots(이미지 스토리) 자동화 | CC-MOVIE-01 | v1.51 | 운영v1.51 기록·공용인코더 미배포 | 11-14배포기록/현version 대조 dacd987cc | 2b9a06c9c 다음기능묶음·실유료영상별도지시 |
| AI 마스터링 스튜디오 | CC-MUSIC-01 | v1.17 | 운영·Ready 보고 | 공통보완 반영·시험22·타입0 | 명시 잔여 없음·실물범위는개별기록 |
| 뮤직비디오 자동화 | CC-MOVIE-01 + CC-MUSIC-01 | v1.31 | 운영·공통반영확인 | 저장위젯/로그인 정책 기배포 | 영상/음악 파일소유분리, 유료생성은기존보류 |
| 음악(SUNO)자동화 | CC-MUSIC-01 | v1.58 | 운영v1.58·기존메뉴수정 반영완료 | db08afdd6가배포기준f78967bad 조상·music-b8m2pihnu/메뉴1개확인기록 | 옛미배포메뉴수정 재구현/재배포0·새배정전점유확인 |
| AI 바나나 캔버스 자동화 | CC-ECOM-01 | v1.49 | 운영Ready·시험상품 실저장왕복 확인 | e5611755d·c41203srg Ready·DB1.49·375/320합성2/2담당보고 | 시험상품1개 운영실저장왕복/동일설정재전송방지/대표사진원복 확인보고수락, 실기기/낭독등별도 |
| 감성 글귀 이미지 | CC-ECOM-01 | v1.37 작성자보고·Master운영alias/metaSHA 직접확인 | 주인님직접지시 최신배포취합·추가12모델소스/실가용성검수미완 | prod dpl_CHF7WKQQgSGngidFcVLbmJ8Zwa1i/meta57ef016cd 직접확인·Cloudflare원문제거9cc 소스지정PASS·최초실생성1 문자혼입 | 배포실행예산/제품트리/DBversion이력회수·운영무료flag 읽기별도·수정후실생성승인없음 |
| AI 영상렌더 스튜디오 | CC-MOVIE-01 | v1.33 | 운영 Ready·독립 코드QA PASS / 실제왕복 미검수 | 2ae34fbdc·11+4독립조건PASS·38pox5t03 Ready·DB/ext/ZIP1.33일치 보고 | 시험상품 범위 확정 후 GIF/WebP 각1 실수신 검수. 추가빌드 없음 |
| AI 상세페이지 자동화 | CC-ECOM-01 | v1.47 | 운영Ready·시험상품 실저장왕복 확인 | 0e418bab9·6esxwz43i Ready·DB1.47·products/위젯 담당확인 | 시험상품1개 운영실저장왕복/동일설정재전송방지/대표사진원복 확인보고수락, 실기기/낭독등별도 |
| AI 쇼츠 원스톱 제작 자동화 | CC-MOVIE-01 | v1.59 | 운영·특정시험대기 | 낱말시각B안 코드·배포 | 약1원시험·시험계정 조건 및 공용인코더 다음배포 |
| AI 가사영상 자동화 | CC-MUSIC-01 | v1.16 | 운영v1.16·국소수정2건 소스완료/미배포 | 취소안내fe402b1df MOV17-05 PASS·인코더2b9a06c9c QA032소스PASS | 두건 다음음악기능배포묶음·Mac MP4신뢰클릭/저장선택은QA002 별도 |
| AI 음악 스튜디오 | CC-MUSIC-01 | v1.16 | 운영·Ready 보고 | 공통 로그아웃/UA/위젯 배포 | 명시 잔여 없음·운영전체무결함 의미아님 |
| AI 영상 스튜디오 | CC-MOVIE-01 | v1.36 | 운영버전 담당기록·유료생성 조건대기 | version/기존배포기록대조 | 주인님 후속지시 전 실유료생성0 |
| AI 업무 워크스페이스 자동화 | CC-WORKSPACE-01 | v1.60 | v1.60 운영·캘린더 스타일 확인 | 36af44608·dpl_DC9Bifer8U1oZ67QFRJNkaAQ1Pj6 READY·로컬 build 1회 담당 통과 | 시험 현황판 주소 미존재로 폭/메뉴 미확인. DB 목록 v1.58 보고·미변경. WS08 미배포. |
| 셀러 라벨·QR·서류 자동화 | CC-ECOM-01 | v1.04 | 운영·인쇄자료/소규모미배포 | 마켓단계48b67dd5c 구현 | 다음배포묶음·실인쇄여백자료대기 |
| AI 쇼핑몰 주문·매출 리포트 자동화 | CC-ECOM-01 | v1.06 | 운영·자료대기 | 코드/기존검증은개별기록 | 개인정보지운실제주문파일 필요 |
| AI 스마트스토어 상품 자동등록기 | CC-ECOM-01 | v1.28 | 운영배포기록·발행표시 수정반영 | 6a17c6123 markPosted v1.28 mxv57n8mv 포함 | 같은변경 재배포0·실제마켓쓰기 별도지시 |
| 부동산 실시간 매물 알림 | CC-REALTY-01 | v1.46 | 운영v1.46·화면/guide/ZIP 독립읽기PASS | 6kxzrn0il Ready·DB/ext1.46·120/type0·메인확장재로드보고·격리코드독립PASS | 기존서버기록10:37 110건/18:16 811건ok 담당읽기·Mac실확장저장소/첫회차격리 미검수, 새수집0 |
| 상가·건물·토지 매물 알림 | CC-REALTY-01 | v1.34 | 운영·재측정조건대기 | 층호출조절 배포완료 | 로그아웃3a1d7fbb4·기기정보7f97c00e6 다음기능묶음, 층진단복구실패는마감·재측정자동반복0 |
| AI 중개사무소 고객관리 자동화 | CC-REALTY-01 | v1.10 | 운영·기능실물완료기록 | 1~4단계·계산기/문자실물기록 | 로그아웃3a1d7fbb4·기기정보/위젯7f97c00e6 미배포3변경 다음기능묶음 |
| AI 쿠팡 운영 자동화 | CC-ECOM-01 | v1.19 | 운영·실쓰기조건대기 | 읽기/기존흐름완료 기록 | 상품권한해제·실주문뒤승인범위시험,중지상품삭제금지 |
| AI 무료음악 자동화 | CC-MUSIC-01 | v1.67 / engine0.8.5 | 운영·조건부 후속 | 11-14 운영 반영 | LeVo 공개/Mureka 충전 등 외부조건 있을 때만 후속 |
| AI 워드프레스·구글블로그 자동화 | CC-BLOG-01 | v1.05 | 운영·B2검수완료 | 권한/공개소개 검수기록 | WP기간은정책담당유지·중복기간부여안함 |
| AI 11번가 상품 자동등록기 | CC-ECOM-01 | v1.07 | 운영·실등록검증완료 | 실제전송/전시중지/중복방지확인 | 관리자잠금화면·시험상품은사용자직접삭제 |
| AI 블로그 이웃 소통 자동화 | CC-BLOG-01 | v1.22 작성자DB/ext·Masteralias직접 | 승인묶음 두번째Ready·B1확장실시험사람대기별도 | 387시험·타입0,e35947191 진단추가 | 기존B1사람확인뒤실확장·새읽기/AI0 |
| 네이버 카페 회원 모집 자동화 | CC-BLOG-01 | v1.04 | 운영·가입계정조건대기 | C모드숨김확인 | 가입카페계정으로운영진제외검수,외부초대재실행안함 |
| AI 쇼핑몰 빌더 | CC-B2B-BACK-01 + CC-B2B-FRONT-01 | v1.16 | 운영0100/v1.16·Lab0104/7609748ad 반영완료 | 운영0100 verify9·58mmx0v2e Ready, Lab0104 pre16/post20/7함수지문·Lab빌드1/1완료 | QA037 기존공간29 고객/관리자로그인·반환뒤읽기검수. 운영0101~0104미반영, 실제토스/새fixture 별도지시·옛0102정리SQL사용금지 |
| G마켓·옥션 등록기 | CC-ECOM-01 | v1.02 | 운영 배포·Mac 지정 웹 회귀 PASS | 매뉴얼·썸네일·모바일닫기·오류입력보존·상품수명 반영,Mac375 실제핵심동작확인 | 실확장업데이트/계정연결/ESM실입력등록은별도범위 |

## 사람의 조치와 결정

기존 요청을 다시 만들지 않고 결정함에서 취합한다. Workspace v1.52·영상 v1.33·음악5회·상세페이지 v1.46은 담당에게 확인된 사용자 직접 승인 범위를 보존한다. QA 미통과나 안전성 미해결은 Master가 먼저 해결하며 새 승인을 요청할 이유로 바꾸지 않는다.

| 조건 | 필요한 사람의 일 | 추천 처리 |
| --- | --- | --- |
| B2B Lab 배포 후 역할별 화면 검수 | 기존메인ego243 Lab 시험naver로그인→교환비3000원 토스시험카드입력/제출1회(주인님만), Mac29별도반환시QA037읽기 | waiting교환420bfb91… 준비완료·고정exfee id·시험키boolean확인,중복제출/실카드/운영0. 결제뒤Backend읽기 |
| 실제 결제 검수 단계 | Lab 테스트 전용 토스 키 사용 확인 | 운영/회원실키 폴백 없이 테스트키로만,현재실결제0 |
| 음악 실기기/저장 단계 | A 실제MP4 PASS·B기존Mac20 저장창확인/저장·Return 필요 | 추가렌더클릭전진행/완료확인·저장창있으면mac-file.mp4 지정폴더·실가속사용미확인 |
| 블로그·마켓 외부계정 | 해당회차가필요할때본인로그인·확장연결/신뢰클릭 | 지금권한확대/실포스팅/실ESM등록은실행하지않음 |
| E3 묶음 운영 배포·실비용 검증 | v1.58은WS27정상1빌드에통합승인·실검색/AI는별도미승인 | 소스560시험/독립PASS완료·미승인동안build/실검색/AI0 |
| Gmail 운영 활성화 | 기존 시험 계정 창에서 주인님 Gmail 동의 1회 | 저장/Client ID 일치 확인 완료, 전파 뒤 §11-3 한 세트. 반복 인증·빌드 0. |
| 감성글귀 v1.30 再실행 | 추가승인분 재배포·실호출3회 완료 | Master alias확인·작성자DB/DOM검수,추가빌드/호출예산0 |
| CRM 중복방지 연결 후속알림 정책 | 주인님Backend직접결정: 미확정/미지상태후속기본보류·보류사실표시 | 기존질문이결정으로해소·CRM18-05소스만진행·운영연결/DDL별도 |
| 감성 무료이미지 실행방식 | 주인님ECOM직접 진행해=Cloudflare회원본인키 방식 선택완료 | 공용키2개재사용·무료량잔여/귀속확인·실생성최대1조건부·서버/UI점유분리·정정배포승인별도 |
| 감성 무료OFF 정정안 운영반영 | 검수완료223ddc6b3 UI보존·원격빌드1회 승인vs묶음대기 질문 | 실이미지호출0·현재운영freeOFF아님·승인전신규배포0 |
| Cloudflare 재생성후 카드 가독성 | 최신 주인님직접 재생성1승인→9cc실제1회완료·누적2·이1장무문자관찰 | 새이미지 JPEG456549B/1024²·인물커짐/여백미검수·추가호출0·인물제외임의변경0·기존샘플오프라인가독성준비 |
| CRM v1.18 운영 릴리스 묶음 | 주인님Backend직접 진행해 승인수신·단독실행착수·기존Master질문재승인불필요 | DDL1/버전·로컬1/원격1·본인시험SMS1/동일v2재전송추가0·프로덕션사후주인님Google/번호직접 |
| Mac ESM/쇼핑제휴 실확장 시험 | Mac준비후 ESM+/네이버 로그인·브랜드커넥트실링크1개·필요시확장폴더선택은주인님직접 | 정상기존설치는재사용·ESM입력만1/외부등록0·네이버대기열까지·기존B/Gmail/Blog창보존 |
| 블로그3프로그램 묶음배포/T04/T08/T03 결정 | 주인님직접선택창 승인: Vercel최대3·T04보안빌드1은세번째통합·T08백업태그선정리·T03회원별결정 | 중복승인질문0·Blog단일순차담당·T03운영DDL/Render별도·T08정확삭제범위후착수 |

## 주인님 결정으로 후일 재개하는 항목

현재 작업에서는 행정 마감하며 실제 검증 PASS로 바꾸지 않는다. 기록된 재개 조건이 생기기 전에는 반복 확인·장비 요청을 하지 않는다.

| 항목·담당 | 결정 | 재개 조건·근거 |
| --- | --- | --- |
| MUSIC-APPLE-SILICON · CC-MUSIC-01 / CX-QA-01 | 장비준비뒤실행으로행정마감·실제PASS아님·현재반복확인/장비요청0 | Apple Silicon장비준비→동일요청서재개 · 주인님 직접지시 msg_a67b1118172d·99e478211/224105f53 |

## 전체 포트폴리오 목록

비교표의 버전·라이프사이클은 원문 기록이며 보고 버전이 있으면 함께 표시한다. 담당 회신이 없는 항목을 완료나 미담당으로 단정하지 않는다. 요약 번호 97 중복 때문에 최대번호로 프로그램 개수를 세지 않는다.

| 번호 | 프로그램 / slug | 카테고리 | 비교표 버전 / 상태 | 최신 보고 버전 | 담당·단계 | 다음 작업 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 구글폼 CRM 자동화 / crm-google-form | CRM | v1.17 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 2 | 카카오톡 뉴스레터 자동화 / kakao-auto-posting | CRM | v1.32 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 3 | AI 할 일·성과 관리 / ai-task-planner | 업무자동화 | v1.14 / 운영 | v1.14 | CC-WORKSPACE-01 · 운영배포기록·받은할일 분류/일괄추가 구현 | 새개발배정없음·Workspace와중복구현0 |
| 4 | AI 종합 성격 진단 자동화 / personality-suite | 성격·운세 | v1.30 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 5 | AI 문서번역 자동화 / document-translator | 업무자동화 | v1.24 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 6 | AI 엑셀·텍스트 합치기 자동화 / file-merge | 업무자동화 | v1.09 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 7 | 성격코드(MBTI) 측정기 / personality-code | 성격·운세 | v1.23 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 8 | 캐릭코드(MBTI) 측정기 / mbti-character | 성격·운세 | v1.26 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 9 | AIMaster 타로점 / tarot-reading | 성격·운세 | v1.29 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 10 | eBook Studio / ebook-studio | 업무자동화 | v1.17 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 11 | 네이버 카페 포스팅 자동화 / naver-cafe-poster | 네이버 | v1.30 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 12 | 네이버 블로그 자동화(App) / naver-blog-auto-poster | 네이버 | v1.12 / 비활성 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 13 | 네이버 블로그 자동화(Web) / naver-blog-auto-poster-web | 네이버 | v1.13 / 비활성 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 14 | 네이버 블로그 SEO 스튜디오 / naver-blog-seo-studio | 블로그 | v2.26 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 15 | 마크다운 문서 자동화 / markdown-studio | 업무자동화 | v1.22 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 16 | AI 글쓰기 에디터 자동화 / ai-writing-editor | 업무자동화 | v1.13 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 17 | Website Scraper / website-scraper | 데이터수집\|기획 | v1.15 / 병합됨 → `web-crawler-saas` 「🔎 한 페이지 분석」(2026-10-21), 숨김·백업 | v1.15 | CC-BLOG-01 (문서·요청 조정) · 병합·비활성·백업비공개 | T12 문서/요청조정Blog 배정완료·라이브화면확인은담당미정, 재활성화/운영변경0 |
| 18 | 시네마틱 스토리보드 자동화 / cinematic-storyboard-studio | 디자인 | v1.20 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 19 | 페르소나 문체 자동화 / persona-style-studio | 데이터수집\|기획 | v1.10 / 병합됨 → ai-writing-editor(2026-10-21) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 20 | AI 랜딩페이지 기획 자동화 / landing-architect | 디자인 | v1.16 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 21 | UI Canvas 자동화 / ui-canvas | 디자인 | v1.15 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 22 | 웹 크롤링 자동화 / web-crawler-saas | 데이터수집 | v1.13 / 운영 | v1.13 작성자DB·Masteralias/READY/metaSHA직접 | CC-BLOG-01 · v1.13 운영·dashboard/jobs/widget실표시확인·실결과job0 | 실Excel/폴러/분석미검수·현재새크롤링/테스트행생성0·T08정확범위준비 |
| 23 | AI Prompt 자동화 / ai-prompt-studio | AI 프롬프트 | v1.11 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 24 | AI 프롬프트 템플릿 자동화 / prompt-template-studio | 데이터수집\|기획 | v1.07 / 병합됨 → `ai-prompt-studio`(2026-10-21) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 25 | AI 슬라이드 자동화 / ai-slide-builder | 업무자동화 | v1.13 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 26 | AI 웹 UI 제작 자동화 / ai-web-ui | 데이터수집\|기획 | v1.07 / 병합됨 → `ui-canvas`(2026-10-21) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 27 | 대량 메일발송 자동화(Step Mail) / stepmail | 마케팅(홍보) | v1.30 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 28 | 키워드·경쟁사 분석 자동화 / competitor-analysis | 마케팅(홍보) | v1.14 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 29 | 롱테일 키워드분석 자동화 / longtail-keyword-expander | 마케팅(홍보) | v1.11 / 병합됨 → `competitor-analysis`(2026-10-23) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 30 | 예약(취소)방지 리마인드 자동화 / booking-reminder | 마케팅(홍보) | v1.29 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 31 | 뮤직 플레이어 자동화 / music-player | 음악 | v1.09 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 32 | AI 리버스 프롬프트 자동화 / reverse-prompt | AI 프롬프트 | v1.15 / 운영(2026-10-21 이미지 스타일 분석기와 서로 연결·30일 정리) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 33 | 무한루프 영상자동화 / infinite-loop-video | 영상 | v1.10 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 34 | 부동산 실거래 투자분석 자동화 / real-estate-sales | 부동산 | v1.61 / 운영 | v1.61 | CC-REALTY-01 · 운영v1.61·뉴스기존회차대조완료 | 뉴스후보C 독립기간표본 확보후Master별도배정·새수집/기존개발표본반복0 |
| 35 | AI 블로그 키워드 자동화 / blog-keyword | 블로그 | v1.13 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 36 | 티스토리 포스팅 자동화 / tistory-auto-blog | 블로그 | v1.98 / 운영 | v1.98 작성자 DB/ext확인·Master운영alias직접 | CC-BLOG-01 · v1.98 운영·기존원고화면확인/생성시점정리효과실검수미완 | 새생성효과는현재유료생성0/단위근거유지·옛원고표시정리는미배정후보 |
| 37 | 블로그 포스팅 자동화 / ai-auto-blog | 블로그 | v1.87 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 38 | 네이버 블로그 에이전트 / naver-blog-agent | 블로그 | v2.28 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 39 | 네이버 블로그 올인원 자동화 / naver-blog-allinone | 블로그 | v1.60 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 40 | AI 블로그 작업실 자동화 / blog-workroom | 블로그 | v1.16 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 41 | AI 블로그 콘텐츠 제작 자동화 / blog-content-maker | 블로그 | v1.14 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 42 | Threads AI 기획 자동화 / threads-easy-planner | 쓰레드 | v1.52 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 43 | Threads 포스팅 자동화 / auto-threads-posting | 쓰레드 | v1.34 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 44 | Threads 댓글자동화 / threads-comment-reply | 쓰레드 | v1.29 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 45 | Threads 쇼핑제휴 자동화 / threads-affiliate-poster | 쓰레드 | v1.89 / 운영 | v1.89 | CC-ECOM-01 · 네이버수집/원자등록 수정 운영·실확장검수대기 | Mac공간19 설치1.89·네이버로그인·본인링크로수집/대기열만, 실제등록/글AI 별도범위 |
| 46 | Threads 콘텐츠 운영 자동화 / threads-content-ops | 쓰레드 | v2.25 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 47 | AI 유튜브 떡상 분석 자동화 / youtube-viral-studio | 유튜브 | v1.30 / 운영 | v1.30 | CC-MOVIE-01 · 운영v1.30·1단계실검색/AI기획안 담당운영검수완료 | 1단계실검색/AI옛대기마감·반복유료호출0·추가기능은별도배정 |
| 48 | YOUTUBE 플레이리스트 자동화 / playlist-channel-studio | 유튜브 | v1.42 / 운영 | v1.42 | CC-MUSIC-01 · 운영·실화면 검증 | 업무전달 재실행 안 함; 직접파일저장/예외검수는별도 |
| 49 | AI 썸네일·SEO 자동화 / thumbnail-master | 유튜브 | v2.02 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 50 | YOUTUBE CHANNEL CONSULTANT / youtube-channel-consultant | 유튜브 | v1.11 / **병합됨 → youtube-viral-studio(2026-10-20), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 51 | 쇼츠 떡상 분석·대본 자동화 / shorts-viral-studio | 유튜브 | v2.0 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 52 | YOUTUBE Shots(이미지 스토리) 자동화 / auto-shorts-posting | 유튜브 | v1.51 / 운영 | v1.51 | CC-MOVIE-01 · 운영v1.51 기록·공용인코더 미배포 | 2b9a06c9c 다음기능묶음·실유료영상별도지시 |
| 53 | 유튜브 댓글자동화 / youtube-auto-reply | 유튜브 | v1.33 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 54 | AI 유튜브 썸네일 프로 / seo-thumbnail-pro | 유튜브 | v1.12 / **병합됨 → thumbnail-master(2026-10-20), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 55 | Suno 음악기획 자동화 / suno-music-studio | 음악 | v1.13 / **병합됨 → music-automation(2026-10-21), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 56 | AI 마스터링 스튜디오 / ai-mastering-studio | 음악 | v1.17 / 운영 | v1.17 | CC-MUSIC-01 · 운영·Ready 보고 | 명시 잔여 없음·실물범위는개별기록 |
| 57 | 뮤직비디오 자동화 / music-video-studio | 음악 | v1.31 / 운영 | v1.31 | CC-MOVIE-01 + CC-MUSIC-01 · 운영·공통반영확인 | 영상/음악 파일소유분리, 유료생성은기존보류 |
| 58 | 음악(SUNO)자동화 / music-automation | 음악 | v1.58 / 운영(2026-10-21 Suno 음악기획 병합) | v1.58 | CC-MUSIC-01 · 운영v1.58·기존메뉴수정 반영완료 | 옛미배포메뉴수정 재구현/재배포0·새배정전점유확인 |
| 59 | LP 턴테이블 자동화 / vinyl-lp-studio | 음악 | v1.15 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 60 | Youtube Playlist 자동화 / yt-playlist-studio | 음악 | v1.15 / **병합됨 → playlist-channel-studio(2026-10-20), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 61 | AI Audio분석 자동화 / ai-audio-analyzer | 음악 | v1.15 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 62 | AI 이미지 스튜디오 / ai-image-studio | 이미지 | v1.34 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 63 | AI 인물사진 자동화 / portrait-photo | 이미지 | v1.45 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 64 | AI 바나나 캔버스 자동화 / banana-canvas | 이미지 | v1.49 / 운영(2026-10-21 포토 리메이크·올인원 그래픽 병합, FREE 해제) | v1.49 | CC-ECOM-01 · 운영Ready·시험상품 실저장왕복 확인 | 시험상품1개 운영실저장왕복/동일설정재전송방지/대표사진원복 확인보고수락, 실기기/낭독등별도 |
| 65 | 이미지 스타일 분석기 / style-dna-analyzer | 이미지 | v1.39 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 66 | AI 4컷 만화 자동화 / four-cut-comics | 이미지 | v1.37 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 67 | 이미지 변환 스튜디오 / image-convert-studio | 이미지 | v1.27 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 68 | AI 패션스타일 자동화 / fashion-style | 이미지 | v1.14 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 69 | 감성 글귀 이미지 / emotion-writer | 이미지 | v1.29 / 운영 | v1.37 작성자보고·Master운영alias/metaSHA 직접확인 | CC-ECOM-01 · 주인님직접지시 최신배포취합·추가12모델소스/실가용성검수미완 | 배포실행예산/제품트리/DBversion이력회수·운영무료flag 읽기별도·수정후실생성승인없음 |
| 70 | AI 올인원 그래픽 자동화 / allinone-graphic | 이미지 | v1.11 / 병합됨 → `banana-canvas`(2026-10-21) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 71 | AI 포토 리메이크 자동화 / photo-remake-studio | 이미지 | v1.13 / 병합됨 → `banana-canvas`(2026-10-21) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 72 | 상품소싱 자동화 / trending-product-finder | 이커머스 | v1.39 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 73 | AI 영상렌더 스튜디오 / video-to-gif | 영상 | v1.33 / 운영 | v1.33 | CC-MOVIE-01 · 운영 Ready·독립 코드QA PASS / 실제왕복 미검수 | 시험상품 범위 확정 후 GIF/WebP 각1 실수신 검수. 추가빌드 없음 |
| 74 | AI 상세페이지 자동화 / shop-detail-page | 이커머스 | v1.47 / 운영 | v1.47 | CC-ECOM-01 · 운영Ready·시험상품 실저장왕복 확인 | 시험상품1개 운영실저장왕복/동일설정재전송방지/대표사진원복 확인보고수락, 실기기/낭독등별도 |
| 75 | 상세페이지 자동생성기 v1 / auto-detail-page | 이커머스 | v1.21 / 병합됨 → `shop-detail-page`(2026-10-21) · **폐지(2026-10-29)**: 저장소 폴더 삭제(백업 `AIMaster_backup/retired-programs/detail-page-12p-20261029`, 태그 `retired/detail-page-12p-20261029`), 상세페이지의 12단 가져오기도 삭제(v1.40) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 76 | AI 12단 상세페이지 자동화 / detail-page-12p | 이커머스 | v1.12 / 병합됨 → `shop-detail-page`(2026-10-21) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 77 | INSTA 포스팅 자동화 / auto-instagram-posting | 인스타 | v1.74 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 78 | AI 인플루언서 자동화 / ai-influencer-studio | 인스타 | v1.26 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 79 | INSTA 댓글·DM 자동화 / instagram-comment-reply | 인스타 | v1.37 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 80 | INSTA DM답변 자동화 / instagram-dm-reply | 인스타 | v1.17 / **병합됨 → instagram-comment-reply(2026-10-20), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 81 | AI 웹툰 자동화 / ai-webtoon-studio | 인스타 | v1.33 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 82 | INSTA Cardnews 자동화 / cardnews-studio | 인스타 | v1.32 / **병합됨 → auto-instagram-posting(2026-10-20), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 83 | AI 쇼츠 원스톱 제작 자동화 / shorts-onestop-studio | 유튜브 | v1.59 / 공개(new) | v1.59 | CC-MOVIE-01 · 운영·특정시험대기 | 약1원시험·시험계정 조건 및 공용인코더 다음배포 |
| 84 | AI 문서 챗봇 자동화 / ai-doc-chatbot | 업무자동화 | v1.10 / 공개(new) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 85 | AI 가사영상 자동화 / lyric-video-studio | 음악 | v1.16 / 공개(new) | v1.16 | CC-MUSIC-01 · 운영v1.16·국소수정2건 소스완료/미배포 | 두건 다음음악기능배포묶음·Mac MP4신뢰클릭/저장선택은QA002 별도 |
| 86 | AI 댓글·DM 통합 받은편지함 / comment-inbox | 마케팅(홍보) | v1.10 / 운영(2026-10-21 신규) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 87 | AI 음악 스튜디오 / ai-music-studio | 음악 | v1.16 / 공개(new, 2026-10-23 신규) | v1.16 | CC-MUSIC-01 · 운영·Ready 보고 | 명시 잔여 없음·운영전체무결함 의미아님 |
| 88 | AI 영상 스튜디오 / ai-video-studio | 영상 | v1.36 / 공개(new, 2026-10-23 신규) | v1.36 | CC-MOVIE-01 · 운영버전 담당기록·유료생성 조건대기 | 주인님 후속지시 전 실유료생성0 |
| 89 | AI 업무 워크스페이스 자동화 / ai-work-workspace | 업무자동화 | v1.57 / 공개(기초 목록 기록) | v1.60 | CC-WORKSPACE-01 · v1.60 운영·캘린더 스타일 확인 | 시험 현황판 주소 미존재로 폭/메뉴 미확인. DB 목록 v1.58 보고·미변경. WS08 미배포. |
| 90 | 셀러 라벨·QR·서류 자동화 / seller-label-docs | 이커머스 | v1.04 / 공개(new, 2026-10-25 신규) | — | CC-ECOM-01 · 운영·인쇄자료/소규모미배포 | 다음배포묶음·실인쇄여백자료대기 |
| 91 | AI 쇼핑몰 주문·매출 리포트 자동화 / shop-order-report | 이커머스 | v1.06 / 공개(new, 2026-10-25 신규) | — | CC-ECOM-01 · 운영·자료대기 | 개인정보지운실제주문파일 필요 |
| 92 | AI 스마트스토어 상품 자동등록기 / smartstore-register | 이커머스 | v1.28 / 공개(new, 2026-10-26 신규 · 「바로 등록」 실제 등록 성공 2026-10-27) | v1.28 | CC-ECOM-01 · 운영배포기록·발행표시 수정반영 | 같은변경 재배포0·실제마켓쓰기 별도지시 |
| 93 | 부동산 실시간 매물 알림 / realty-listing-alert | 부동산 | v1.46 / 공개(2026-10-26 정식 공개, VIP 자동 부여) | v1.46 | CC-REALTY-01 · 운영v1.46·화면/guide/ZIP 독립읽기PASS | 기존서버기록10:37 110건/18:16 811건ok 담당읽기·Mac실확장저장소/첫회차격리 미검수, 새수집0 |
| 94 | 상가·건물·토지 매물 알림 / commercial-land-trade-alert | 부동산 | v1.34 / 공개(2026-10-31, VIP 자동 부여) | v1.34 | CC-REALTY-01 · 운영·재측정조건대기 | 로그아웃3a1d7fbb4·기기정보7f97c00e6 다음기능묶음, 층진단복구실패는마감·재측정자동반복0 |
| 95 | AI 중개사무소 고객관리 자동화 / realty-client-desk | 부동산 | v1.10 / 운영(2026-11-03 공개, NEW) | v1.10 | CC-REALTY-01 · 운영·기능실물완료기록 | 로그아웃3a1d7fbb4·기기정보/위젯7f97c00e6 미배포3변경 다음기능묶음 |
| 96 | AI 쿠팡 운영 자동화 / coupang-ops | 이커머스 | v1.19 / 공개(2026-10-31 공개 전환) | v1.19 | CC-ECOM-01 · 운영·실쓰기조건대기 | 상품권한해제·실주문뒤승인범위시험,중지상품삭제금지 |
| 97 | AI 무료음악 자동화 / free-music-studio | 음악 | v1.67 / 운영(Windows 엔진, Mac x64 설치·실행 검수/생성 미지원) | v1.67 / engine0.8.5 | CC-MUSIC-01 · 운영·조건부 후속 | LeVo 공개/Mureka 충전 등 외부조건 있을 때만 후속 |
| 98 | AI 워드프레스·구글블로그 자동화 / wp-blogger-auto | 블로그 | v1.05 / 운영(공개 2026-11-11, 관리자 실물 재검수 완료) | v1.05 | CC-BLOG-01 · 운영·B2검수완료 | WP기간은정책담당유지·중복기간부여안함 |
| 99 | AI 11번가 상품 자동등록기 / elevenst-register | 이커머스 | v1.07 / 비공개·v1.07운영/실등록시험완료기록 | v1.07 | CC-ECOM-01 · 운영·실등록검증완료 | 관리자잠금화면·시험상품은사용자직접삭제 |
| 100 | AI 블로그 이웃 소통 자동화 / blog-neighbor-care | 블로그 | v1.22 / 운영(C-3 진행 중) | v1.22 작성자DB/ext·Masteralias직접 | CC-BLOG-01 · 승인묶음 두번째Ready·B1확장실시험사람대기별도 | 기존B1사람확인뒤실확장·새읽기/AI0 |
| 101 | 네이버 카페 회원 모집 자동화 / naver-cafe-recruit | 네이버 | v1.04 / 비공개(실물 초대 1건 성공, 표시 수정 미배포) | v1.04 | CC-BLOG-01 · 운영·가입계정조건대기 | 가입카페계정으로운영진제외검수,외부초대재실행안함 |
| 102 | AI 쇼핑몰 빌더 / mall-builder | 이커머스 | v1.16 / 운영(샘플몰 `aimaster-b2b`, 손님 화면·분양 안내 공개 2026-11-13) | v1.16 | CC-B2B-BACK-01 + CC-B2B-FRONT-01 · 운영0100/v1.16·Lab0104/7609748ad 반영완료 | QA037 기존공간29 고객/관리자로그인·반환뒤읽기검수. 운영0101~0104미반영, 실제토스/새fixture 별도지시·옛0102정리SQL사용금지 |
| 103 | G마켓·옥션 등록기 / esm-register | 이커머스 (현재 비공개) | 신규 / 비교표 미등재 신규 | v1.02 | CC-ECOM-01 · 운영 배포·Mac 지정 웹 회귀 PASS | 실확장업데이트/계정연결/ESM실입력등록은별도범위 |

## 근거와 갱신

각 행의 원본 경로·줄, 보고근거·SHA·작업별 증거는 inventory JSON과 `.ai/master-status.json`에 있다. 전체 프로그램의 직접 운영 접속/실행·DB/유료 AI 재검증을 수행한 보고가 아니다. 담당 미응답·문서 충돌·실물 미검수는 그대로 남긴다.

```text
node .ai/build-master-report.mjs
```

먼저 Master가 실제 보고·검토 결과를 `.ai/master-status.json`에 반영하고 이 명령으로 표를 내보낸다. 날짜만 새로 만들고 검증한 것으로 표시하지 않는다.
