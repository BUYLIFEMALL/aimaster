# Claude Code 보조 계정 세션 인수인계 — 2026-10-15 (오전~오후)

> 계정: Claude Code 보조 계정 `buylifemall1@gmail.com`(설정 폴더 `.claude-account2`, 브라우저는 **엣지만**). 커밋·배포·DB는 메인 계정 기준(BUYLIFE / buylifemall@gmail.com).
> 앞부분(새벽: file-merge v1.02, stepmail·kakao v1.07 등): [`HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2.md`](HANDOFF_CLAUDE_SESSION_2026-10-15_ACCOUNT2.md)
> 작업 목록(완료 표시 포함): [`WORK_QUEUE_2026-10-15.md`](WORK_QUEUE_2026-10-15.md)

## 1. 한눈에 보기

| # | 작업 | 결과 | 커밋 |
|---|---|---|---|
| 1 | **AI 포토 리메이크 자동화**(`photo-remake-studio`) 신규 출시 | v1.01 → v1.02(복원 때 원본 구도 유지), https://photo-remake-studio.buylife.xyz | `19515791` `9d56b585` `f0567a94` `6e0dd592` |
| 2 | Claude Code 하단 상태바 고정 지침 | CLAUDE.md 원칙 20 / AGENTS.md 19, `docs/CLAUDE_STATUSBAR.md`, guard에 `.good` 백업 복원 | `f0567a94` |
| 3 | **B3** 글·대본 생성 16개 프로그램 AI 지시문에 "한국 시간 현재 월" 추가 | 각 +0.01·배포·DB, 확장 4개 검증 OK | `b4ff74db` |
| 4 | A1·C2 기록(Step Mail 로그인 화면, 12개 프로그램 본문 모바일 점검) | 수정 필요 없음 | `b03ebb86` |
| 5 | **메인 사이트 안의 프로그램 3개 독립 분리** | threads-content-ops v1.94, naver-blog-auto-poster(App) v1.03, naver-blog-auto-poster-web v1.04 | `c850784b` `f4c5b31e` `41146346` |
| 6 | 쓰레드 `FIXIE_URL` 등록(토스쇼핑 고정 IP) | 민감 값 등록·재배포, 토스 베스트 30개 정상. Fixie는 tricycle 월 $0(카드만 등록) | `e1a42239` `8212dc77` `f0f99a57` `f15bab82` |
| 7 | **B4** Step Mail·카카오톡 뉴스레터 `buylife.xyz` 도메인 연동(SSO) + **A2** | 각 v1.08, 재로그인 없이 진입 확인 | `afb1027b` |
| 8 | 카카오 JS SDK 도메인 등록 확인 | 주인님이 콘솔에 새 주소 추가 → 공유 창·실제 공유 정상 | `c1450edc` |
| 9 | **C4** AI 할 일·성과 관리 실제 회원 검수 | W01~W05 통과(코드 변경 없음) | `52e6ce2d` |
| 10 | **REA(리버스 엔지니어링) 환경 구축 + 메인 지침 원칙 21** | Java 21·Ghidra 12.1.4·REA MCP(두 계정)·ILSpy·.NET 8 SDK·DIE·7-Zip | `9fc253f3` `f3b64929` `3c307814` `d23bdaf1` |

- B5(나머지 19개 "현재 월")는 다른 세션이 완료했다(`fc507531`, `811f3657`, `docs/HANDOFF_B5_CURRENT_MONTH_2026-10-15.md`).

## 2. 작업별 요점

### 2-1. photo-remake-studio (v1.02)
- Google AI Studio 앱을 이어 완성: 사진 복원·컬러화·확대, 사물 합성(AI 제안), 비교·다운로드, 보관함. 회원 본인 Gemini 키.
- DB: `programs`·요금제 3종·VIP 접근·썸네일. v1.02에서 복원 지시에 "자르기·확대 금지, 원본 구도 유지"(FRAMING) 추가, 같은 사진으로 운영 재확인.
- 시험 계정에 시험 데이터가 남아 있음(정리는 선택).

### 2-2. B3 현재 월
- 16개 프로그램 프롬프트에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월…]". 버전: threads-content-ops v1.93, landing-architect v1.05, cardnews-studio v1.08, youtube-channel-consultant v1.05, cinematic-storyboard-studio v1.04, ai-auto-blog v1.62, naver-blog-allinone v1.41, naver-blog-agent v1.83, tistory-auto-blog v1.69, youtube-viral-studio v1.11, detail-page-12p v1.02, ai-influencer-studio v1.07, ai-webtoon-studio v1.08, suno-music-studio v1.08, ebook-studio v1.04, emotion-writer v1.08.

### 2-3. 메인 사이트 = 홈페이지만 (독립 분리)
- 주인님 지시: "모든 프로그램은 AIMaster 안의 서브프로젝트로, AIMaster는 프로그램에 들어가는 홈페이지."
- threads-content-ops → https://threads-content-ops.buylife.xyz (크론 2개 이전, OAuth state 쿠키 `.buylife.xyz`). 네이버 App·Web → 각 폴더 `web/` 독립 Next 앱, https://naver-blog-auto-poster.buylife.xyz, https://naver-blog-auto-poster-web.buylife.xyz.
- 루트에는 옛 주소 전달(`next.config.mjs` redirects·rewrites)만 남김 — 설치된 데스크톱 앱·확장·외부 OAuth 콜백 그대로 동작. CLAUDE.md Platform-hub에 "메인 사이트에는 프로그램 화면·API를 만들지 않는다" 추가.
- 루트·분리 앱은 Next 14.2.35(업그레이드는 별도 과제).

