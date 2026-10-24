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
7. **메인 사이트 할 일**: 메인 화면 작은 수정은 푸시 즉시 빌드되므로 코드를 미리 쓰지 않고 아래 「메인 사이트 — 다음 메인 빌드 때 할 일」 표에 모았다가 빌드 1회(사전 승인)로 묶는다. 세션 시작 점검(`deploy.mjs --version-only --all`)이 개수를 보여 준다.

## 대기 중

| 프로그램 | 무엇(작은 소스 수정) | 커밋 | 날짜 · CLI | 상세 위치 | 다음 배포 때 |
|---|---|---|---|---|---|
| `naver-blog-agent` (운영 v2.20) | 간편 결과 화면 미리보기가 [SECTION - …] 표시 기호를 소제목으로 보여 줌(화면 표시만) | `7ec53853f` | 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-blog3` | `naver-blog-agent/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `ai-work-workspace` | 슬래시 메뉴 「AI 이미지」 항목 숨김(U3 시험 중 발견) | `768bf908d` | 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-workspace` | `ai-work-workspace/docs/IMPROVEMENTS.md` 맨 위 | U4와 함께 배포 → 슬래시 메뉴에 「AI 이미지」 없음 확인 |
| `music-video-studio` (운영 v1.26) | 참고 이미지를 새로 고침으로 잃어도 화풍 분석 결과가 있으면 영상 전에 그 화풍으로 장면 이미지를 먼저 만들기(`scenes/page.tsx` 조건 한 줄) | `fde4c94bf` | 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-music` | `music-video-studio/AGENTS.md` v1.26 | v1.27 |
| `shop-detail-page` | 30일 자동 정리(`cleanup-generated`)가 지운 상품·파일 수를 회원별 `usage_logs` `cleanup_expired`로 기록(공용 `cleanup-usage-log` 사본, 관리자 「30일 자동 정리」 표) — 정리 동작 자체는 그대로, 유예 2026-11-21까지는 지우는 것이 없어 기록도 없음 | `34094c954` | 2026-10-24 · Claude Code(맥미니) `claude-mac-20261023-ecommerce` | `shop-detail-page/docs/IMPROVEMENTS.md` 맨 아래 | 운영 v1.30 → v1.31, 2026-11-21 뒤 첫 정리에서 기록 1줄 확인 |
| `tistory-auto-blog` (운영 v1.91) | 긴 글 분량 지시문을 단락 개수로(`utils/news/lengthPlan.ts`·`generator.ts`) — GPT-4.1 실측 88.7%(3,104자) 통과 | `fef7491d6`·`756a2ca7a` | 2026-10-23 · Claude Code(윈도우) `claude-win-20261023-blog2` | `tistory-auto-blog/docs/IMPROVEMENTS.md` 맨 아래 | v1.92(코드·manifest·ZIP·DB) |
| `booking-reminder` | 테스트 문자·이메일 테스트·텔레그램 연동 메시지에 남아 있던 「구글폼 CRM」 → 「예약(취소)방지 리마인드 자동화」 + 공용 `solapi-client` 사본 등록 | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `booking-reminder/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `stepmail` | 테스트 문자 「[구글폼 CRM]」 → 「[대량 메일발송 자동화(Step Mail)]」 + 공용 `solapi-client` 사본 등록 | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `stepmail/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `crm-google-form` | 공용 `solapi-client` 기준 등록(머리 주석만) | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `crm-google-form/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `kakao_auto_poster` | 공용 `solapi-client` 사본(주석·쓰지 않는 `sendRcs`) · ⚠ 로컬 빌드가 Next.js 16.4.0 보안 경고로 멈춤 | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `kakao_auto_poster/docs/IMPROVEMENTS.md` 맨 아래 | **배포 전에 Next.js 보안 업데이트 필요할 수 있음**(주인님 승인), 버전 +0.01 |
| `real_estate_sales` | 공용 `solapi-client` 사본(주석·쓰지 않는 `sendRcs`) | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `real_estate_sales/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `instagram-comment-reply` (운영 v1.36) | 설정 「다음 확인 예정」 시각 · 「실행 방식 바꾸기 ↓」 바로가기 | `24562d6aa` | 2026-10-23 · Claude Code(윈도우) | `instagram-comment-reply/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01, 설정에서 다음 확인 예정·바로가기 확인 |
| `real_estate_sales` | 지역 분위기 30일 정리(`cleanup-sentiment`)가 회원별 `usage_logs` `cleanup_expired`(sentiments) 기록 — 공용 `cleanup-usage-log` 사본 | `82a76d9f2` | 2026-10-23 · Claude Code(윈도우) | `real_estate_sales/docs/IMPROVEMENTS.md` 「정정」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `portrait-photo` | 서버 보관함 30일 정리가 회원별 `usage_logs` `cleanup_expired`(images, 경로 첫 폴더로 회원) 기록 — 공용 `cleanup-usage-log` 사본 | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `portrait-photo/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `banana-canvas` | 결과 30일 정리가 회원별 `usage_logs` `cleanup_expired`(images=지운 입력·결과 파일 수) 기록 — 공용 `cleanup-usage-log` 사본 | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `banana-canvas/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `reverse-prompt` | 분석 기록 30일 정리가 회원별 `usage_logs` `cleanup_expired`(history) 기록 — 공용 `cleanup-usage-log` 사본(1시간 임시 파일은 세지 않음) | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `reverse-prompt/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `four-cut-comics` | 서버 보관함 30일 정리(`/api/cron/cleanup`)가 회원별 `usage_logs` `cleanup_expired`(images=지운 작품 수) 기록 | `4cafe5eb3` | 2026-10-23 · Claude Code(윈도우) | `four-cut-comics/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `allinone-graphic` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `allinone-graphic/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `naver-cafe-poster` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `naver-cafe-poster/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `persona-style-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `persona-style-studio/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `react-ui-showcase` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `react-ui-showcase/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `ai-audio-analyzer` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `ai-audio-analyzer/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `ai-slide-builder` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `ai-slide-builder/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `kakao_auto_poster` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `kakao_auto_poster/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `shorts-viral-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `shorts-viral-studio/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `competitor-analysis` | 경쟁사 분석 화면 안내 문구 정정(「다른 회원이 조사한 회사 정보 재사용」 → 본인 30일 안 조사만) | `87b773ef2` | 2026-10-23 · Claude Code(윈도우) | `competitor-analysis/AGENTS.md` 2026-10-23 v1.09 절 | 버전 +0.01 |
| `emotion-writer` (운영 v1.26) | 사용 매뉴얼 사진 출처 「Unsplash」 → 「Pixabay·Pexels」 7곳·저작권 안내 문구 | `1965b2c6c` | 2026-10-23 · Claude Code(윈도우) | `emotion-writer/AGENTS.md` 맨 아래 「⏸ 미배포」 | 버전 +0.01, `/guide` 문구 확인 |

## 메인 사이트 — 다음 메인 빌드 때 할 일 (코드 미작성)

> 2026-10-23 신설(Claude Code 윈도우, 주인님 승인 제안). 메인 사이트(루트 `app`·`components`·`lib` 등)는 **푸시하면 바로 자동 빌드**되므로 작은 화면 수정은 코드를 미리 쓰지 않고 여기에 모았다가, 빌드 1회(사전 승인)로 묶어 구현·배포한다. 구현해 내보내면 줄을 지우고 위 「내보낸 기록」에 `.`(메인 사이트)로 적는다. **「급함」 칸**: 회원에게 바로 피해가 가는 화면 문제(오류·잘못된 안내·막힌 기능)는 `급함` — 이 표를 기다리지 않고 주인님 승인 뒤 바로 빌드한다(쌓인 `보통` 줄도 그때 함께 넣어 빌드 1회로). 관리자 화면 편의·문구는 `보통`. 다른 CLI가 적은 줄은 지우지 않는다(내보낸 경우만).

| 할 일 | 급함 | 관련 파일 | 근거·메모 | 적은 날 · CLI |
|---|---|---|---|---|

## 내보낸 기록

| 프로그램 | 배포 버전 · 날짜 | 함께 나간 대기 항목 |
|---|---|---|
| `ai-video-studio` | v1.19 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회, `ai-video-studio-2snzpcyw2`) | 프롬프트 게시판 A안(관리자 편집 + 내 프롬프트 저장, 운영 DB 표 2개) `79d6aed00`(대기 줄 없음) |
| `playlist-channel-studio` | 영상(MP4) 배경 그리기(`c40641d57`) | v1.31 · 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-music` — 운영 크롬 확인 |
| `ai-video-studio` | v1.18 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회, `ai-video-studio-6b8vhdn18`) | 갤러리 카드 「⚡ 내 PC로」 GIF·작은 MP4 `a354d4c56`(대기 줄 없음) |
| `video-to-gif` | v1.24 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 2회 중 1, `video-to-9rhaboikt`) | 내 PC 렌더러 1.30 `normalize`·`compress` 묶음 `0492b0cbb`·`72bfaa11f`(대기 줄 없음), DB `extension_version` v1.24, check-extension-release OK |
| `ai-video-studio` | v1.17 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 2회 중 2, `ai-video-studio-kdamezmak`) | 영상 합치기 「⚡ 내 PC로 용량 줄이기」·넣는 영상 PC 형식 맞추기 `3b94adc78`(대기 줄 없음) |
| `infinite-loop-video` | v1.08 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드, `infinite-loop-video-i96qqi0d6`) | 「⚡ 내 PC로 빠르게」(실행기 `loop`) `997fec0bb`(대기 줄 없음) |
| `video-to-gif` | v1.23 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드, `video-to-4fjavywr6`) | 내 PC 렌더러 1.20 `loop` 배포 묶음 `e14e958cd`·`e5e9c3441`(대기 줄 없음), DB `extension_version` v1.23 |
| `ai-mastering-studio` | v1.14 · 2026-10-24 (Claude Code 윈도우 · 세션 `claude-win-20261024-music`, 승인 빌드 1회, `ai-mastering-studio-eprfsbanw`) | GUIDE 배지 띄어쓰기 수정 `b5b875484`(크롬 금색 그라데이션·10px 확인, 「⚡ 내 PC로 저장」과 함께) |
| `infinite-loop-video` | v1.07 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 회원 기능 실패 수정·승인 빌드 1회, `infinite-loop-video-q2ezfnuhj`) | 소리 없는 영상 실패 수정 `2fb360453`(대기 줄 없음) |
| `infinite-loop-video` | v1.06 · 2026-10-23 17:43 (Next.js 보안 배포에 함께 실림 — 2026-10-24 Claude Code 윈도우 `claude-win-video`가 운영 화면으로 확인) | 좌측 메뉴 계정 위치 `22c6cda35`(커밋 00:19, 배포보다 앞섬) |
| `ai-video-studio` | v1.16 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드, `ai-video-studio-h82vhy4xa`) | 데스크톱 모델 카드 미리보기 128px 썸네일 `96439b319` — 크롬 1384px 카드 98px·썸네일 128×72, 503px 폭 카드 폭 그대로 |
| `ai-image-studio` | v1.30 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드, `ai-image-studio-55iswla9s`) | 대기 4건 — 공용 `ai-video-*` 사본(Kling v2.1 제거 `c2b698db4`·소리/글→영상 선택값 `fd1f3cb67`·기준 이전 주석, 모두 화면 미사용) + 생성 기록 30일 정리 `usage_logs` 기록 — 크롬 대시보드 v1.30 정상 |
| `auto-detail-page` | **배포 안 함 — 배포 불필요(꺼진 프로그램)** · 2026-10-24 주인님 결정(Claude Code 맥미니 `claude-mac-20261023-ecommerce`) | 좌측 메뉴 계정 위치 `22c6cda35` — 프로그램이 「AI 상세페이지 자동화」에 병합돼 `is_active=false`라 회원이 보지 않는 화면에 빌드 비용만 들어 내보내지 않음. 코드는 저장소에 남아 있어 다시 켜서 배포할 때 함께 나감 |
| `blog-keyword` | v1.09 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `blog-keyword-k7skfpyk1`) | v1.08 실검수 수정: 벤치마킹 새 글만 분석 멈춤 기준·급상승 이유 문구 `133d140ea` |
| `blog-keyword` | v1.08 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `blog-keyword-b4vt26i3f`) | 블로그 병합 묶음 C — 키워드 등급 탐색·급상승 검증·블로그 벤치마킹(작업실에서 옮김, 도톨이 N8·N9) + Next.js 16.4.2 · `8c0e67c11`(Next.js 16.4.2)·`21fcec501`(기능)·`34bd55adc`(버전) · DB 허용 값 0006 적용 |
| `naver-blog-seo-studio` | v2.18 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `naver-blog-seo-studio-o59nt528w`) | v2.17 실검수 수정: 검수 반영 소제목 보호 `c60aefdbd` + 원문 붙여넣기 칸 배치·유튜브 제목 공개 oEmbed `0975d003b` · 버전 `d12f42a56` |
| `naver-blog-seo-studio` | v2.17 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `naver-blog-seo-studio-jaunaxrf4`) | 도톨이 참고 D-1 어조 강도 `eb60d1904` + D-2 전개 구조 `764991359` + D-3 검수 지적 반영·검수 8영역 `328184977` + D-4 자료 읽기(PDF·유튜브·붙여넣기) `8552eaded` · 버전 `e042e2b2b` |
| `naver-blog-seo-studio` | v2.16 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261023-blog2`, 승인 빌드 1회) | 블로그 병합 B-5 서식 포함 복사 + B-7 TXT·MD·HTML 내보내기 `27f5e2324` + B-6 수정본 이력·비교·되돌리기 `de243dd5d` + B-8 SNS 공유 문구 `4dfd4a227` · 버전 `639aff080` |
| `naver-blog-seo-studio` | v2.15 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261023-blog2`, 승인 빌드 1회, `naver-blog-seo-studio-2myivnlgq`) | 「길게」 분량 보강(소제목마다 문단 4개) `ff50a6a91` + 블로그 병합 B-4 이미지 비율·표현 방식·참고 사진(저장 안 함) `7ec2f9029` |
| `shorts-onestop-studio` | v1.41 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 회원 기능 실패 수정·승인 빌드, `shorts-onestop-studio-r6ntxtshv`) | Kling v2.1 제거 `c2b698db4` + 대기분 공용 사본 동기화 `fd1f3cb67`(동작 불변) — 크롬 `/design` 선택 목록 4개·화면 코드에 kling-v2.1 없음 |
| `shots` | v1.43 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 회원 기능 실패 수정·승인 빌드, `shots-lrb2sbwid`) | Kling v2.1 제거 `c2b698db4` + 대기분 공용 사본 동기화 `fd1f3cb67`(동작 불변) — 화면 v1.43, 장면 편집 화면은 시험 계정 장면이 없어 미확인 |
| `ai-video-studio` | v1.15 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 회원 기능 실패 수정·승인 빌드, `ai-video-studio-clewlka18`) | Kling v2.1 제거 `c2b698db4` — Replicate 카드 모델 1개(Seedance 1 Lite)만 |
| `music-video-studio` | v1.23 · 2026-10-24 (Claude Code 윈도우 · 세션 `claude-win-20261024-music`, 승인 빌드 1회, `music-video-studio-7rc77y3l5`) | 영상 일괄 생성 진행률·남은 시간 `0a7f66d7c`(장면 타임라인 `37d84b05b`과 함께, 크롬 확인) |
| `naver-blog-seo-studio` | v2.14 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261023-blog2`, 승인 빌드 1회, `naver-blog-seo-studio-ivj7tb442`) | 블로그 병합 B-1 AI 검수 6영역·필수 지적 발행 차단 `f4681176c` + B-2 문체 영구 보관(원문만 30일 정리, 주인님 A안) `a8dfacb26` + B-3 분량 선택 `bb7668dee`(대기 줄에 다른 세션 커밋 `a1c240867`로 잘못 적혔던 것을 바로잡음) |
| `video-to-gif` | v1.21 · 2026-10-24 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회, `video-to-as3vkytql`) | 내 PC 고속 변환 다듬기(새 버전 알림·최소 판 LR-M-01, 맥 Homebrew 없을 때 안내 LR-M-02, 윈도우 경고·`Unblock-File` LR-M-03, 엣지 안내 LR-W-02) `c7c2c322f` · 확장 버전 자동 맞춤 LR-W-01 — `check-extension-release` OK(DB·확장·ZIP v1.21), 운영 ZIP으로 윈도우 재설치 정상. 맥미니 크롬 「🔔 새 버전」 실검수 남음 |
| `ai-video-studio` | v1.12 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회, `ai-video-studio-lgacukoyw`) | 다듬기 프롬프트 인물 추가 금지 `ffaae22b2` — 운영에서 사람 없는 설명(레코드판 홈 스튜디오) 다듬기 1회 → 3안 모두 인물 없음 확인 |
| `naver-blog-agent` | v2.20 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `naver-blog-agent-rlfpej3tb`) | E-4 간편 모드 무료 입구(전체/간편 권한 범위·간편 원고만·간편 결과 화면) `a687ab28d`(플랜)·`00b1b1a36`(기능)·`272d70a41`(버전·확장 ZIP) |
| `naver-blog-agent` | v2.19 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `naver-blog-agent-i29myxlki`) | E-3 간편 모드 `/quick` `b6592d9b3`(기능)·`52d5bdab0`(버전·확장 ZIP) + 대기였던 대표 이미지 카드 전체 표시 `9ee3cb3d8`(올린 세션 `claude-win-20261023-blog2`) |
| `naver-blog-agent` | v2.18 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261023-blog2`, 승인 빌드 1회, `naver-blog-agent-mejx4uje3`) | 블로그 병합 A-5 본문 이미지 소제목 이동 `75cf43a57` + A-6 대표 이미지 제목 글자 `ae5351f08` + A-7 메모·파일 글감 `09186ad4b` |
| `naver-blog-agent` | v2.17 · 2026-10-23 (Claude Code 윈도우 `claude-win-20261023-blog2`, 승인 빌드 1회, `naver-blog-agent-bu2m09y4n`) | 블로그 병합 A-3 사진 후기 방문 정보·FAQ `c73959966` + A-4 화자 직접 입력·경험 메모·경험 질문 |
| `ai-mastering-studio` | v1.13 · 2026-10-23 (Claude Code 윈도우 · 세션 `claude-win-20261023-bgm`, 승인 빌드 1회, `ai-mastering-studio-5yboet05u`) | 「연동 & 사용 매뉴얼」 메뉴 한 줄 `a33fd63ff`(크롬 높이 42px 확인) |
| `ai-mastering-studio` | v1.12 · 2026-10-23 (Claude Code 윈도우 · 세션 `claude-win-20261023-bgm`, 승인 빌드 1회, `ai-mastering-studio-560vmpqod`) | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로 `22c6cda35`(크롬 데스크톱·390px 확인) |
| `naver-blog-agent` | v2.16 · 2026-10-23 (Claude Code 윈도우 `claude-win-20261023-blog2`, 승인 빌드 1회, `naver-blog-agent-5vxc7vkrv`) | 블로그 병합 A-1 참고 URL·추가 지시 `1aa3bed9c` + A-2 주제 최근 뉴스 근거 |
| `ai-music-studio` | v1.13 · 2026-10-23 (Claude Code 윈도우 · 세션 `claude-win-20261023-bgm`, 승인 빌드 1회, `ai-music-studio-pwose5nlf`) | 공급자 색 점·띠 투명 수정 `39f7471d3`(크롬 계산값 5색 확인) |
| `ai-music-studio` | v1.12 · 2026-10-23 (Claude Code 윈도우 · 세션 `claude-win-20261023-bgm`, 승인 빌드 1회, `ai-music-studio-brcpsck8j`) | 제안 가 미니 플레이어 반복·무작위 `36abe772a` · 나 실제 소리 파형 `c15faae8e` · 다 이 설정으로 다시 만들기 `abb7cb4cf` · 라 보관함 공급자 필터 `a7b5deef4` (크롬 확인) |
| `threads-easy-planner` | v1.49 · 2026-10-23 (Claude Code 윈도우 · 세션 `claude-win-20261023-tep-kit`, 주인님 지시 빌드 1회, `threads-easy-planner-a1lwj980x`) | 배포판 이름 ALLA AI `APP_NAME`(독립 모드 전용, 운영 이름 그대로 확인) · 이번 배포 본건: 운영에서 이미지 기능 숨김(`IMAGE_FEATURE`) |
| `naver-blog-agent` | v2.15 · 2026-10-23 (Claude Code 윈도우 · 세션 `claude-win-20261023-blog2`, 승인 빌드 1회, `naver-blog-agent-chb6zlsgx`) | 확장 팝업 폭 480px·버튼 한 줄 `2666fc309`(올린 세션 `claude-win-20261023-seo-bg`) + 준비 모드 직접 발행 결과 기록(새 기능) |
| `detail-page-12p` | v1.11 · 2026-10-23 Next.js 보안 업데이트 배포(`claude-win-20261023-next-security`, 커밋 `f9a3fcefe`)에 함께 나감 — 표 정리는 Claude Code(맥미니) `claude-mac-20261023-ecommerce` | 메인 사이트 링크 정정 `486fd5fd3` — `node scripts/check-app-urls.mjs detail-page-12p --live`: 로그인 화면·스크립트 8개에 `www.buylife.xyz` 있음, `aimaster.buylife.xyz`·`/signup` 0개 |
| `shots` | v1.42 · 2026-10-23 (Claude Code 윈도우 · 세션 `claude-win-20261023-bgm`, 승인 빌드 1회, `shots-4qfznzp6u`) | Lyria·ElevenLabs 배경음악 실제 길이 표시 `35bcd8a03`(크롬 Lyria 1곡 「66초」 확인) · 공용 `ai-video-providers` 선택값 사본 · `ai-video-*` 기준 이전 사본(동작 불변) |
| `video-to-gif` | v1.19 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `video-to-kjwuwh5xt`) | 좌측 메뉴 「색상표 최적화 고화질 변환」 · 미리보기 Esc 닫기(G-23-06) · 8MiB 초과용 25·20fps 단계(`db5116a9f`) — 크롬에서 v1.19·메뉴 문구·사다리 안내 확인, 실제 변환은 맥미니 실검수 남음 |
| `trending-product-finder` | v1.24 · 2026-10-23 14:04 Next.js 보안 업데이트 배포(`claude-win-20261023-next-security`, 커밋 `be7d1fd4a`)에 함께 나감 — 표 정리는 Claude Code(맥미니) `claude-mac-20261023-ecommerce` | 30일 정리 회원별 기록 `af9b2719c`·`05902a01d` · 공용 `solapi-client` 사본 `36d0a4fdc`(세 커밋 모두 배포 커밋의 조상임을 확인). 다음 정리(매일 03:50) 뒤 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 남음 |
| `cinematic-storyboard-studio`·`ai-prompt-studio`·`allinone-graphic` | 2026-10-23 Next.js 보안 업데이트 배포(`claude-win-20261023-next-security`)에 함께 나감 | 메인 사이트 링크 정정 `486fd5fd3` — 로그인 화면 스크립트에 `www.buylife.xyz`만 있고 옛 주소 없음, AI 프롬프트 스튜디오는 크롬에서 회원가입 링크 `/register` 확인 |
| `persona-style-studio`·`playlist-channel-studio`·`prompt-template-studio` | 2026-10-23 Next.js 보안 업데이트 배포(`claude-win-20261023-next-security`)에 함께 나감 | 메인 사이트 링크 정정 `486fd5fd3`·`9c170faf5` — 17:3x 로그인 화면 스크립트에 `www.buylife.xyz` 있음, 옛 주소·`/signup` 없음 |
| `ai-video-studio` | v1.06 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `ai-video-studio-6hf0ame5b`) | 내레이션 덕킹(새 기능) · 기준 코드 보강 `208c80842` |
| `naver-blog-seo-studio` | v2.13 · 2026-10-23 | 원고 생성 모델 기록 `07e08257e` · 30일 정리 회원별 기록 `6cd2b9783` |
| `naver-blog-agent` | v2.14 · 2026-10-23 | 30일 정리 회원별 기록 `6cd2b9783` |
| `ai-auto-blog` | v1.80 · 2026-10-23 | 30일 정리 회원별 기록 `6cd2b9783` |
| `tistory-auto-blog` | v1.91 · 2026-10-23 | 30일 정리 회원별 기록 `6cd2b9783` |
| `naver-blog-allinone` | v1.52 · 2026-10-23 | 30일 정리 회원별 기록 `6cd2b9783` |
| `blog-workroom` | v1.14 · 2026-10-23 | 30일 정리 회원별 기록 `6cd2b9783` |
| `music-video-studio` | v1.19 · 2026-10-23 (Claude Code 윈도우 `claude-win-avs-c12`, 승인 빌드 1회, `music-video-studio-13ii31wh2`) | 장면 전환을 박자에 맞추기 `798ef6126` + 대기분 공용 사본 동기화 `179b58ccc`·`fd1f3cb67`(동작 불변) — 운영 켬/끔 렌더로 전환 1프레임 이동 확인 |
| `ai-video-studio` | v1.09 · 2026-10-23 (Claude Code 윈도우 `claude-win-avs-c12`, 승인 빌드 1회, `ai-video-studio-r8r4gseoz`) | 자르기 막대 끌기 `cd696eb2a` — 운영에서 끌기·←→ 키·최소 0.5초 확인 |
| `ai-video-studio` | v1.08 · 2026-10-23 (Claude Code 윈도우 `claude-win-avs-c12`, 승인 빌드 1회, `ai-video-studio-223fxl5fq`) | fal 소리 켜기·글만으로 영상 `fd1f3cb67` — 운영 fal 생성 2회(약 $0.50)로 소리·글만으로 확인 |
| `ai-video-studio` | v1.07 · 2026-10-23 (Claude Code 윈도우 `claude-win-avs-c12`, 승인 빌드 1회, `ai-video-studio-hhv6cegzq`) | 장면을 내레이션에 맞추기·겹쳐 바꾸기 `179b58ccc` — 운영 렌더로 반복 재생·섞임·내레이션 끝 소리 확인 |
| `music-video-studio` | v1.18 · 2026-10-23 (Claude Code 윈도우 `claude-win-avs-c12`, 승인 빌드 1회, `music-video-studio-3tmbxxbny`) | 장면을 가사 시각에 맞춰 바꾸기 `c67256045` + 대기분 가사 자막 구간 표시 빼기 `1b8440ac7`(이미 v1.17 보안 배포에 실렸음) — 운영 렌더로 24초 전환·자막 확인 |
| `music-video-studio` | v1.16 · 2026-10-23 (Claude Code 윈도우, 회원 피해 수정·승인 빌드 1회, `music-video-studio-ocyhgtgjr`) | 장면 이미지 500(sharp libvips) 수정 `8f1171788` — 이미지 2장 생성·최종 뮤직비디오 렌더 운영 확인 |
| `comment-inbox` | v1.09 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `comment-inbox-o4t2vkqdq`) | 「🤖 자동 수집 상태」 카드 `24562d6aa` · 7일 그래프 글자 크게·문구 선택 항목(공용 사본) |
| `youtube-auto-reply` | v1.31 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `youtube-auto-reply-dpgbgdpq6`) | 「중지」 즉시 화면 반영 `52b8adb5a` · 다음 확인 예정·실행 방식 바로가기 `24562d6aa` |
| `threads-comment-reply` | v1.28 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `threads-comment-reply-ku5b09w90`) | 「중지」 즉시 화면 반영 `52b8adb5a` · 다음 확인 예정·실행 방식 바로가기 `24562d6aa` |
| `naver-blog-agent` | v2.13 · 2026-10-23 (제안 범위 빌드 1회) | 30일 정리가 이관 복사본을 파일 이름 시각으로 판정 `f1aabf2a2` |
| `music` | v1.45 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `music-4n6o3dlzo`) | 휴대폰 폭 가로 넘침 `overflow-x-clip`(크롬 390px scrollX 0 확인) |
| `instagram-comment-reply` | v1.36 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `instagram-comment-reply-1k2h264nv`) | 이번 작업: 댓글 자동 수집 회원 선택 `b4696e1e6` · 함께: 7일 그래프 글자 크게 `9479f0bc` · 좁은 칸 버튼 줄바꿈 `f0871e568` · 그래프 문구 선택 항목 `10835a02` · 공용 사본 member-scheduler |
| `threads-content-ops` | v2.20 · 2026-10-23 (모아 둔 수정, 제안 범위 빌드 1회) | 초안 사진 깜박임 `f92acc076` · 쿠팡 임시 사진 서버 키 삭제 `6b44abdc8` · 공용 사본 member-scheduler·openai-request-params |
| `ai-video-studio` | v1.03 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `ai-video-studio-mcgdidz4n`) | 실사 인물 사진 거절 시 쉬운 안내 `96423f5ec` |
| `insta_auto_poster` | v1.68 · 2026-10-23 (모아 둔 수정, 제안 범위 빌드 1회) | 「🔤」 한글일 때만 기억 `4bebfb016` · 「✕ 슬라이드 N 빼기」 `447780d5c` · 공용 사본 member-scheduler·instagram-publish |
| `music` | v1.44 · 2026-10-23 (Claude Code 윈도우, 승인 빌드 1회, `music-36j3lwxcj`) | 공용 Suno `callbackOrigin` `acccf06eb` · 곡 30일 정리 회원별 기록 `4cafe5eb3`(2026-10-29 첫 실제 삭제 뒤 관리자 정리 표 확인) · 휴대폰 ☰ 펼침 메뉴 `2fcddccb7`(크롬 390px 확인) |
| `naver-blog-agent` | v2.12 · 2026-10-23 (이미지 전용 공개 버킷, 회원 피해 수정·승인 빌드 1회) | 대기 항목 없음 |
| `shorts-onestop-studio` | v1.40 · 2026-10-23 (곡 링크로 들어왔을 때 대본이 여러 개면 고르게 함, 승인 빌드 1회) | `b22a5526a` |
| `ai-music-studio` | v1.10 · 2026-10-23 (Lyria RealTime 서버 녹음, 승인 빌드 1회) | `8386be97f` |
| `ai-music-studio` | v1.09 · 2026-10-23 (Stable Audio 3 Medium(fal) 추가, 승인 빌드 1회) | Mureka 연동 코드(숨김) `3cdeb201b` |
| `ai-music-studio` | v1.08 · 2026-10-23 (곡마다 원스톱·뮤직비디오 링크에 곡 번호 `?ams=`, 승인 빌드) | `5991d70bb` |
| `music-video-studio` | v1.14 · 2026-10-23 (`/music?ams=` 곡 자동으로 가져오기, 승인 빌드) | `5b9dba1af` |
| `shorts-onestop-studio` | v1.39 · 2026-10-23 (`/render?ams=` 배경음악 자동으로 넣기, 승인 빌드) | `8da387b28` · 고른 곡 이름 번호 유지 `b48814471` |
| `ai-music-studio` | v1.07 · 2026-10-23 (곡 카드에 쇼츠 원스톱·뮤직비디오 링크, 승인 빌드 1회) | 공용 `music-sync-calls` 분리(동작 같음) |
| `shots` | v1.40 · 2026-10-23 (배경음악 모델 고르기 Suno V6·Mini·Wild·Lyria 3.5·ElevenLabs, 승인 빌드 1회) | 공용 `music-sync-calls` 사본 첫 배포 |
| `music-video-studio` | v1.13 · 2026-10-23 (곡 카드: AI 음악 스튜디오 가져오기 + 내 파일 올리기, 승인 빌드 1회) | 루프 버튼 「On」 · 공용 `ai-video-*` 사본 머리 주석·사진 거절 안내 `6c02ccf41`·`96423f5ec` |
| `shorts-onestop-studio` | v1.38 · 2026-10-23 (AI 음악 스튜디오 내 곡에서 배경음악 고르기, 승인 빌드 1회) | `ai-video-providers` 사본 동기화 `cea11442a`(동작 불변) |
| `shots` | v1.39 · 2026-10-23 (배경음악 Suno V4_5 → V6 공용 사본, 승인 빌드 1회) | `ai-video-providers` 사본 동기화 `cea11442a`(동작 불변) |
| `threads-comment-reply` | v1.27 · 2026-10-23 (모니터링 시작 시각 한국 시간으로 읽기, 승인 빌드 1회) | 9시간 밀림 수정 `e6139cd39`·`3f8897cd7` |
| `youtube-auto-reply` | v1.30 · 2026-10-23 (같은 9시간 밀림 수정, 승인 빌드 1회) | 댓글 30일 정리 회원별 기록 `af9b2719c`·`05902a01d` · 공용 그래프 `noun`·`labels`·글자 크게 `9479f0bc` 보류분 |
| `threads-comment-reply` | v1.26 · 2026-10-23 (자동 수집 회원 선택 + AI 지시문 Threads용, 승인 빌드 1회) | 공용 그래프 글자 크게 `9479f0bc` 등 기존 대기분은 v1.25에 이미 나감 |
| `ai-auto-blog` | v1.79 · 2026-10-23 | 옛 자동 연결 코드 정리 · 소제목 반복 제거 `c9a09ce45` |
| `naver-blog-seo-studio` | v2.12 · 2026-10-23 | 입력·자동 포스팅 background 실행(사이드패널 닫아도 이어짐) `c65d87fbb` · 입력 중 안내·끊긴 실행 즉시 정리 `19a124d24` · 배포 `1b4950030` |
| `naver-blog-seo-studio` | v2.11 · 2026-10-23 | 옛 자동 연결 코드 정리 `da9805c6b` |
| `naver-blog-agent` | v2.11 · 2026-10-23 | 설치 상태 문구 · 기한 지난 미사용 연결 번호 정리 |
| `.` (메인 사이트) | 빌드 `aimaster-fvef7otna` · 2026-10-23 (Claude Code 윈도우, 승인 빌드) | 메인 사이트 할 일 3개 `9a6a74d74`·`eb79c7843`: 관리자 전용 안내에 「관리자 계정으로 다시 로그인」 버튼 · 휴대폰 폭 관리자 머리줄에 로그인 이메일 · 정리 표 아래 「아직 기록 안 남기는 곳」 목록 · 이름표 `products` 상품 |
| `insta_auto_poster` | v1.67 · 2026-10-23 (한국어로 다시 찾기) | JPEG 저장 `8b44df90d` · 설명 한 줄 `8022fbf0a` · 공용 사전 `93b2aac56` |
| `tistory-auto-blog` | v1.90 · 2026-10-23 | 옛 자동 연결 코드 정리 `da9805c6b` · 글 품질 보완(이번 커밋) |
| `threads-affiliate-poster` | v1.83 · 2026-10-23 (상품 연동 공용 기준 코드 `affiliate-clients`, 승인 빌드) | 없음 |
| `threads` | v1.32 · 2026-10-23 (미배포 모아 내보냄, Claude Code 윈도우, 승인 빌드 1회) | 사전 보강 `93b2aac56` · 한국어로 다시 찾기 `d4dcd0384`·`4bebfb016` |
| `emotion-writer` | v1.26 · 2026-10-23 (사진 검색 「🔤 영어로」 공용 사전, Claude Code 윈도우, 제안 범위 빌드) | 공용 사진 사본 `428fcdfc3` |
| `threads-content-ops` | v2.19 · 2026-10-23 (미디어 전용 공개 버킷 `threads-content-ops-media` — 옛 버킷 비공개 전환 대응, 주인님 승인 빌드) | 없음 |
| `threads-content-ops` | v2.18 · 2026-10-23 (보관함 초안 무료 사진, 제안 범위 빌드) | 초안 무료 사진 `922cedd37` |
| `threads-content-ops` | v2.17 · 2026-10-23 (작성 탭 무료 사진 — 보류 패치 적용, Claude Code 윈도우, 승인 빌드 1회) | 없음 |
| `threads-content-ops` | v2.16 · 2026-10-23 (상품 연동 공용 기준 코드 `affiliate-clients` 사본, 승인 빌드) | 없음 |
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
