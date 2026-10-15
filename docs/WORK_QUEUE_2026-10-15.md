# 해야 할 작업 목록 — 2026-10-15 (Claude Code 보조 계정 세션 기준)

- 2026-10-14~15 이 세션에서 남긴 일을 한곳에 모았다. 처리하면 줄을 지우지 말고 **상태를 "완료(날짜·커밋)"로 바꾼다**.
- 담당: **주인님** = 로그인·결정·브라우저 설정 등 주인님만 할 수 있는 일 / **에이전트** = CLI가 이어서 할 수 있는 일.
- 배포 전 규칙: 서브프로젝트를 고치기 전에 그 폴더 `AGENTS.md`의 승인 규칙을 먼저 확인한다(`stepmail`·`kakao_auto_poster`는 **Git push·프로덕션 배포 전 주인님 승인 필수**). 배포는 `vercel deploy --cwd <절대경로>` + `.vercel/project.json` projectName 확인 후.

## A. 우선 처리(확인이 빠진 운영 변경)

| # | 작업 | 담당 | 내용·확인할 것 | 근거 |
|---|---|---|---|---|
| A1 | ~~Step Mail 로그인 상태 화면 확인~~ **완료(2026-10-15)** — 주요 화면·필터·엑셀 양식 정상. 남은 것: 초안 편집기(초안이 있어야 열림) | 완료 | v1.07에서 Next 14→15.5 + React 19로 올렸다. 로그인 후 리드 목록(페이지·상태 필터)·초안 편집(tiptap 편집기)·새 캠페인(초안 선택)·엑셀 양식 내려받기/업로드가 정상인지. 주인님이 엣지에서 `https://stepmail-kappa.vercel.app`에 한 번 로그인해 두면 에이전트가 이어서 확인한다. **실제 발송·캠페인 "지금 실행"은 하지 않는다.** | `stepmail/AGENTS.md` v1.07 |
| A2 | **카카오톡 뉴스레터 로그인 상태 화면 확인** | 주인님 → 에이전트 | v1.06(xlsx)·v1.07(next 16.4·nodemailer 10). 로그인 후 설정·수신자 엑셀 양식/업로드·발송 내역 화면. **카카오·메일 실제 발송은 하지 않는다.** 엣지에서 `https://kakaoautoposter.vercel.app` 로그인 필요. | `kakao_auto_poster/AGENTS.md` v1.07 |
| A3 | ~~AI 포토 리메이크 자동화 실제 회원 검수~~ **완료(2026-10-15)** — 복원·합성·보관함·400px 정상. 개선 후보: 복원 때 AI가 인물 쪽으로 확대해 원본 구도가 바뀜 | 완료 | v1.01 출시(2026-10-15). 엣지에서 일반 회원으로 사진 복원(2배)·사물 합성(AI 제안 포함)·비교·다운로드·보관함·400px 화면 확인. 본인 Gemini 사용량 발생. 보조 계정 엣지가 Claude in Chrome에 연결돼 있어야 함. | `photo-remake-studio/docs/RELEASE_CHECKS.md` |
| A4 | ~~포토 리메이크 v1.02 구도 유지 운영 재확인~~ **완료(2026-10-15)** — 같은 사진으로 v1.01은 인물만 꽉 차게 잘렸고, v1.02는 왼쪽 빈 벽·인물 위치 유지(아버지 머리 가로 위치 원본 0.80 → 결과 0.79), 1792×2354 | 완료 | v1.02 배포 완료(복원 지시에 자르기·확대 금지). 같은 조건(인물 오른쪽·왼쪽 빈 벽·긁힘) 사진으로 복원해 구도가 유지되는지 확인. 엣지 탭이 숨으면 절전으로 멈춤. | `photo-remake-studio/AGENTS.md` |

## B. 보안·유지보수

