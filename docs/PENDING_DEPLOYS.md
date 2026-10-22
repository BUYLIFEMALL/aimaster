# 미배포 대기 목록 (PENDING_DEPLOYS.md)

> 2026-10-22 신설(Claude Code 윈도우, 주인님 승인 — 추가개선 제안 「미배포 대기 항목을 한곳에」).
> 근거 지침: 루트 `CLAUDE.md` 최상단 「작은 소스 수정은 모았다가 배포한다」(2026-10-22 23:17) · [`docs/VERCEL_COST_REDUCTION_PLAN.md`](VERCEL_COST_REDUCTION_PLAN.md) 맨 위.

## 쓰는 법 (모든 CLI 공통)

1. **미배포로 커밋할 때**: 아래 표에 한 줄 추가합니다(프로그램·무엇·커밋·날짜/CLI·상세 위치). 그 프로그램 `docs/IMPROVEMENTS.md`(또는 `AGENTS.md`)의 「미배포 대기」 기록은 지침대로 그대로 남깁니다 — 이 표는 그 기록들을 **한곳에서 찾게 해 주는 색인**입니다.
2. **그 프로그램을 배포할 때**: 배포 전에 이 표에서 그 프로그램 줄을 찾아 함께 나가는지 확인하고, 배포가 끝나면 줄을 지우고 맨 아래 「내보낸 기록」에 한 줄(배포 버전·날짜)을 남깁니다. 프로그램 폴더의 대기 표시도 지웁니다.
3. **공용 기준 코드 사본의 미배포**는 이 표에 다시 적지 않습니다 — [`docs/SHARED_MODULES.md`](SHARED_MODULES.md) 「미배포 사본」 표가 그 목록입니다. 프로그램을 배포할 때는 **두 표를 모두** 확인합니다.
4. 다른 CLI가 적은 줄은 지우거나 고치지 않습니다(배포해서 내보낸 경우만 지움 — 공동작업 규칙).
5. **배포 전 빠른 확인**: `node scripts/pending-check.mjs <폴더> [<폴더> ...]`(이 표와 `docs/SHARED_MODULES.md` 「미배포 사본」에서 그 프로그램 줄을 보여 줌, 읽기만), `--all`은 프로그램별 개수.
6. **배포 도우미**: `node scripts/deploy.mjs <폴더>`(확인만) · `--go`(확인 뒤 배포, 빌드 1회) · `--version-only [--set-version]`(화면 `APP_VERSION` ↔ DB `programs.version` 비교·맞춤). `--version-only --all`(화면↔DB 버전 어긋남·건너뛴 폴더·역량 지도 버전 칸↔DB 차이 보고, DB·지도는 안 고침 — **Claude Code는 세션을 시작할 때 한 번 실행**, 2026-10-23 결정: PC 작업 스케줄러는 쓰지 않음). `--go`는 끝에 `--publish`도 자동 실행. **관리자 화면 갱신**: 이 표를 고친 뒤 `node scripts/pending-check.mjs --publish` → 운영 DB `site_settings.ops_overview` → 관리자 첫 화면 「DB & 미디어」 탭 「30일 자동 정리」 카드에 미배포 대기 건수·정리 기록 진행률 표시.

## 대기 중

