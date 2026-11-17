# AIMaster 총괄 개발 플랜·작업 지휘표

기준: 2026-11-17 11:41:25 KST · 총괄: Codex(Master), CX-MASTER-01 · 최종 결정권자: 주인님

이 문서는 비교표 전체와 실제 담당 보고를 함께 정리한 작업판이다. 완료율은 산출하지 않는다. 담당 보고·Git·문서 확인과 Master의 제품 실동작 재시험을 구분한다. 실시간 화면이 아니라 아래 명령으로 갱신하는 스냅샷이다.

범위: 비교표 102개 + 신규 ESM 1개 = 103개. 병합·폐지·비공개 기록도 누락 없이 포함한다. 메인 사이트·공통 보안/저장 정책은 별도 공통 업무다. 비교표의 '운영'은 지금 모든 기능이 검수 완료됐다는 의미가 아니다.

[팀·실제 연결](../.ai/TEAM.md) · [수정 전 점유표](../.ai/FILE_OWNERSHIP.md) · [사람의 결정함](../.ai/decisions/DEC-20261116-001.md) · [전체 목록 CSV](MASTER_DEVELOPMENT_PLAN_20261116.csv) · [전체 목록 JSON](MASTER_DEVELOPMENT_PLAN_20261116.inventory.json)

## 지금 내린 지휘와 우선순위

| 순서 | 담당 | 진행 단계 | 다음 작업·통과 기준 |
| --- | --- | --- | --- |
| 1 · ESM | Ecom + Mac Tester | v1.02 운영 배포·Mac 웹 회귀 완료 | 실ESM 등록/확장 연결은 별도 범위, 추가 빌드 없음 |
| 2 · Workspace | Workspace + Master | v1.56 운영배포·Mac독립운영정상경로/375직접viewport PASS | 현재묶음완료·추가검사/빌드0,Alt/실인쇄/실기기/실발급未검수유지 |
| 3 · B2B | Backend + Master + Mac Tester | 주인님 응답을 Backend가 준비신호로 접수·DB요청결과 대기 | 주인님Accept→검증20/지문→Master승인Lab1빌드,실결제테스트키만 |
| 4 · B2BFront | B2BFront + Mac Tester | 다크단추 최소보정 소스/독립계산 PASS | acb858a77 같은Lab묶음·실Tab/누름상태후속·3색기존미달별도 |
| 5 · 블로그 | Blog | 문서T12 배정/보관표정정완료,이웃1.22·티스토리1.98미배포 | 실확장/신뢰클릭·계정조건 별도,작은수정은다음묶음·타인변경보존 |
| 6 · 영상 | Movie | 떡상v1.30·사용량/캐시2표운영적용보고 | 실검색 시험로그인·AI기획안1회비용승인 전 유료호출0 |
| 7 · 음악 | Music | 운영6프로그램 보고확보·가사취소안내1건미배포 | Mac 실제MP4 저장/장비조건·외부충전/공개조건 구분,반복검사0 |
| 8 · 부동산 | Realty | 알림v1.46 운영·뉴스B프라임검증미통과/미반영 | 기존18:04회차결과있을때읽기확인·상가/CRM작은수정다음묶음 |
| 9 · 디자인 | AGY | 146 기준자산보존·대조요청 전달대기/착수미확인 | 대표실캡처와명세비교,제품코드수정·새시안0 |
| 전담 · 키트 | Support + 주인님 | 주인님 직접 작업 전담 | Master 타업무 배정 제외·다른 빌드예산 전용0 |

## 운영 순서

1. 담당 보고를 실제 SHA·현재 파일·기배포 근거와 대조한다. 잘못 보고된 전역 HEAD와 실제 작업 커밋을 구분한다.
2. 기본 기술 판단은 Master가 승인하고, 담당 한 명·정확 경로·완료조건으로 배정한다. 다른 역할 파일을 임의로 수정하지 않는다.
3. 작업자는 변경·검증·한계와 함께 ready_review로 반환한다. Master가 범위별 done/보완/다음 작업을 결정한다.
4. 유료 빌드·외부 쓰기·운영 DB·사람 인증은 이미 받은 승인 이력을 먼저 대조한다. 기존 승인에 없는 필수 결정만 사용자에게 취합한다.

## 완료를 정정한 항목

- B2B v1.09·v1.14 대기 표는 v1.15 배포 증거로 정정. 기존 프론트 5건/0095/S61은 재구현하지 않는다. 새 프론트 미배포는 5bfed663d로 분리했다.
- 음악 공통 6곳은 이미 배포됐다. 11-16의 사용자 직접 승인 5회 배포도 Ready 보고를 회수했고, 가사 MP4/플레이리스트 곡0개 화면은 실제 검증 근거를 받았다.
- ESM 웹 v1.01·11번가 실제 전송·영상v1.32 검수·단지2936·플레이리스트 첫30일 정리는 완료 기록이 있다. 옛 대기를 재요청하지 않는다.
- MOV/Blog의 커밋 보고가 같은 시각 다른 세션 HEAD를 가리켜 실제 파일 커밋으로 정정했다. 영상 efc72da60, 이웃 e35947191, 티스토리 a27861137이 기준이다.
- AG 정적 지적은 담당이 대조해 사실·추정을 구분했다. 실제 25MB 입력 검사 누락과 모바일 그리드는 수정, 자동 최적화/모든 WebP 애니메이션이라는 가정은 채택하지 않았다.

## 현재 작업 ID와 Master 처리

작업 기록 183개: done 159개 · cancelled 6개 · ready_review 13개 · running 2개 · waiting_human 2개 · ready 1개. 아래 done은 해당 작업의 완료조건만 닫은 것이며 제품 전체 개발·배포 완료율이 아니다.