### 2-4. B4 Step Mail·카카오 SSO (각 v1.08)
- https://stepmail.buylife.xyz, https://kakao-auto-posting.buylife.xyz. 쿠키 `.buylife.xyz`, 옛 vercel.app 화면은 308, API·크론은 옛 주소 유지.
- 카카오 로그인 콜백: 회원 등록값(옛 주소) 그대로 → 옛 호스트로 오면 새 주소로 307 후 토큰 교환(회원 변경 불필요).
- 운영자 카카오 앱 JavaScript SDK 도메인에 새 주소 추가 완료(주인님, 새 콘솔: 앱 → 플랫폼 키 → JavaScript 키 수정 → JavaScript SDK 도메인). 공유 버튼 정상.

### 2-5. C4 ai-task-planner 검수
- 서버 저장·키 상태·모델 저장·본인 Gemini 분석 1회(약 16초)·JSON 가져오기(추가/중복/충돌 보존)·CSV/JSON 통과.
- 개선 후보 3건(미수정): 첫 화면 키 상태 "확인 필요", AI 결과에 내부 필드명(`focusSecondsOnDate` 등) 노출, 모델 저장 안내 없음. 시험 할 일 2건 남음.

### 2-6. REA 분석 환경 (주인님 지시 "프로그램 분석에 필요하면 REA 사용")
- 지침: CLAUDE.md 원칙 21 / AGENTS.md 원칙 20. 상세: [`REA_REVERSE_ENGINEERING.md`](REA_REVERSE_ENGINEERING.md)(언제·수칙), [`ANALYSIS_TOOLKIT.md`](ANALYSIS_TOOLKIT.md)(도구 목록·주소·재설치 순서).
- 설치: Temurin JDK 21, Ghidra 12.1.4(`C:\Tools`, SHA-256 검증, 원본 ZIP `C:\Tools\dl`), 사용자 환경변수 `GHIDRA_INSTALL_DIR`·`JAVA_HOME`, `rea setup`으로 두 계정 MCP `rea`·skill, .NET 8 SDK + `ilspycmd` 9.1(최신은 SDK 8에서 설치 실패), Detect It Easy 3.21, 7-Zip.
- 확인: `whoami.exe` Ghidra 분석(함수 341), DIE 판별, ILSpy C# 복원, `claude mcp list`에 `rea ✔ Connected`.

## 3. 사고·주의 기록
- **pathspec 커밋 사고**: `git commit -- docs/HANDOFF.md`가 인덱스가 아니라 작업 폴더 파일을 커밋해, 다른 CLI의 미커밋 수정분이 `9fc253f3`에 섞임 → `f3b64929`로 되돌림(작업 폴더 수정분은 보존). 교훈은 `docs/ERROR_LESSONS.md` 2026-10-15. **blob 방식으로 올린 공유 문서는 `git diff --cached --name-only` 확인 후 pathspec 없이 `git commit`.**
- 카카오 공유 창 확인 때, 코드로 공유 창을 띄우는 시도는 자동 안전장치가 막았고, 실제 버튼 클릭(사용자 동작)으로 열어 주인님이 화면으로 확인함.
- 대화에 Fixie 비밀번호가 노출됨 — 원하면 재발급 후 threads-content-ops·threads-affiliate-poster 둘 다 다시 등록.

## 4. 남은 일
| 누가 | 내용 |
|---|---|
| 에이전트(승인 필요) | B1 Step Mail Next 16 이전 |
| 에이전트(선택) | B2 개발용 도구 취약점, B6 네이버 App·Web 화면 흰색 표준, D1 file-merge 후보 기능, C4 개선 3건 |
| 자료 필요 | A1 Step Mail 초안 편집기(초안·유료 AI 필요), C2 ai-writing-editor 편집 화면(문서 필요) |
| 주인님 | C1·C3 실제 휴대폰 확인, C4 W06 두 번째 기기, B6 Threads 재연결·관리자 계정으로 네이버 App·Web 화면, E1 엣지 절전 예외, E2 자동 다운로드 허용, E3 `D:\PDS` 시험 이미지 정리, (선택) Fixie 비밀번호 재발급, (선택) Windows 샌드박스 켜기 |
| 대기 | 분석할 EXE를 주인님이 `D:\PDS`에 넣으면 → DIE 판별 → 종류별 분석 → 재구현 계획 보고 |

## 5. 이어서 작업하는 법
1. `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`·`docs/WORK_QUEUE_2026-10-15.md`를 먼저 읽는다.
2. 보조 계정 세션은 `list_connected_browsers` → 엣지(`6455da5d-…`) 선택. 크롬은 메인 계정 전용.
3. 공유 문서(`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`)는 HEAD blob 방식으로 내 항목만 올리고, 스테이징 확인 후 pathspec 없이 커밋.
4. 배포는 `.vercel/project.json`의 projectName 확인 후 `vercel deploy --cwd <절대경로> --prod --yes --scope buylife`. 버전은 `version.ts` + DB `programs.version` 함께 +0.01.
5. `document-translator`는 Codex 작업 중 — 손대지 않는다.