| 프로그램 | 무엇(작은 소스 수정) | 커밋 | 날짜 · CLI | 상세 위치 | 다음 배포 때 |
|---|---|---|---|---|---|
| `threads` (운영 v1.31) | 「🔤 영어로」 사전 194개로 보강(회원 글감에서 자주 나온 말·업종별 말), 붙여 쓴 말은 두 글자 이상으로만 나눔(「비용」→rain 같은 오변환 방지), 「정리」→organize · 공용 기준 코드 `photo-keywords` 기준이 됨 | `93b2aac56` | 2026-10-23 · Claude Code(윈도우) | `threads/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 새 글 「🔤 영어로」로 「미용실 창업」→hair salon startup 확인 |
| `naver-blog-agent` (운영 v2.10) | 기한 지난 미사용 연결 번호 정리(번호 발급 때) | 이 줄을 넣은 커밋 | 2026-10-23 · Claude Code(윈도우) | `naver-blog-agent/AGENTS.md` 맨 위 「미배포 대기」 | v2.11(설치 상태 문구와 함께) |
| `ai-auto-blog` (운영 v1.78) | 옛 자동 연결 코드 정리(연결 성공 뒤, 안 쓰이거나 30일 미사용만) | 이 줄을 넣은 커밋 | 2026-10-23 · Claude Code(윈도우) | `ai-auto-blog/AGENTS.md` 「미배포 대기」 | 버전 +0.01(manifest·ZIP·DB 함께) |
| `tistory-auto-blog` (운영 v1.89) | 옛 자동 연결 코드 정리(연결 성공 뒤, 안 쓰이거나 30일 미사용만) | 이 줄을 넣은 커밋 | 2026-10-23 · Claude Code(윈도우) | `tistory-auto-blog/AGENTS.md` 맨 위 「미배포 대기」 | 버전 +0.01(manifest·ZIP·DB 함께) |
| `naver-blog-seo-studio` (운영 v2.10) | 옛 자동 연결 코드 정리(연결 성공 뒤, 안 쓰이거나 30일 미사용만) | 이 줄을 넣은 커밋 | 2026-10-23 · Claude Code(윈도우) | `naver-blog-seo-studio/AGENTS.md` 맨 위 「미배포 대기」 | 버전 +0.01(manifest·ZIP·DB 함께) |
| `real_estate_sales` | 지역 분위기 30일 정리(`cleanup-sentiment`)가 회원별 `usage_logs` `cleanup_expired`(sentiments) 기록 — 공용 `cleanup-usage-log` 사본 | `82a76d9f2` | 2026-10-23 · Claude Code(윈도우) | `real_estate_sales/docs/IMPROVEMENTS.md` 「정정」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `naver-blog-agent` (운영 v2.10) | 설정 화면 설치 상태 문구 — 확장 응답 없을 때 「설치 전이거나 v2.09 이하 버전」 | 이 줄을 넣은 커밋 | 2026-10-23 · Claude Code(윈도우) | `naver-blog-agent/AGENTS.md` 맨 위 「미배포 대기」 | v2.11(코드·manifest·ZIP·DB 함께), `check-extension-release` OK |
| `trending-product-finder` | 생성 데이터 30일 정리(`cleanup-generated`)가 지운 행의 user_id로 회원별 `cleanup_expired`(reports·snapshots·competition) 기록 — 공용 사본 | `af9b2719c` · `05902a01d` | 2026-10-23 · Claude Code(윈도우) | `trending-product-finder/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `youtube-auto-reply` | 댓글 30일 정리(`cleanup-comments`)가 회원별 `cleanup_expired`(comments=내용을 비운 댓글 수) 기록 — 공용 사본 | `af9b2719c` · `05902a01d` | 2026-10-23 · Claude Code(윈도우) | `youtube-auto-reply/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `portrait-photo` | 서버 보관함 30일 정리가 회원별 `usage_logs` `cleanup_expired`(images, 경로 첫 폴더로 회원) 기록 — 공용 `cleanup-usage-log` 사본 | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `portrait-photo/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `banana-canvas` | 결과 30일 정리가 회원별 `usage_logs` `cleanup_expired`(images=지운 입력·결과 파일 수) 기록 — 공용 `cleanup-usage-log` 사본 | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `banana-canvas/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `ai-image-studio` | 생성 기록 30일 정리가 회원별 `usage_logs` `cleanup_expired`(images=이미지가 있던 기록 수) 기록 — 공용 `cleanup-usage-log` 사본 | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `ai-image-studio/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `reverse-prompt` | 분석 기록 30일 정리가 회원별 `usage_logs` `cleanup_expired`(history) 기록 — 공용 `cleanup-usage-log` 사본(1시간 임시 파일은 세지 않음) | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `reverse-prompt/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `insta_auto_poster` (운영 v1.66) | 피드 이미지를 JPEG로 저장(직접 첨부 PNG·WEBP 브라우저 변환, AI 이미지 서버 변환) · 자동 채우기 설명 한 줄로 · 무료 사진 검색에 공용 사전 `photo-keywords`(자동 채우기 영어 검색·🔤 버튼) | `8b44df90d` `8022fbf0a` `93b2aac56` | 2026-10-23 · Claude Code(윈도우) | `insta_auto_poster/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, PNG 직접 첨부 → 저장 형식 JPEG 확인(게시 없이) |
| `four-cut-comics` | 서버 보관함 30일 정리(`/api/cron/cleanup`)가 회원별 `usage_logs` `cleanup_expired`(images=지운 작품 수) 기록 | `4cafe5eb3` | 2026-10-23 · Claude Code(윈도우) | `four-cut-comics/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `music` | 곡 30일 정리(`/api/cron/cleanup`, 2026-10-28까지 유예)가 회원별 `usage_logs` `cleanup_expired`(tracks=지운 곡 수) 기록 | `4cafe5eb3` | 2026-10-23 · Claude Code(윈도우) | `music/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `emotion-writer` (운영 v1.25) | 사진 검색·받기를 공용 `free-photo-search` 사본으로(내부 정리, 동작 같음) | `428fcdfc3` | 2026-10-23 · Claude Code(윈도우) | `emotion-writer/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 사진 검색 → 선택 → 이미지 만들기 확인 |
| `allinone-graphic` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `allinone-graphic/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `ai-mastering-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `ai-mastering-studio/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `infinite-loop-video` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `infinite-loop-video/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `music-video-studio` (운영 v1.12) | 장면 화면 루프 버튼 「On (8s)」→「On」(Omni Flash는 8초 고정 없음) | 이 줄을 넣은 커밋 | 2026-10-23 · Claude Code(윈도우) | `music-video-studio/docs/IMPROVEMENTS.md` 맨 위 | 버전 +0.01, 장면 화면 루프 버튼 문구 확인 |
| `shots` | 공용 사본 `ai-video-providers` 동기화 — 선택값 `aspectRatio`·글만 생성(Gemini) 추가, 기본값 그대로라 **동작 불변** | `cea11442a` | 2026-10-23 · Claude Code(윈도우) | `docs/SHARED_MODULES.md` `ai-video-providers` | 버전 +0.01, 장면 영상 1회(9:16) 확인 |
| `shorts-onestop-studio` | 공용 사본 `ai-video-providers` 동기화 — 위와 같음(동작 불변, 영상 시험 13개 통과) | `cea11442a` | 2026-10-23 · Claude Code(윈도우) | `docs/SHARED_MODULES.md` `ai-video-providers` | 버전 +0.01, 장면 영상 1회(9:16) 확인 |
| `naver-cafe-poster` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `naver-cafe-poster/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `persona-style-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `persona-style-studio/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `react-ui-showcase` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `react-ui-showcase/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `ai-audio-analyzer` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `ai-audio-analyzer/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `ai-slide-builder` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `ai-slide-builder/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `kakao_auto_poster` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `kakao_auto_poster/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `shorts-viral-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `shorts-viral-studio/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `auto-detail-page` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `auto-detail-page/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `competitor-analysis` | 경쟁사 분석 화면 안내 문구 정정(「다른 회원이 조사한 회사 정보 재사용」 → 본인 30일 안 조사만) | `87b773ef2` | 2026-10-23 · Claude Code(윈도우) | `competitor-analysis/AGENTS.md` 2026-10-23 v1.09 절 | 버전 +0.01 |

## 내보낸 기록

| 프로그램 | 배포 버전 · 날짜 | 함께 나간 대기 항목 |
|---|---|---|
| `playlist-channel-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(`22c6cda35`) | v1.27 · 2026-10-23 · Claude Code(윈도우) — AI 음악 스튜디오 곡 가져오기와 함께 |
| `threads-content-ops` | v2.15 · 2026-10-23 (기획 앱 기능 합치기: 사진·영상 글쓰기·추천 주제, Claude Code 윈도우, 승인 빌드 1회) | 정리 기록(images·posts·ideas) `4cafe5eb3` |
| `music-video-studio` | v1.12 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회) | Veo 3.1 Preview 종료 대응 → Gemini Omni Flash `cea11442a` · 좌측 메뉴 계정 위치 `22c6cda35` |
| `threads-affiliate-poster` | v1.82 · 2026-10-23 (Claude Code 윈도우, 승인 빌드) | 정리 기록(posts·images) `af9b2719c`·`05902a01d` · 좌측 메뉴 계정 위치 `22c6cda35` · 공용 사본 `member-scheduler`(가짜 토큰 401) |
| `style-dna-analyzer` | v1.37 · 2026-10-23 (Claude Code 윈도우, 승인 빌드) | 정리 기록(images) `8ad8ea2e5`·`f53021369` · 좌측 메뉴 계정 위치 `22c6cda35` · 공용 사본 `openai-request-params` |
| `cinematic-storyboard-studio` | v1.17 · 2026-10-23 (Claude Code 윈도우, 승인 빌드) | 정리 기록(projects·images) `4cafe5eb3`·`f53021369` · 좌측 메뉴 계정 위치 메모 → 이번에 고침(`991a43a44`, 메뉴 `flex-1` → `min-h-0 shrink`) |
| `threads` | v1.29 · 2026-10-23 (글 첨부 무료 사진) | 좌측 메뉴 계정 위치 `22c6cda35` |
| `naver-blog-seo-studio` | v2.08 · 2026-10-23 | 확장 입력 속도 한 단계 낮춤(1~3글자 묶음) `add21ed73` |
| `insta_auto_poster` | v1.65 · 2026-10-23 (서로 다른 사진·연결 확인·피드 첨부) → v1.66 Enter 수정 | 자동 채우기·출처 배지·공용 기준 코드 `428fcdfc3` |
| `booking-reminder` | v1.28 · 2026-10-23 (엑셀 일괄 등록·한국 시간 수정) | 좌측 메뉴 계정 위치 `22c6cda35` · 공용 사본 telegram-bot-client `linkButton` · 버튼 줄바꿈 `f0871e568` |
| `stepmail` | v1.27 · 2026-10-23 (문자 차수 발송) | 좌측 메뉴 계정 위치 `22c6cda35` · 공용 사본 member-scheduler(가짜 토큰 401 확인) |
| `ai-image-studio` | v1.29 · 2026-10-23 | 배지 이름·형식 바꾸기 넘김 기록 `681e1d823` |
| `image-convert-studio` | v1.26 · 2026-10-23 | 검수용 큰 시험 그림 `681e1d823` |
| `naver-blog-allinone` | v1.51 · 2026-10-23 (배포 대기 4곳 일괄 배포) | BC-05 보관함 30일 자동 삭제 `f61c0899f` · 공용 사본 openai-request-params·year-policy `ebcdd6b0f` |
| `four-cut-comics` | v1.35 · 2026-10-23 (이미지 연계 정리 배포) | 작품 이름표·resave-receiver 기준 `b0502560e` · link-mark 사본 `acf432dbe` |
| `portrait-photo` | v1.42 · 2026-10-23 (이미지 연계 정리 배포) | resave-receiver 사본 `b0502560e` · link-mark 사본 `acf432dbe` |
| `banana-canvas` | v1.32 · 2026-10-23 (이미지 연계 정리 배포) | 다운로드 확장자 `a00e43925` · 이름표 제목·resave-receiver 사본 `b0502560e` · link-mark 기준 `acf432dbe` |
| `ai-image-studio` | v1.28 · 2026-10-23 (이미지 연계 정리 배포) | 갤러리 형식 바꾸기·다시 저장 받기 `acf432dbe` · 변환됨 배지·큰 보기 창 버튼(이번 커밋) |
| `cinematic-storyboard-studio` | v1.16 · 2026-10-23 (이미지 연계 정리 배포) | link-mark 사본 `acf432dbe` |
| `image-convert-studio` | v1.25 · 2026-10-23 (이미지 연계 정리 배포) | 이름표 전달·품질 70% `b0502560e` · PNG→WebP·이미지 스튜디오 연계 `acf432dbe` |
| `thumbnail-master` | v1.19 · 2026-10-22 (`85aff6a76`) | 쇼츠 표지 안내 `de99b1ca9` |
| `shorts-onestop-studio` | v1.37 · 2026-10-23 (`9bdcef674`) | 출처 띠 모양 `f055d6b70` |