| 작업 ID | 담당 | 상태 / 전달 | 완료·진행 범위 | Master의 다음 지휘 |
| --- | --- | --- | --- | --- |
| MUS-20261116-01 | CC-MUSIC-01 | done / integrated | 음악 기배포5건·공통6곳 포함 여부 정정 | 재배포 없음; 외부조건은 유지 |
| MUS-20261116-02 | CC-MUSIC-01 | done / integrated | 가사 MP420초·플레이리스트 곡0개 운영 검증 | 직접파일저장·멈춤/fallback·맥은 검수한계로 별도 |
| ECOM-20261116-01 | CC-ECOM-01 | done / integrated | WebP 수신 계약·ESM 상태 정정 | 수신부v1.46 Ready, 영상측 송신 연결 후 실제왕복 |
| ECOM-20261116-02 | CC-ECOM-01 | done / integrated | 바나나 M1 모바일·25MB가드·빈상태 보완 | 코드/104시험/정적독립검토 완료; v1.49 배포·실화면375px는 별도대기 |
| DES-20261116-01 | AG-UI-01 | done / integrated | M1 정적 품질 명세·잘못된 단정 정정 | 실기기·낭독 검수로 확대하지 않음 |
| DES-20261116-02 | AG-UI-01 | done / integrated | 7b5d3b053 정적 독립 재검토 | 필수 남은 정적결함0; 실화면 별도대기 |
| MOV-20261116-01 | CC-MOVIE-01 | done / integrated | GIF/WebP 송신·0/10MB·origin/source 보완 | 초기 구현·수정·독립QA 완료; MOV03 배포 완료, 실왕복 미검수 |
| WS-20261116-01 | CC-WORKSPACE-01 | done / integrated | Agent MCP 연결4개·회원한도·무인쓰기검토 | v1.52 운영 사용자 직접 배포 완료. 외부 MCP 실제 쓰기는 미검수 |
| WS-20261116-02 | CC-WORKSPACE-01 | done / integrated | 영속 승인1회 소모·동시재개1회 보완 | MUS03 독립12시험 통과. 운영 전체 무결함 의미 아님 |
| B2B-20261116-01 | CC-B2B-BACK-01 | done / integrated | v1.15 정정·M2-8~11/0100 준비·415시험 | 준비/최종422시험·Front합의 검토완료. 실제배포는B2B-20261116-03/DEC-002로분리 |
| B2B-20261116-02 | CC-B2B-BACK-01 | done / integrated | 3210 Lab 재개·Front 검수환경 | 2회재개 예외기록·보관캐시유지·추가재시작없음 |
| FRONT-20261116-01 | CC-B2B-FRONT-01 | done / integrated | v1.15/0095/S61 정정·S74 배포합의 | E3 실화면은FRONT-02에서 완료조건별 계속 |
| FRONT-20261116-02 | CC-B2B-FRONT-01 | done / integrated | E3 Lab검수→식품/키즈/뷰티 각6종 템플릿 | 6종구현/420시험/E3·갤러리Lab확인·Master카탈로그등록 완료. v1.16배포는별도대기 |
| RE-20261116-01 | CC-REALTY-01 | done / integrated | L-6 기술안·뉴스미배포정정·17시험 | 대안1 채택, 구현은RE-02로 분리 |
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
| YVS-20261116-01 | CC-MOVIE-01 | ready_review / returned | 사용자직접 YVS1단계 기능·v1.30 운영배포 | i71hni371 Ready·DB1.30·401/307·공통3항목 확인보고 수락. DDL2표/실검색/AI미검수·DES07 UI검토대기 |
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
| ECOM-20261117-01 | CC-ECOM-01 | ready_review / returned | 주인님 직접 쇼핑제휴2단계 구현 | URL/원자성독립검토수락·v1.89운영반영완료, 실제확장설치/네이버수집등록/글생성미검수 |
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
| WS-20261117-06 | CC-WORKSPACE-01 | ready_review / returned | 주인님직접 DB전체페이지 여백96→24px 미배포묶음 | 소규모묶음다음배포·별도비용요청/빌드없음·미배포 |
| REL-20261117-004 | CC-B2B-BACK-01 | done / integrated | 주인님직접 B2B0100실행위임 취합 | B2B0100주인님확인직접승인·분리소스1.16배포완료, 추가빌드0·실볼타/관리자미검수 |
| QA-20261117-001 | CC-ECOM-01 | done / integrated | 주인님 직접시험상품1개 운영 저장응답왕복 검수 | resultId왕복/동일설정재전송방지확인·대표사진원복, 실기기/낭독별도·추가실행없음 |
| REL-20261117-005 | CC-ECOM-01 | done / integrated | 주인님 직접승인 쇼핑제휴v1.89 운영배포 | qkncpet55 Ready·ext/zip/DB1.89·실설치/네이버수집등록/쿠팡미검수 |
| FRONT-20261117-01 | CC-B2B-FRONT-01 | ready_review / returned | 갤러리 로빙키보드·필터선택 및fallback 정합성 | MOV17-05실Lab핵심PASS·fallback후속코드검토수락/미배포묶음·실낭독별도 |
| MUS-20261117-01 | CC-MUSIC-01 | done / integrated | 가사영상 회원취소 일반안내 보완 | 작성자36검사/독립실원본취소·실패분리PASS·미배포묶음, ACTIVE공용타인삭제충돌보존 |
| BLOG-20261117-01 | CC-BLOG-01 | done / integrated | 수집기 운영메타·블로그 미배포 누락 정정 | 문서정정완료·tistory타인ZIP삭제diff보존·T12미정별도 |
| RE-20261117-03 | CC-REALTY-01 | done / integrated | 읽기전용 뉴스측정·안정페이징 도구 | 동률2500루프모의검증수락·실PostgREST1000+미검수·recall판정불가/운영recent상한차이명시 |
| WS-20261117-07 | CC-WORKSPACE-01 | done / integrated | 뉴스측정기 독립읽기/안정페이징 후속검토 | 지적보완수락·DB/API0·실페이지경계누락실측아님 |
| RE-20261117-04 | CC-REALTY-01 | done / integrated | 지역·단지 감시 겹침 안내 | 신규경계Mac실background12+boolean2 PASS 수락·미배포. 정확릴리스묶음/기록격리화면영향·복구없는중단·업데이트횟수 준비,실수집/배포0 |
| MOV-20261117-05 | CC-MOVIE-01 | done / integrated | 갤러리키보드·가사취소 안내 독립검토 | 각실컴포넌트/실Lab PASS·운영미배포·fallback소규모후속코드대조 |
| B2B-20261117-01 | CC-B2B-BACK-01 | done / integrated | 메시지 safeupdate 미리보기·알림라벨 보완(Lab) | Mac정적PASS/동일Lab작성자preview증거 재사용. 운영0101·실발송·제품배포 미완료 유지 |
| WS-20261117-08 | CC-WORKSPACE-01 | ready_review / returned | 주인님 직접 소규모5건 캘린더·번역 묶음 | ⑤기존구현조사/4영역코드변경·MOV17-06독립검토·906여백과미배포묶음 |
| PLAN-20261117-01 | CC-WORKSPACE-01 | done / integrated | Workspace 큰기능4건 기존기능대조·확장계획 | E1 claimRetry보완우선. E2 PresenceLayer기존위치표시발견→새Badge/Block중복계획철회, sync복귀조회·기존말풍선현지화만. 예약/포털설계보완·운영DDL별도 |
| MOV-20261117-06 | CC-MOVIE-01 | done / integrated | Workspace소규모캘린더/번역/여백 독립검토 | 중복검토0·최신146화면은Workspace/독립시각검수별도 |
| QA-20261117-002 | CX-QA-01 | waiting_human / returned | 실제Intel Mac MP4파일내보내기 보조검수 | Intel x86_64·AppleSilicon불가. ego20 handoff에서MP4신뢰클릭/저장위치선택필요, 실제인코딩0·우회없음 |
| QA-20261117-003 | CX-QA-01 | done / integrated | B2B Lab·RE계정격리·Workspace묶음 독립검수 | 배정검수범위완료·새E2/교환UI반환후새검수,같은시험반복없음 |
| QA-20261117-004 | CX-QA-01 | done / integrated | 교환0102 독립검토 | DB검수배정범위완료·맥DB/실UI/운영미검수;불가능복구문구후속정정. Lab0102/운영0 |
| B2B-20261117-02 | CC-B2B-BACK-01 | done / integrated | 교환0102 구현·독립지적 수정 | 코어가드범위완료·불가능한거절/재접수안내P2문구는후속UI와국소정정. Lab0102/운영미적용 |
| WS-20261117-10 | CC-WORKSPACE-01 | ready_review / returned | 보기 이름 저장값 보존 | 저장된 Table/한글 이름 그대로 표시·서버3경로 보류. 최종MacQA후 다음배포묶음 |
| WS-20261117-09 | CC-WORKSPACE-01 | done / integrated | 확장 E1·notify_me 중복 차단 | 독립경계완료·소규모미배포묶음유지. claim후enqueue실패소진/전체execute중복별도한계. E2축소진행 |
| DES-20261117-02 | AG-UI-01 | ready_review / returned | Workspace 전면디자인3안·12뷰 | 146최종명세/8개월전체보조캡처·Workspace전달msg_0df2d31453ba,제품단독구현계획대기·145147보존/추가보완중단 |
| B2B-20261117-03 | CC-B2B-BACK-01 | running / returned | 교환 접수·단계 UI 구현 | Lab실환경자동confirmed 3일과7일교환상태충돌로고객UI/guard조건후속보완필요·기존UI P2정적PASS는보존·실흐름최종검수대기 |
| QA-20261117-005 | CX-QA-01 | ready_review / returned | Workspace 디자인3안·독립뷰어 시각검수 | 주인님146선택으로기존선택대기종료·과거P2결과보존,146최종기준참조검수/구현인계지원만.145/147추가검사반복없음 |
| WS-20261117-11 | CC-WORKSPACE-01 | done / integrated | E2-7-1 포커스복귀 동기화·기존말풍선 현지화 | 미배포묶음유지·기존disconnect poll타이머/inflight/currentPage잔류는별도한계,포털계속 |
| QA-20261117-006 | CX-QA-01 | ready_review / returned | 교환 UI 서버권한·단계·오류 독립검수 | 원UI P2두건독립PASS·모의RLS몰/RPC0·11시험수락. Labfixture/verify별도보완대기·실적용흐름미검수 |
| QA-20261117-007 | CX-QA-01 | done / integrated | E2 복귀동기화·리스너수명 독립검수 | 지정경계PASS수락·기존타이머취소/실네트워크/전체계정전환검수아님·재반복없음 |
| WS-20261117-12 | CC-WORKSPACE-01 | done / integrated | E2-7-3 손님 포털 구현·외부공개권한 경계 | 서버/UI OFF·운영aww_portals표0 유지. 활성배포는DB구조추가별도승인·기회정리/5분캐시한계기록 |
| ESM-20261117-01 | CC-ECOM-01 | done / integrated | 주인님 직접 ESM 썸네일 등록·사용자 매뉴얼 | 운영v1.02유지·동일배포재실행0·실ESM등록은추후범위지정 |
| QA-20261117-008 | CX-QA-01 | done / integrated | ESM 운영안내·매뉴얼 누락 독립점검 | 다음esm묶음배포뒤운영가이드반영확인만·같은소스재검수없음 |
| QA-20261117-009 | CX-QA-01 | done / integrated | OFF 포털 공유권한·토큰·속성투영 독립검수 | 만료토큰부활지정수정독립PASS 수락·실DB다중프로세스미검수·공개전환0 |
| WS-20261117-13 | CC-WORKSPACE-01 | done / integrated | 주인님 선택146 Professional Studio 전면리뉴얼 | 배포완료·후속QA021 Mac읽기전용독립검수. Alt/실인쇄/실기기/실발급未검수 유지 |
| REL-20261117-006 | CC-REALTY-01 | done / integrated | 주인님 직접승인 매물알림v1.46 운영배포 | QA010읽기확인배정·ZIP압축해시차이/내부파일동일근거보존,새수집/알림/추가빌드0 |
| QA-20261117-010 | CX-QA-01 | done / integrated | 매물알림v1.46 운영·확장버전 읽기확인 | Mac확장설치/실SW/첫격리/수집알림미검수·PC5대표시는다른PC상태,재반복0 |
| RE-20261117-05 | CC-REALTY-01 | done / returned | 주인님 직접 상가 층진단 n30 재측정1회 | 클라이언트15초타임아웃·응답지역변수라회수실패·HTTP/건수미확인·추가공공API호출0,향후결과보관실행기개선안만기록 |
| WS-20261117-14 | CC-WORKSPACE-01 | ready_review / returned | 주인님 직접 캘린더 달별 상자/색 구분 | 월보기CalendarView/calendar.css·tsc0 미배포,146토큰/월경계/연말전환·week보존실화면검수에병합·중복구현0 |
| ESM-20261117-02 | CC-ECOM-01 | done / integrated | ESM 카탈로그 썸네일 실등록 | 등록/독립공개이미지검수범위완료·backup비공개유지·이미지재생성/루트배포0 |
| B2B-20261117-06 | CC-B2B-BACK-01 | ready_review / returned | Lab0102 안전fixture·실행패키지 준비 | Lab0102합성자료/정리안준비·0103적용기완료,정리미실행. 0104적용뒤기존b5정리금지·별도후속승인자료필요 |
| B2B-20261117-07 | CC-B2B-BACK-01 | waiting_human / delivered | 주인님기승인 D5 교환비 카드결제 b3 mock구현 | 도구승인준비신호대기·현재적용0/빌드0of1. 준비되면고정원문1회요청→verify20/지문→Master단독Lab빌드,자동반복금지 |
| WS-20261117-15 | CC-WORKSPACE-01 | done / integrated | 주인님 직접 Alt/Option 달력카드 드래그 복사 | 배정코드검수완료·미배포묶음/146실화면으로연결,개발시험DB분리완료전DB시험재실행0 |
| QA-20261117-011 | CX-QA-01 | done / integrated | 달력 Alt복사·월구분 기능회귀 독립검수 | 취소/원자구조/엄격날짜/권한작성자증거지정검수완료·실DOM146시각미검수·같은검사재반복0 |
| QA-20261117-012 | CX-QA-01 | done / integrated | 교환비 카드결제 0103 모의/권한 독립검수 | Lab적용도구승인→검증→승인1빌드·테스트키실동작별도 |
| QA-20261117-013 | CX-QA-01 | done / integrated | 146 studio S0~2 라우트·실데이터·테마 독립검수 | 새로그인뒤실화면검수별도범위·동일effect/소스시험재반복0 |
| WS-20261117-16 | CC-WORKSPACE-01 | done / integrated | 로컬 개발·시험 DB 분리 및 기존자료 보존 | 래퍼 종료 보고 정정: Master TCP3457 LISTEN/PID44692 node 생존 직접확인, 재시작 불필요. 기존 로그인 안내 유효·로그인 후 로컬검수workspace 담당 생성·운영자료 이전0 |
| B2B-20261117-08 | CC-B2B-BACK-01 | ready_review / returned | 자동 구매확정과 교환7일 상태정합성 수정 | 0103적용/staff실RPC 및증거검토마감. 유저실세션7일/화면은별도미검수. 시험후baseline rejected1행/이력2,기존verify교환0 반복요구0. Backend0104기승인로컬보완진행 |
| DES-20261117-03 | AG-UI-01 | ready / queued | 146 실제스타일 소스·명세·접근성 대조 지원 | AGY정착프롬프트수신대기·로그인뒤실렌더비교는후속,새시안/유료/서버변경0 |
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

