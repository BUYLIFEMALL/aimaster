# 작업 분담표 — Next.js 보안 업데이트 이후 남은 일 (2026-10-23 Claude Code 윈도우, 세션 `claude-win-20261023-next-security`)

> 주인님 지시: 「멀티세션 작업이 많아져서 너가 하던 작업을 다른 CLI들이 나누어서 작업할꺼야」. 이 세션은 여기서 끝나고, 아래 **작업 묶음 A~H**를 CLI들이 하나씩 맡는다.
> 지금까지 한 일의 상세(배포 45개 표·명령·교훈): [`docs/HANDOFF_20261023_NEXTJS_SECURITY.md`](HANDOFF_20261023_NEXTJS_SECURITY.md). 플랜: [`docs/PLAN_20261023_NEXTJS_SECURITY.md`](PLAN_20261023_NEXTJS_SECURITY.md). 대상: ① 운영 AIMaster(DB ref `esgxyikcnnvmlhygjkth`).

## 0. 지금까지 한 일 (2026-10-23 저녁 기준)
| 항목 | 상태 |
|---|---|
| Next.js 보안 업데이트(16.x→16.4.2, 15.5.27→15.5.28) | 대상 49개 **모두 배포 Ready**·DB 버전 맞춤(마지막 4개: detail-page-12p v1.11 `f9a3fcefe`, ebook-studio v1.12 `be64bc2ce`, ghost-scraper v1.14 `0638942d1`, infinite-loop-video v1.06 `9d16655ca`) |
| infinite-loop-video v1.06 | 배포 Ready·로그인 200. 빌드 명령을 `next build --webpack`으로 바꿈(Turbopack이 `@ffmpeg/ffmpeg` Worker를 못 풂) — **크롬 실제 변환 확인은 아직** |
| 동시 빌드 추가 구매(On-Demand Concurrent Builds) | 켜져 있던 **62개 프로젝트 모두 끔**(주인님 승인, 92개 전부 꺼짐). 백업 `docs/evidence/vercel-odcb-backup-20261023.json` |
| 지침 | 「★ 동시 빌드 금지」 추가(`98c6379c6`), ⑤번 「끔 완료」 갱신(`a165684ea`) |
| 푸시 | 이 세션은 푸시 안 함. 다른 세션 푸시로 대부분 원격에 올라갔고 종료 시점 앞선 커밋 2개 — 묶음 A 끝에 한 번 |
| 비용 | Vercel 빌드 49회(승인 범위 약 49회 안), AI 0회 |

## 1. 모든 묶음 공통 규칙 (꼭 지킬 것)
1. **시작 전** `docs/ACTIVE_WORK.md`에 자기 줄(세션 이름·맡은 묶음·폴더)을 넣고, 다른 세션이 그 폴더를 쓰는지 확인한다.
2. **배포는 팀 전체에서 한 번에 하나** — 시작 직전에 팀 `buylife`의 `BUILDING`·`QUEUED`·`INITIALIZING`이 0건인지 확인한다. 이제 동시 빌드 추가 구매가 꺼져 있어 겹치면 **줄을 서서 기다린다**(`deploy.mjs`가 시간 초과로 보여도 실패로 단정하지 말고 `vercel inspect`로 다시 확인).
3. **커밋은 경로 지정** — 일반 파일은 `node scripts/commit-paths.mjs "<메시지>" <경로…> --as <세션>`(공용 `.git/index`·잠금을 쓰지 않음), 공용 문서는 `node scripts/safe-commit.mjs`. 커밋 뒤 `git show --stat HEAD | tail -1`로 파일 수 확인. `git add -A`·`--no-verify`·`.git/index.lock` 삭제 금지.
4. **푸시는 작업 묶음 끝에 한 번**(푸시마다 메인 사이트 빌드가 생김).
5. **비용이 드는 단계(빌드 포함)는 그 묶음의 「비용」 칸 범위 안에서만** — 칸에 「승인 필요」로 적힌 것은 시작 전 주인님께 여쭌다. 끝나면 비용 리포트.
6. 버전은 실제 배포 때 한 번만 +0.01(코드 `APP_VERSION` + DB `programs.version`).

