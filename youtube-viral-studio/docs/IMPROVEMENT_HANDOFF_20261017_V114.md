# v1.14 개선 인수인계 — 즐겨찾기·30일 보관

2026-10-17 Codex(Windows). 주인님 「진행해줘」와 「즐겨찾기 전용 DB와 30일 자동 정리를 적용 진행해」 승인. 서비스 https://youtube-viral-studio.buylife.xyz

## 구현·운영 DB 적용

- 전용 public.yvs_favorites, user_id+유형+ID 기본키, owner-only RLS. 회원 API는 로그인+프로그램 자격 확인 후 서버에서 본인 user_id를 강제합니다. 저장/해제·오류·재조회·새로고침 후 유지·보관기한 표시를 연결했습니다. 동일 자료 재저장은 생성일을 갱신하지 않습니다. 키/회원 권한/기존 테이블은 변경하지 않았습니다.
- 건별 생성일30일 경계부터 DB RLS/API/화면에서 제외. 분당 pg_cron yvs-favorites-retention-30d로 전용 테이블의 만료 자료만 물리 삭제(최대1분 정리 지연). SQL 실제 버전20261017025253 적용. 회원의 생성일 갱신/타회원 읽기·쓰기/전역 정리 실행 금지 실검사를 롤백으로 통과했습니다. cron 실제 성공 실행 확인.
- 과거 전역 localStorage는 표시·이전·임의 귀속·자동삭제하지 않습니다. 신규 자료는 DB에만 저장합니다. 기존 브라우저 원본 제거는 이번 승인 범위에 포함하지 않습니다.
- 쇼츠·황금채널·실시간·원본찾기 자동 외부 호출 제거. 실시간 탭만 바꿔도 검색하지 않으며 이전 종류의 결과는 지웁니다. 버튼으로 실행하고 본인 YouTube 할당량/AI 비용을 안내합니다.
- 채널 지수 누락은85점 대신 「계산값 없음」. VPH는 업로드 후 평균이며 실시간1시간 증가량·추천 유입을 확정하는 수치가 아님을 화면/가이드에 명시. 한국16/17시 초기화·30일 보관 안내 통일.
- CSV 셀 따옴표/수식 실행 방지 및 BlobURL 해제. ESLint9 설정 신설·기존 const 오류2개 수정. lint 오류0, 기존 형식/사용하지 않는 항목 등 경고74는 별도 후속.
- 선택 영상의 Playlist 참고 메모 복사(본인 회원ID·제목·URL·발급일)와 공식 프로그램 링크를 추가했습니다. 상대 프로그램 수신 칸은 본 프로그램 완료 후 별도 작업으로 마무리합니다. 실제 미디어 다운로드·AI·자동게시 없음.

## 검수·제한

- Next16.4.2 전체 빌드/TypeScript 통과. 단위/API 경계8검사: 비로그인/권한거부·소유자 강제·중복 생성일·만료/삭제·입력/Origin 검증·오류·CSV. SQL 실제 RLS9항목(검사 자료 전부 롤백). 합성 카드7검사.
- 실제 일반 회원 Edge1440/375: 8화면9검사, 자동검색0. 별도 실제 보관 기능10검사: 4화면/URL쿼리/탭전환 API0, 저장 실패 안내, 저장/해제/새로고침/기한, 채널 지수, 중복 생성일 유지, 메모 복사. 외부 검색 응답·썸네일만 합성; 저장은 승인한 전용 DB에 시험 계정의 합성2항목만 쓰고 해제했습니다. 유료/외부AI0, 기존 자료 자동이전0.
- 발견·수정: Next가 로컬 request.url을 localhost로 정규화해 같은 브라우저127.0.0.1 Origin이403이 되는 경우. 비교 대상을 실제 요청 Host로 바꾸고 외부 Origin 차단을 유지, 회귀 검사 추가.
- 조회는 최근1000건까지. 필요하면 다음에 페이지 나눔을 추가합니다. 개발 의존성 braces 경로 high5(직전 운영 의존성0) 추적. lint 경고 정리는 별도 기능 변경 없이 진행 가능.

## 운영 배포

완료. 소스 68b2b0109cd5533441d5f7cfaf84b894a19fcab6 (기능 db209560 포함), origin/master 푸시. 프로덕션 dpl_6E59ACNhP719UAtzc2UA8Tktw8Rx READY/소스 일치, https://youtube-viral-studio-mg5s0mj0r-buylife.vercel.app. DB programs.version v1.14 별도 조회 확인. 운영 Edge 화면9·실제 보관기능10·비로그인API11개401 통과, 오류로그0(조회 구간). DESIGN28 v1.14 완료, 본인 ACTIVE_WORK 줄 제거. 결과 문서 최종 커밋은 후속 git log 및 최종 보고 참고.

## 다음 CLI

먼저 이 문서·AGENTS/README·IMPROVEMENTS를 읽습니다. 소유자 불명 전역 자료를 복구/자동이전하지 않습니다. 새 테이블 외 삭제 대상 추가 금지. API키·계정·권한은30일 정리 대상이 아닙니다. 메인 Git 자동배포 뒤 설치파일 보호는 기존 scripts/finalize-supabase-compat-main.cjs 지침을 따릅니다.

검수 명령(프로그램 폴더): npm run build:verify / node --test tests/favorites.test.mjs / npm run lint / npm run test:runtime / node tests/runtime-favorites.mjs / npm run test:fixtures / node tests/security-http.mjs. 로컬서버 node tests/local.mjs start, 운영은 YVS_TEST_BASE를 공식 도메인으로 지정. 자료·키는 로그로 출력하지 않습니다. 증거 docs/evidence/v114/.

## 최신 한도 안내 추가 보완

2026-10-17 [공식 문서](https://developers.google.com/youtube/data/determine_quota_cost)(2026-10-15 갱신)를 확인해 search.list 하루100회 별도 한도와 기타 API10,000units를 대시보드/설정/가이드/오류 안내에 맞췄습니다. 수천 회 가능·새 키를 만들면 한도 회복 등의 문구를 제거했습니다. 실제 한도는 본인 Cloud 프로젝트 콘솔 기준입니다.

### 후속 작업 분리

본 프로그램 v1.14 완료 뒤 yt-playlist-studio 수신 칸을 별도 작업으로 구현·검수·배포합니다. 현재 소스 측 참고 메모 복사까지 구현/검수됐으며 수신 완료 여부는 상대 프로그램의 최신 인수인계를 확인합니다. 메모는 동일 회원 확인·5분 기한·명시적 붙여넣기만 허용하고 미디어 다운로드/AI 호출/자동게시를 하지 않습니다.

## 2026-10-17 종료 추가 기록 — 수신 연계도 완료

yt-playlist-studio v1.08 소스ea42c5b8·결과a504b96d 푸시, dpl_HLTavGo2Qn2nqX7A5rDqUuWt8qJy READY/DBv1.08. 운영 Viral Finder→Playlist 실제 일반 회원 Edge 복사/붙여넣기·타회원ID 거부·5분·375px 포함10검사 통과. 위 수신 칸 대기는 해소됐습니다. [상대 최신 결과](../../yt-playlist-studio/docs/IMPROVEMENT_HANDOFF_20261017_V108_REFERENCE.md). 남은 개발 경고/페이지 나눔/추가연계와 미검수는 [개선 대기 목록](IMPROVEMENT_BACKLOG.md) 및 [이번 전체 종료 인수인계](../../docs/HANDOFF_20261017_CODEX_YOUTUBE_FINAL.md)에서 확인합니다. 현재 기능 범위 추가 작업 없음.