## 현재 담당 회신이 확보된 프로젝트

| 프로젝트 | 담당 | 운영/후속 버전 (보고) | 단계 | 완료 근거 요약 | 다음 작업 |
| --- | --- | --- | --- | --- | --- |
| AI 할 일·성과 관리 | CC-WORKSPACE-01 | v1.14 | 운영·현황재확인 | Workspace범위 유지 | 별도잔여확정전새구현배정안함 |
| Website Scraper | 기존담당 확인 | v1.15 | 병합·비활성·백업비공개 | WS10 DB v1.15/is_activefalse/backup비공개·옛API410 코드 | 실라이브/T12담당정의미확인,운영재조회반복없음 |
| 부동산 실거래 투자분석 자동화 | CC-REALTY-01 | v1.61 | 운영 Ready 보고 / 다음 뉴스 회차 대조 | 사용자 직접 승인·bl0k0qu46 Ready·17+3시험·타입0 보고 | 실행기 기록 확인 뒤08:00뉴스 지역별 대조, 자동감시 약속 없음 |
| 티스토리 포스팅 자동화 | CC-BLOG-01 | v1.97 / v1.98 후보 | 운영·소제목수정완료 / 미배포 | B4생성/보관완료,a27861137 소제목8시험 | 다음배포후H2확인·실청구검증별도 |
| AI 유튜브 떡상 분석 자동화 | CC-MOVIE-01 | v1.30 | 운영v1.30·사용량/캐시 운영표 적용보고 | 주인님직접SQL실행·2표/RLS/함수/cleanupcron 읽기확인보고 | 시험계정로그인뒤실검색·AI기획안1회는비용승인필요 |
| YOUTUBE 플레이리스트 자동화 | CC-MUSIC-01 | v1.42 | 운영·실화면 검증 | 곡0개 업로드기록/업무단추 확인, 30일정리11-14 확인 | 업무전달 재실행 안 함; 직접파일저장/예외검수는별도 |
| YOUTUBE Shots(이미지 스토리) 자동화 | CC-MOVIE-01 | v1.50 (역할기록) | 운영·공통사본후속 | 실물·정리 완료 기록 | 미배포 공용인코더/지역 항목만담당대조 |
| AI 마스터링 스튜디오 | CC-MUSIC-01 | v1.17 | 운영·Ready 보고 | 공통보완 반영·시험22·타입0 | 명시 잔여 없음·실물범위는개별기록 |
| 뮤직비디오 자동화 | CC-MOVIE-01 + CC-MUSIC-01 | v1.31 | 운영·공통반영확인 | 저장위젯/로그인 정책 기배포 | 영상/음악 파일소유분리, 유료생성은기존보류 |
| 음악(SUNO)자동화 | CC-MUSIC-01 | v1.58 | 운영·범위내 완료 | 음악 메뉴1개 선택 수정·Ready·검증보고 | 명시 잔여 없음; 새 배정 전 임의수정 없음 |
| AI 바나나 캔버스 자동화 | CC-ECOM-01 | v1.49 | 운영Ready·시험상품 실저장왕복 확인 | e5611755d·c41203srg Ready·DB1.49·375/320합성2/2담당보고 | 시험상품1개 운영실저장왕복/동일설정재전송방지/대표사진원복 확인보고수락, 실기기/낭독등별도 |
| AI 영상렌더 스튜디오 | CC-MOVIE-01 | v1.33 | 운영 Ready·독립 코드QA PASS / 실제왕복 미검수 | 2ae34fbdc·11+4독립조건PASS·38pox5t03 Ready·DB/ext/ZIP1.33일치 보고 | 시험상품 범위 확정 후 GIF/WebP 각1 실수신 검수. 추가빌드 없음 |
| AI 상세페이지 자동화 | CC-ECOM-01 | v1.47 | 운영Ready·시험상품 실저장왕복 확인 | 0e418bab9·6esxwz43i Ready·DB1.47·products/위젯 담당확인 | 시험상품1개 운영실저장왕복/동일설정재전송방지/대표사진원복 확인보고수락, 실기기/낭독등별도 |
| AI 쇼츠 원스톱 제작 자동화 | CC-MOVIE-01 | v1.59 | 운영·특정시험대기 | 낱말시각B안 코드·배포 | 약1원시험·시험계정 조건 및 공용인코더 다음배포 |
| AI 가사영상 자동화 | CC-MUSIC-01 | v1.16 | 주인님 직접승인 운영Ready | d65c40617·38f1zi7y1 Ready·DB1.16·운영4흐름 담당검수 | 실저장창/맥실하드웨어/30분곡 등 기존한계 유지·재배포없음 |
| AI 음악 스튜디오 | CC-MUSIC-01 | v1.16 | 운영·Ready 보고 | 공통 로그아웃/UA/위젯 배포 | 명시 잔여 없음·운영전체무결함 의미아님 |
| AI 영상 스튜디오 | CC-MOVIE-01 | v1.36 | 운영·조건부 유료시험 | Vidu/상품장면 코드·배포 완료 기록 | 사용자 나중에 지시 유지·유료호출 재실행안함 |
| AI 업무 워크스페이스 자동화 | CC-WORKSPACE-01 | v1.55 | 운영 v1.55 유지·후속33소스/계정수정검수·146 로컬화면확인중 | 146 S0~5·영수증/캘린더상태 소스PASS·desktop/375iframe 담당실화면확인 | en/Alt·대표캡처독립시각대조·전체타입미검수분리·미배포묶음 |
| 셀러 라벨·QR·서류 자동화 | CC-ECOM-01 | v1.04 | 운영·인쇄자료/소규모미배포 | 마켓단계48b67dd5c 구현 | 다음배포묶음·실인쇄여백자료대기 |
| AI 쇼핑몰 주문·매출 리포트 자동화 | CC-ECOM-01 | v1.06 | 운영·자료대기 | 코드/기존검증은개별기록 | 개인정보지운실제주문파일 필요 |
| 부동산 실시간 매물 알림 | CC-REALTY-01 | v1.46 | 운영v1.46·화면/guide/ZIP 독립읽기PASS | 6kxzrn0il Ready·DB/ext1.46·120/type0·메인확장재로드보고·격리코드독립PASS | 실Mac설치/첫회차격리·수집알림은미검수,새빌드/수집없이원래회차후읽기만별도 |
| 상가·건물·토지 매물 알림 | CC-REALTY-01 | v1.34 | 운영·재측정조건대기 | 층호출조절 배포완료 | local로그아웃3a1d7fbb4 코드완료·미배포, 다음기능배포에묶음. UA/위젯잔여는별도 |
| AI 중개사무소 고객관리 자동화 | CC-REALTY-01 | v1.10 | 운영·기능실물완료기록 | 1~4단계·계산기/문자실물기록 | local로그아웃3a1d7fbb4 코드완료·미배포, 다음기능배포에묶음. UA/위젯잔여는별도 |
| AI 쿠팡 운영 자동화 | CC-ECOM-01 | v1.19 | 운영·실쓰기조건대기 | 읽기/기존흐름완료 기록 | 상품권한해제·실주문뒤승인범위시험,중지상품삭제금지 |
| AI 무료음악 자동화 | CC-MUSIC-01 | v1.67 / engine0.8.5 | 운영·조건부 후속 | 11-14 운영 반영 | LeVo 공개/Mureka 충전 등 외부조건 있을 때만 후속 |
| AI 워드프레스·구글블로그 자동화 | CC-BLOG-01 | v1.05 | 운영·B2검수완료 | 권한/공개소개 검수기록 | WP기간은정책담당유지·중복기간부여안함 |
| AI 11번가 상품 자동등록기 | CC-ECOM-01 | v1.07 | 운영·실등록검증완료 | 실제전송/전시중지/중복방지확인 | 관리자잠금화면·시험상품은사용자직접삭제 |
| AI 블로그 이웃 소통 자동화 | CC-BLOG-01 | v1.21 / v1.22 후보 | 운영·진단구현완료 / 실검수대기 | 387시험·타입0,e35947191 진단추가 | 맥일반창/작업공간창진단 재시험·신청있는계정·배포묶음 |
| 네이버 카페 회원 모집 자동화 | CC-BLOG-01 | v1.04 | 운영·가입계정조건대기 | C모드숨김확인 | 가입카페계정으로운영진제외검수,외부초대재실행안함 |
| AI 쇼핑몰 빌더 | CC-B2B-BACK-01 + CC-B2B-FRONT-01 | v1.16 | 운영v1.16·Lab0103적용/0104도구입력대기 | 교환/결제소스·UI·적용자료검수완료,Lab0103/staff실RPC근거대조 | SupabaseDEV Accept→0104검증20→MasterLab1빌드(Front대비수정포함),실결제는테스트키만 |
| G마켓·옥션 등록기 | CC-ECOM-01 | v1.02 | 운영 배포·Mac 지정 웹 회귀 PASS | 매뉴얼·썸네일·모바일닫기·오류입력보존·상품수명 반영,Mac375 실제핵심동작확인 | 실확장업데이트/계정연결/ESM실입력등록은별도범위 |

