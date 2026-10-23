# Claude Code 보조 계정 세션 인수인계 — 2026-10-15 (저녁)

> 계정: Claude Code 보조 계정 `buylifemall1@gmail.com`(설정 폴더 `.claude-account2`, 브라우저는 **엣지만** — deviceId `6455da5d-…`). 커밋·배포·DB는 메인 계정 기준(BUYLIFE / buylifemall@gmail.com).
> 앞부분: 새벽 [`HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2.md`](HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2.md) → 오전~오후 [`HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2_PM.md`](HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2_PM.md) → 이 문서.
> 작업 목록(완료 표시 포함): [`WORK_QUEUE_2026-10-15.md`](WORK_QUEUE_2026-10-15.md)

## 1. 한눈에 보기

| # | 작업 | 결과 | 커밋 |
|---|---|---|---|
| 1 | REA를 Codex·Antigravity·Gemini CLI에도 연결 | 세 도구 설정에 MCP `rea` 추가(기존 설정은 `.rea.backup`), 공용 skill `~/.agents/skills` | `b4cda790` |
| 2 | **C4 개선 3건** — AI 할 일·성과 관리(`ai-task-planner`) | v1.06 | `47fb1d32` |
| 3 | **D1** AI 엑셀·텍스트 합치기(`file-merge`) 후보 기능 | v1.03 → v1.04 → v1.05 | `c6ddbe26` `c3ee3c47` `e00b6914` |
| 4 | **E2** 엣지 자동 다운로드 허용 | 4컷 만화 연속 3개 다운로드 확인 | `7d38aded` |
| 5 | **B6 마무리** — 네이버 블로그 자동화 App·Web 연동 화면 흰색 표준 | App v1.04, Web v1.05(확장 버전 동기화) | `377f043e` |

- 같은 시간대 다른 세션 커밋: `13d99740`·`48ff7fb7`·`0ba32646`(codex-statusbar), `d240159f`(Orca 상태바 지침). 이 세션 작업 아님.

## 2. 작업별 요점

### 2-1. REA 다른 CLI 연결
- Claude Code 두 계정은 오후에 연결 완료(`rea setup`). 저녁에 Codex·Antigravity·Gemini CLI 설정에도 MCP `rea`를 넣음. 이미 열려 있던 세션은 **재시작해야** 도구가 보임.
- 상세: [`REA_REVERSE_ENGINEERING.md`](REA_REVERSE_ENGINEERING.md), [`ANALYSIS_TOOLKIT.md`](ANALYSIS_TOOLKIT.md).

### 2-2. ai-task-planner v1.06 (C4 개선)
- ① 키 상태: 확인하는 1~2초 동안 "확인하는 중입니다…"(오류일 때만 "확인 필요").
- ② AI 결과에 내부 영문 이름·`null`·ISO 시각이 나오던 문제: 지시문이 아니라 **AI에 보내는 데이터를 `promptView()`로 한국어 항목·값으로 변환**. 제목은 「」로 원문 인용.
- ③ [분석 모델 저장] 뒤 저장 안내 문구.
- 함정(ERROR_LESSONS 기록): JSON 구조화 출력에서 큰따옴표 인용을 시키면 문장이 잘림 → 「」 사용. "영어 금지"를 넓게 걸면 제목 "C4"가 "씨포"로 바뀜.
- 검수: 단위 22/22, 운영 엣지 시험 계정에서 본인 Gemini 분석 4회로 확인. 상세: `ai-task-planner/AGENTS.md` v1.06.

### 2-3. file-merge v1.03~v1.05 (D1)
- v1.03: 남길 열·순서 선택, 같은 행 제거, 원본 바이트 보관 중단(메모리 절약).
- v1.04: **원본 서식 유지 저장**(ExcelJS 4.4.0, `src/lib/files/styled.ts`). 머리글·열 너비는 그 열이 처음 나온 파일, 데이터 행은 각자 원래 파일 서식. 결과 100만 칸 한도(`MAX_STYLE_CELLS`). `uuid` overrides `^11.1.1`로 취약점 0건. 원본 행 위치 추적(`rowNums`/`col0`/`src`/`origin`/`idx`/`keep`).
  - 메모리 실측(`scripts/measure-memory.mjs`): 30만 행 보관 137MB / 서식 유지 저장 10만 행 10초·약 1.4GB, 30만 행 48초·약 3.1GB.
  - v1.03에 실수로 들어간 실제 NUL 문자도 수정(ERROR_LESSONS 기록: 스크립트로 소스 고칠 때 `\u0000` 이스케이프 주의, 커밋 전 NUL 검사).
- v1.05: 엑셀 나누기 3방식(시트별·열 값별·N행씩)에도 서식 유지.
- 검수: 테스트 21/21, 엣지에서 실제 다운로드한 파일로 서식 확인(시험 파일 삭제). 상세: `file-merge/AGENTS.md`, `file-merge/docs/CLI_HANDOFF.md`.

