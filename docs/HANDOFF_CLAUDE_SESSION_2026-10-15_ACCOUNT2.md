# Claude Code 보조 계정 세션 인수인계 — 2026-10-15 (새벽)

- 작업자: Claude Code, **보조 계정 `buylifemall1@gmail.com`**(설정 폴더 `C:\Users\Administrator\.claude-account2`). 커밋·배포·DB는 메인 계정 기준(`BUYLIFE`, Vercel 팀 `buylife`).
- 앞선 내용(상태바·계정별 브라우저·4컷 만화 v1.01~v1.07·12개 프로그램 모바일 수정·모바일 지침)은 [HANDOFF_CLAUDE_SESSION_2026-10-14_ACCOUNT2.md](HANDOFF_CLAUDE_SESSION_2026-10-14_ACCOUNT2.md).
- **남은 일 목록은 [WORK_QUEUE_2026-10-15.md](WORK_QUEUE_2026-10-15.md)가 기준**이다(처리하면 상태를 "완료(날짜·커밋)"로 바꾼다).
- 상태: 모든 작업 커밋·푸시·배포 완료. **진행 중인 미완성 작업 없음.**

---

## 1. 한눈에 보기

| 작업 | 결과 | 버전 | 커밋 |
|---|---|---|---|
| 레퍼런스 분석·플랜 | "Playful File Helper"(xel-fusion-v2) 전수 분석, 이름 추천·개발 플랜 | — | `d5015ef8` |
| **신규 프로그램 `file-merge`** "AI 엑셀·텍스트 합치기 자동화" | 4기능 구현·등록·배포 | v1.01 | `09fdc1d9` |
| `file-merge` 큰 파일 실측·개선 | 엑셀 처리 Web Worker 이전(화면 멈춤 제거), 스택 넘침 수정 | v1.02 | `fd26be0d` |
| `stepmail`·`kakao-auto-posting` 엑셀 라이브러리 | npm xlsx 0.18.5 → SheetJS 공식 0.20.3 | 각 v1.06 | `fd26be0d` |
| `stepmail`·`kakao-auto-posting` 패키지 보안 업데이트 | Next·nodemailer·tiptap 등(**주인님 승인 후 배포**) | 각 v1.07 | `759b8530` |
| 해야 할 작업 목록 | `docs/WORK_QUEUE_2026-10-15.md` | — | `2cf2916e` |

---

## 2. AI 엑셀·텍스트 합치기 자동화 (`file-merge`) — v1.01 → v1.02

- 라이브: https://file-merge.buylife.xyz · 메인 상세: https://www.buylife.xyz/programs/file-merge
- 기준 문서: [`file-merge/docs/CLI_HANDOFF.md`](../file-merge/docs/CLI_HANDOFF.md), [`DEVELOPMENT_PLAN.md`](../file-merge/docs/DEVELOPMENT_PLAN.md), [`REFERENCE_ANALYSIS.md`](../file-merge/docs/REFERENCE_ANALYSIS.md), 작업 지침 [`file-merge/AGENTS.md`](../file-merge/AGENTS.md)
- **주인님 결정**: 이름은 추천안 확정, 첫 버전 범위는 플랜 전부, **FREE 배지 달지 않음(유료 유지)**.

### 2-1. 무엇을 만들었나
- 메뉴 1~4: 엑셀 합치기(**머리글 이름 기준 정렬**·원본 파일/시트 열·시트 선택·머리글 행·시트별 모으기·xlsx/CSV) / 엑셀 나누기(시트별·**열 값별**·**N행씩** → ZIP, 파일마다 머리글) / 텍스트 합치기(순서·구분자·[파일명] 줄) / 텍스트 나누기(글자 수·조각 수·문장 수, 문단·문장 경계 보존). 한글 ANSI(CP949) 자동 인식.
- 레퍼런스에서 엣지로 **실제 재현한 결함**(엑셀 잇기 시 머리글 반복·열 어긋남·다른 시트 섞임, 텍스트 조각 불균등)을 테스트로 고정하고 고쳤다.
- **파일은 브라우저 안에서만 처리**(서버 전송·저장·API 키 없음). 엑셀은 **SheetJS 0.20.3 공식 CDN 패키지**(npm `xlsx`는 0.18.5에서 멈춤).
- 등록: `programs`(카테고리 Tools·배지 new·최소 등급 일반)·요금제 3종·VIP 접근·§13 썸네일, Vercel 프로젝트 `file-merge`·환경변수 4개(`scripts/add-file-merge-vercel-env.mjs`)·도메인.

### 2-2. 큰 파일 실측과 v1.02
| 작업 | v1.01 | v1.02 |
|---|---|---|
| 엑셀 2개(20만 행·32MB) 읽기+미리보기 | 4.5초, 화면 멈춤 약 4.4초 | 5.5초, **멈춤 0** |
| 합쳐 저장(36.7MB) | 7.3초, **내내 멈춤** | 7.7초, **멈춤 0**, 진행 표시 |
| 엑셀 나누기(10만 행, 지역별 5개) | — | 1.3초 + 1.1초, 멈춤 0 |
| 텍스트 30.6MB 나누기 | 약 1초 | 그대로 |