## 사람의 조치와 결정

기존 요청을 다시 만들지 않고 결정함에서 취합한다. Workspace v1.52·영상 v1.33·음악5회·상세페이지 v1.46은 담당에게 확인된 사용자 직접 승인 범위를 보존한다. QA 미통과나 안전성 미해결은 Master가 먼저 해결하며 새 승인을 요청할 이유로 바꾸지 않는다.

| 조건 | 필요한 사람의 일 | 추천 처리 |
| --- | --- | --- |
| 지금 · B2B Lab 도구 입력 | Backend 도구승인창을 바로 확인할 수 있는 시점 알림 후 Accept | 기존개발승인유효·두요청모두만료/실행0·준비후한번만재요청,DB검증뒤Lab1빌드 |
| 실제 결제 검수 단계 | Lab 테스트 전용 토스 키 사용 확인 | 운영/회원실키 폴백 없이 테스트키로만,현재실결제0 |
| 영상 실호출 단계 | 시험회원 로그인·AI 기획안 1회 비용 승인 | 운영표2개는이미적용,실검색/AI검수만분리 |
| 음악 실기기/저장 단계 | Mac MP4 만들기 신뢰클릭·저장위치 선택/AppleSilicon장비 필요시 | 기존소스검수를실하드웨어PASS로대체하지않음 |
| 블로그·마켓 외부계정 | 해당회차가필요할때본인로그인·확장연결/신뢰클릭 | 지금권한확대/실포스팅/실ESM등록은실행하지않음 |