| # | 작업 | 담당 | 내용 | 근거 |
|---|---|---|---|---|
| B1 | Step Mail Next 16 이전(선택) | 에이전트(승인 필요) | 운영 취약점 남은 2건(Next 15 내장 postcss 8.4.31)은 Next 16으로 올려야 사라진다. 실사용 위험은 낮음(빌드 때 자체 CSS만 처리). middleware→proxy 등 변경이 더 많아 별도 작업. | `stepmail/AGENTS.md` v1.07 |
| B2 | 개발용 도구 취약점 정리(선택) | 에이전트 | 두 프로그램의 eslint 계열(braces·micromatch·glob 등) — 운영 서버에 들어가지 않음. eslint-config-next 정리 시 함께. | `npm audit` |
| B3 | ~~글·대본 생성 프로그램 "현재 월" 추가~~ **완료(2026-10-15)** — 16개 프로그램 버전 +0.01·배포·DB, 확장 4개 검증 OK | 완료 | | HANDOFF 2026-10-15 B3 |
| B4 | `vercel.app` 주소만 쓰는 프로그램의 도메인 연동(SSO) 후보 | 에이전트(정책 확인) | stepmail·kakao는 아직 `*.vercel.app`이라 메인 사이트 로그인이 공유되지 않는다(검수 때 매번 따로 로그인 필요). 원칙 11번 절차(OAuth 콜백 고정 여부 먼저 확인)로 한 프로그램씩. | `docs/DOMAIN_SSO_POLICY.md` |
| B5 | 나머지 프로그램 "현재 월" 추가(보류) | 에이전트(지시 시) | 연도 규칙만 있고 현재 월이 없는 나머지: ai-audio-analyzer, ai-mastering-studio, ai-prompt-studio, ai-slide-builder, allinone-graphic, banana-canvas, fashion-style, ghost-scraper, music-video-studio, persona-style-studio, playlist-channel-studio, prompt-template-studio, reverse-prompt, seo-thumbnail-pro, style-dna-analyzer, thumbnail-master, ui-canvas, tistory-auto-blog·ai-auto-blog의 `shortsAnalysis.ts`(쇼츠 분석), document-translator(Codex 작업 중). 대부분 이미지·오디오 도구라 우선순위 낮음. 같은 `koreaNowRule()`을 주 지시문에 붙이고 각 버전 +0.01. | HANDOFF 2026-10-15 B3 |
| B6 | ~~메인 사이트 안의 프로그램 3개 독립 분리~~ **완료(2026-10-15)** — threads-content-ops v1.94, naver-blog-auto-poster v1.03, naver-blog-auto-poster-web v1.04. 남은 것: ~~쓰레드 `FIXIE_URL` 등록~~(2026-10-15 등록·토스 베스트 목록 정상), 실제 Meta 재연결 1회 확인, 네이버 App·Web 로그인 화면 확인(관리자 계정, 비공개 프로그램), 두 화면 흰색 표준 적용(선택) | 완료 | HANDOFF 2026-10-15 분리 ①②③ |

## C. 휴대폰·화면 검수

| # | 작업 | 담당 | 내용 | 근거 |
|---|---|---|---|---|
| C1 | 실제 휴대폰으로 모바일 화면 확인 | 주인님(또는 기기 모드) | 위쪽 메뉴(☰)로 바꾼 12개 프로그램(four-cut-comics, file-merge, ai-writing-editor, banana-canvas, blog-keyword, fashion-style, landing-architect, music-player, personality-suite, portrait-photo, reverse-prompt, thumbnail-master). 지금까지는 엣지 492px·400px iframe으로만 확인. | 원칙 19번, `docs/SIDEBAR_LAYOUT_STANDARD.md` |
| C2 | ~~각 프로그램 본문 안의 모바일 배치 점검~~ **완료(2026-10-15)** — 12개 23화면 400px 가로 넘침 0, 수정 필요 없음. 남은 것: ai-writing-editor 편집 화면(문서가 있어야 열림) | 완료 | 메뉴 셸만 고쳤다. 표·편집기·좌우 분할·버튼이 좁은 화면에서 쓸 만한지 프로그램별로 확인·수정(각 버전 +0.01). | 원칙 19번 |
| C3 | 4컷 만화 휴대폰 터치(말풍선 끌기)·[내 작품] | 주인님(또는 기기 모드) | | `four-cut-comics/docs/CLI_HANDOFF.md` §6 |
| C4 | AI 할 일·성과 관리 일반 회원 실제 검수 | 에이전트 | 예전부터 남은 항목(일반 회원 로그인·본인 Gemini 호출·두 기기). | `ai-task-planner/docs/WORK_QUEUE.md` |

## D. 프로그램 후속 개발(지시 시)

| # | 작업 | 내용 | 근거 |
|---|---|---|---|
| D1 | AI 엑셀·텍스트 합치기(`file-merge`) 후보 기능 | 엑셀 서식(색·테두리) 유지, 시트 안 중복 행 제거, 열 선택·순서 변경, 수십만 행 × 여러 파일 메모리 관찰 | `file-merge/docs/CLI_HANDOFF.md` §3 |
| D2 | 4컷 만화 후보 | 현재 남은 개발 항목 없음(v1.07). 필요 시 지시 | `four-cut-comics/docs/CLI_HANDOFF.md` |

## E. 주인님 환경 설정·정리(선택)

| # | 작업 | 내용 |
|---|---|---|
| E1 | 엣지 절전 예외 | 엣지 설정 → 시스템 및 성능에서 `buylife.xyz`(필요하면 `vercel.app`)를 절전 예외로 — 에이전트 검수 탭이 뒤에 숨어도 멈추지 않게. |
| E2 | 엣지 자동 다운로드 허용 | 주소창 오른쪽 다운로드 차단 아이콘에서 `four-cut-comics.buylife.xyz`·`file-merge.buylife.xyz` 허용 — 연속 저장이 막히지 않게. |
| E3 | 시험 파일 정리 | `D:\PDS`의 `4컷만화-grid.png`·`4컷만화-grid (1).png`·`4컷만화-합치기.png`(필요 없으면 삭제). |

## F. 다른 CLI와 공유하는 주의

| # | 내용 |
|---|---|
| F1 | 작업 폴더의 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`에 다른 CLI의 미커밋 변경이 있다(HEAD보다 옛 항목 포함). 커밋할 때 HEAD와 합쳐야 한다. 이 세션은 HEAD blob 방식으로만 커밋했다. |
| F2 | `document-translator`(Codex)·`codex-statusbar`는 다른 CLI 작업 폴더 — 손대지 않는다. |