## 2. 작업 묶음
| 묶음 | 할 일 | 맡을 CLI(추천) | 폴더 | 선행 | 비용 |
|---|---|---|---|---|---|
| **A** | infinite-loop-video 크롬 변환 확인 + 푸시 1회 | 윈도우 Claude Code(크롬) | `infinite-loop-video/` | 없음 | 없음(고칠 게 나오면 빌드 — 승인 필요) |
| **B** | 문서 정리(대기 목록 18줄 → 내보낸 기록, 프로그램별 버전 기록, 플랜 결과, 작업 중 표) | 아무 CLI(맥미니 포함, 문서만) | 문서만 | A 이후 마무리(앞부분은 먼저 가능) | 없음 |
| **C** | `/login` 404 3개 점검 | 윈도우 Claude Code(크롬) | `ai-webtoon-studio/`·`ebook-studio/`·`ghost-scraper/` | 없음 | 확인은 없음, 고치면 빌드 — 승인 필요 |
| **D** | 버전 미증가 2개 보정 | 그 프로그램을 다음에 배포하는 CLI | `ai-influencer-studio/`·`ai-prompt-studio/` | 없음 | 다음 배포 때 함께(추가 빌드 없음) |
| **E** | 제외했던 10개 보안 업데이트 | 블로그 7개는 **블로그 담당 세션**, 나머지 3개는 아무 윈도우 CLI | 아래 표 | 없음 | 빌드 약 10회 — **승인 필요** |
| **F** | 3단계: Next 14.2.35 19개 + 메인 사이트(큰 버전 변경) | Codex(설계·시험) → 각 분야 담당이 나눠 적용 | 아래 표 | 플랜 먼저 | 빌드 20회 이상 — **별도 플랜·승인 필요** |
| **G** | 이 세션 이전의 미배포 대기 3건 | 해당 프로그램을 다음에 배포하는 CLI | 아래 | 없음 | 다음 배포 때 함께 |
| **H** | 주인님 결정 대기 | 주인님 | — | — | — |

### 묶음 A — 마무리 확인 (배포는 끝남)
1. **infinite-loop-video(v1.06)** https://infinite-loop-video.buylife.xyz — 크롬에서 짧은 영상 하나로 무한 반복 영상 만들기가 끝까지 되는지(ffmpeg Worker 로드, 콘솔 오류 없음). 안 되면 원인 기록 후 `--webpack` 설정·`next.config`를 확인(고쳐서 다시 배포하면 빌드 1회 — 승인).
2. (ghost-scraper `/login` 404는 묶음 C로 옮김)
3. `git push origin master` 한 번 → `git status -sb`가 앞선 커밋 0인지.

### 묶음 B — 문서 정리 (비용 없음)
1. `docs/PENDING_DEPLOYS.md` 대기 표에서 **이번 보안 배포에 함께 나간 줄을 「내보낸 기록」으로 옮긴다.** 대조 결과(2026-10-23 기준 줄 번호, 다른 세션이 고치면 바뀜): `kakao_auto_poster`(2줄) · `music-video-studio` · `detail-page-12p` · `portrait-photo` · `banana-canvas` · `reverse-prompt` · `four-cut-comics` · `allinone-graphic` · `ai-mastering-studio` · `naver-cafe-poster` · `persona-style-studio` · `react-ui-showcase` · `ai-audio-analyzer` · `ai-slide-builder` · `shorts-viral-studio` · `emotion-writer` · `infinite-loop-video`.
   ⚠ **커밋 시각이 그 프로그램 배포 시각보다 늦은 줄은 나가지 않았다** — `git log -1 --format=%ci <커밋>`과 Vercel 배포 시각을 대조해 늦은 줄은 대기로 남긴다. CLI 배포는 그 시점 작업 폴더 파일을 올리므로, 커밋 전이라도 파일이 있었으면 나갔을 수 있다(애매하면 대기로 두고 메모).
2. 각 프로그램 `docs/IMPROVEMENTS.md`(또는 AGENTS 맨 위) 「미배포 대기」 표시를 지우고 버전 기록 한 줄: 「vX.YY 2026-10-23 Next.js 보안 업데이트(16.4.2/15.5.28) + 대기분 함께」. 배포된 폴더 목록은 상세 인수인계 2번 표.
3. `docs/PLAN_20261023_NEXTJS_SECURITY.md` 끝에 「결과」 절(49개 중 몇 개 배포, 제외 10개, 3단계 남음).
4. `docs/ACTIVE_WORK.md`의 `claude-win-20261023-next-security` 줄 — 이 세션이 끝나며 「분담표 참고」로 바꿔 둠. 묶음 A·B가 끝나면 삭제.
5. 프로그램 비교표 버전은 배포 스크립트가 이미 갱신함(`docs(capability-map): <폴더> <버전>` 커밋들) — 빠진 곳만 확인.