## 전체 포트폴리오 목록

비교표의 버전·라이프사이클은 원문 기록이며 보고 버전이 있으면 함께 표시한다. 담당 회신이 없는 항목을 완료나 미담당으로 단정하지 않는다. 요약 번호 97 중복 때문에 최대번호로 프로그램 개수를 세지 않는다.

| 번호 | 프로그램 / slug | 카테고리 | 비교표 버전 / 상태 | 최신 보고 버전 | 담당·단계 | 다음 작업 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 구글폼 CRM 자동화 / crm-google-form | CRM | v1.17 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 2 | 카카오톡 뉴스레터 자동화 / kakao-auto-posting | CRM | v1.32 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 3 | AI 할 일·성과 관리 / ai-task-planner | 업무자동화 | v1.14 / 운영 | — | CC-WORKSPACE-01 · 운영·현황재확인 | 별도잔여확정전새구현배정안함 |
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
| 17 | Website Scraper / website-scraper | 데이터수집\|기획 | v1.15 / 병합됨 → `web-crawler-saas` 「🔎 한 페이지 분석」(2026-10-21), 숨김·백업 | v1.15 | 기존담당 확인 · 병합·비활성·백업비공개 | 실라이브/T12담당정의미확인,운영재조회반복없음 |
| 18 | 시네마틱 스토리보드 자동화 / cinematic-storyboard-studio | 디자인 | v1.20 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 19 | 페르소나 문체 자동화 / persona-style-studio | 데이터수집\|기획 | v1.10 / 병합됨 → ai-writing-editor(2026-10-21) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 20 | AI 랜딩페이지 기획 자동화 / landing-architect | 디자인 | v1.16 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 21 | UI Canvas 자동화 / ui-canvas | 디자인 | v1.15 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 22 | 웹 크롤링 자동화 / web-crawler-saas | 데이터수집 | v1.12 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
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
| 34 | 부동산 실거래 투자분석 자동화 / real-estate-sales | 부동산 | v1.61 / 운영 | v1.61 | CC-REALTY-01 · 운영 Ready 보고 / 다음 뉴스 회차 대조 | 실행기 기록 확인 뒤08:00뉴스 지역별 대조, 자동감시 약속 없음 |
| 35 | AI 블로그 키워드 자동화 / blog-keyword | 블로그 | v1.13 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 36 | 티스토리 포스팅 자동화 / tistory-auto-blog | 블로그 | v1.97 / 운영 | v1.97 / v1.98 후보 | CC-BLOG-01 · 운영·소제목수정완료 / 미배포 | 다음배포후H2확인·실청구검증별도 |
| 37 | 블로그 포스팅 자동화 / ai-auto-blog | 블로그 | v1.87 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 38 | 네이버 블로그 에이전트 / naver-blog-agent | 블로그 | v2.28 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 39 | 네이버 블로그 올인원 자동화 / naver-blog-allinone | 블로그 | v1.60 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 40 | AI 블로그 작업실 자동화 / blog-workroom | 블로그 | v1.16 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 41 | AI 블로그 콘텐츠 제작 자동화 / blog-content-maker | 블로그 | v1.14 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 42 | Threads AI 기획 자동화 / threads-easy-planner | 쓰레드 | v1.52 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 43 | Threads 포스팅 자동화 / auto-threads-posting | 쓰레드 | v1.34 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 44 | Threads 댓글자동화 / threads-comment-reply | 쓰레드 | v1.29 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 45 | Threads 쇼핑제휴 자동화 / threads-affiliate-poster | 쓰레드 | v1.88 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 46 | Threads 콘텐츠 운영 자동화 / threads-content-ops | 쓰레드 | v2.25 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 47 | AI 유튜브 떡상 분석 자동화 / youtube-viral-studio | 유튜브 | v1.30 / 운영 | v1.30 | CC-MOVIE-01 · 운영v1.30·사용량/캐시 운영표 적용보고 | 시험계정로그인뒤실검색·AI기획안1회는비용승인필요 |
| 48 | YOUTUBE 플레이리스트 자동화 / playlist-channel-studio | 유튜브 | v1.42 / 운영 | v1.42 | CC-MUSIC-01 · 운영·실화면 검증 | 업무전달 재실행 안 함; 직접파일저장/예외검수는별도 |
| 49 | AI 썸네일·SEO 자동화 / thumbnail-master | 유튜브 | v2.02 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 50 | YOUTUBE CHANNEL CONSULTANT / youtube-channel-consultant | 유튜브 | v1.11 / **병합됨 → youtube-viral-studio(2026-10-20), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 51 | 쇼츠 떡상 분석·대본 자동화 / shorts-viral-studio | 유튜브 | v2.0 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 52 | YOUTUBE Shots(이미지 스토리) 자동화 / auto-shorts-posting | 유튜브 | v1.51 / 운영 | v1.50 (역할기록) | CC-MOVIE-01 · 운영·공통사본후속 | 미배포 공용인코더/지역 항목만담당대조 |
| 53 | 유튜브 댓글자동화 / youtube-auto-reply | 유튜브 | v1.33 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 54 | AI 유튜브 썸네일 프로 / seo-thumbnail-pro | 유튜브 | v1.12 / **병합됨 → thumbnail-master(2026-10-20), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 55 | Suno 음악기획 자동화 / suno-music-studio | 음악 | v1.13 / **병합됨 → music-automation(2026-10-21), 노출 중지** | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 56 | AI 마스터링 스튜디오 / ai-mastering-studio | 음악 | v1.17 / 운영 | v1.17 | CC-MUSIC-01 · 운영·Ready 보고 | 명시 잔여 없음·실물범위는개별기록 |
| 57 | 뮤직비디오 자동화 / music-video-studio | 음악 | v1.31 / 운영 | v1.31 | CC-MOVIE-01 + CC-MUSIC-01 · 운영·공통반영확인 | 영상/음악 파일소유분리, 유료생성은기존보류 |
| 58 | 음악(SUNO)자동화 / music-automation | 음악 | v1.58 / 운영(2026-10-21 Suno 음악기획 병합) | v1.58 | CC-MUSIC-01 · 운영·범위내 완료 | 명시 잔여 없음; 새 배정 전 임의수정 없음 |
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
| 69 | 감성 글귀 이미지 / emotion-writer | 이미지 | v1.27 / 운영 | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
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
| 85 | AI 가사영상 자동화 / lyric-video-studio | 음악 | v1.16 / 공개(new) | v1.16 | CC-MUSIC-01 · 주인님 직접승인 운영Ready | 실저장창/맥실하드웨어/30분곡 등 기존한계 유지·재배포없음 |
| 86 | AI 댓글·DM 통합 받은편지함 / comment-inbox | 마케팅(홍보) | v1.10 / 운영(2026-10-21 신규) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 87 | AI 음악 스튜디오 / ai-music-studio | 음악 | v1.16 / 공개(new, 2026-10-23 신규) | v1.16 | CC-MUSIC-01 · 운영·Ready 보고 | 명시 잔여 없음·운영전체무결함 의미아님 |
| 88 | AI 영상 스튜디오 / ai-video-studio | 영상 | v1.36 / 공개(new, 2026-10-23 신규) | — | CC-MOVIE-01 · 운영·조건부 유료시험 | 사용자 나중에 지시 유지·유료호출 재실행안함 |
| 89 | AI 업무 워크스페이스 자동화 / ai-work-workspace | 업무자동화 | v1.51 / 공개(2026-10-24 신규, 일반 등급 이상) | v1.55 | CC-WORKSPACE-01 · 운영 v1.55 유지·후속33소스/계정수정검수·146 로컬화면확인중 | en/Alt·대표캡처독립시각대조·전체타입미검수분리·미배포묶음 |
| 90 | 셀러 라벨·QR·서류 자동화 / seller-label-docs | 이커머스 | v1.04 / 공개(new, 2026-10-25 신규) | — | CC-ECOM-01 · 운영·인쇄자료/소규모미배포 | 다음배포묶음·실인쇄여백자료대기 |
| 91 | AI 쇼핑몰 주문·매출 리포트 자동화 / shop-order-report | 이커머스 | v1.06 / 공개(new, 2026-10-25 신규) | — | CC-ECOM-01 · 운영·자료대기 | 개인정보지운실제주문파일 필요 |
| 92 | AI 스마트스토어 상품 자동등록기 / smartstore-register | 이커머스 | v1.28 / 공개(new, 2026-10-26 신규 · 「바로 등록」 실제 등록 성공 2026-10-27) | — | 기존 담당 확인 대기 · 비교표 기록·담당 재확인 | 기존 담당·최신 기록 대조 후 배정 |
| 93 | 부동산 실시간 매물 알림 / realty-listing-alert | 부동산 | v1.46 / 공개(2026-10-26 정식 공개, VIP 자동 부여) | v1.46 | CC-REALTY-01 · 운영v1.46·화면/guide/ZIP 독립읽기PASS | 실Mac설치/첫회차격리·수집알림은미검수,새빌드/수집없이원래회차후읽기만별도 |
| 94 | 상가·건물·토지 매물 알림 / commercial-land-trade-alert | 부동산 | v1.34 / 공개(2026-10-31, VIP 자동 부여) | v1.34 | CC-REALTY-01 · 운영·재측정조건대기 | local로그아웃3a1d7fbb4 코드완료·미배포, 다음기능배포에묶음. UA/위젯잔여는별도 |
| 95 | AI 중개사무소 고객관리 자동화 / realty-client-desk | 부동산 | v1.10 / 운영(2026-11-03 공개, NEW) | v1.10 | CC-REALTY-01 · 운영·기능실물완료기록 | local로그아웃3a1d7fbb4 코드완료·미배포, 다음기능배포에묶음. UA/위젯잔여는별도 |
| 96 | AI 쿠팡 운영 자동화 / coupang-ops | 이커머스 | v1.19 / 공개(2026-10-31 공개 전환) | v1.19 | CC-ECOM-01 · 운영·실쓰기조건대기 | 상품권한해제·실주문뒤승인범위시험,중지상품삭제금지 |
| 97 | AI 무료음악 자동화 / free-music-studio | 음악 | v1.67 / 운영(Windows 엔진, Mac x64 설치·실행 검수/생성 미지원) | v1.67 / engine0.8.5 | CC-MUSIC-01 · 운영·조건부 후속 | LeVo 공개/Mureka 충전 등 외부조건 있을 때만 후속 |
| 98 | AI 워드프레스·구글블로그 자동화 / wp-blogger-auto | 블로그 | v1.05 / 운영(공개 2026-11-11, 관리자 실물 재검수 완료) | v1.05 | CC-BLOG-01 · 운영·B2검수완료 | WP기간은정책담당유지·중복기간부여안함 |
| 99 | AI 11번가 상품 자동등록기 / elevenst-register | 이커머스 | v1.07 / 개발 중(비공개, 서울 지역 직접 연결·연결 시험) | v1.07 | CC-ECOM-01 · 운영·실등록검증완료 | 관리자잠금화면·시험상품은사용자직접삭제 |
| 100 | AI 블로그 이웃 소통 자동화 / blog-neighbor-care | 블로그 | v1.21 / 운영(C-3 진행 중) | v1.21 / v1.22 후보 | CC-BLOG-01 · 운영·진단구현완료 / 실검수대기 | 맥일반창/작업공간창진단 재시험·신청있는계정·배포묶음 |
| 101 | 네이버 카페 회원 모집 자동화 / naver-cafe-recruit | 네이버 | v1.04 / 비공개(실물 초대 1건 성공, 표시 수정 미배포) | v1.04 | CC-BLOG-01 · 운영·가입계정조건대기 | 가입카페계정으로운영진제외검수,외부초대재실행안함 |
| 102 | AI 쇼핑몰 빌더 / mall-builder | 이커머스 | v1.07 / 운영(샘플몰 `aimaster-b2b`, 손님 화면·분양 안내 공개 2026-11-13) | v1.16 | CC-B2B-BACK-01 + CC-B2B-FRONT-01 · 운영v1.16·Lab0103적용/0104도구입력대기 | SupabaseDEV Accept→0104검증20→MasterLab1빌드(Front대비수정포함),실결제는테스트키만 |
| 103 | G마켓·옥션 등록기 / esm-register | 이커머스 (현재 비공개) | 신규 / 비교표 미등재 신규 | v1.02 | CC-ECOM-01 · 운영 배포·Mac 지정 웹 회귀 PASS | 실확장업데이트/계정연결/ESM실입력등록은별도범위 |

## 근거와 갱신

각 행의 원본 경로·줄, 보고근거·SHA·작업별 증거는 inventory JSON과 `.ai/master-status.json`에 있다. 전체 프로그램의 직접 운영 접속/실행·DB/유료 AI 재검증을 수행한 보고가 아니다. 담당 미응답·문서 충돌·실물 미검수는 그대로 남긴다.

```text
node .ai/build-master-report.mjs
```

먼저 Master가 실제 보고·검토 결과를 `.ai/master-status.json`에 반영하고 이 명령으로 표를 내보낸다. 날짜만 새로 만들고 검증한 것으로 표시하지 않는다.
