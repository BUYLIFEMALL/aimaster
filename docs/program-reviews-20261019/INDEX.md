# AIMaster 프로그램별 상세 개선 분석 · 2026-10-19

**83개 프로그램 · 265개 세부 항목 · 14개 카테고리**. 각 항목은 필요 이유·현재 코드 조건·제안 범위·확인 시험을 갖습니다.

- [검색 보고서](REPORT.html) · [엑셀 표](AIMaster_프로그램별_상세개선_20261019.xlsx) · [공통 아이디어 원장](../PROGRAM_IDEA_BACKLOG.md) · [인수인계](../PROGRAM_DETAILED_REVIEW_HANDOFF_20261019.md) · [분석 중 최신 변경 재대조](LATEST_RECHECK.md)
- 기준 소스 `b3eab74b1e092d5eab4840bf30fdcbc084f6e0f1`. 카탈로그 분류/주소는 앞선 분석 스냅샷을 재사용했습니다. 운영 DB 버전이나 배포 상태를 다시 인증한 표가 아닙니다.
- 83개 카탈로그 프로그램의 문서와 선택 핵심 소스 경로에 대한 정적 분석. 전체 소스 전수 정독·83개 운영 기능 검증·보안 인증이 아님. 코드 조건 확인과 실제 장애 재현을 구분합니다. 운영 DB·회원 데이터·환경변수 변경·유료 호출·게시/발송은 **0회**입니다.
- 우선순위: **P0** 접근/통신 경계 우선 검토, **P1** 자료 격리·손실·중복 실행·비용 위험, **P2** 검증/이해/편의, **P3** 이후 적용할 기능 확장 후보. 우선순위는 실제 사고 발생 판정이나 작업 승인과 다릅니다.
- 세 관점은 개발·유지보수 / 디자인·사용성 / 신규 자동화입니다. 신규 자동화에는 기존 기능을 활용하는 작은 개선도 포함하며 세상에 없던 신규성을 주장하지 않습니다.
- 채택 기준 세 가지는 **안정적으로 동작하는가 / 현재 프로그램에 적용 가능한가 / 사용자가 편리한가**입니다. 근거 없는 점수 대신 항목별 검증 조건을 제시했습니다.
- 이미 해결된 기능은 보존하고 이전 문서와 충돌하면 최신 코드·완료 증거를 우선 대조합니다. 본인 계정/API·개인 자료 격리·생성물 최초 생성 +30일은 공통 경계입니다. 사용자 설정/키/권한/원본 파일은 생성 자료와 분류를 구분합니다.
- 당분간 기존 프로그램 안정화가 우선입니다. 검증된 기능만 기준 모듈 후보로 남기고 신규/리뉴얼에 한 개씩 적용합니다. 일괄 모듈화·앱 간 런타임 호출은 하지 않습니다.

## 프로그램별 찾아보기

