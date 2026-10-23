# 세션 인수인계 — Claude Code(윈도우) `claude-win-20261023-mainsite-url` (2026-10-23)

**목적:** 여러 세션이 역할을 나눠 일하는 중이라, 이 세션이 오늘 한 일·남긴 일·만든 도구를 다른 CLI(Claude Code·Codex·agy, 윈도우·맥미니)가 이 문서 하나로 이어받게 한다.
**대상:** ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`). 이 세션은 DB 데이터 변경 없음(읽기만).
**이 세션은 손대지 않는 것:** 블로그 8개 프로그램(`ai-auto-blog`·`blog-keyword`·`blog-workroom`·`naver-blog-agent`·`naver-blog-allinone`·`naver-blog-auto-poster_web`·`naver-blog-seo-studio`·`tistory-auto-blog`) — 블로그 전담 세션 몫.

---

## 1. 이어받을 일 (우선순위 순)

### 1-1. 메인 사이트 링크 정정 — 마지막 1곳 `detail-page-12p`
- **무엇:** 7개 프로그램의 로그인 화면 링크를 `https://aimaster.buylife.xyz` → `https://www.buylife.xyz`, `/signup` → `/register`, `/legal/privacy`·`/legal/terms` → `/privacy`·`/terms`로 정정(코드 커밋 `486fd5fd3`·`9c170faf5`, tsc 0).
- **현황:** 6곳(`cinematic-storyboard-studio`·`ai-prompt-studio`·`persona-style-studio`·`playlist-channel-studio`·`prompt-template-studio`·`allinone-graphic`)은 Next.js 보안 업데이트 배포에 함께 실려 나갔고, `check-app-urls --live`로 반영 확인 → `docs/PENDING_DEPLOYS.md` 「내보낸 기록」, 각 폴더 `docs/IMPROVEMENTS.md` 「✅ 배포됨」까지 끝.
- **남은 곳:** `detail-page-12p`(https://detail-12p.buylife.xyz) — 17:4x 기준 아직 옛 주소·`/signup`이 보임. 보안 세션 `claude-win-20261023-next-security`가 **중간 종료**했고(루트 `docs/HANDOFF.md` 맨 위), 이 프로그램은 v1.11 커밋 `f9a3fcefe`·배포 진행 중이었다고 적혀 있음(그 세션은 **푸시 안 함**).
- **임시 조치(운영 중):** 메인 Vercel 프로젝트 `aimaster`에 도메인 `aimaster.buylife.xyz` → `www.buylife.xyz` 308(경로 유지). 그래서 배포 전에도 **회원가입 링크(`/signup`)만 404**이고 나머지는 동작한다.
- **다음 첫 단계:**
  1. 보안 세션 이어받기 담당이 `detail-page-12p`를 배포했는지 본다: `node scripts/check-app-urls.mjs detail-page-12p --live` → 「✔ 반영됨」이면 3번으로.
  2. 아직이면 이 프로그램 배포는 **보안 세션 이어받기 담당이 할 일**(같은 폴더 동시 작업 금지). 링크 정정은 그 배포에 자동으로 실린다. 따로 배포하려면 주인님께 빌드 1회 승인부터.
  3. `docs/PENDING_DEPLOYS.md` 「대기 중」의 `detail-page-12p` 메인 사이트 링크 줄 1개를 「내보낸 기록」으로(안전 커밋 도우미), `detail-page-12p/docs/IMPROVEMENTS.md`의 「🟡 미배포 대기 — 메인 사이트 링크 주소 정정」 → 「✅ 배포됨」(`--mine`).
  4. 끝나면 `docs/IMPROVEMENT_HANDOFF_20261023_MAINSITE_LINK_PENDING.md` 5절에 한 줄 남기고 이 작업 종료.
- 상세: [`docs/IMPROVEMENT_HANDOFF_20261023_MAINSITE_LINK_PENDING.md`](IMPROVEMENT_HANDOFF_20261023_MAINSITE_LINK_PENDING.md)

### 1-2. 작업 중 표 — 보안 세션 줄 정리 상태
- 17:4x 주인님 지시(「작업 중 표에서 끝난 폴더(shots/ 등)를 빼라」)로 `docs/ACTIVE_WORK.md`의 `claude-win-20261023-next-security` 줄에서 **끝난 45개 폴더를 뺌**(`b01eddb4a`). 판정 기준: 커밋된 `package.json`의 `next`가 보안판(16.4.2↑ 또는 15.5.28↑) + 그 폴더 미커밋 없음(`next-env.d.ts` 제외) + 코드 `APP_VERSION` = DB `programs.version`.
- 남긴 4개: `detail-page-12p`·`ebook-studio`·`ghost-scraper`·`infinite-loop-video`.
- 폴더 이름 ≠ DB slug 짝(판정 때 주의): `shots`→`auto-shorts-posting`, `threads`→`auto-threads-posting`, `insta_auto_poster`→`auto-instagram-posting`, `react-ui-showcase`→`ai-web-ui`, `kakao_auto_poster`→`kakao-auto-posting`.
- 보안 세션에 보낸 알림은 **그쪽에서 수신 거부**되어 전달되지 않음. 이어받는 세션은 이 줄을 49개로 되돌리지 말 것.

### 1-3. 다른 담당에게 넘긴 것
| 대상 | 남은 일 | 문서 |
|---|---|---|
| 블로그 전담 세션 | `naver-blog-agent` 전용 공개 버킷 `naver-blog-agent-media`로 글 23건 이미지 이관함 → 19건 「다시 검수 필요」 표시 여부, 발행 준비 5건 실제 이미지 입력 확인 | `naver-blog-agent/docs/IMPROVEMENT_HANDOFF_20261023_OTHER_SESSION_IMAGE_BUCKET.md` |
| 맥미니 | 커밋·푸시 검사 훅 설치: 맥미니 터미널에서 `node scripts/git-hooks/install.mjs` 한 번 | `scripts/git-hooks/` |

---

## 2. 오늘 한 일 (완료)

| 분야 | 한 일 | 커밋 |
|---|---|---|
| `threads-content-ops` | v2.20 배포(모아 둔 수정: 초안 사진 깜박임, 쿠팡 임시 사진 서버 키 삭제, 공용 사본) | `c790a9539` |
| `naver-blog-agent`(실수로 맡음, 인계함) | v2.12 전용 버킷, v2.13 정리 작업이 파일 이름 시각으로 판정, 글 23건 이미지 이관 | `e11bebdd4`·`f1aabf2a2`·`f9c7bb1cd`·`8db24b5a3` |
| 메인 사이트 링크 정정 | 7곳 코드, 6곳 반영 확인·정리 | `486fd5fd3`·`9c170faf5`·`c391501d6`·`5306b1e3b`·`cca22fbbe` |
| 메인 도메인 넘김 | Vercel `aimaster` 프로젝트에 `aimaster.buylife.xyz` → `www` 308 | (빌드 없음) |
| 작업 중 표 | 보안 세션 줄에서 끝난 45개 폴더 뺌 | `b01eddb4a` |
| 지침 | 한국어 재발 기록(10-23 ①~④, 대책 ⓜ~ⓠ) 루트 `CLAUDE.md`·`~/.claude/CLAUDE.md`·`docs/guidelines/KOREAN.md`, 「프로그램 비교표」 명칭 정정, `docs/CLI_COLLABORATION_RULES.md` 9번(일반 파일도 `safe-commit --mine`, 공용 스크립트 차단, 주소 점검) | 여러 개 |

---

## 3. 이 세션이 만든·고친 도구 (다른 CLI가 그대로 쓰면 됨)

| 도구 | 쓰는 법 | 비고 |
|---|---|---|
| `scripts/check-app-urls.mjs` | 인자 없음: 문서 속 `*.buylife.xyz` 중 연결 안 되는 주소 찾기 / `<slug>`: DB 실제 주소 / `<slug>... --json` / **`<slug>... --live`**: 로그인 없이 `/login`+그 화면 스크립트(`?dpl=` 포함)에서 `www.buylife.xyz` 있음·`aimaster.buylife.xyz`·`/signup` 없음 확인. `--path`·`--find`·`--absent`로 바꿈 | 보고에 프로그램 링크를 쓰기 전 `<slug>`로 실제 주소 확인(추측 금지). `804ebed90` |
| `scripts/deploy.mjs` | 기존대로 `<폴더> --go --owner "<내 줄>"`. **배포가 끝나면 「내보낸 기록으로 옮길 줄」** — `PENDING_DEPLOYS.md` 「대기 중」에서 그 폴더·slug 줄과 올린 세션을 보여 줌(다른 세션 줄이면 「그 세션에 알리기」) | 세션 시작 점검에 주소 요약 한 줄. `804ebed90` |
| `scripts/safe-commit.mjs` | 공용 문서·스크립트: `--begin <파일> --as <세션>` → 고침 → `"<메시지>" <파일> --as <세션> --push`. 일반 파일: `--mine` | `--mine` 이진·삭제 지원(`fa772546e`), 공용 스테이징 맞추기 잠금 `.git/safe-commit-index.lock`(`a88f09453`, 20초 안 못 잡으면 건너뜀). 시험 `scripts/safe-commit.test.mjs` |
| `scripts/check-index-health.mjs` + 훅 | pre-commit·pre-push가 50개 넘는 삭제·스테이징 절반 이하를 막음. `check-shared-doc-reverts.mjs --block-scripts`가 공용 스크립트 일반 커밋을 막음(`AIMASTER_SHARED_SCRIPT_OK=1`로만 통과) | 설치 `node scripts/git-hooks/install.mjs`. `b9d3d4094` |
| `scripts/generate_category_template_map.cjs` | DB `app_url` 우선 사용 | |

---

## 4. 이어받는 세션이 지킬 것 (오늘 겪은 일 기준)
- **공용 스테이징(`.git/index`) 축소 사고가 오늘 3번**(11시대·13:28·14:00) 있었다. `.git/index`·`index.lock`을 지우거나 `reset --hard`·`checkout .`·`stash`로 고치지 말고, `git ls-files | wc -l`이 HEAD(`git ls-tree -r HEAD --name-only | wc -l`)보다 많이 적으면 멈추고 주인님께 먼저 알린다. 1~2개 차이는 다른 세션이 새로 올린 파일이 아직 안 맞춰진 경우가 많다(오늘 `scripts/git-hooks/commit-msg` 사례).
- 다른 세션의 작업 중 표 줄은 **주인님 지시가 있을 때만** 고친다. 메시지(SendMessage)는 상대 권한 방식에 따라 보류·거부될 수 있으니, 고친 사실은 그 줄과 인수인계 문서에도 남긴다.
- 비용 작업(빌드 1회 포함)은 먼저 주인님 승인. 다른 세션의 연속 배포에 실려 나갈 수 있으면 따로 빌드하지 않는다(오늘 링크 정정 빌드 7회 절약).
- 화면에 보이는 모든 문장은 한국어(0순위 규칙). 진행 안내는 「~하겠습니다./~했습니다.」 두 문형.

## 5. 비용
오늘 이 세션: Vercel 빌드 — `threads-content-ops` v2.20 1회, `naver-blog-agent` 배포분(그 인수인계 문서 참고). 링크 정정은 0회(보안 배포에 실려 나감). AI 호출 0회.