### 2-4. E2 엣지 자동 다운로드
- 원인: 처음 차단 때 엣지가 four-cut-comics를 **"허용 안 함" 목록에 자동으로 넣어서**, 허용 목록에 추가만 해서는 계속 막힘.
- 주인님이 `edge://settings/content/automaticDownloads`에서 차단 목록에서 빼고 허용 목록에 추가 → 연속 3개 모두 `D:\PDS`에 받아짐. (`edge://` 페이지는 도구로 열 수 없어 주인님이 직접 설정.)

### 2-5. B6 네이버 블로그 자동화 App·Web 흰색 표준
- 대상: `naver-blog-auto-poster_app/web`(v1.03→v1.04), `naver-blog-auto-poster_web/web`(v1.04→v1.05). 변경 스크립트 방식은 두 앱 동일.
- `globals.css` 끝에 흰색 덮어쓰기(브랜드색 emerald), 화면 글자색 클래스를 밝은 화면용으로 교체.
- 새 좌측 메뉴 `web/components/Sidebar.tsx`: 프로그램명·버전 → ← 다른 프로그램 보기 → 1 다운로드 / 2 사용 방법 / 3 기기 연동 토큰(같은 화면 `#download`·`#howto`·`#tokens`로 이동) → API키등록·플랫폼연동(메인 `/api-settings`)·연동 매뉴얼(`#guides`) → 이메일·로그아웃. 767px 이하는 ☰ 메뉴.
- `layout.tsx`의 어두운 위쪽 줄 제거. 로그아웃 API `web/app/api/auth/logout/route.ts` 추가(four-cut-comics 복사, 다른 출처 요청 403).
- Web 확장(핵심 원칙 10번): 코드 변경 없이 `manifest.json` 1.5.0 / v1.05, ZIP 재생성 → 메인 사이트 재배포, DB `version`·`extension_version` v1.05, `check-extension-release.mjs naver-blog-auto-poster-web` **OK**.
- 검수: tsc·빌드, 운영 비로그인 307·로그아웃 403·옛 www API 401 전달 유지. 두 프로그램이 비공개(관리자만)라 시험 계정으로 열 수 없어서, 로컬 dev에 로그인 확인만 뺀 임시 미리보기를 엣지로 확인(흰 화면·메뉴 이동·400px ☰·가로 넘침 0) 후 미리보기 삭제(커밋 안 함).
- **운영 로그인 화면은 관리자 계정(메인 크롬)으로 주인님 확인 필요.**
- 라이브: https://naver-blog-auto-poster.buylife.xyz/naver-blog-auto-poster , https://naver-blog-auto-poster-web.buylife.xyz/naver-blog-auto-poster-web

## 3. 사고·주의 기록
- 푸시 거절(다른 세션이 먼저 푸시)일 때는 작업 폴더를 건드리지 않고 올림: 임시 `GIT_INDEX_FILE`로 `read-tree origin/master` → 내 파일 blob `update-index` → `write-tree` → `commit-tree -p origin/master` → `push <NEW>:master` → 로컬 `reset --soft NEW` 후 원격에서 바뀐 파일만 맞춤. `377f043e`가 이 방식.
- 공유 문서(`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`)는 다른 CLI의 미커밋 수정이 있어 **HEAD blob 방식**으로 내 항목만 올리고, `git diff --cached --name-only` 확인 후 pathspec 없이 `git commit`.
- PowerShell 프로세스 종료 명령은 exit 255로 bash 명령 체인을 끊음 — 따로 실행.

## 4. 남은 일
| 누가 | 내용 |
|---|---|
| 에이전트(승인 필요) | B1 Step Mail Next 16 이전 |
| 에이전트(선택) | B2 개발용 도구 취약점, D2 4컷 만화 추가 기능(지시 시) |
| 자료 필요 | EXE 분석(파일을 `D:\PDS`에 넣으면 DIE 판별 → 분석 → 재구현 계획), A1 Step Mail 초안 편집기(초안 필요), C2 ai-writing-editor 편집 화면(문서 필요) |
| 주인님 | C1·C3 실제 휴대폰 확인, C4 W06 두 번째 기기, B6 Threads 재연결 1회·관리자 계정으로 네이버 App·Web 새 화면 확인, E1 엣지 절전 예외, E3 `D:\PDS` 4컷 시험 이미지 3개 정리 |
| 주인님(선택) | Fixie 비밀번호 재발급(threads-content-ops·threads-affiliate-poster 둘 다 재등록), Windows 샌드박스 켜기, Codex·Antigravity·Gemini 세션 재시작(REA 표시), 시험 데이터 정리(ai-task-planner 할 일 2개, photo-remake 결과물) |
| 참고 | 루트·분리 앱은 Next 14.2.35. `document-translator`는 Codex 작업 중 — 손대지 않음 |

## 5. 이어서 작업하는 법
1. `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`·`docs/WORK_QUEUE_2026-10-15.md`를 먼저 읽는다.
2. 보조 계정 세션은 `list_connected_browsers` → 엣지 선택. 크롬은 메인 계정 전용.
3. 버전은 `version.ts` + DB `programs.version` 함께 +0.01(확장 있으면 manifest·ZIP·`extension_version`·검증 스크립트까지).
4. 배포는 `.vercel/project.json`의 projectName 확인 후 `vercel deploy --cwd <절대경로> --prod --yes --scope buylife`.