### 묶음 C — `/login` 404 점검
| 프로그램 | 확인한 것 | 할 일 |
|---|---|---|
| ai-webtoon-studio (https://ai-webtoon-studio.buylife.xyz) | `/login` 404, `/` 307, `/dashboard` 404. 배포는 Ready | 앱의 실제 로그인 경로를 코드(`src/app` 라우트)와 크롬으로 확인. 원래부터 `/login`이 없는 앱이면 문제 아님(기록만) |
| ebook-studio (https://ebook.buylife.xyz) | `/login` 404. 배포는 Ready, DB v1.12 | 같은 방법. 메인 사이트 「바로가기」(`programs.app_url`)가 열리는지도 확인 |
| ghost-scraper (https://ghost-scraper.buylife.xyz, DB slug `website-scraper`) | `/login` 404. 배포는 Ready, DB v1.14 | 같은 방법 |
- 보안 업데이트 전 배포에서도 404였는지 비교하면 원인을 빨리 가를 수 있다(이전 배포 주소로 같은 경로 요청).

### 묶음 D — 버전 미증가 2개
- `ai-influencer-studio`(v1.24 그대로), `ai-prompt-studio`(v1.09 그대로): 버전 파일이 작은따옴표라 스크립트가 못 올림. 보안 수정은 이미 배포됨. **다음 배포 때 +0.01**(코드+DB), 각 폴더 `docs/IMPROVEMENTS.md`에 「버전 미증가 배포 2026-10-23」 한 줄.

### 묶음 E — 제외했던 10개 (아직 취약 버전)
| 폴더 | 현재 next | 제외 이유 | 맡을 곳 |
|---|---|---|---|
| ai-auto-blog · tistory-auto-blog | 16.2.10 | 블로그 담당·확장 동기화 필요 | 블로그 담당 세션 |
| naver-blog-agent · naver-blog-allinone | 16.2.11 | 〃 (agent는 다른 세션 작업 중이었음) | 〃 |
| naver-blog-seo-studio | 16.3.5 | 〃 | 〃 |
| blog-keyword | 16.4.0 | 〃 (16.4.0은 빌드 끝에 `SecurityFatalError`로 멈춤) | 〃 |
| cardnews-studio · seo-thumbnail-pro · youtube-channel-consultant | 16.2.11 | 버전 파일 없는 옛 구조 | 윈도우 CLI 아무나 |
| web-crawler | — | 미커밋 변경(`web-crawler/AGENTS.md`) 있음 | 그 변경 주인 세션 |
- 방법은 상세 인수인계 1번(폴더마다 `npm install next@16.4.2`(+`eslint-config-next`) → `tsc` → build → 경로 커밋 → 배포 → DB 버전 → 로그인 확인). 확장이 있는 블로그 프로그램은 manifest·ZIP·DB 확장 버전도 함께(핵심 원칙 10).

### 묶음 F — 3단계: Next 14.2.35 (패치 없는 버전, 큰 변경)
| 분야 | 폴더 |
|---|---|
| 메인 사이트 | 루트(`app/`) |
| 영상·음악 | `ai-video-studio` · `ai-music-studio` · `music` · `video-to-gif` |
| 인스타·댓글 | `comment-inbox` · `instagram-comment-reply` · `instagram-dm-reply` · `threads-comment-reply` · `threads-content-ops` |
| 이미지·상세페이지 | `ai-image-studio` · `auto-detail-page` · `shop-detail-page` |
| 문자·CRM | `booking-reminder` · `crm-google-form` |
| 분석·키워드 | `competitor-analysis` · `longtail-keyword-expander` |
| 무료 체험 | `mbti` · `mbti-character` · `tarot` |
- 위 목록은 `node_modules/next`가 설치된 폴더만 센 것이다 — `node_modules`가 없는 폴더(예: `stepmail`·`real_estate_sales`)는 `package.json`의 `next` 값을 따로 확인한다.
- 순서: ① 플랜 문서(`docs/PLAN_YYYYMMDD_NEXT14_UPGRADE.md`) — 15.5.28로 갈지 16.4.2로 갈지, 바뀌는 점(동적 `params`·`searchParams`·`cookies()`·`headers()` 비동기, `fetch` 기본 캐시 변화 등) ② **한 프로그램으로 시험**(작은 것 추천: `tarot`) ③ 주인님 승인 뒤 분야 담당 세션이 자기 분야를 하나씩. 메인 사이트는 맨 마지막(푸시하면 바로 빌드).

### 묶음 G — 이전 미배포 대기
| 무엇 | 프로그램 | 커밋 | 비고 |
|---|---|---|---|
| 「다음 확인 예정」·「실행 방식 바꾸기」 바로가기 | `instagram-comment-reply` | `24562d6aa` | 묶음 F(14.2.35)와 같이 내보내면 빌드 1회 절약 |
| SOLAPI 공용 기준 코드 `solapi-client` + 테스트 문자 이름 버그 | `booking-reminder` · `stepmail` · `crm-google-form` · `real_estate_sales` (kakao·trending은 이번에 나감) | `36d0a4fdc` | 플랜 `crm-google-form/docs/PLAN_20261023_SOLAPI_SHARED.md`. booking·stepmail은 테스트 문자에 다른 프로그램 이름이 나가는 작은 버그 |
| 유튜브 30일 정리 기록 확인 | `youtube-auto-reply` | — | 새벽 3:40 정리 뒤 `usage_logs` `cleanup_expired` 기록이 생겼는지 DB 조회(비용 없음) |

### 묶음 H — 주인님 결정 대기
- 오래 남은 `.git/index.lock`과 오래된 공용 스테이징(그대로 일반 커밋하면 21개 파일이 되돌아갈 위험). 다른 세션 것이라 손대지 않음. 결정 전까지 모든 CLI는 `commit-paths.mjs`/`safe-commit.mjs`로만 커밋.

## 3. 맡을 때 이 문서에 적기
맡은 CLI는 아래 표에 한 줄 넣고(안전 커밋), 끝나면 상태를 「완료(커밋)」로 바꾼다.

| 묶음 | 맡은 세션(장비) | 시작 | 상태 |
|---|---|---|---|
| | | | |