| 번호 | 카테고리 | 프로그램별 분석 | 항목 | 첫 검토 우선 | 첫 검토 주제 | 왜 필요한가 | 링크 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 데이터수집&#124;기획 | [AI 글쓰기 에디터 자동화](programs/ai-writing-editor.md) | 4 | P1 | 자동 저장에 수정 충돌 감지와 복구 원고 추가 | 두 탭이나 느린 자동 저장 응답이 역순으로 도착하면 뒤늦은 옛 원고가 새 원고를 덮을 수 있다. Ctrl+Z만으로 새로고침 이후를 복구할 수 없다. | [프로그램](https://ai-writing-editor.buylife.xyz) |
| 2 | 데이터수집&#124;기획 | [시네마틱 스토리보드 자동화](programs/cinematic-storyboard-studio.md) | 4 | P1 | 동시 렌더와 결과 덮어쓰기 분리 | 두 번 요청하면 두 유료 생성이 진행되고 늦게 끝난 옛 결과가 새 구도/모델 선택을 덮을 수 있다. 이미지 저장 성공 후 DB 실패도 별도 정합성 문제다. | [프로그램](https://cinematic-storyboard-studio.buylife.xyz) |
| 3 | 데이터수집&#124;기획 | [AI 랜딩페이지 기획 자동화](programs/landing-architect.md) | 4 | P1 | 생성 HTML의 미리보기와 배포 가능한 산출물 구분 | 회원이 받은 기획/텍스트에 외부 스크립트나 폼이 섞이면 미리보기에서 예기치 않은 요청이 나갈 수 있다. 프로토타입이 실제 결제/문의 기능처럼 보일 수도 있다. | [프로그램](https://landing-architect.buylife.xyz) |
| 4 | 데이터수집&#124;기획 | [마크다운 문서 자동화](programs/markdown-studio.md) | 4 | P1 | 로컬 문서 보관 정책과 기존 무삭제 설계의 차이 정리 | 로컬에만 저장된 본문도 회원 생성물이다. 오래된 문서를 계속 조회하거나 백업/복원으로 만료일을 갱신하면 플랫폼 정책과 어긋난다. | [프로그램](https://markdown-studio.buylife.xyz) |
| 5 | 데이터수집&#124;기획 | [페르소나 문체 자동화](programs/persona-style-studio.md) | 3 | P2 | 문체 변환에서 사실·수치·고유 명사 보존 검사 | 전문성·창의성·길이를 동시에 바꾸면 어투뿐 아니라 사실까지 바뀔 수 있다. 글자 수 변화만으로 의미 보존을 판단할 수 없다. | [프로그램](https://persona-style-studio.buylife.xyz) |
| 6 | 데이터수집&#124;기획 | [UI Canvas 자동화](programs/ui-canvas.md) | 3 | P1 | AI 화면 가져오기의 구조 손실·정규화 결과 설명 | 일부 요소만 누락되거나 좌표/계층이 바뀐 경우 성공처럼 보여 실제 디자인과 다른 결과를 믿을 수 있다. | [프로그램](https://ui-canvas.buylife.xyz) |
| 7 | 데이터수집&#124;기획 | [Website Scraper](programs/website-scraper.md) | 4 | P1 | 최근 수집 결과의 회원별 저장·만료 | 같은 브라우저에서 회원을 바꾸면 이전 수집 결과가 재노출될 수 있고 30일 뒤에도 남는다. 안전한 서버 수집과 로컬 결과 격리는 별개다. | [프로그램](https://website-scraper.buylife.xyz) |
| 8 | 데이터수집&#124;기획 | [웹 크롤링 자동화](programs/web-crawler-saas.md) | 4 | P1 | 도메인 수집 계획 캐시를 회원별로 격리 | 회원 키로 만든 사이트 정찰 결과 역시 개인 생성 물이다. 한 회원의 0건 재수집이 다른 회원 캐시를 무효화하는 간섭도 가능하다. | [프로그램](https://web-crawler-saas.buylife.xyz) |
| 9 | 데이터수집&#124;기획 | [AI Prompt 자동화](programs/ai-prompt-studio.md) | 3 | P1 | 프롬프트 입력을 타입·크기·오류 코드로 검증 | 숫자 goal이나 잘못된 선택 값이 사용자 입력 오류 대신 서버 오류가 되고 과도한 입력을 모델까지 전달할 수 있다. 원본 오류의 비밀 포함 여부도 확인해야한다. | [프로그램](https://ai-prompt.buylife.xyz) |
| 10 | 데이터수집&#124;기획 | [AI 프롬프트 템플릿 자동화](programs/prompt-template-studio.md) | 3 | P1 | 빈 AI 응답을 성공으로 처리하지 않기 | 차단/빈 응답을 정상 생성 물로 저장하거나 다음 자동화에 전달하면 실제 실패가 가려지고 잘못된 후속 작업이 실행된다. | [프로그램](https://prompt-template.buylife.xyz) |
| 11 | 데이터수집&#124;기획 | [AI 슬라이드 자동화](programs/ai-slide-builder.md) | 3 | P1 | 장표 재생성의 입력·출력 스키마 검증 | 잘못된 장표 타입·수치/배열 형태가 들어가면 미리 보기는 보이더라도 PPTX 생성에서 실패하거나 사용자 편 집을 덮을 수 있다. | [프로그램](https://ai-slide-builder.buylife.xyz) |
| 12 | 데이터수집&#124;기획 | [AI 웹 UI 제작 자동화](programs/ai-web-ui.md) | 3 | P1 | 생성 TSX를 실행 가능한 코드로 검증하는 경계 | 문자열이 나왔다고 컴 파일/의존성/접근성이 충족된 것은 아니다. 임의 코드를 앱 권한으로 실행하면 외부 요청이나 비밀 접근 위험이 커진다. | [프로그램](https://ai-web-ui.buylife.xyz) |
| 13 | 쓰레드 | [Threads AI 기획 자동화](programs/threads-easy-planner.md) | 3 | P1 | 로컬 백업의 회원 격리·저장 성공 확인 | 회원 전환 때 다른 회원 원고가 섞일 수 있고, 저장 공간 부족 때 저장됐다고 믿고 창을 닫으면 글을 잃을 수 있다. | [프로그램](https://threads-easy-planner.buylife.xyz) |
| 14 | 쓰레드 | [Threads 포스팅 자동화](programs/auto-threads-posting.md) | 3 | P1 | 예약 실행 시 회원 자격과 결과 불확실성 재확인 | 예약 후 정지/기간 만료·게시 성공 뒤 기록 실패를 구분하지 않으면 이용 기간 외 게시나 중복재시도 위험이 있다. | [프로그램](https://auto-threads-posting.buylife.xyz) |
| 15 | 쓰레드 | [Threads 댓글자동화](programs/threads-comment-reply.md) | 3 | P1 | 웹·텔레 그램 동시 승인 선점과 게시 기록 오류 처리 | 웹과 텔레 그램이 동시에 승인하면 둘다미게시로 읽고 답 글을 두 번 달 수 있다. 실제 게시는 성공했는데 DB 기록 실패가 가려지면 재승인 위험도 생긴다. | [프로그램](https://threads-comment-reply.buylife.xyz) |
| 16 | 쓰레드 | [Threads 쇼핑제휴 자동화](programs/threads-affiliate-poster.md) | 3 | P1 | 검색/트렌드 캐시의 소유자와 만료 기준 정비 | 회원 키로 얻은 결과가 다른 회원에게 전달되며 TTL이 지나도 원본 행의 물리 정리를 보장하지 않는다. 본인 키 조회와 결과 격리는 각각 필요하다. | [프로그램](https://threads-affiliate-poster.buylife.xyz) |
| 17 | 쓰레드 | [Threads 콘텐츠 운영 자동화](programs/threads-content-ops.md) | 3 | P1 | 게시 성공·기록 실패를 재게시 가능한 실패와 분리 | 일반 실패와 실제 게시 후기 록 실패가 같은 상태면 사용자가 다시 예약해 중복 게시할 수 있다. 기존 선점만으로 외부 효과와 DB 원자성이 해결되지는 않는다. | [프로그램](https://threads-content-ops.buylife.xyz) |
| 18 | 인스타 | [INSTA 포스팅 자동화](programs/auto-instagram-posting.md) | 4 | P1 | 예약 설정과 실제 운영 호출의 증거 대조 | 옛 문서를 따라 Cron을 중복 등록하면 중복 실행 위험과 비용이 생긴다. 반대로 설정 파일만 믿으면 미배포/실패를 놓친다. | [프로그램](https://auto-instagram-posting.buylife.xyz) |
| 19 | 인스타 | [AI 인플루언서 자동화](programs/ai-influencer-studio.md) | 3 | P1 | 생성 설정의 서버 검증과 참조 자산 범위 | 타입 표기는 런 타임 검사가 아니라 잘못된 배열/참조 이미지/과도한 설정이 비싼 호출까지 갈 수 있다. 시간 한도 수정을 다시 하는 것보다 입력 범위를 검증해야한다. | [프로그램](https://ai-influencer.buylife.xyz) |
| 20 | 인스타 | [INSTA 댓글자동화](programs/instagram-comment-reply.md) | 3 | P1 | 승인 중복 선점과 외부 게시 후 DB 실패 대응 | 두 승인 경로가 같이 실행되면 같은 댓글에 답 글이 중복될 수 있고, 저장 실패가 숨겨지면 다음 검토에서 재게시된다. | [프로그램](https://instagram-comment-reply.buylife.xyz) |
| 21 | 인스타 | [INSTA DM답변 자동화](programs/instagram-dm-reply.md) | 4 | P1 | 실제 수신 시각으로 답장 가능 기한 판단 | 오래된/지연웹훅을 뒤늦게 처리하면 실제보다 응답 가능 기한이 길게 보일 수 있다. 재전송/순서 역전도 마지막 대화 시각을 왜곡할 수 있다. | [프로그램](https://instagram-dm-reply.buylife.xyz) |
| 22 | 인스타 | [AI 웹툰 자동화](programs/ai-webtoon-studio.md) | 4 | P1 | 실패 후 다른 외부 엔진 전송을 명시 선택으로 | 오류 안내가 있어도 회원이 선택한 제공 사 밖으로 캐릭터/작품 정보가 전송되는 행동은 별개다. 키 없을 때 공용 외부 처리로 대신하는 것도 본인 키 원칙과 맞지 않는다. | [프로그램](https://ai-webtoon-automation.buylife.xyz) |
| 23 | 인스타 | [INSTA Cardnews 자동화](programs/cardnews-studio.md) | 3 | P1 | 기획/문구 변경과 이미지·렌더 결과의 버전 연결 | 한 카드 본문을 고친 뒤 옛 배경/캡션/렌더가 남으면 사용자가 어떤 결과가 최종인지 혼동하고 전체 생성을 반복할 수 있다. | [프로그램](https://cardnews-studio.buylife.xyz) |
| 24 | 블로그 | [BLOG(원문)생성 자동화](programs/ai-auto-blog.md) | 3 | P1 | 생성 성공·저장 실패 때 원고 회수와 단계별 재개 | 회원 키로 생성 비용을 썼는데 저장 실패 뒤 전체 재시도하면 성공했던 본문/이미지를 다시 만들 수 있다.300초 한 도 안에 여러 작업이 겹치는 것도 별도 고려해야한다. | [프로그램](https://ai-auto-blog.buylife.xyz) |
| 25 | 블로그 | [AI 블로그 키워드 자동화](programs/blog-keyword.md) | 3 | P1 | 실측 값·AI 추정 점수·조회 실패를 분리 | 검색 실패/키 없음을 0으로 표시하거나 AI 점수를 실제 노출성과처럼 해석하면 잘못된 키워드를 선택한다. | [프로그램](https://blog-keyword.buylife.xyz) |
| 26 | 블로그 | [티스토리(원문)생성 자동화](programs/tistory-auto-blog.md) | 3 | P1 | 확장 임대 만료·늦은 보고 회귀와 호환 관리 | 이 보호가 약해지면 PC 꺼짐 뒤늦은 보고가 새 원고 상태를 덮고 중복 입력이 생긴다. 새 모듈화 때 가장 쉽게 잃는 안전 조건이다. | [프로그램](https://tistory-auto-blog.buylife.xyz) |
| 27 | 블로그 | [네이버 블로그 에이전트](programs/naver-blog-agent.md) | 3 | P1 | 이미구현된 저장·실행 복구 규약을 회귀 기준으로 | 일반적인 재시도 코드로 바꾸면 실제 네이버에 입력/게시된 작업을 다시 보내거나 옛 설정이 최신 원고를 덮을 수 있다. | [프로그램](https://naver-blog-agent.buylife.xyz) |
| 28 | 블로그 | [네이버 블로그 올인원 자동화](programs/naver-blog-allinone.md) | 3 | P1 | 이미지 슬롯을 문구 대신 고정 ID로 연결 | 두 이미지 설명이 같으면 한 이미지 결과가 여러 슬롯에 들어갈 수 있고 생성 중 원고를 바꾸면 옛 결과가 다른 위치에 반영될 수 있다. | [프로그램](https://naver-blog-allinone.buylife.xyz) |
| 29 | 블로그 | [AI 블로그 작업실 자동화](programs/blog-workroom.md) | 3 | P1 | 이미지 요청 허용 크기를 실제 배포 한도와 정합화 | 애플리케이션이 허용하는 범위가 배포 플랫폼 요청 한도보다 크면 앱 오류 처리 전 요청이 거절돼 사용자가 원인을 모른다. 메모리 상한 도별도 문제다. | [프로그램](https://blog-workroom.buylife.xyz) |
| 30 | 블로그 | [AI 블로그 콘텐츠 제작 자동화](programs/blog-content-maker.md) | 3 | P1 | 이미 있는 작업 선점·원고 revision·만료의 실패 회귀 강화 | 이를 다시 추가하는 대신 작업 중 서버 중단/고아 파일/DB 실패에서 실제로 회수되는지 검증해야한다. 조회 시 cleanup만으로 미접속 자료의 물리 정리가 증명되지는 않는다. | [프로그램](https://blog-content-maker.buylife.xyz) |
| 31 | 네이버 | [네이버 카페 포스팅 자동화](programs/naver-cafe-poster.md) | 3 | P1 | Cron 비밀 미설정 차단과 예약 실행 자격 | CRON_SECRET 미설정 시 Bearer undefined와 일치할 수 있는 조건부 결함이며, 전화번호 등록만으로 현재 프로그램 자격을 대신할 수 없다. 현재 운영 값이 비어 있다고 단정하지 않는다. | [프로그램](https://naver-cafe-poster.buylife.xyz) |
| 32 | 네이버 | [네이버 블로그 자동화(App)](programs/naver-blog-auto-poster.md) | 3 | P1 | 설치형 생성 작업의 요청 ID·본문/이미지 부분 성공 보존 | 앱 연결이 끊겼을 때 같은 주제를 다시 보내면 본문 생성을 중복할 수 있다. 이미지 실패 시 본문을 버리면 기존 부분 성공 보호가 사라진다. | [프로그램](https://naver-blog-auto-poster.buylife.xyz) |
| 33 | 네이버 | [네이버 블로그 자동화(Web)](programs/naver-blog-auto-poster-web.md) | 3 | P1 | 확장 개인 토큰과 서버 규격의 호환 회귀 | 함수 공통화 때 slug/토큰 대상을 혼동하면 다른 프로그램 권한으로 실행하거나 옛 확장이 깨질 수 있다. | [프로그램](https://naver-blog-auto-poster-web.buylife.xyz) |
| 34 | 네이버 | [네이버 블로그 SEO 스튜디오](programs/naver-blog-seo-studio.md) | 3 | P1 | 최적화 입력 타입·응답 스키마·시간 제한 보강 | 숫자 body는 예외가 날 수 있고 형식상 존재하는 객체/배열이 본문으로 통과할 수 있다. 중단/시간 초과가 불명확하면 회원이 중복 요청하기 쉽다. | [프로그램](https://naver-blog-seo-studio.buylife.xyz) |
| 35 | 유튜브 | [플레이리스트 채널 제작 자동화](programs/playlist-channel-studio.md) | 3 | P1 | 다 곡 생성의 동시 호출 수·부분 저장·재시도 구분 | 묶음 크기 4 가동 시 요청 4개라는 뜻은 아니다. 곡 수가 늘면 요청/토큰/시간이 함께 늘고 부분 실패 시 성공한 가사가 유실될 수 있다. | [프로그램](https://playlist-maker.buylife.xyz) |
| 36 | 유튜브 | [AI 썸네일 마스터 자동화](programs/thumbnail-master.md) | 3 | P1 | A/B 이미지 버전 갱신 충돌 방지 | 같은 옵션 동시 생성이면 각 실행이 옛 버전 배열에서 출발해 한 쪽 새 버전 기록이 사라지거나 참조 파일 정리가 엇갈릴 수 있다. | [프로그램](https://thumbnail-master.buylife.xyz) |
| 37 | 유튜브 | [YOUTUBE CHANNEL CONSULTANT](programs/youtube-channel-consultant.md) | 3 | P1 | 조회 범위와 API 할당 량을 분석 결과에 남기기 | 표본 50개 분석과 채널 전체 분석은 다르다. 반복 조회는 회원 프로젝트 한도를 소모하고 결과의 조회 시점이 달라 비교가 왜곡된다. | [프로그램](https://youtube-channel-consultant.buylife.xyz) |
| 38 | 유튜브 | [YOUTUBE VIRAL FINDER](programs/youtube-viral-studio.md) | 3 | P1 | 원본 추적의 후보·부분 검색 실패를 구분 | 검색어/메타 데이터 유사성은 영상의 원저작자/사용권 확정이 아니다. 쿼터 부족 이 후보 없음처럼 보이면 잘못된 결론을 낸다. | [프로그램](https://youtube-viral-studio.buylife.xyz) |
| 39 | 유튜브 | [쇼츠 떡상 분석·대본 자동화](programs/shorts-viral-studio.md) | 3 | P1 | 목록 외 직접 조회·갱신의 30일 만료와 재생성 우회 차단 | 목록을 안 열면 만료 데이터를 직접 불러올 수 있고 없는 옛 ID 갱신이 새 행으로 저장되면 보관 시계가 리셋될 수 있다. | [프로그램](https://shorts-viral-studio.buylife.xyz) |
| 40 | 유튜브 | [YOUTUBE Shots(이미지 스토리) 자동화](programs/auto-shorts-posting.md) | 3 | P1 | 외부 렌더 작업 ID 저장·중복 실행 보호 | 렌더 생성은 성공했는데 DB 기록이 실패하면 회원은 실패/대기로 보고 다시 유료 렌더링을 요청할 수 있다. | [프로그램](https://shots.buylife.xyz) |
| 41 | 유튜브 | [유튜브 댓글자동화](programs/youtube-auto-reply.md) | 4 | P1 | 답 글 승인 선점·게시 기록 확정 | 동시 웹/텔레 그램 승인과 게시 성공 후 DB 실패는 같은 답 글이 재게시되는 원인이 될 수 있다. | [프로그램](https://youtube-auto-reply.buylife.xyz) |
| 42 | 유튜브 | [AI 유튜브 썸네일 프로](programs/seo-thumbnail-pro.md) | 3 | P1 | 글 전략 생성의 구형 모델 순회·키 URL·시간 제한 점검 | 구형 모델 실패를 여러 번 거치거나 키/권한 오류에도 다른 모델을 시도하면 느리고 비용 원인이 불명확해진다.URL 키는오류로그/진단 노출 위험이 커진다. | [프로그램](https://seo-thumbnail-pro.buylife.xyz) |
| 43 | 유튜브 | [AI 쇼츠 원스톱 제작 자동화](programs/shorts-onestop-studio.md) | 3 | P1 | 브라우저 일괄 제작의 장면별 체크 포인트·복구 | 중간에 실패/새로 고침되면 이 호출 동안 성공한 유료 음성을 상위 저장까지 회수하는지 확인해야한다. 완성된 단계 전체를 다시 만들면 비용이 늘어난다. | [프로그램](https://shorts-onestop-studio.buylife.xyz) |
| 44 | CRM | [구글폼 CRM 자동화](programs/crm-google-form.md) | 4 | P1 | 접수 ID 멱 등 성과 채널별 발송 결과 선점 | AppsScript/네트워크 재전송 이 같은 신청을 여러 번 접수하고 유료 메시지를 중복 보낼 수 있다. 사후 중복 표시만으로 비용을 막을 수 없다. | [프로그램](https://crm-google-form.buylife.xyz) |
| 45 | CRM | [카카오톡 뉴스레터 자동화](programs/kakao-auto-posting.md) | 3 | P1 | 다중 채널 발송의 선점·동의·부분 성공 보존 | 제외플래그가 현재 마케팅 동의/채널 수신 가능성과 동일하지 않고 중간 실패 뒤 전체 재시도는 성공 채널까지 보낼 수 있다. | [프로그램](https://kakao-auto-posting.buylife.xyz) |
| 46 | 이커머스 | [상품소싱 자동화](programs/trending-product-finder.md) | 3 | P1 | 대량 마진 비교의 대표 가격·입력 타입·계산 가정 검증 | 잘못된 형식은 서버 예외가 되고 서로 다른 옵션/배송비/최소 수량의 최저가를 그대로 비교하면 마진을 과대평가할 수 있다. | [프로그램](https://trending-product-finder.buylife.xyz) |
| 47 | 이커머스 | [상세페이지 GIF 자동화](programs/video-to-gif.md) | 3 | P1 | FFmpeg 초기화 실패·변환 실패 뒤 재시도 복구 | 첫 CDN로 딩 실패가 계속 재사용되거나 변환 실패 뒤 파일/리스너가 남으면 다음 파일까지 실패하고 브라우저 메모리가 증가할 수 있다. | [프로그램](https://video-to-gif.buylife.xyz/dashboard) |
| 48 | 이커머스 | [상세페이지 자동화(15p)](programs/shop-detail-page.md) | 3 | P1 | 섹션 이미지 동시 버전 갱신·고아 파일 복구 | 같은 섹션 동시 생성은 한쪽 이력을 덮을 수 있고 업로드 성공/DB 실패는과 금된 결과를 잃거나 고아 파일을 남긴다. | [프로그램](https://shop-detail-page.buylife.xyz) |
| 49 | 이커머스 | [상세페이지 자동생성기 v1](programs/auto-detail-page.md) | 3 | P1 | 입력 이미지·HTML 응답·미리 보기 격리 검증 | 비배열/과대 이미지/잘린 응답이 오류나 불완전 페이지를 만들 수 있다. 생성 HTML은 신뢰하지 않는 코드라 실행 격리도 별도 검증해야한다. | [프로그램](https://auto-detail-page.buylife.xyz) |
| 50 | 이커머스 | [AI 12단 상세페이지 자동화](programs/detail-page-12p.md) | 3 | P1 | 스펙 자동 검색이라는 표현과 실제 생성 동작 정합화 | 실제 스펙을 검색해 확인한 것처럼 보이지만 모델이 추측한 규격/인증/긴급 할인을 상품 사실로 사용할 수 있다. | [프로그램](https://detail-12p.buylife.xyz) |
| 51 | 마케팅(홍보) | [대량 메일발송 자동화(Step Mail)](programs/stepmail.md) | 4 | P1 | 수동 실행과 예약 발송의 중복·결과 불명 방지 | 예약 실행과 수동 실행이 겹치면 같은 리드를 함께 고를 수 있다. 발송은 됐지만 기록에 실패한 경우 재실행으로 같은 메일을 보낼 수 있다. | [프로그램](https://stepmail.buylife.xyz) |
| 52 | 마케팅(홍보) | [경쟁사 키워드분석 자동화](programs/competitor-analysis.md) | 4 | P1 | 개인 조사·30일 보관 수정안의 운영 전환 검증 | 코드만 보고 운영에서도 회원 자료가 격리됐다고 판단하면 안 된다. 반대로 준비된 수정안을 다시 만드는 것도 중복 작업이다. | [프로그램](https://competitor-analysis.buylife.xyz) |
| 53 | 마케팅(홍보) | [롱테일 키워드분석 자동화](programs/longtail-keyword-expander.md) | 4 | P1 | 실행별 결과 보존과 실패 단계 재개 | 실행 중 일부 저장만 성공하거나 재실행으로 연관 점수가 바뀌면 과거 실행의 개수·요약과 현재 표가 달라질 수 있다. | [프로그램](https://longtail-keyword-expander.buylife.xyz) |
| 54 | 마케팅(홍보) | [예약(취소)방지 리마인드 자동화](programs/booking-reminder.md) | 5 | P1 | 채널별 발송 선점·부분 실패 재시도 | 동시 실행은 중복 발송할 수 있고 한 채널 실패는 나머지 성공 채널까지 섞인다. 실패 기록이 있으면 재시도도 막힐 수 있다. | [프로그램](https://booking-reminder.buylife.xyz) |
| 55 | 이미지 | [AI 이미지 스튜디오](programs/ai-image-studio.md) | 3 | P1 | 여러 장 생성의 부분 성공·보관 실패 복구 | 앞의 그림이 생성됐어도 뒤 호출 실패가 전체 오류가 되면 사용자가 받은 결과와 비용을 놓친다. 외부 임시 URL은 나중에 만료될 수 있다. | [프로그램](https://ai-image-studio.buylife.xyz) |
| 56 | 이미지 | [AI 바나나 캔버스 자동화](programs/banana-canvas.md) | 3 | P1 | 부분 생성과 최종 기록 저장 실패의 회복 | 이미 비용이 든 그림이 DB 한 번의 실패로 사라지면 같은 생성을 다시 해야 한다. 무조건 보관만 늘리는 방식도 30일 원칙에 맞지 않는다. | [프로그램](https://banana-canvas.buylife.xyz) |
| 57 | 이미지 | [AI 패션스타일 자동화](programs/fashion-style.md) | 3 | P1 | 개인 옷장·완성 룩의 보관 기한 | 개수 제한은 30일 보관을 대신하지 못한다. 옷 정보를 고쳤다는 이유로 원본 사진의 보관 기한이 연장돼서도 안 된다. | [프로그램](https://fashion-style.buylife.xyz) |
| 58 | 이미지 | [AI 4컷 만화 자동화](programs/four-cut-comics.md) | 3 | P1 | 내 작품 보관함의 날짜 만료와 재사용 차단 | 보관 개수와 날짜 보관은 다른 규칙이다. 이어서 만들기·개별 열기·저장 파일도 같은 만료 기준을 따라야 한다. | [프로그램](https://four-cut-comics.buylife.xyz) |
| 59 | 이미지 | [이미지 변환 스튜디오](programs/image-convert-studio.md) | 3 | P2 | 일괄 변환의 메모리 상한과 취소 회복 | 큰 사진 여러 장과 ZIP을 동시에 들고 있으면 개별 픽셀 제한을 지켜도 메모리가 부족할 수 있다. | [프로그램](https://image-convert-studio.buylife.xyz) |
| 60 | 이미지 | [AI 인물사진 자동화](programs/portrait-photo.md) | 3 | P2 | 규격 계산·얼굴 추정·최종 파일의 검증 분리 | 얼굴 감지가 성공해도 공식 제출 규격 전체를 만족한 것은 아니다. 규격 출처가 바뀌면 예전 프리셋이 남을 수 있다. | [프로그램](https://portrait-photo.buylife.xyz) |
| 61 | 이미지 | [이미지 스타일 분석기](programs/style-dna-analyzer.md) | 3 | P1 | 보관 한도 선점·원본 파일 정리의 정합성 | 동시 요청이 한도 직전 개수를 함께 읽으면 제한을 넘길 수 있다. 30일 만료와 파일/레코드 정리를 함께 검증해야 한다. | [프로그램](https://style-dna-analyzer.buylife.xyz) |
| 62 | 이미지 | [감성 글귀 이미지](programs/emotion-writer.md) | 3 | P2 | 최종 글자 배치·폰트 로딩의 회귀 검증 | 미리보기와 저장 해상도의 측정 차이, 이모지·서명·긴 공백 때문에 저장 결과가 달라질 수 있다. | [프로그램](https://emotion-writer.buylife.xyz) |
| 63 | 이미지 | [AI 올인원 그래픽 자동화](programs/allinone-graphic.md) | 3 | P1 | 이미지 생성 입력의 런타임 형식·크기 검증 | 잘못된 자료형은 400 대신 서버 오류가 되고 과도한 참고 이미지나 옵션은 비용과 메모리 문제를 유발할 수 있다. | [프로그램](https://graphic.buylife.xyz) |
| 64 | 이미지 | [AI 포토 리메이크 자동화](programs/photo-remake-studio.md) | 3 | P1 | 로컬 복원 이력에 날짜 만료 적용 | 20개 미만이면 오래된 얼굴 사진이 계속 남을 수 있다. 회원별 저장은 이미 구현됐으므로 공유 저장소 버그로 설명하면 안 된다. | [프로그램](https://photo-remake-studio.buylife.xyz) |
| 65 | 음악 | [AI 마스터링 스튜디오](programs/ai-mastering-studio.md) | 3 | P2 | 음량·리미터의 수치 검증과 긴 파일 한도 | 크게 들리는 결과가 품질 개선과 같지는 않다. 긴 다채널 파일은 복사 버퍼가 커지고 설정 경계에서는 왜곡이 생길 수 있다. | [프로그램](https://ai-mastering-studio.buylife.xyz) |
| 66 | 음악 | [뮤직비디오 자동화](programs/music-video-studio.md) | 3 | P1 | 유료 영상 시작 후 응답 유실의 복구 | 제공자는 작업을 받았는데 응답만 끊긴 경우 처음부터 다시 시작하면 중복 요금이 생길 수 있다. | [프로그램](https://music-video-studio.buylife.xyz) |
| 67 | 음악 | [Suno 음악기획 자동화](programs/suno-music-studio.md) | 3 | P2 | 개인 JSON 백업 병합의 출처·만료·충돌 처리 | 같은 ID의 다른 수정본은 조용히 무시될 수 있고 백업을 다시 들여오며 생성 자료의 보관 기한이 늘어나서는 안 된다. | [프로그램](https://suno-music-studio.buylife.xyz) |
| 68 | 음악 | [음악(SUNO)자동화](programs/music-automation.md) | 3 | P1 | 음악 콜백의 신뢰 확인과 동시 상태 갱신 | 작업 ID를 아는 요청을 곧바로 신뢰하거나 콜백·폴링이 동시에 상태를 읽으면 위조 결과·중복 저장 가능성을 점검해야 한다. 실제 공격 발생을 확인한 것은 아니다. | [프로그램](https://music-automation.buylife.xyz) |
| 69 | 음악 | [LP 턴테이블 자동화](programs/vinyl-lp-studio.md) | 3 | P2 | 브라우저 인코딩의 실패 정리와 시간·샘플 단위 명확화 | 이름만 보고 초 단위로 재사용하면 길이를 잘못 계산할 수 있다. 인코더 실패·긴 음원은 종료와 자원 해제를 확인해야 한다. | [프로그램](https://lp-turntable.buylife.xyz) |
| 70 | 음악 | [Youtube Playlist 자동화](programs/yt-playlist-studio.md) | 3 | P1 | 내보내기 실패·취소 시 인코더와 저장 파일 회수 | 중간 예외 때 자원이 남거나 미완성 파일이 생기면 다음 렌더링까지 실패할 수 있다. 장시간 재생목록은 메모리도 커진다. | [프로그램](https://youtube-playlist.buylife.xyz) |
| 71 | 음악 | [AI Audio분석 자동화](programs/ai-audio-analyzer.md) | 3 | P1 | API 권한·업로드 크기·실제 파일 검증 | 직접 API 호출은 화면 권한 검사와 별개다. 큰 파일·잘못된 형식이 들어오면 서버 메모리와 유료 호출을 낭비할 수 있다. | [프로그램](https://audio.buylife.xyz) |
| 72 | 멀티미디어 | [무한루프 영상자동화](programs/infinite-loop-video.md) | 3 | P2 | 프레임 수 증가에 따른 분석 비용 상한 | 샘플 프레임 수가 늘면 메모리와 비교 횟수가 제곱으로 커진다. 긴 영상에서 취소가 늦거나 화면 반응이 떨어질 수 있다. | [프로그램](https://infinite-loop-video.buylife.xyz) |
| 73 | 멀티미디어 | [뮤직 플레이어 자동화](programs/music-player.md) | 3 | P2 | 로컬 원본·설정·생성 기록의 보관 분류 | 사용자가 직접 올린 원본 재생 파일과 AI 생성 이력의 보관 기준을 섞으면 원치 않는 자동 삭제나 무기한 생성 자료 보관이 생긴다. | [프로그램](https://music-player.buylife.xyz) |
| 74 | 멀티미디어 | [AI 리버스 프롬프트 자동화](programs/reverse-prompt.md) | 3 | P1 | 결과 저장 실패 복구와 보관 기한의 진입점 일치 | 화면이 오류 응답의 결과를 버리면 비용이 든 분석을 잃는다. 즐겨찾기·직접 조회·임시 파일 재분석도 각각 보관 기한을 따라야 한다. | [프로그램](https://reverse-prompt.buylife.xyz) |
| 75 | 부동산 | [부동산 실거래 투자분석 자동화](programs/real-estate-sales.md) | 3 | P1 | 동일 회원·지역 동시 조사 중복과 저장 오류 처리 | 옛 개선 원장의 공유 캐시 문제를 다시 구현하면 안 된다. 다만 동시 조회는 유료 조사를 중복 호출하고 저장 실패는 정상 성공과 섞일 수 있다. | [프로그램](https://real-estate-sales.buylife.xyz) |
| 76 | Tools | [AI 할 일·성과 관리](programs/ai-task-planner.md) | 3 | P2 | 기존 명령 중복 방지·버전 충돌 회귀 검증 | 이 장점을 다른 도구의 저장 기준으로 참고할 수 있지만 직접 재사용 전에 DB 원자성·백업 병합과 타이머 경계를 검증해야 한다. | [프로그램](https://ai-task-planner.buylife.xyz) |
| 77 | Tools | [AI 문서번역 자동화](programs/document-translator.md) | 3 | P2 | 번역·검수·역번역의 수정 버전 연결 | 번역을 사람이 고친 뒤 이전 검수/역번역을 최신 평가로 보여 주면 잘못된 번역을 통과시킬 수 있다. | [프로그램](https://document-translator.buylife.xyz) |
| 78 | Tools | [AI 엑셀·텍스트 합치기 자동화](programs/file-merge.md) | 3 | P1 | 정규화 뒤 같은 머리글의 충돌 검사 | 같은 파일의 Name/name 또는 매출/매 출이 서로 다른 열이면 정규화 뒤 한 열로 합쳐져 값이 빠질 조건이 있다. 일반적인 열 순서 차이 합치기는 이미 정상 검수됐다. | [프로그램](https://file-merge.buylife.xyz) |
| 79 | Tools | [AI 종합 성격 진단 자동화](programs/personality-suite.md) | 3 | P2 | 검사 버전과 점수 재현·민감 저장 경계 | 문항이나 계산이 바뀐 뒤 예전 결과를 새 기준으로 해석하면 기록 비교가 틀어진다. 민감 결과는 기본 미저장 원칙을 유지해야 한다. | [프로그램](https://personality-suite.buylife.xyz) |
| 80 | Tools | [성격코드(MBTI) 측정기](programs/personality-code.md) | 3 | P2 | 미응답·빈 차원·범위 밖 점수의 명시적 검증 | 호출 화면이 검증하더라도 계산 함수 자체가 불완전 자료를 정상 결과로 만들면 향후 재사용 때 문제가 된다. 현재 정상 검사에서 발생했다고 단정하지 않는다. | [프로그램](https://personality-code.buylife.xyz) |
| 81 | Tools | [캐릭코드(MBTI) 측정기](programs/mbti-character.md) | 3 | P2 | 성격 계산과 캐릭터 매칭 버전의 분리 | 문항·유형·캐릭터 목록을 바꾸면 예전 결과와 다른 캐릭터가 연결될 수 있다. 이미지 생성 실패를 검사 결과 실패와 섞지 않아야 한다. | [프로그램](https://mbti-character.buylife.xyz) |
| 82 | Tools | [AIMaster 타로점](programs/tarot-reading.md) | 3 | P2 | 카드 배열·입력 형식·해석 오류의 계약 검사 | 중복 카드는 해석 근거를 바꾸며 숫자 질문·모델은 trim 처리에서 오류가 날 수 있다. 원문 오류는 비밀 값이나 어려운 문구가 섞일 수 있다. | [프로그램](https://tarot-reading.buylife.xyz) |
| 83 | Tools | [eBook Studio](programs/ebook-studio.md) | 3 | P0 | 직접 API의 회원 자격과 URL 수집 안전 경계 | 화면 로그인만으로 직접 API 요청을 막을 수 없다. 내부 주소·리다이렉트·큰 응답은 서버 자원과 내부 통신 경계에 영향을 줄 수 있다. 실제 내부 조회 공격은 실행하지 않았다. | [프로그램](https://ebook-studio.buylife.xyz) |

## 항목 분포

| 우선순위 | 항목 수 |
| --- | --- |
| P0 | 1 |
| P1 | 83 |
| P2 | 98 |
| P3 | 83 |

| 관점 | 항목 수 |
| --- | --- |
| 개발·유지보수 | 99 |
| 디자인·사용성 | 83 |
| 신규 자동화 | 83 |

## 사용 방법

작업 전 공통 원장 → 이 목록 → 프로그램별 분석 → 최신 AGENTS/README·개선 원장·ACTIVE_WORK를 읽습니다. 같은 문제를 중복 구현하지 않고 최신 결과와 대조한 뒤 플랜을 제시합니다. 작업 후 프로그램 원장에 처리한 ID·버전·증거·미완료·다음 첫 단계를 추가하고 공통 원장에서 연결합니다. 이 분석서는 날짜가 고정된 근거 스냅샷이며 최신 완료 기록을 지우지 않습니다.