- 구조: 엑셀 원본은 Worker 안 보관소(`src/lib/files/sheetStore.ts` `handle()`)에만 두고 화면은 미리보기 20행·행/열 수만 받음. `sheet.worker.ts` + `sheetClient.ts`(Worker를 못 만들면 같은 `handle()`을 화면에서 실행).
- 측정 중 찾은 결함: `Math.max(0, ...행 목록)`이 20만 행에서 Worker 안 스택 넘침 → 반복문, 30만 행 회귀 테스트.
- 단위 테스트 13/13, 운영 엣지 일반 회원(`buylifemall@naver.com`)으로 4기능 실제 파일 확인, 400px 모바일 확인.

---

## 3. stepmail·카카오톡 뉴스레터 — v1.06 / v1.07

| 항목 | `stepmail` (Step Mail) | `kakao-auto-posting` (폴더 `kakao_auto_poster`) |
|---|---|---|
| v1.06 엑셀 | `lib/leads.ts` 업로드 파싱 → xlsx 0.20.3 | `src/lib/broadcastRecipients.ts` → xlsx 0.20.3 |
| v1.07 Next | 14.2.35 → **15.5.27** + React 19 (params·searchParams Promise 대응 3파일, tsconfig `target` 자동 추가) | 16.2.11 → **16.4.0** |
| v1.07 기타 | tiptap 전부 3.32.0(편집기 XSS), nodemailer 6 → 10.1.1, audit fix | nodemailer 9 → 10.1.1, audit fix |
| 운영 의존성 취약점 | 37 → **2**(Next 15 내장 postcss — 실사용 위험 낮음, Next 16 이전 시 해소) | 5 → **0** |
| 검수 | 빌드, 파싱 함수 새 판 실행, 로컬 `next start`(로그인 200·보호 307·API 401), 운영 같은 확인·로그인 화면 렌더링 | 같음 + nodemailer `jsonTransport` 메일 생성 |

- nodemailer 7~10 큰 변경(SES 제거·`NoAuth`→`ENOAUTH`·원격 첨부 TLS 검사·Node 20 이상)은 공식 CHANGELOG로 확인 — 두 프로그램 모두 기본 SMTP만 써서 해당 없음, Vercel은 Node 24.x.
- `vercel.json`(stepmail 매시·카카오 5분 cron)은 **바꾸지 않았고, 실제 메일·카카오 발송은 하지 않았다.**
- **미확인**: 로그인 상태 화면(엣지가 두 `vercel.app` 주소에 로그인되어 있지 않음) → 작업 목록 A1·A2.

---

## 4. 사고·주의 기록

1. **서브프로젝트 승인 규칙 미확인(v1.06)**: `stepmail`·`kakao_auto_poster`의 `AGENTS.md`에는 "Git push·프로덕션 배포·실제 발송·cron 활성화 전 사전 승인"이 있는데, v1.06(xlsx 교체)은 이를 확인하지 않고 승인 없이 푸시·배포했다(변경은 xlsx뿐, cron 그대로). 주인님께 보고했고 v1.07은 승인 후 배포. 각 `AGENTS.md`·`ERROR_LESSONS.md`에 정정·재발 방지("서브프로젝트를 고치기 전에 그 폴더 승인 규칙부터 확인") 기록.
2. **배포 안전장치**: 배포는 항상 `vercel deploy --cwd <절대경로> --prod --yes --scope buylife`, 그 전에 `.vercel/project.json`의 `projectName` 확인(2026-10-14 루트 사이트 오배포 사고 이후 규칙).
3. **엣지 검수 요령**(ERROR_LESSONS 2026-10-14·15): 다운로드는 `D:\PDS`이고 이 사이트들은 연속 자동 다운로드가 막혀 있어 `URL.createObjectURL`·`a.click`을 가로채 결과를 다시 읽어 확인 / 숨은 탭은 절전으로 멈춤 → 주인님께 창을 앞으로 / `navigate` 직후 바로 조작하면 React 준비 전이라 무시됨 → 요소를 기다린 뒤 조작, 대기에 시간 제한 / 파일 선택 칸은 `DataTransfer`로 시험 파일 주입.
4. **비밀값**: 로컬 검수 때 공용 DB 값은 루트 `.env.local`에서 **실행할 때만 환경변수로** 넘겼다(파일로 만들지 않음). `file-merge/.env.local`은 `vercel link`가 만든 것으로 `.gitignore` 대상.
5. **루트 문서 커밋**: 다른 CLI가 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 수정 중이라 항상 HEAD blob 방식(`git show HEAD:` → `hash-object -w` → `update-index --cacheinfo`)으로 내 항목만 커밋하고 작업 폴더 사본에도 같은 항목을 넣었다.

## 5. 이어서 작업하는 법
1. [WORK_QUEUE_2026-10-15.md](WORK_QUEUE_2026-10-15.md)에서 할 일을 고른다(가장 먼저: A1·A2 — 주인님이 엣지에서 두 주소에 로그인해 두면 에이전트가 화면 확인, 실제 발송 금지).
2. 해당 프로그램 폴더의 `AGENTS.md`(승인 규칙)·`docs/CLI_HANDOFF.md`를 먼저 읽는다.
3. 수정 → 단위 테스트·`tsc`·빌드 → (승인 규칙 확인) → 안전장치 배포 → 운영 확인 → 버전 +0.01(코드·DB) → 문서·작업 목록 갱신 → 커밋·푸시.
4. 화면 검수는 보조 계정이면 엣지(deviceId `6455da5d…`), 메인 계정이면 크롬(`3208dd7d…`)만 조작한다.
