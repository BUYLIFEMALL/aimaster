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


- **공통 — 30일 삭제 예외(2026-11-01 주인님 승인, 추가 배포 없음):** 서버 30일 정리 코드가 있는 프로그램을 배포할 때 함께 고친다. 삭제 전에 `profiles.retention_exempt = true`인 회원을 읽어 표 행(`user_id`)과 파일(경로 첫 폴더)에서 제외한다. 이메일은 코드에 적지 않는다. 공유 버킷(`post-images`, `insta-post-images`)은 함께 쓰는 프로그램이 모두 고쳐져야 파일이 지켜진다. 위험·대상: `docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md` §3.




- `coupang-ops` — 텔레그램 끊기, 다른 프로그램 봇 빌려 쓰기 제거 (2026-11-01, [역할: ecommerce-image], `8479b2009`, 실제 끊기 내 PC에서 통과) · 페이지 설명 위너 문구 제거(`ebd28e0e9`)
- `commercial-land-trade-alert` — 쿠팡 봇을 봇 고르기·빌려 쓰기에서 제외 (2026-11-01, [역할: realty], 서버 코드만, 다음 배포 때 함께)



| 프로그램 | 무엇(작은 소스 수정) | 커밋 | 날짜 · CLI | 상세 위치 | 다음 배포 때 |
|---|---|---|---|---|---|
| `commercial-land-trade-alert` | 실거래 목록 「분류」 거르기에 공장·창고 용도(공장·창고시설·자동차 관련시설) 추가, 종류 전체 선택 이름 「모든 종류」(v1.31 운영 확인 중 발견) | 이 커밋 바로 뒤 `fix(commercial-land-trade-alert)` | 2026-11-04 · [역할: realty] `claude-win-realty-docs` | `commercial-land-trade-alert/AGENTS.md` v1.31 | 다음 상가 배포 때 함께(+0.01) |
| `free-music-studio` | 작업 대기열의 「180초」를 「요청 길이 3분」으로(실제 곡 길이와 헷갈림, 마우스를 올리면 설명) + 곡 만드는 데 걸린 시간 배지(만드는 중 「지금까지 ○분」 3초마다 갱신, 완료 「걸린 시간 ○분 ○초」, 엔진이 이미 기록하던 startedAt·finishedAt 사용 — 엔진 변경 없음) | `803439ff0`, `9f6dd1ebc` | 2026-11-04 · [역할: music] `claude-win-20261024-music` | `free-music-studio/src/app/(dashboard)/queue/page.tsx` | v1.19와 함께 |
| `free-music-studio` | 엔진 0.6.4: MiniMax Music 3 「Failed to create component transformer」 수정 — 오프라인 실행에서 받아 둔 폴더로 부품을 불러오고, 부품이 비면 바로 실패 표시(마스터PC에서 1시간 반 헛돎). **MiniMax 시험에 필요** | `786c6627a` | 2026-11-04 · [역할: music] `claude-win-20261024-music` | `free-music-studio/engine/src/py/run_minimax3.py`, `docs/ERROR_LESSONS.md` 2026-11-04 | v1.19와 함께 |
| `free-music-studio` | 엔진 0.6.4: 탐색기로 저장 폴더에 옮긴 곡도 같은 파일 이름으로 찾아 「모든 음악」 재생·받기 유지(기록된 자리에 없으면 지금 저장 폴더와 그 아래 세 단계 폴더에서 찾음 — 장르별 폴더 정리, 모델·숨김 폴더는 건너뜀, 마스터PC E:\AI-Musc → Song\Best). 설치 파일 새로 만들어야 함 | `43e3b98a0`, `b12263837`, `1b012e633` | 2026-11-04 · [역할: music] `claude-win-20261024-music` | `free-music-studio/engine/src/library.mjs` | v1.19와 함께 |
| `free-music-studio` | 한국어를 못 부르는 노래 엔진은 선택지에서 뺌(주인님 지시) — LeVo 2 제외(마스터PC 실물: 영어 단어만 반복, 공식 표도 zh·en만), 엔진마다 한국어 상태(된다·안 된다·시험 전), MiniMax Music 3은 「시험 전」 안내, 내 PC 엔진 「사용할 엔진」 목록에서도 숨김(받아 둔 PC만 지우기용으로 보임) | `5e9507063`, `5d8a47833`, `60ee2fe0b` | 2026-11-04 · [역할: music] `claude-win-20261024-music` | `free-music-studio/AGENTS.md` 미배포 대기(v1.19) | v1.19, 다음 배포 때 함께 |
| `banana-canvas` · `shop-detail-page` | 무료 지우기 회색 얼룩 수정(조각 자리에만 붙이기, 공용 `browser-free-erase`) | `d2181359e` | 2026-11-03 · [역할: ecommerce-image] `claude-win-sdp` | `banana-canvas/docs/IMPROVEMENT_BACKLOG.md` | 바나나 v1.43·상세페이지 +0.01, 배포 뒤 같은 배너 전후 비교 |
| `banana-canvas` | E5-4 한글 이름·주소 가리기(「한글 이름·주소도」, 한국어 글자 읽기 모델 13MB 브라우저 첫 1회) | `1dd57ac12` | 2026-11-03 · [역할: ecommerce-image] `claude-win-sdp` | `banana-canvas/docs/IMPROVEMENT_BACKLOG.md` E5-4 | v1.43, 운영에서 송장 사진으로 확인 |
| `banana-canvas` · `thumbnail-master` · `insta_auto_poster` · `shop-detail-page` | E5-5 무료 도구를 썸네일·인스타 카드뉴스에서도: 공용 `nukki-handoff` 보낸 곳 여러 개, 바나나 받기 훅(무료 이미지 도구·무료 지우기), 썸네일 「🧽 무료 지우기」→새 버전(받기 API `POST /api/projects/[id]`), INSTA 슬라이드 「✂ 누끼·🙈 가리기·🧽 지우기」→이 장 새 이미지. 시험 바나나 29·썸네일 19·INSTA 78+2, tsc·로컬 build 4곳 | `75bd2728d` | 2026-11-04 · [역할: ecommerce-image] `claude-win-sdp` | `docs/roles/ecommerce-image.md` 이미지 인계 | 바나나 v1.43과 함께, 썸네일·INSTA·상세 +0.01. 배포 순서 바나나 먼저. 배포 뒤 운영 창끼리 보내기·되돌려 넣기 확인 |
| `banana-canvas` | E5-4 숫자 자리 판정 기준 화면 조절(숫자 개수·비율, 브라우저 기억) | `90410e158` | 2026-11-03 · [역할: ecommerce-image] `claude-win-sdp` | `banana-canvas/docs/IMPROVEMENT_BACKLOG.md` E5-4 | v1.43, 운영 화면 확인 |
| `trending-product-finder` | 확장 창 「마켓」 선택을 큰 버튼 두 개로(쿠팡 빨강·네이버 초록) + 새 버전 알림(`/api/extension/version`·확장 창 띠) + 이 PC 목록 쓰기 잠금·지운 기록 | `19e1aed3b` · `ddfa8359e` | 2026-11-03 · [역할: ecommerce-image] `claude-win-sdp` | `trending-product-finder/AGENTS.md` v1.35 아래 | v1.36·manifest·ZIP·DB 함께 |
| **12월 모델 교체 묶음 A (12-11 호출 실패 — 기한 있음)** `ai-auto-blog` `142cb45ec` · `tistory-auto-blog` `7eb961fbd` · `naver-blog-seo-studio` `6103af9a8` · ~~`real_estate_sales` `7b55bd09d`~~(✅ v1.42 배포에 실림, 11-03 realty 세션) · `threads-affiliate-poster` `0caadc5ee` | `gpt-5`·`o3`·`gemini-2.5` 선택지 삭제 + 저장된 옛 값을 대체 모델로 읽기(`gpt-5`/`o3`→`gpt-5.6-sol`, 2.5→`3.8-flash`). tsc 통과, SEO 시험 158 통과 | 각 프로그램 줄 | 2026-11-03 · [역할: mac-mini] Claude Code(맥미니) | `docs/PLAN_20261103_MODEL_MIGRATION_DEC.md` | **12-05까지 다른 배포가 없으면 12-10 전에 이 5개만 배포 여쭘**(주인님 11-03). ⚠ MAC 7개 배포(요청 63ff201b)는 11-03 08:32~08:45에 `claude-win-sdp`가 이미 끝냈고 이 교체 커밋(10:24~)보다 먼저라 **실리지 않음** — 블로그·티스토리·SEO·threads·blog-keyword 모두 아직 미배포(11-03 14:31 배포 시각 대조, `claude-win-20261103-deploy`) |
| 12월 모델 교체 묶음 C(일부) `blog-keyword` `fb1d16075` · `ai-writing-editor` `aae03dda7` · `banana-canvas` `b8fa1638c` · `personality-suite` `73e8ac110` · `thumbnail-master` `dc64d2eae` | 텍스트 실패 대비 목록 `["gemini-3.5-flash","gemini-2.5-flash"]` → `["gemini-3.8-flash","gemini-3.5-flash-lite"]`(개수 같음, 대기 시간 변화 없음). tsc 통과 | 각 프로그램 줄 | 2026-11-03 · [역할: mac-mini] Claude Code(맥미니) | 같은 플랜 | 다른 배포 때 함께(급하지 않음 — 12-01 뒤에도 자동 연결로 동작). `blog-keyword`는 MAC 7개 배포에 함께 |
| 12월 모델 교체 묶음 C(나머지) `ai-doc-chatbot` `3be5e593d`(공용 기준 `ProviderSelect` — 사본 `ai-prompt-studio`) · `ai-prompt-studio` `83324cf24` · `ai-slide-builder` `0672e4e43` · `allinone-graphic` `30148e8c0` · `cinematic-storyboard-studio` `cdd576bcf` · `persona-style-studio` `3247aed17` · `photo-remake-studio` `e0ce4d84d` · `portrait-photo` `2a4538625` · `react-ui-showcase` `543085c0f` · `ui-canvas` `7afee3c23` · `vinyl-lp-studio` `f4f582f09` · `fashion-style` `c40cc3396` · `landing-architect` `8b2d37718` · `reverse-prompt` `0e8f645cf` | 고정 `gemini-2.5-flash`·대체 목록 → `gemini-3.8-flash`(마지막 `3.5-flash-lite`). `ai-prompt-studio`는 서버 검사(`api/templates/execute`)가 새 값·옛 값 둘 다 받음. tsc 14개 통과 | 각 프로그램 줄 | 2026-11-03 · [역할: mac-mini] Claude Code(맥미니) | 같은 플랜 | 다른 배포 때 함께(급하지 않음) |
| 12월 모델 교체 묶음 B(선택 칸 있는 12개) `instagram-comment-reply` `3de8c5d73` · `threads-comment-reply` `ac6cc6736` · `youtube-auto-reply` `5e994cd8f` · `web-crawler` `4206fcdaa` · `ai-mastering-studio` `946660f65` · `playlist-channel-studio` `25a73b0c8` · `blog-content-maker` `bacde857b` · `blog-workroom` `bf5587fbb` · `emotion-writer` `c551b56da` · `ghost-scraper` `5e2a7819f` · `ai-webtoon-studio` `184f3f2ca` · `ebook-studio` `9b1e6fdd2` | 선택 칸의 2.5·3.6·3.7·1.5 → `3.8-flash`/`3.5-flash-lite`(일부 `4-argon` 추가) + **저장된 옛 값(회원 설정·작업·브라우저 저장)을 읽는 곳에서 새 모델로 변환**. tsc 12개 통과. 마스터링 시험 13 통과(1건은 맥 환경 문제), **플레이리스트·블로그 작업실·감성 글쓰기 시험은 맥에서 열리지 않음 → 배포 때 윈도우가 `npm test`** | 각 프로그램 줄 | 2026-11-03 · [역할: mac-mini] Claude Code(맥미니) | 같은 플랜 | 다른 배포 때 함께(급하지 않음). **윈도우 시험 3개 통과(11-03 14:35, `claude-win-20261103-deploy`): 플레이리스트 28·블로그 작업실 13·감성 글쓰기 35** — 배포 직전 코드가 바뀌었으면 다시 돌림. `blog-neighbor-care`(같은 모델 파일)는 윈도우 blog 세션 몫 — `web-crawler` `4206fcdaa`와 같게 |
| 30일 보관 열외(관리자·시험 계정) 블로그 5개(올인원·에이전트는 11-03 배포됨): `blog-workroom` `f1d9e7dcc` · `blog-content-maker` `9198c0da8` · `blog-keyword` `6c9f6d8a1` · `tistory-auto-blog` `00481371a`(+시험 `8ce1156a9`) · `naver-blog-seo-studio` `4e1eab489` | 예외 회원(`profiles.retention_exempt`)은 30일 자동 삭제·조회 숨김에서 빠짐. tsc 7개 통과, 시험(티스토리 46·SEO 158·에이전트 글감 등) 통과 | 각 프로그램 줄 | 2026-11-03 · [역할: mac-mini] Claude Code(맥미니) | `docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md` §6 | 블로그 배포 때 함께(주인님 11-03 「블로그는 모았다가」) |
| 30일 보관 열외(관리자·시험 계정) 블로그 밖 21개: `threads-content-ops` `657b44c3c` · `threads-affiliate-poster` `fea3571a8` · `threads` `567567979` · `shop-detail-page` `668f6532a` · `ai-image-studio` `21f22863d` · `ai-music-studio` `78e3eb561` · `ai-video-studio` `84e1de257` · `banana-canvas` `a17062357` · `cinematic-storyboard-studio` `97a6d8589` · `coupang-ops` `a4a3b1857` · `music-video-studio` `ed488d875` · `smartstore-register` `e619be285` · `style-dna-analyzer` `dd305ff4e` · `trending-product-finder` `e7c031b6f` · `youtube-auto-reply` `e3f93b8d7` · `thumbnail-master` `16eb5d6e2` · `reverse-prompt` `a253ae63d` · `portrait-photo` `0fef47e81` · `four-cut-comics` `508565e5d` · `shorts-onestop-studio` `c720528f6` · `shots` `ab4595846` | 매일 정리(크론)·화면 진입 정리에서 예외 회원(`profiles.retention_exempt`)의 행·파일·회원 폴더를 건너뜀, 예외 목록을 못 읽으면 503/오류로 정리 전체를 멈춤(`lib/retentionExempt.ts`). tsc 21개 통과, 관련 시험(스토리보드 3·인물사진 4·네컷 8) 통과. `commercial-land-trade-alert`는 공공 거래 자료(회원 칸 없음)라 제외, `blog-neighbor-care`는 윈도우 blog 세션 몫 | 각 프로그램 줄 | 2026-11-03 · [역할: mac-mini] Claude Code(맥미니) `claude-mac-20261101-blog` | `docs/PLAN_20261031_RETENTION_EXEMPT_ACCOUNTS.md` §6 | 각 프로그램 다음 배포 때 함께(급하지 않음). 쓰레드 3개는 공유 버킷 `post-images` 보호에 필요 — 먼저 배포되면 좋음 |
| `ghost-scraper`(website-scraper) | 사이드바 고정 「FREE」 표시 삭제 — DB 배지 없음·비공개라 DB와 다름(2026-11-03 배지 전수 조사) | `937ce820d` | 2026-11-03 · Claude Code(윈도우) `claude-win-20261029-statusbar` | `src/components/layout/Sidebar.tsx` | 다음 배포 때(버전 +0.01) |
| `ai-work-workspace` | 회의록 요약 소제목 한국어화(v1.20 운영 시험에서 「Action items」 영어로 나옴), 페이지 휴지통 안내 한국어화 | `297efb419`·`1551c9041` | 2026-11-03 [역할: workspace] Claude Code(윈도우) | `ai-work-workspace/docs/IMPROVEMENTS.md` | 다음 배포 때(v1.21) |
| ai-influencer-studio, ai-mastering-studio, ai-prompt-studio, ai-slide-builder, ai-writing-editor, allinone-graphic, banana-canvas, blog-workroom, booking-reminder, cinematic-storyboard-studio, insta_auto_poster, kakao_auto_poster, landing-architect, mbti-character, personality-suite, persona-style-studio, prompt-template-studio, react-ui-showcase, reverse-prompt, shop-detail-page, stepmail, style-dna-analyzer, thumbnail-master, ui-canvas, vinyl-lp-studio, youtube-viral-studio | API 키 암호화 문구 수정(문구만, 각 프로그램 다음 배포 때 함께) | `b16550ad4` | 2026-11-01 [역할: realty] Claude Code(윈도우) | `docs/HANDOFF_20261101_MVS_DEPLOY_AND_API_KEY_WORDING.md` |  |
| `shop-detail-page` | 마켓 등록에 쿠팡 칸 추가(2026-10-31 `claude-win-sdp`, tsc 통과, 쿠팡 v1.05 연계) |
| `seller-label-docs` | 공용 흐름 띠 사본에 「🛒 마켓 등록」 단계 추가(`shop-flow` 사본만, 동작 변화는 띠 단계 하나) | `48b67dd5c` | 2026-10-27 · [역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp` | `docs/SHARED_MODULES.md` shop-flow 줄 | 각 프로그램 다음 배포 때 함께(버전 +0.01) |
| `detail-page-12p` · `auto-detail-page` (이동 안내만) | EC-W12 쓰이지 않던 옛 엔진·화면 파일 39개 삭제(화면·경로 동작 변화 없음, 백업·태그 있음). 일부러 배포할 필요 없음 — 다른 이유로 배포할 때 함께 나감 | `4e660826a` | 2026-10-26 · [역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp` | 각 폴더 `AGENTS.md` 맨 위 | 함께 나가면 이 줄을 「내보낸 기록」으로(버전은 그때 +0.01) |
| `music-video-studio` (운영 v1.26) | 참고 이미지를 새로 고침으로 잃어도 화풍 분석 결과가 있으면 영상 전에 그 화풍으로 장면 이미지를 먼저 만들기(`scenes/page.tsx` 조건 한 줄) | `fde4c94bf` | 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-music` | `music-video-studio/AGENTS.md` v1.26 | v1.27 |
| `music-video-studio` (운영 v1.26) | 문구 정정: 최종 합치기 「추가 비용 없음」, 이미지 유료 안내, 설정 단가 $0.10, 곡 고르는 단계, 매뉴얼 Suno·보관함 설명 · 최종 뮤직비디오 안내 문구 간결화 | `30a53cbc2`·`04afb0c91` | 2026-10-31 · Claude Code(윈도우) `claude-win-20261029-statusbar` | 이 줄 | v1.27 |
| `booking-reminder` | 테스트 문자·이메일 테스트·텔레그램 연동 메시지에 남아 있던 「구글폼 CRM」 → 「예약(취소)방지 리마인드 자동화」 + 공용 `solapi-client` 사본 등록 | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `booking-reminder/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `stepmail` | 테스트 문자 「[구글폼 CRM]」 → 「[대량 메일발송 자동화(Step Mail)]」 + 공용 `solapi-client` 사본 등록 | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `stepmail/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `crm-google-form` | 공용 `solapi-client` 기준 등록(머리 주석만) | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `crm-google-form/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01 |
| `kakao_auto_poster` | 공용 `solapi-client` 사본(주석·쓰지 않는 `sendRcs`) · ⚠ 로컬 빌드가 Next.js 16.4.0 보안 경고로 멈춤 | `36d0a4fdc` | 2026-10-23 · Claude Code(윈도우) | `kakao_auto_poster/docs/IMPROVEMENTS.md` 맨 아래 | **배포 전에 Next.js 보안 업데이트 필요할 수 있음**(주인님 승인), 버전 +0.01 |
| `instagram-comment-reply` (운영 v1.36) | 설정 「다음 확인 예정」 시각 · 「실행 방식 바꾸기 ↓」 바로가기 | `24562d6aa` | 2026-10-23 · Claude Code(윈도우) | `instagram-comment-reply/docs/IMPROVEMENTS.md` 맨 아래 | 버전 +0.01, 설정에서 다음 확인 예정·바로가기 확인 |
| `portrait-photo` | 서버 보관함 30일 정리가 회원별 `usage_logs` `cleanup_expired`(images, 경로 첫 폴더로 회원) 기록 — 공용 `cleanup-usage-log` 사본 | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `portrait-photo/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `reverse-prompt` | 분석 기록 30일 정리가 회원별 `usage_logs` `cleanup_expired`(history) 기록 — 공용 `cleanup-usage-log` 사본(1시간 임시 파일은 세지 않음) | `8ad8ea2e5` · `f53021369` | 2026-10-23 · Claude Code(윈도우) | `reverse-prompt/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `four-cut-comics` | 서버 보관함 30일 정리(`/api/cron/cleanup`)가 회원별 `usage_logs` `cleanup_expired`(images=지운 작품 수) 기록 | `4cafe5eb3` | 2026-10-23 · Claude Code(윈도우) | `four-cut-comics/docs/IMPROVEMENTS.md` 「미배포 대기(정리 기록)」 | 배포 뒤 다음 정리 시각에 관리자 「30일 자동 정리」 표에 줄이 생기는지 확인 |
| `allinone-graphic` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `allinone-graphic/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `naver-cafe-poster` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `naver-cafe-poster/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `persona-style-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `persona-style-studio/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `react-ui-showcase` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `react-ui-showcase/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `ai-slide-builder` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `ai-slide-builder/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `kakao_auto_poster` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `kakao_auto_poster/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `shorts-viral-studio` | 좌측 메뉴 계정·로그아웃을 마지막 메뉴 바로 아래로(클래스만) | `22c6cda35` | 2026-10-23 · Claude Code(윈도우) | `shorts-viral-studio/docs/IMPROVEMENTS.md` 「미배포 대기」 | 버전 +0.01, 데스크톱·휴대폰 폭 계정 위치 확인 |
| `competitor-analysis` | 경쟁사 분석 화면 안내 문구 정정(「다른 회원이 조사한 회사 정보 재사용」 → 본인 30일 안 조사만) | `87b773ef2` | 2026-10-23 · Claude Code(윈도우) | `competitor-analysis/AGENTS.md` 2026-10-23 v1.09 절 | 버전 +0.01 |
| `emotion-writer` (운영 v1.26) | 사용 매뉴얼 사진 출처 「Unsplash」 → 「Pixabay·Pexels」 7곳·저작권 안내 문구 | `1965b2c6c` | 2026-10-23 · Claude Code(윈도우) | `emotion-writer/AGENTS.md` 맨 아래 「⏸ 미배포」 | 버전 +0.01, `/guide` 문구 확인 |

## 메인 사이트 — 다음 메인 빌드 때 할 일 (코드 미작성)

> 2026-10-23 신설(Claude Code 윈도우, 주인님 승인 제안). 메인 사이트(루트 `app`·`components`·`lib` 등)는 **푸시하면 바로 자동 빌드**되므로 작은 화면 수정은 코드를 미리 쓰지 않고 여기에 모았다가, 빌드 1회(사전 승인)로 묶어 구현·배포한다. 구현해 내보내면 줄을 지우고 위 「내보낸 기록」에 `.`(메인 사이트)로 적는다. **「급함」 칸**: 회원에게 바로 피해가 가는 화면 문제(오류·잘못된 안내·막힌 기능)는 `급함` — 이 표를 기다리지 않고 주인님 승인 뒤 바로 빌드한다(쌓인 `보통` 줄도 그때 함께 넣어 빌드 1회로). 관리자 화면 편의·문구는 `보통`. 다른 CLI가 적은 줄은 지우지 않는다(내보낸 경우만).

| 할 일 | 급함 | 관련 파일 | 근거·메모 | 적은 날 · CLI |
|---|---|---|---|---|
| 수동 목록 「결제 전 정지」 표시 내보내기(**2026-11-01 블로그 세션 푸시로 메인 자동 빌드 `aimaster-jb21pzhit` Ready, 운영 반영됨 — 회원 상세 화면 확인만 남음**) | 낮음 | `components/admin/MemberDetail.tsx`, `types/database.types.ts` | 커밋 `8b117fced`. 주인님 지시: 다음 배포 때 함께. 푸시 뒤 회원 상세에서 정지 권한 표시 확인 | 2026-11-01 · Claude Code(윈도우) claude-win-20261029-statusbar |

## 내보낸 기록

| 프로그램 | 배포 버전 · 날짜 | 함께 나간 대기 항목 |
|---|---|---|
| `blog-neighbor-care` | v1.16 · 2026-11-04 ([역할: blog] 윈도우 `claude-win-blog`, 주인님 승인 빌드 1회, `blog-neighbor-care-3bof0lg0q`) | 단계 A 화면 정리(메뉴 4개·실행 허용/모델 설정 한 곳·기기 허용 저장값 표시·Gemini 3개·매뉴얼 3+3) `587d08f6d`. DB 변경 없음, DB/ZIP OK |
| `real_estate_sales` | v1.49 · 2026-11-04 ([역할: realty] `claude-win-realty-docs`, 주인님 「진행해」 빌드 1회, `real-estate-sales-kocrxxfxc`) | 서울 분양권 계약일순 재정렬 |
| `real_estate_sales` | v1.48 · 2026-11-04 ([역할: realty] `claude-win-realty-docs`, 주인님 「진행해」 빌드 1회, `real-estate-sales-l6lj3bimi`) | 「지금 조회하기」 시간 예산(`6d89f342f`, 운영 220초에 끝까지 확인) + 분양권(SilvTrade) 다섯째 유형 |
| `blog-neighbor-care` | v1.15 · 2026-11-04 ([역할: blog] 윈도우 `claude-win-blog`, 주인님 승인 빌드 1회, `blog-neighbor-care-3focphnt6`) | 30일 보관 열외(운영 SQL `20261104120000` 적용, 열외 자료 87줄 무기한) + 12월 모델 교체 묶음 B(`web-crawler`와 같은 파일) `0a3a8c9f1`. DB/ZIP OK. 위 「12월 모델 교체 B」·「30일 보관 열외」 줄의 `blog-neighbor-care` 몫 처리 완료 |
| `free-music-studio` | v1.18 · 엔진 0.6.3 설치 파일 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 빌드 1회) | LeVo 2 「pkg_resources 없음」 수정(`ae3578ec5`) + 다운로드 센터 버전 표시 두 개(`82f037ee7`) |
| `free-music-studio` | v1.17 · 엔진 0.6.2 설치 파일 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「배포해」 빌드 1회, `free-music-studio-91rlksdgq`) | LeVo 2 모델 v1 base-full로(`4ba8bbb1f`) + 버전 표시 크고 밝게(`9b90e3463`) |
| `free-music-studio` | v1.16 · 엔진 0.6.1 설치 파일 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「배포해」 빌드 1회, `free-music-studio-5gh1o5hsp`) | LeVo 2 LFS 자리표시 파일 자동 수정(`40506bee7`) |
| `free-music-studio` | v1.15 · 엔진 0.6.0 설치 파일 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 「진행해」 승인 빌드 3회 중 3회째, `free-music-studio-e1xugpr05`) | 2차 MiniMax Music 3(`d7a52afbd`) + LeVo 2 torch.load 수정 + 실패 원인 표시 + 새 판 안내 + 노래 폴더 안내 문구 |
| `free-music-studio` | v1.14 · 엔진 0.5.0 설치 파일 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 빌드 1회, `free-music-studio-arwl7qh3c`) | 모델 저장 공간 관리(안 쓰는 모델 지우기·모델 폴더를 다른 드라이브로·설치 확인 창 없앰) + 미배포였던 받기 진행 막대(`c4468c688`) |
| `free-music-studio` | v1.13 · 엔진 0.4.1 설치 파일 · 2026-11-04 ([역할: music], 「진행해」 승인 빌드 3회 중 2회, `free-music-studio-m3pwx8pti`) | 추가 엔진 설치 실패(torch 판 맞추기) 수정 |
| `free-music-studio` | v1.12 · 엔진 0.4.0 설치 파일 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 승인 빌드 3회 중 1회, `free-music-studio-jma2o97ob`) | 음악 엔진 더 넣기 1차(HeartMuLa·Stable Audio 3·LeVo 2, 상업용·개인용 두 묶음) + 미배포였던 `/downloads` 로그인 검사 제외(`9d0d6fae9`) |
| `free-music-studio` | v1.11 · 엔진 0.3.0 설치 파일 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 빌드 1회, `free-music-studio-3jjuvdkqi`) | 원클릭 다운로드 센터(설치 파일 106.7MB·`engine-latest.json`·윈도우 경고 안내·[설치한 엔진 켜기]) + 미배포였던 「ACE-Step 음악 모델 구성」 제목(`6fc4b7ac3`) |
| `free-music-studio` | v1.10 · 엔진 0.2.0 · 2026-11-04 ([역할: music], 빌드 1회, `free-music-studio-pre6r21xo`) | 비상업용 YuE2·재생바·실패 이유 표시·구성 안내·프리셋 안내 |
| `free-music-studio` | v1.09 · 엔진 0.1.6 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 빌드 1회, `free-music-studio-astk6ny4p`) | 로드맵 3단계 작업 대기열(`d6880119a`) + 프리셋 지운 뒤 안내(`ea6bba1d9`). 가짜 음악 엔진으로 API·운영 화면 확인 |
| `free-music-studio` | v1.08 · 2026-11-04 ([역할: music] `claude-win-20261024-music`, 주인님 「DB 표 만들어서 2단계 진행해」 SQL 1회 + 빌드 1회, `free-music-studio-ky09xxsqq`) | 로드맵 2단계 만들기 강화(`273934d52`, SQL `20261104_v1_08_presets.sql` 먼저 실행·RLS 확인) + 1단계 표시 버전(v1.06 → v1.08, v1.07 건너뜀, DB 맞춤). 로그인 없는 새 API 401 확인, 로그인 화면 확인은 주인님 로그인 대기 |
| `free-music-studio` | v1.06 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 SQL 1회 + 빌드 1회, `free-music-studio-83c438grx`) | 가져온 음악 커버·부분 수정(`8c7d2d039`, SQL `20261103_v1_06_cover.sql` 먼저 실행·규칙 확인) + AI 작사 OpenAI/Claude/Gemini(`70b78a36d`) + 최고 품질 엔진 0.1.4(`4b6514cee`) + 한글 Enter(`e17ace42a`). 로그인 없는 차단 확인, 화면 확인은 ego 로그인 풀려 대기 |
| `realty-client-desk` | v1.08 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 주인님 지시 빌드 1회, `realty-client-desk-21gyn8g6j`) | 일정 알림 기본·유일 = 회원 cron-job.org, 가입하기 버튼(SOLAPI·OpenAI·Claude·Gemini·cron-job.org), AI 초안 플랫폼 3개·모델 선택(`dffad1a6a`). DB SQL `20261103060000_cronjob_default_ai_engines.sql`은 주인님 「진행해」 승인 뒤 ego SQL 적용(vercel 행 0·소개 문구 반영 확인) |
| `realty-client-desk` | v1.07 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 주인님 지시 빌드 1회, `realty-client-desk-nf5kq3r0m`) | 중개보수 계산기 지역 선택(17개 시·도, 서울·충남·충북 공식 게시본 대조 표시, 나머지 조례 이름 안내)(`f2e5d32fc`). 운영 화면 확인 |
| `free-music-studio` | v1.05 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 SQL 1회 + 빌드 1회, `free-music-studio-4h0idon07`) | 프로젝트·플레이리스트(`0e30aa896`, SQL `20261103_v1_05_collections.sql` 먼저 실행·RLS 확인) + 사이트 안 한글 폴더 고르기(`c1f99cbd3`). ego lite에서 프로젝트·플레이리스트 만들기·지정·담기·곡 수 확인 |
| `naver-blog-agent` | v2.27 · 2026-11-03 (Claude Code 윈도우 `deploy-naver-blog-agent`, 맥미니 요청 「블로그 급한 2개」·주인님 승인 빌드 2회 중 2번째, `naver-blog-agent-ea60hyj4o`) | 종료된 `gpt-image-1` 교체 `87b12267e` + 30일 열외 글감 `27795e295`·비공개 사진 `01d973bf6`. 시험 46·tsc 통과, DB/ext/ZIP v2.27 OK |
| `naver-blog-allinone` | v1.60 · 2026-11-03 (Claude Code 윈도우 `deploy-naver-blog-allinone`, 같은 승인 1번째, `naver-blog-allinone-348m64t7u`) | 종료된 `gpt-image-1` 교체 `87b12267e` + 30일 열외 `0e46894fb`. 시험 38·tsc 통과, DB/ext/ZIP v1.60 OK |
| `trending-product-finder` | v1.35 · 2026-11-03 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드 1회 `trending-product-finder-l1cvtpead`) | 매일 예약 마켓별(쿠팡·네이버 따로, 겹치면 10분 뒤 재시도·저장 때 안내) `90f85b4e5`. 시험 42·tsc·빌드, DB/ZIP v1.35 OK, ego 예약 옮김·겹침 안내·알람 확인 |
| `realty-client-desk` | v1.06 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 주인님 「중개보수 계산기 작업해」 빌드 1회, `realty-client-desk-mdyg9kbm3`) | D5 중개보수 계산기 `/fee`(시행규칙 제20조 별표 1·2, 월세 ×100/×70, 한도·부가세), 매물 화면 값 채움 링크(`047e0dc42`). 운영 화면 계산값 3가지·390px 확인 |
| `trending-product-finder` | v1.34 · 2026-11-03 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드 1회 `trending-product-finder-kl5zo2n5q`) | 스마트스토어 상품소싱기(네이버 쇼핑 구매·리뷰 거르기, 쿠팡 확장에 마켓 추가) `e09fc075c` 외. 운영 DB 칸 4개 적용(배포 전), 시험 40·tsc·빌드, DB/ZIP v1.34 OK, ego 자동 검색 실검수(「접이식 캠핑의자」 56개 저장) |
| `realty-client-desk` | v1.05 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 플랜 4단계 빌드 1회, `realty-client-desk-hsthsm95m`) | 4단계 광고 명시 항목 점검·AI 광고 글/문자 초안(회원 본인 Claude 키, 저장 안 함)·사무소 등록번호/성명·Claude 키 칸(`4be6ba487`, 칸 3개 ego SQL). 시험 계정 점검 표시·AI 초안 1회·문자 칸 넣기·390px 확인 |
| `realty-client-desk` | v1.04 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 플랜 3단계, `realty-client-desk-ffflmwj64` — 첫 시도 `5gb804l8q`는 CRON_SECRET 끝 줄바꿈으로 2초 만에 실패) | 3단계 일정·아침 8시 알림(회원 SOLAPI→회원 본인 핸드폰)·회원 실행 방식(Vercel 기본/내 cron-job.org)·운영 아침 호출(1년 정리 포함)(`e43a37bae`, 표 2개 ego SQL, `CRON_SECRET` 새로 등록). 시험 계정 일정 넣기·상태 줄·대시보드·설정·390px 확인, 실행 주소 가짜 토큰 401 |
| `realty-client-desk` | v1.03 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 플랜 2단계 승인 빌드 1회, `realty-client-desk-qztxwj8fc`) | 2단계 내 매물·맞는 고객·광고 문자(회원 SOLAPI)·무료 수신거부 화면(`8a022ffcc`, 새 표 3개 ego SQL 적용). 시험 계정 운영 화면에서 등록→매칭→미리보기→수신거부 확인·390px 5화면, 실제 문자는 시험 계정 SOLAPI 없어 미발송 |
| `free-music-studio` | v1.02 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 주인님 「진행해」 빌드 1회, `dpl_7Fj5fc8d1KZvRmv9KLBebstf2aaq`) | 3단계 웹 ↔ 내 PC 엔진 연결(`1b6a3c2df`) + 대기 3건(`96f04aee3`: 설정 「확인 중」·Apple Silicon 「아직 측정 전」·Intel 맥 줄). ego lite에서 연결 코드 → 30초 곡 생성 → 재생·MP3 확인 |
| `real_estate_sales` | v1.45 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 주인님 「삭제/수정 기능 넣어달라니까」 빌드 1회, `dpl_6pWGcoSGzNCwzkatqknsYnWm3aR3`) | 설정 「카카오 알림톡 템플릿」 🗑 삭제 버튼·값 검사(`29ae525ca`). 운영 설정 화면(시험 계정)에서 버튼·안내 확인 |
| `real_estate_sales` | v1.44 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 주인님 「진행해」 빌드 1회, `dpl_2HsMQiwfYqZDVeVnKgWLSdegcA7h`) | B3 임장 모드 — 리포트에 임장 사진·메모, 저장 리포트 나란히 비교(`f35b2b73b`) + B2 작은 수정 3건(`a94d618ea`). 운영 화면·390px 확인 |
| `real_estate_sales` | v1.43 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 주인님 채팅 승인 빌드 1회, `dpl_9pSAFXbNyz5Uox1pAcBa8inVqXVw`) | B2 주소 리포트 호가 비교·저장·Claude AI 총평·인쇄(`31695e09a`, 새 표 `real_estate_saved_reports` ego SQL 적용) + 건물 칸 총괄표제부(`83d3f0daf`). 운영 화면에서 저장·AI 총평 1회·인쇄 확인, 용적률·건폐율·주차 값 확인 |
| `realty-listing-alert` | v1.43 · 2026-11-03 ([역할: realty] `claude-win-realty-docs`, 주인님 채팅 승인 빌드 1회, `dpl_4rdqQWg2ZHkTsFHTfAhcLsZFkuPQ`) | 확장: 네이버 화면 필터(`tradeType`)가 남아도 감시 조건대로 읽기·조건 밖 매물은 「사라짐」 대신 기록에서 뺌. DB·확장·ZIP v1.43 `check-extension-release` OK, 운영 화면 v1.43 확인. (대기에 남아 있던 A3 링크·단지 위치 한정 두 줄은 v1.42에 이미 나간 것이라 정리) |
| `ai-work-workspace` | v1.20 · 2026-11-03 (`ai-work-workspace-kgvdb1nmm`, Ready, DB 버전 맞춤) | U6-B 음성 파일 받아쓰기 `03d5373a5`, 30일 예외 회원 제외 `20557e396`, 요약 중 자동 갱신 `05d0ec5f4`, 표 행 읽기 `94719d8da`, 요약 지침 이름 `26db40bd4` |
| `shots` | v1.45 · 2026-11-03 ([역할: video] `claude-win-video`, 주인님 채팅 승인 빌드 1회, `shots-bl2l6rixx`) | DUP-4 업로드 중복 방지 `7da2cb688` + API 키 암호화 안내 문구 `b16550ad4`(공통 줄에서 `shots` 뺌) — 운영 화면 v1.45·업로드 카드 「미게시」 배지 확인, 「확인 필요」 배지·재발송 확인 창은 시험 계정 채널 미연결이라 미확인 |
| `ai-video-studio` | v1.26 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `ai-video-studio-nikbwpt4l`) | 음성 `9045a5005` |
| `shorts-onestop-studio` | v1.43 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `shorts-onestop-studio-2z711hpa9`) | 음성 `9045a5005` + 안내 그림문자 `a95613743`, 코드 표기 v2.0 → v1.43(DB와 맞춤) |
| `ai-image-studio` | v1.31 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `ai-image-studio-2amw33trt`) | 이미지 `87b12267e` + API 키 문구 `b16550ad4` |
| `playlist-channel-studio` | v1.34 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `playlist-channel-studio-e5lnm0rdl`) | 이미지 `87b12267e`(GPT Image 1·1 mini·1.5 목록 제거, 옛 값 → flare) |
| `threads-affiliate-poster` | v1.85 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `threads-affiliate-poster-dg55pgkc0`) | 이미지 `87b12267e` |
| `threads-content-ops` | v2.22 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `threads-content-dq8rs2jct`) | 이미지 `87b12267e` |
| `threads-easy-planner` | v1.50 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `threads-easy-planner-matxodjk3`) | 이미지 `87b12267e` + API 키 문구 `b16550ad4` |
| `tarot` | v1.28 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 종료 모델 긴급 교체·승인 빌드 8회 중 1회 `tarot-ofrylsvat`) | 타로 `22fbd1b03` + API 키 문구 `b16550ad4` + 버튼 줄바꿈 `f0871e568` |
| `music` | v1.49 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 승인 빌드 1회) | 30일 정리 수정 `3f3bac612`·관리자·시험 계정 제외 `f4ac53ba3` + API 키 암호화 문구 `b16550ad4`. 시험 61·tsc, DB v1.49, 크롬 화면 v1.49. 2026-11-04 03:00 정리 뒤 남은 행 대조 예정 |
| `naver-blog-agent` | v2.26 · 2026-11-03 (`claude-win-sdp`, **주인님 승인으로 블로그 세션 대신 배포** — 작업 중 표 블로그 세션 줄은 그대로 둠, 빌드 `naver-blog-agent-8fw0nvubj`) | 좌측 메뉴 제목 옆 고정 「FREE」 삭제 `2a37dabc4`. tsc·빌드 통과, DB/ZIP OK |
| `playlist-channel-studio` | v1.33 · 2026-11-03 ([역할: music] `claude-win-20261024-music`, 승인 빌드 1회 `playlist-channel-studio-nb1fq7dnw`) | 최신 AI 모델 추가 `d2fc103ed` + API 키 암호화 문구 `b16550ad4`. 시험 28·tsc, 실제 호출 15개 통과, DB v1.33, 크롬 확인 |
| `shop-order-report` | v1.06 · 2026-11-03 ([역할: ecommerce-image] `claude-win-sdp`, 맥미니 요청·주인님 승인 빌드 1회 `shop-order-report-ojibtobuy`) | 쿠팡·11번가 수수료 공식 대조 `0a9870e16`. 시험 22개·tsc·빌드 통과, DB OK. 맥미니 화면 확인 대기 |
| `trending-product-finder` | v1.33 · 2026-11-03 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드 1회 `trending-product-finder-fnsqoe0di`) | 매뉴얼 쿠팡 상품소싱기 단계별 사용법·「PC에서만·켜 두기·결과는 휴대폰」 안내·⏰ 매일 예약·거부 징후 일시정지(「!」·컴퓨터 알림)·좌측 메뉴 확장 받기 버튼·버전 배지 `bdb918ca2` 외. DB/ZIP v1.33 OK, 운영 화면 확인 |
| `trending-product-finder` | v1.32 · 2026-11-03 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드 1회 `trending-product-finder-29uom1q0i`) | 쿠팡 상품소싱기 이름·판매량순 설명·판매 순위(사이트 `sales_rank`)·1년 보관·키워드 자동 검색 `6ce5b201c`(쿠팡 읽기 권한 추가) + 맥미니 쿠팡·11번가 수수료 공식 대조. 시험 33개·tsc·빌드, DB/ZIP OK, ego 자동 검색 실검수·확장 연결·사이트 저장(순위 1~54) 확인 |
| `trending-product-finder` | v1.31 · 2026-11-03 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드 1회 `trending-product-finder-j48lqxy7m`) | 수수료 공식 대조 `0a9870e16` + 쿠팡 리뷰 결과 회원별 사이트 저장·확장 연결 `308da3f1c`(자동 검색은 아직 없음, 쿠팡 시험 뒤). 시험 27개·tsc·빌드 통과, DB/ZIP OK. 연결·저장 화면 실동작 미확인 |
| `ai-auto-blog` | v1.86 · 2026-11-03 (`claude-win-sdp`, 맥미니 요청 승인 빌드 `ai-auto-blog-68j3hvewj`) | 30일 정리 예외 회원 제외 `204080c43`. tsc·빌드 통과, DB/ZIP OK |
| `tistory-auto-blog` | v1.95 · 2026-11-03 (`claude-win-sdp`, 맥미니 요청 승인 빌드 `tistory-auto-blog-mx8ptuijj`) | 30일 정리 예외 회원 제외 `204080c43`. tsc·빌드 통과, DB/ZIP OK |
| `blog-keyword` | v1.11 · 2026-11-03 (`claude-win-sdp`, 맥미니 요청 승인 빌드 `blog-keyword-fq3jr9crd`) | 사용법 배지 실제 버전 `c0af2aed9`. tsc·빌드 통과, DB OK(확장 없음) |
| `naver-blog-allinone` | v1.59 · 2026-11-03 (`claude-win-sdp`, 맥미니 요청 승인 빌드 `naver-blog-allinone-ppc9nvlqc`) | 쓰이지 않던 권한 함수 보완 `21022a363` + API 키 암호화 문구 `b16550ad4`. tsc·빌드 통과, DB/ZIP OK |
| `naver-blog-seo-studio` | v2.23 · 2026-11-02 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 블로그 담당 대신 처리, 승인 빌드) | 사용법 「새로 생긴 기능」 카드 `12118b542`. DB/ZIP OK. 맥미니 화면 검수 완료(2026-11-03, 상세·사용법 5개, 요청함 결과 `d950e9b2`) |
| `blog-keyword` | v1.10 · 2026-11-02 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 블로그 담당 대신 처리, 승인 빌드) | 사용법 「새로 생긴 기능」 카드 `12118b542`. DB OK(확장 없음). 맥미니 화면 검수 완료(2026-11-03, 상세·사용법 5개, 요청함 결과 `d950e9b2`) |
| `tistory-auto-blog` | v1.94 · 2026-11-02 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 블로그 담당 대신 처리, 승인 빌드) | 사용법 「새로 생긴 기능」 카드 `12118b542`. DB/ZIP OK. 맥미니 화면 검수 완료(2026-11-03, 상세·사용법 5개, 요청함 결과 `d950e9b2`) |
| `ai-auto-blog` | v1.85 · 2026-11-02 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 블로그 담당 대신 처리, 승인 빌드) | 사용법 「새로 생긴 기능」 카드 `12118b542` + 글 보기 복사에서 이미지 설명 제외. DB/ZIP OK. 맥미니 화면 검수 완료(2026-11-03, 상세·사용법 5개, 요청함 결과 `d950e9b2`) |
| `naver-blog-seo-studio` | v2.25 · 2026-11-03 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 맥미니 요청·주인님 승인 빌드 1회, `naver-blog-seo-studio-nrhlnfwaf`) | 확장: 원고를 빨리 바꿔 고를 때 앞 원고 결과가 덮어쓰던 문제 `176004fa9`. 버전·manifest·ZIP `e3c199f92`. 시험 158(157 통과·1 건너뜀)·tsc·build 통과, DB/ZIP OK |
| `naver-blog-seo-studio` | v2.24 · 2026-11-02 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 맥미니 요청·주인님 승인 빌드 1회, `naver-blog-seo-studio-ixznbia00`) | 맥 예약 포스팅 검수 수정 묶음(확장 9커밋) + 웹 6커밋(재전송 409 복제 안내·실패 원고 삭제·목록 상태 표시·생성 기록 칸·복제 때 이미지 복사·30일 정리 예외 회원 제외) — 핸드오프 `naver-blog-seo-studio/docs/IMPROVEMENT_HANDOFF_20261102.md`. 버전·ZIP `07b1b1abe`. DB/ZIP OK. 웹 확인: 생성 기록 결과 칸 전체 폭, 이미지 있는 원고 복제 → 새 원고 폴더에 본문 이미지 1장 복사·화면 표시 확인. 확장 화면은 맥미니 확인 대기 |
| `naver-blog-agent` | v2.25 · 2026-11-02 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 맥미니 요청·주인님 승인 빌드 1회, `naver-blog-agent-f3irqshs0`) | 예약 시각 지난 원고 막기·발행 직전 재확인 `ab67e1ff0` + 30일 정리 예외 회원 제외 `6c8e0eb63`. 버전 `5ac258ab5` 커밋. DB/ZIP OK. 맥미니 예약 재시험 대기 |
| `naver-blog-agent` | v2.24 · 2026-11-02 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 블로그 담당 대신 처리, 승인 빌드) | 사용법 「새로 생긴 기능」 카드 `12118b542`. DB/ZIP OK. 맥미니 화면 검수 완료(2026-11-03, 상세·사용법 5개, 요청함 결과 `d950e9b2`) |
| `blog-neighbor-care` | v1.06 · 2026-11-01 ([역할: blog] 윈도우, 승인 빌드 1회, `blog-neighbor-care-hpykndu5j`) | 첫 읽기 최근 7일, 확인 시각 수정, AI 프로필 검증 항목 유지. SQL 1건. DB/ZIP OK, AI 재시험 성공 |
| `naver-blog-allinone` | v1.58 · 2026-11-01 ([역할: blog] 윈도우, 승인 빌드, `naver-blog-allinone-9f60r9weg`) | 이동 안내 띠 `5c1e40ac2`. DB/ZIP OK. 맥미니 화면 검수 대기 |
| `blog-content-maker` | v1.14 · 2026-11-01 ([역할: blog] 윈도우, 승인 빌드, `blog-content-maker-1dhxtjetc`) | 이동 안내 띠 `5c1e40ac2`. DB/ZIP OK. 맥미니 화면 검수 대기 |
| `blog-workroom` | v1.16 · 2026-11-01 ([역할: blog] 윈도우, 승인 빌드, `blog-workroom-678yhouoy`) | 이동 안내 띠 `5c1e40ac2`. 맥미니 화면 검수 대기 |
| `naver-blog-agent` | v2.23 · 2026-11-01 ([역할: blog] 윈도우, 승인 빌드, `naver-blog-agent-ni50xpp8e`) | 간편 모드 에이전트 권한만 `9a2c21c6e`. DB/ZIP OK. 맥미니 화면 검수 대기 |
| `blog-neighbor-care` | v1.05 · 2026-11-01 ([역할: blog] Claude Code 윈도우, 승인 빌드 1회, `blog-neighbor-care-donc06qa2`) | 새 글 확인 환경변수 2개 등록, 서버 RSS 미리보기 차단, 안내문 수정. ZIP·DB OK. Edge 실검수 전 |
| `blog-neighbor-care` | v1.04 · 2026-11-01 ([역할: blog] Claude Code 윈도우, 승인 빌드 1회, `blog-neighbor-care-4fn9tvouc`) | 16묶음+회원 PC 확장 새 글 확인, SQL 10개 적용(표 16개), ZIP·DB OK. 운영 `BNC_` 환경변수 없음으로 기능은 꺼짐 |
| `naver-blog-allinone` | v1.57 · 2026-11-01 ([역할: blog] Claude Code 윈도우, 승인 빌드 1회, `naver-blog-allinone-99flpqnff`) | 회원 키 과금 버그: 본문 이미지 없음에도 2장 생성 수정 `edd6edfd0`(맥미니). 시험 37개·DB/ZIP OK. 맥미니 화면 재확인 대기 |
| `naver-blog-allinone` | v1.56 · 2026-11-01 ([역할: blog] Claude Code 윈도우, 승인 빌드 1회, `dpl_EBo9V4UYA8cTWMT8m1dpvC1bNXBJ`) | API 키 회원 계정 저장 `b3a6fd89b`. 시험 37개·DB/ZIP OK. 맥미니 화면 검수 대기 |
| `naver-blog-seo-studio` | v2.22 · 2026-11-01 ([역할: blog] Claude Code 윈도우, 승인 빌드 1회) | 작업실·콘텐츠 병합 `0bf9a6d55`·`ae0da6b38`·`0543e8646`. 시험 142 통과·1 건너뜀(python3 없음)·DB/ZIP OK. 맥미니 화면 검수 대기 |
| `commercial-land-trade-alert` | v1.30 · 2026-11-02 ([역할: realty], A2·A3 승인 빌드) | A3 메뉴 이동 링크, 행정동 고르기 「새로고침」 안내. 확장 ZIP·DB v1.30 검증 OK |
| `commercial-land-trade-alert` | v1.29 · 2026-11-02 ([역할: realty], 주인님 「진행해」 빌드 1회) | 감시 화면별 「알림 받을 행정동」(DB `admin_dongs`, 확장이 회원 PC에서 판정). 확장 ZIP·DB v1.29 검증 OK |
| `commercial-land-trade-alert` | v1.28 · 2026-11-02 ([역할: realty], 주인님 「진행해」 빌드 1회) | 관리자 층 진단 쪽 넘김(건축물대장 API가 한 쪽 100줄만 줌). 확장 ZIP·DB v1.28 검증 OK |
| `commercial-land-trade-alert` | v1.27 · 2026-11-02 ([역할: realty], 「전부 진행」 승인 빌드 1회) | 대기 3건(`6a7dfff33`·`69fde47bd`·`ac52a4d20`) + 시세 정확도 1~4단계: 건물 연면적·대지 두 기준, 토지 묶음 합치기·「비교 자료 부족」, 층 빈칸 쌍둥이 정리, 관리자 층 진단 경로. 확장 ZIP·DB v1.27 검증 OK |
| `commercial-land-trade-alert` | v1.26 · 2026-11-02 ([역할: realty], 승인 빌드 1회) | 상가 매매 「같은 건물 호가 대비」 후보(`b320b1b84`) |
| `commercial-land-trade-alert` | v1.25 · 2026-11-02 ([역할: realty], 승인 빌드 1회) | 감시 화면 거르기, 같은 조건 묶기, 네이버 링크 맨 뒤로, 비교 불가 표시, 추이 거래 종류, 사라진 매물 행정동, AI 자료·지시문(`af983f066`) |
| `commercial-land-trade-alert` | v1.24 · 2026-11-02 ([역할: realty], 승인 빌드 1회) | 결과 표 한눈에 보기, 건물 시세 비교도 동 표본 기준(`1fb2c1886`, `fa5c849e2`) |
| `commercial-land-trade-alert` | v1.23 · 2026-11-01 ([역할: realty], 승인 빌드 1회) | 수집 결과 행정동(추정) 칸과 거르기 |
| `commercial-land-trade-alert` | v1.22 · 2026-11-01 ([역할: realty], 승인 빌드 1회) | 행정동 찾기, 메일 권한 안내, 이메일 경고, 토지 비교 참고 처리, 좌표 진단 |
| `commercial-land-trade-alert` | v1.21 · 2026-11-01 ([역할: realty], 승인 빌드 1회) | 수익률을 같은 동 감시 화면 월세로 계산(`a7cfe7127`) |
| `commercial-land-trade-alert` | v1.20 · 2026-11-01 ([역할: realty], 승인 빌드 1회) | 네이버 필터·잘림 표시, 필터 변경 회차 기준 재저장, 동 표본 없는 상가 비교 「참고」, 쿠팡 봇 제외(`1f488abf2`) |
| `commercial-land-trade-alert` | v1.19 · 2026-11-01 ([역할: realty], 승인 빌드 1회) | 주간 리포트 도착 뒤 기록, 사라진 매물 이전 가격 중복 제거, 이메일 링크 줄바꿈 막음(`b42607427`) |
| `commercial-land-trade-alert` | v1.18 · 2026-11-01 ([역할: realty], 승인 빌드 1회) | 받을 텔레그램 봇 고르기·빌려 쓰는 중 경고(`a6cfe2e87`), PC별 확장 끊기, 글로 쓰기, 변동 기록 표, 수익률 대표값 보정, 팝업 기록 30줄, 토지 같은 지목 시세 비교 |
| `music` | v1.48 · 2026-11-01 ([역할: music], 승인 빌드 1회) | 대기 항목 없음(AI 모델 추가 `73704b95e`) |
| `ai-mastering-studio` | v1.15 · 2026-10-31 ([역할: music], 승인 빌드 1회) | AI 제안 모델 추가(`a7746f979`) |
| `ai-audio-analyzer` | v1.14 · 2026-10-31 ([역할: music], 승인 빌드 1회) | 메뉴 계정 위치(`22c6cda35`) |
| `.` (메인 사이트) | 커밋 `af740503d` 자동 빌드 `aimaster-bm1hohj6m` Ready · 2026-11-03 (Claude Code 윈도우 `claude-win-20261029-statusbar`, 주인님 승인 빌드 1회) | 관리자 저장 0건이면 경고(프로그램 목록 배지·상태·순서, 편집 화면 요금제·수수료) `3d95b9a48`·`13a95dfde` + 카드·퀵 프리뷰 배지 고정 순서 `13a95dfde` + 상세 페이지 요금 기간 순 정렬(맥미니) `a0f0c7d33` |
| `.` (메인 사이트) | 커밋 `3e4f029b8` 자동 빌드 · 2026-10-31 (Claude Code 윈도우, 주인님 승인) | 일반 등급 권한 경고 팝업 4곳, 공개 프로그램 없는 카테고리 숨김(워드프레스·주식·Tools). 백업 카테고리는 `f23d2ea85`에서 이미 처리돼 표에서만 지움. 운영 홈·목록 확인, 팝업 화면은 관리자 로그인 필요로 미확인 |
| `coupang-ops` | v1.17 · 2026-10-31 ([역할: ecommerce-image], 승인 빌드 1회) | 카카오 웹 도메인 안내(`054f96270`), 품절 임박 자동 알림(`244e05212`), 수시 알림·회원 시각 선택(`905fe8284`·`2c4bd91db`·`bcb940598`), 고정 IP 미등록 안내(`d381ca59d`) |
| `coupang-ops` | v1.16 · 2026-10-31 ([역할: ecommerce-image], 승인 빌드 1회) | 연동 화면 부동산 표 구조, 발급 버튼·매뉴얼, Resend 메일, 카카오 나에게 보내기(`71c8571a5`·`ed5e72204`) |
| `coupang-ops` | v1.15 · 2026-10-31 ([역할: ecommerce-image], 승인 빌드 1회) | 알림 키 칸을 API키등록·플랫폼연동으로 이동(`ff2682c89`) |
| `coupang-ops` | v1.14 · 2026-10-31 ([역할: ecommerce-image], 승인 빌드 1회) | 수동 입력 가격 제안(`3edea4937`), 30일 정리 암호 적용 |
| `coupang-ops` | v1.13 · 2026-10-31 ([역할: ecommerce-image], 승인 빌드 1회) | 가짜 위너 숫자·없는 기능 문구 제거, AGY 디자인, 연결 화면 순서, 플랫폼별 AI 모델(`2e332a881`·`309ad926c`·`ecc60ee20`·`0c4545a79`) |
| `coupang-ops` | v1.12 · 2026-10-31 ([역할: ecommerce-image], 승인 빌드 1회) | 아침 요약 이메일·카카오톡, AI 플랫폼·모델 선택, 메뉴 「🔑 API키등록·플랫폼연동」, 저장됨 표시, 반복 작업 8개, 회수 송장·철회 이력·출고지/반품지·옵션 단위 자동생성옵션·쿠폰 적용 옵션, 저장 결과를 누른 칸 아래 표시, 회원 본인 고정 IP 등록, 키 만료 알림·문의 남은 시간·재고 0 경고·쿠팡 경고·오류 화면·건수 보강·카테고리/브랜드 찾기·메뉴 글자·화면 정리(시험 111개·빌드 통과, 배포 전 `coupang_ops_prefs`·`fixed_ip_proxy_key` SQL 필요, 기존 회원 주소 등록 필요) (`533bdded5`·`6e656fd51`·`00523fa9b`·`6754b148e`·`78cfc78c5`·`e151edbb8`·`a143d427b`·`998e1a43b`·`8deed7e30`·`d31521697`·`8c1346219`·`83cd9583d`·`39b56e0e2`·`d10a75d75`·`e8c4bf879`·`bba53c843`) |
| `realty-listing-alert` | v1.39 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 단지 비교 표 「📈 실거래 ↗」(`c8f9bf948`) |
| `commercial-land-trade-alert` | v1.02 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 네이버 매물 1단계, 3채널 알림, 이름 변경, 상세 문구 |
| `commercial-land-trade-alert` | v1.01 · 2026-10-31 ([역할: realty], 승인 빌드 3회) | 새 프로그램 첫 배포, 준비중 |
| `realty-listing-alert` | v1.42 · 2026-11-03 ([역할: realty], 주인님 「배포해」, 빌드 1회) | A3 「함께 쓰는 부동산 프로그램」 링크, 확장 단지 위치 한정(a4c60b987). 확장·ZIP·DB v1.42 확인 OK |
| `real_estate_sales` | v1.41 · 2026-11-03 ([역할: realty], B1, 빌드 2회 — 1회는 실수로 중복 실행) | B1 주소 리포트(`/report`, 실거래 상세·임장 기록 버튼), 건축HUB https. ⚠ 운영 공용 공공데이터 키가 11-02 23:23 이후 국토부·건축HUB 403 |
| `real_estate_sales` | v1.40 · 2026-11-02 ([역할: realty], B0 승인 빌드 1회) | B0 관리자 진단 `/api/admin/report-probe`(주소 리포트 칸 채움률), 건축물대장 표제부 조회 |
| `real_estate_sales` | v1.39 · 2026-11-02 ([역할: realty], A2·A3 승인 빌드) | 거래량 비교를 신고가 끝난 달(2달 전) vs 그 전 3개월로, 비교 달이 다 모인 유형만 합산(v1.38 착시 수정) |
| `real_estate_sales` | v1.38 · 2026-11-02 ([역할: realty], A2·A3 승인 빌드) | A2 보유 자료 12개월 최고가·최저가 배지·알림, 지역 매매 신고 건수 표·🔥 알림 줄(DB `price_rank` 칸·`real_estate_trade_volume` 표), A3 메뉴 이동 링크 |
| `real_estate_sales` | v1.37 · 2026-11-02 ([역할: realty], 「전부 진행」 승인 빌드 1회) | 임장 노트 지번 연결: 격자 v2(PNU·공동주택, 전국 100%), DB `pnu`·`jibun` 칸, 「공시지가·용도지역 보기」 |
| `real_estate_sales` | v1.36 · 2026-11-02 ([역할: realty], 승인 빌드 1회) | 임장 노트 회원 공개, 소개 문구(`5eaa1797d`) |
| `real_estate_sales` | v1.35 · 2026-11-02 ([역할: realty], 승인 빌드 1회) | 임장 노트 주소 자동 등록(위치정보요약DB 격자, `9a195b728`) |
| `real_estate_sales` | v1.34 · 2026-11-01 ([역할: realty], 승인 빌드 1회) | 임장 노트 1차(시험 계정까지), 대기 중이던 월세 표기·`deal_type` |
| `real_estate_sales` | v1.33 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 전월세 거래 목록·알림 |
| `real_estate_sales` | v1.32 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 공공데이터포털 공용 키 교체 적용, 지역당 20건 안내 문구 |
| `commercial-land-trade-alert` | v1.14 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 토지 비교 보류, 시세 대비 표시, 지역 화면 정리 등 |
| `commercial-land-trade-alert` | v1.13 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 실거래 메뉴 합침 |
| `commercial-land-trade-alert` | v1.12 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 실거래 메뉴 맞춤 |
| `commercial-land-trade-alert` | v1.11 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 지역으로 매물 감시 추가 |
| `realty-listing-alert` | v1.40 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 메뉴 합침, 알림 문구 통일 |
| `commercial-land-trade-alert` | v1.10 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 메뉴 합침 |
| `commercial-land-trade-alert` | v1.09 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 비교 표 중간값, 수익률 표시 기준, 메뉴 맞춤 |
| `real_estate_sales` | v1.31 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 전국 256곳, 빌라·오피스텔, 유형 필터 |
| `real_estate_sales` | v1.30 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 면적 범위 축소·거래 신고 면적 우선·특수 거래 표시 |
| `real_estate_sales` | v1.29 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 공시가 면적·층 맞추기, 경기·인천 전월세 비교 |
| `real_estate_sales` | v1.28 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 낱말별 검색(`9a794af1a`)·브이월드 키 교체 적용 |
| `real_estate_sales` | v1.27 · 2026-10-31 ([역할: realty], 승인 빌드 1회) | 지역 찾기 칸·경기·인천 리 코드(`55975c789`) |
| `realty-listing-alert` | v1.38 · 2026-10-30 ([역할: realty], 승인 빌드 1회) | 감시 대상 「📈 실거래 보기」(`904385b89`) · 글로 쓰기 키워드 쉼표 수정(`1b56317f6`) |
| `real_estate_sales` | v1.26 · 2026-10-30 ([역할: realty], 승인 빌드 1회) | 화성 4개 구·인천 개편 구 코드(`c08a309a3`), 경기·인천 필지 번호·브이월드 오류 로그(v1.26 커밋) |
| `real_estate_sales` | v1.25 · 2026-10-30 ([역할: realty], 승인 빌드 1회) | 실거래 목록 `?district=`·`?q=` 거르기·경기 시 이름 묶기(`1d8cd99c5`) |
| `real_estate_sales` | v1.24 · 2026-10-30 ([역할: realty], 승인 빌드 1회) | 경기·인천 전용면적 빈칸 수정(`de7ec2b30`) + 기존 20줄 DB 채움 |
| `real_estate_sales` | v1.23 · 2026-10-30 ([역할: realty], 승인 빌드 1회) | RE-B4 경기·인천 확장(`9ab5d5ba3`) · RE-B5 `zod` ^4.6.7(`8f86de0ec`) |
| `realty-listing-alert` | v1.37 · 2026-10-29 ([역할: realty], 승인 빌드 1회) | (대기 항목 없음) 추가개선 5·6·7 — 주간 동향 글로 쓰기·블로그/티스토리 고르기·「최근 6개월 매매 신고 없음 (n일째)」 (`f8156bd12`) |
| `blog-neighbor-care` | v1.03 · 2026-10-29 · Codex `codex-win-20261026-blog-check` · dpl_FM3zxNjsfHPYB4GrTe2q7LLRXZBu | 좌측메뉴표준/모바일계정·진단·정리5종·중단/반복설정·비공개실행인증/최소결과·확장가시성/진행범위(소스a93fc9ecd까지),SQL재적용없음 |
| `trending-product-finder` | v1.30 · 2026-11-01 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드 1회) | 쿠팡 리뷰 거르기 확장·안내 화면 `839fc5860` |
| `trending-product-finder` | v1.29 · 2026-10-29 ([역할: ecommerce-image] Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `trending-product-finder-2arev86dm`) | 흐름 띠 「🛒 마켓 등록」 단계(`48b67dd5c`) (본 작업: 스마트스토어 수수료 6.63% 공식 대조 `6ce752039`) |
| `shop-order-report` | v1.05 · 2026-10-29 ([역할: ecommerce-image] Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `shop-order-report-3qdt03vl7`) | 흐름 띠 「🛒 마켓 등록」 단계(`48b67dd5c`) + 사이드바 프로그램명 2열(`187ec0d28`) (본 작업: 스마트스토어 수수료 6.63% `6ce752039`) |
| `shop-detail-page` | v1.40 · 2026-10-29 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 1회 `shop-detail-page-izoi9n7fk`) | 옛 12단 자료 가져오기 삭제(`f4b930e99`) · 나노바나나 2.1 표기·2K 비용 $0.0504 정정(`e0da4a46a`) |
| `smartstore-register` | v1.12 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 1회 `smartstore-register-7blp17f02`) | 대기 항목 없음 (본 작업: 옵션 자동 입력 `2ceefdf8a`) |
| `smartstore-register` | v1.13 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 주인님 추가 승인 빌드 1회 `smartstore-register-gefdo1s9o`) | 옵션 입력 칸 배치 수정 `74035bc95` |
| `smartstore-register` | v1.11 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 1회 `smartstore-register-m22lvumg4`) | 확장 상태 창 제목 새 이름 (본 작업: 오래된 탭이 만든 작업 막기 `20c37020f`) |
| `smartstore-register` | v1.10 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 1회 `smartstore-register-48tdzwzos`) | 대기 항목 없음 (본 작업: 추가 이미지 자동 넣기 `b6af9abe9`) |
| `smartstore-register` | v1.09 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 1회 `smartstore-register-c59rnifm2`) | 대기 항목 없음 (본 작업: 이름 변경 「AI 스마트스토어 상품 자동등록기」 — 화면·확장 표시명) |
| `shop-detail-page` | v1.39 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 3회 중 3번째 `shop-detail-page-3h5v9rlyd`) | 버전 숫자 v1.39 맞추기 + 분석 카테고리 우선 `e244bb71e` |
| `shop-detail-page` | v1.38 표시 그대로 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 3회 중 1번째 `shop-detail-page-5az2ls9nr`) | 대기 항목 없음 (본 작업: 검토 완료·마켓 등록 영역·등록 결과 표시·목록 검토 배지·흐름 띠·카테고리 받기 — 버전 올리기를 빠뜨려 다음 배포 때 v1.39) |
| `smartstore-register` | v1.08 · 2026-10-27 ([역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp`, 승인 빌드 3회 중 2번째) | 대기 항목 없음 (본 작업: 검토 배지·검토 완료 먼저 정렬·검토 전 안내·흐름 띠) |
| `smartstore-register` | v1.07 · 2026-10-27 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `7iiza23u6`) | 「상품속성 미입력 확인」 창 자동 넘기기·완료 창에서 상품번호 읽기 |
| `smartstore-register` | v1.06 · 2026-10-27 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `mcvppashp`) | 저장 결과 확인·AngularJS 칸 입력·고시 전화번호·어린이제품인증 기본값·탭 다시 쓰기·나가기 확인 창 방지 |
| `smartstore-register` | v1.05 · 2026-10-27 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `kjp25qgzv`) | 배송 selectize 고르기·기본값 표시 보정 + 실제 시험 보정(PC 임시저장 버튼·에디터 닫힘 대기·첫 화면 재이동·전시 상태 칸) + 「바로 등록」 중복 막기 |
| `smartstore-register` | v1.04 · 2026-10-27 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `c2zo2h21x`) | 대기 항목 없음 (본 작업: 배송 칸 자동 입력·확장 버전 확인) |
| `smartstore-register` | v1.03 · 2026-10-27 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `isi1praid`) | 상태 창 버전 알약·초록 버튼 색·「연결됨」 표시(`3cde9e812`·`fdeeee3aa`) + 실제 시험 보정(섹션 펼치기·에디터 팝업·사진 가로채기·맨 앞 창·한국 시간) |
| `smartstore-register` | v1.02 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 2회 `q5ufh2eud`·`4cj06wxgp`) | 대기 항목 없음 (본 작업: EC-W8 2단계 크롬 확장 `bcab98b7c`·ZIP 경로 수정) |
| `smartstore-register` | v1.01 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 2회 `smartstore-register-po82s56md`·`ij7pvrsnr`, 새 프로그램) | 대기 항목 없음 (본 작업: EC-W8 1단계 뼈대 `64ea89142`·화면 수정) |
| `shop-detail-page` | v1.37 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `shop-detail-page-lkgk3d8zf`) | 대기 항목 없음 (본 작업: E3 상세페이지 편집 보강 `7be8c9583`) |
| `seller-label-docs` | v1.04 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `seller-label-docs-84fsruei2`) | 대기 항목 없음 (본 작업: 개인정보 가리기 바로가기 `38180d0d9`) |
| `shop-order-report` | v1.04 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `shop-order-report-r59tb14xp`) | 대기 항목 없음 (본 작업: 개인정보 가리기 바로가기 `38180d0d9`) |
| `shop-detail-page` | v1.36 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `shop-detail-page-7rl68h9iw`) | 대기 항목 없음 (본 작업: 누끼 결과 되돌려 넣기 `38180d0d9`) |
| `banana-canvas` | v1.42 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `banana-canvas-cjvc8de5q`) | 대기 항목 없음 (본 작업: E5-3 `38180d0d9`) |
| `shop-detail-page` | v1.35 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `shop-detail-page-3h85sy7og`) | 공용 `browser-free-erase` 사본 동기화 `baf4a88e6` (본 작업: 섹션 「✂ 누끼」 `6d7575a5f`) |
| `banana-canvas` | v1.41 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `banana-canvas-ir04pepnx`) | 대기 항목 없음 (본 작업: E5-2 글자 가리기·사진 일괄 손질로 보내기·누끼 받기 `6d7575a5f`) |
| `banana-canvas` | v1.40 · 2026-10-26 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 2회 — `banana-canvas-ika50w7rb`, 같은 코드 실수 재배포 `-ph6adch6a`) | 사진 일괄 손질 숫자 칸 80px CSS (본 작업: E5 무료 이미지 도구 `baf4a88e6`) — 운영 크롬에서 80px 확인 |
| `ai-video-studio` | v1.25 · 2026-10-26 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회) | 맥 메모리 쪽 2D 캔버스 기본·형식 확인 6초 제한 `eaeae933d`(대기 줄 없음) |
| `trending-product-finder` | v1.28 재배포 · 2026-10-26 (과세환율 키 `CUSTOMS_FX_SERVICE_KEY` 등록 뒤, 승인 빌드 2회 중 2회 `trending-product-finder-gis68pxt2`) | 코드 같음, 환경변수만 반영 |
| `trending-product-finder` | v1.28 · 2026-10-26 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드(EC-W7 최대 2회 중 1회) `trending-product-finder-9lp6wy88e`) | E9 흐름 띠(`93b20e6b0`) + EC-W7 과세환율·관세 계산 순서 바로잡기·관세율 참고표·점수 알림 |
| `ai-auto-blog` | v1.83 · 2026-10-26 (Codex·Next.js 보안) | Next16.4.2·sharp0.35.5, 무료188개·타입/빌드·READY/DB/ZIP OK. 6728a83ab |
| `tistory-auto-blog` | v1.93 · 2026-10-26 (Codex·Next.js 보안) | Next16.4.2·sharp0.35.5, 무료175개·타입/빌드·READY/DB/ZIP OK. c0e151740 · 분량 지시 fef7491d6·756a2ca7a 포함 |
| `naver-blog-allinone` | v1.54 · 2026-10-26 (Codex·Next.js 보안) | Next16.4.2·sharp0.35.5, 무료33개·타입/빌드·READY/DB/ZIP OK. d490b437a |
| `naver-blog-agent` | v2.22 · 2026-10-26 (Codex·Next.js 보안) | 방식 전환 때 예약 미리 넣기 해제 `89d135c4b`, 보안 의존성 `f6cbcdc0a` 함께. READY·DB/ZIP OK |
| playlist-channel-studio | v1.32 · 2026-10-25 ([역할: design] Antigravity(윈도우, 웨일) gy-win-20261025-ext3d, 빌드 1회) | YouTube/Gemini/OpenAI/Claude 4대 키발급 2단버튼 세트 & 1080p 렌더링 3D 엠보싱 버튼 규격화 배포 완료 |
| `ai-doc-chatbot` | v1.08 · 2026-10-25 · Codex `codex-win-20261025-docbot-release` · `dpl_CRZ4ZSzCehcwovNfGSKkDu6xsq2L` Ready | G1~G4·키 용도/콘솔 버튼·Cloudflare 식별번호·줄바꿈·로그아웃303.108개 검사·실제 문서 답변/출처·운영 Edge 확인, DB버전 일치. [증거·비용·남은 검수](../ai-doc-chatbot/docs/IMPROVEMENT_HANDOFF_20261025_G4.md#최종-운영-배포--2026-10-25) |
| `ai-prompt-studio` | v1.10 · 2026-10-25 · 같은 세션 · `dpl_4YjhJhW16BrqRtc5umXDxmpo7XU5` Ready | 챗봇 공용 G1 공급자/키 안내 함께 반영(`2d56a117b`·`9ab4f36e0`·`d2b05913b`). 운영 Edge 일반 회원·키 모달·공급자/모델 준비 화면 확인, DB버전 일치. 새 공급자 실호출은 키 등록 뒤 |
| `shop-order-report` | v1.03 · 2026-10-25 ([역할: ecommerce-image] `claude-win-sdp`, 승인 빌드(E9 최대 3회 중 2회) `b0s1sfp6u`) | E1 공용 `market-fees` 기준 확장(대기 줄) + E9 흐름 띠·발송 전 주문→셀러 라벨. 같은 묶음 `seller-label-docs` v1.03 `f2dzr25lh` |
| music | v1.47 · 2026-10-25 ([역할: design] Antigravity(윈도우, 웨일) gy-win-20261025-ext3d, 빌드 1회) | Suno/OpenAI/Claude/Gemini 4대 키발급 2단버튼 세트 & 음악기획·생성 3D 엠보싱 버튼 규격화 배포 완료 |
| `realty-listing-alert` | v1.30 · 2026-10-26 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 카톡 글에 변동 생긴 단지 이름을 앞에·버튼 「○○ 매물 보기」→ 그 단지 매물 목록(주인님 「결과보기를 클릭하면 전혀 다른 링크」), 실거래 저장분 빈 결과 3시간·규칙 버전 바뀌면 바로 재조회(새벽 빈 결과 24시간 재사용으로 v1.29 이름 보강이 안 쓰이던 문제), 팝업 「최근 기록」에서 개발용 진단 줄 숨김 (`b5fee3cb8`·`8dbc578e0`·`928701045`) |
| `realty-listing-alert` | v1.29 · 2026-10-26 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 결과 표 정렬·거르기(거래 종류·🔥 급매만·가격/면적/층/실거래 대비)·「층(해당/전체)」 「44층 / 58층」 표기, 📉 여러 번 내린 매물(1년 변동 기록), 확장 팝업 연결 계정 강조(15px 굵게·붉은 이메일), AI 요약 글 정리(# 서식 지우기·「목록에서 사라짐」을 거래로 단정 안 함), 실거래 단지 이름 맞추기 보강(마을·○단지·주거복합 무시, 괄호 안 단지명 살림, 60% 규칙)+진단 기록, 설정 화면 박스 간격 16px (`bf5c7345a`·`036e2e61f`·`46d936ebc`·`cbc287c1c`·`4cef27d37`·`197a4e1ca`) |
| `realty-listing-alert` | v1.28 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 🔥 급매 표시(같은 단지·같은 면적 매매 3건 이상 묶음 중간값보다 10% 이상 싼 매물, 엑셀 맨 끝 칸·결과 표·텔레그램·메일, `extension/lib/bargain.js`), 📶 오늘 수집 사용량 「n/300페이지」·한도 도달 시 「내일 0시」(대시보드·수집 결과, web-bridge `ping`이 숫자만 전달), 감시 조건에 「🎯 목표가 알림」 안내(기능은 기존 가격 조건) (`a7822289f`) |
| `realty-listing-alert` | v1.27 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 확장 줄 버튼 한 줄 배치·연결 버튼 크기, 텔레그램 끊기·가져오기 뒤 설정 화면 바로 갱신, AI 시세 요약 금액을 한국어 표기로(「1억 600만」 오류 수정, 확장), 공공데이터 「신청 ↗」 링크를 올바른 자료 15126469 「국토교통부_아파트 매매 실거래가 자료」로(원래 엉뚱한 15057532)·403이면 「활용신청(승인) 필요」 안내 (`a6002a9e2`·`a409edb81`·`07a3ef184`·`ae64e821c`·`cf58fefb6`·`0c28fb8a7`) |
| `realty-listing-alert` | v1.14 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 중개사 번호 조금씩 채워 기억(새·변동 매물 먼저, 남는 여유로 번호 모르는 매물을 회차당 최대 20건 — 회원 PC `chrome.storage` `phones`에 기억, 30일 뒤 정리, 서버로 안 보냄), 수집 결과 화면은 변동 0건이면 바로 전체 표(「이번엔 변동 없음 · 지금 매물 n건」) |
| `detail-page-12p` | v1.12 · 2026-10-25 ([역할: design] Antigravity(윈도우, 웨일) `agy-win-20261025-ext3d`, 빌드 1회) | Google AI Studio 키 발급 2단 퀵액션 버튼 세트 및 12단/9단 일괄 기획·렌더링 3D 엠보싱 버튼 탑재 |
| `realty-listing-alert` | v1.13 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 왼쪽 메뉴 「4 · 📄 수집 결과」(주인님 「좌측에 메뉴는 보여야 할꺼 아냐」 「그래야 직관적이지」) — 전용 화면 `/results`(대시보드 결과 표와 같은 컴포넌트) (`948ef29cc`) |
| `realty-listing-alert` | v1.12 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 대시보드 「📄 최근 수집 결과」 표(확장이 PC 안에서 직접 전달 — web-bridge `lastResult`, 확장 연결 계정 = 로그인 계정일 때만, 서버 미경유; 변동만/전체 보기; 확장 없는 브라우저는 안내 + 마지막 수집 요약), 시작하기가 최근 3일 수집 기록으로 다른 브라우저·PC 동작 인식, 카톡 요약 건수 글자 라벨(🆕 네모 깨짐), 카톡 기본 링크 `/dashboard#results`, 제목 「텔레그램·카톡·메일로」 (`2f9301b0f`·`697a817d4`) |
| `realty-listing-alert` | v1.11 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 카톡 웹 도메인 안내를 읽기 쉬운 상자로(세 줄·도메인 빨간 강조), 켜기 칸 한 줄·옆 버튼과 같은 높이로 한 줄 배치(카톡·이메일) (`6d9557b6a`·`062a5d151`·`25dd5575c`) |
| `shop-detail-page` | v1.34 · 2026-10-25 ([역할: design] Antigravity(윈도우, 웨일) `agy-win-20261025-ext3d`, 빌드 1회) | 문구 고치기 안내·진행 표시, 공용 사본 오류 문구 `2cc9edc75`·`9cfb40fb1`·`c5fb22b4d` + 4대 플랫폼 API키 2단 퀵액션 버튼 세트 및 3D 엠보싱 실행버튼 전면 탑재 |
| `realty-listing-alert` | v1.10 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 버튼 위치 조정 `69ffa6708` + 중개사 번호·엑셀 링크 |
| `realty-listing-alert` | v1.09 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 카톡 「결과 보기」→ 첫 새 매물의 네이버 부동산 화면(`/api/go` 넘겨주기, 네이버 부동산만 허용 — 회원 카카오 앱 웹 도메인엔 이 프로그램 도메인 하나만), 웹 도메인 등록 안내(카톡 카드·매뉴얼), 이메일 받는 주소 안내(Resend 가입 메일로 바꾸기 버튼·로그인 메일로 대신 안 보냄), 카톡 안내 상자 여백 (`5f75f5630`·카톡 링크 커밋) |
| `realty-listing-alert` | v1.08 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 카톡 받기(요약 200자 + 결과 보기 버튼, 「카카오 자동화」에서 연결한 공용 카카오 계정 재사용)·이메일 받기(회원 본인 Resend 키 `resend_api_key`, 요약 + 엑셀 첨부) — 확장이 회원 PC에서 직접 보냄(매물은 서버를 거치지 않음), 채널별 따로 보내기, 받는 방법·API키등록 두 화면에 같은 카드(`ChannelCards`), 시험 보내기 |
| `realty-listing-alert` | v1.07 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 주소 추가 칸 여유 배치(3단계 안내 전체 폭·주소 2:이름 1·높이 맞춤, 주인님 「우측에 여유가 있는데」) |
| `realty-listing-alert` | v1.06 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 예약 간격 1~24시간 `46197286f` + 수집 상한·공지 `c79c7059a` + 주소 칸 쉬운 말 `dadf961d8` |
| `realty-listing-alert` | v1.05 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 연결 계정 대조·표시, 다음 페이지 읽기 수정(겹친 페이지 버림) + 지역(시·구·동) 감시 |
| `ai-video-studio` | v1.24 · 2026-10-25 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회, `ai-video-studio-5paj2jco8`) | 맥 인코더 35초 대기 대책 `?render=realtime`·인코더 대기열 trace·막힘 안내 15초·정리 새로고침 안내 `5ac5dfe08`(대기 줄 없음) |
| `realty-listing-alert` | v1.04 · 2026-10-25 ([역할: realty] `claude-win-20261024-realty`, 승인 빌드 1회) | 네이버 부동산 열기 버튼 `e851a4927` + UX 리뉴얼 A~F·2페이지·단지 이름 수정 |
| `ai-video-studio` | v1.23 · 2026-10-25 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회, `ai-video-studio-94rs4c5ko`) | 맥 렌더 3단계 `?render=trace|nopace|htmlcanvas`·멈추기 3초 보장·막힘 안내 `cbfe705af`(대기 줄 없음) |
| `realty-listing-alert` | v1.03 · 2026-10-25 ([역할: realty] Claude Code 윈도우 `claude-win-20261024-realty`, 승인 빌드 2회) | 전화번호 지우기·봇 상태 배지 `3a3e231ab` · 실거래에서 넘어온 단지 미리 채우기 `c623becf5` + 3단계 수집 엔진 |
| `real_estate_sales` | v1.19 · 2026-10-25 (같은 세션, 승인 빌드 1회) | 「🔔 이 단지 새 매물 알림 받기」 `154e7386b` · 공용 `solapi-client` 사본 `36d0a4fdc` · 30일 정리 회원별 기록 `82a76d9f2`(다음 정리 시각에 관리자 「30일 자동 정리」 표 확인 필요) · `telegram-bot-client` `linkButton` 사본 |
| `ai-video-studio` | v1.22 · 2026-10-25 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회) | 남은 시간 전체 진행률 계산 `d8c0aed57`(대기 줄 옮김) + 맥 렌더 2단계 `40f8c8a99` |
| `banana-canvas` | v1.38 · 2026-10-25 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `banana-canvas-822ffb1o1`) | 무료 지우기 「⬇ AI 계산용 모델 파일 받기」 상자·저장됨 표시·좌측 메뉴·컴퓨터 사양 안내 `c5fb22b4d`·`c41c58f75` — 운영 크롬에서 「✅ 저장됨」·안내·메뉴 확인 |
| `banana-canvas` | v1.37 · 2026-10-25 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `banana-canvas-24uc9d6tb`) | 무료 지우기 모델 받는 곳(허깅페이스)·출처 링크·「AI 계산용 모델 파일(설치 없음)」 이름 `2cc9edc75`·`9cfb40fb1` |
| `shop-detail-page` | v1.33 · 2026-10-24 (Claude Code 윈도우 `claude-win-sdp`, 추가 승인 빌드 1회 `shop-detail-page-lxt19gt29`) | 무료 지우기 글자 상자 넓히기 0.9배 사본 `1304e3fda` — 운영 프로모션 배너 「글자 모두 지우기」 8곳(그래픽 가속), 글자 모양 사라짐·회색 얼룩 1곳 남음(저장 안 함) |
| `banana-canvas` | v1.36 · 2026-10-24 (Claude Code 윈도우 `claude-win-sdp`, 추가 승인 빌드 1회 `banana-canvas-kw70ex2rb`) | 무료 지우기 글자 상자 넓히기 0.9배 기준 `1304e3fda` + 매뉴얼 절 번호·빈 화면 문구 `db31e8684`(v1.35 때 이미 나갔으나 대기 줄이 남아 있어 함께 정리) |
| `ai-video-studio` | v1.21 · 2026-10-24 (Claude Code 윈도우 `claude-win-video`, 승인 빌드 1회) | 영상 만들기 진단 1단계(남은 시간·느림 안내·`[avs-render]` 진단·`?render=software`) + 갤러리 목록 서명 한 번에 `10f736e9e` + 화질 「균형」 `4e1776da0`(대기 줄 옮김) — 운영 크롬: v1.21, 영상 18개 재생·내려받기 주소 정상, 소프트웨어 렌더 진단 `300/300/300` |
| `trending-product-finder` | v1.25 · 2026-10-24 (Claude Code 윈도우 `claude-win-dotori`, 승인 빌드 1회 `trending-product-finder-dt86buzti`) | 공용 사본 telegram-bot-client `linkButton` (본 작업: 추천 사유 프롬프트 당해 연도 규칙) |
| `shop-detail-page` | v1.31 · 2026-10-24 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 1회 `shop-detail-page-ert7y0vcg`) | 30일 정리 `usage_logs` 기록 `34094c954` (본 작업: 문구 고치기 무료 지우기) |
| `banana-canvas` | v1.34 · 2026-10-24 (Claude Code 윈도우 `claude-win-sdp`, 승인 빌드 2회 `banana-canvas-r7tq6xjlt`·`-9os1p5zzy`) | 결과 30일 정리 `usage_logs` 기록 `8ad8ea2e5`·`f53021369` (본 작업: 「🧽 무료 지우기(내 PC)」) |
| `ai-video-studio` | v1.20 · 2026-10-24 (디자인 담당 `agy-win-20261024-videostudio` 리뉴얼 배포 `ai-video-studio-9eovaet1l`에 함께 실림 — 영상 담당 `claude-win-video`가 운영 확인) | 프롬프트 게시판 진행 중 배지 + 누른 카드 바로 갱신 `5b2c589b5`(대기 줄 옮김) — 운영 관리자 계정: 「숨기는 중…」 0.06초에 표시, 카드 바뀜 2.4초(전 3.9초·표시 없음), 되돌림 |
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
| `naver-blog-seo-studio` | v2.19 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `naver-blog-seo-studio-pzqq11f3j`) | 예약 포스팅(블로그 핵심 지침 ③ⓒ) `f8a33efbf`(플랜)·`bbd6d771a`(기능)·`92fb0bb7a`(버전·확장 ZIP) |
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
| `naver-blog-agent` | v2.21 · 2026-10-24 (Claude Code 윈도우 `claude-win-20261024-blog3`, 승인 빌드 1회, `naver-blog-agent-nmd0jyu99`) | E-5 세 가지 포스팅 방식 한 줄 선택·전송 버튼 옆 안내·간편 4단계 안내 `b94be856e`(플랜)·`6e6c3d60b`(기능)·`fae322367`(버전·확장 ZIP) + 대기였던 `7ec53853f` |
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
