# 네이버 입력 엔진 공통화 제안 — Codex 검토용 (Claude 작성, 2026-10-10)

작성: Claude(BLOG 담당). 대상: Codex(네이버 블로그 에이전트 담당)와 주인님. **이 문서는 제안과 인수인계이며 `naver-blog-agent/` 코드는 수정하지 않았습니다.** 에이전트 쪽 적용 여부와 순서는 Codex가 검토해 결정합니다. 주인님이 BLOG에서 아래 1~2번을 승인·진행하셨고(3번 공통화는 "Codex 쪽이 안정되면 합치자"는 방향), 3번은 이 문서로 검토를 요청합니다.

## 1. BLOG에서 완료한 것 (v1.40~v1.44, 모두 배포·검증됨)

| 버전 | 내용 | 에이전트에 가져갈 만한 것 |
|---|---|---|
| v1.40 | 서버 자동 입력 큐(`POST /api/extension/task`), 결과 보고 DB 오류 503·늦은 보고 409·멱등 재보고·성공 ACK | 에이전트 v1.64가 같은 방향으로 이미 구현(`finish`). 상태 이동표(`ALLOWED_PREVIOUS`)와 "읽은 뒤 바뀌었으면 덮어쓰지 않음" 패턴 |
| v1.41 | 확장 작업기 개편: 빈 새 글쓰기 탭만 사용·내용 있는 탭 보호, 본인 블로그 확인, **단계마다 문서 정확 비교(`compareUnits`)**, 단일 프레임 변경, 고유 이미지 이름, 결과 선보관·보고만 재시도, 재시작 시 자동 재입력 금지 | 이미 에이전트 `writer.js`가 같은 철학. 아래 §3 표의 차이만 검토 |
| v1.43 | **실행 번호(`naver_run_id`)·3분 임대(`naver_lease_expires_at`)·45초 하트비트·직접 시작 `/start`** — DB 칸 2개 추가(승인·운영 적용) | **에이전트의 "선점 응답 유실·PC 단절 복구" 미해결 항목(5단계)에 그대로 적용 가능** — §4 |
| v1.44 | 입력 완료 크롬 알림(권한 `notifications`), 클릭하면 해당 탭으로 이동, 사이드패널에서 끄기 | 에이전트도 최종 발행 결과를 알림으로 줄 수 있음 |

상세·근거는 `ai-auto-blog/AGENTS.md`(2026-10-10 v1.40~v1.44 항목), 시험은 `ai-auto-blog/tests/extension-*.test.cjs`(엔진·작업기·adapter·API).

## 2. 두 확장의 구조 비교

| 층 | 에이전트(v1.64) | BLOG(v1.44) |
|---|---|---|
| 작업기 | `extension/background.js`(큐 폴링·활성 작업·보고) | `extension/background.js`(같은 책임 + 하트비트·알림) |
| 순서·검증 엔진 | `writer.js`(`runWriter`·`matchingWriterPrefix`: 단계 목록과 문서 접두 일치) | `blog-engine.js`(`runInputTask`) + `blog-core.js`(`unitsFromSnapshot`·`compareUnits`) |
| 브라우저 연결 | `background.js` 안(`editorTab`·`command`·`frameResults`) | `naver-adapter.js`(`createNaverAdapter` — 의존성 주입으로 가짜 chrome 시험 가능) |
| 화면 안 명령 | `editor.js`(`editorCommand`) | `naver-page.js`(`blogEditorCommand`) |
| 글자 입력 | `execCommand('insertText')` 덩어리(이모지는 grapheme 분리) | CDP `Input.insertText` **한 글자씩 70~170ms**(`docs/PLATFORM_PATTERNS.md` §20) |
| 최종 발행 | 확장이 클릭하고 게시글/예약 목록으로 확인 | **누르지 않음**(회원이 직접). 준비 완료 = `publish_ready` |
| 원고 구조 | 계획(plan) 기반: 제목 인용구·섹션 인용구·이미지 위치 | 블록(글/링크/이미지) 순서 입력, 인용구 없음 |
| 카테고리 | 실제 목록 조회·ID 저장 | 이름으로 선택(데이터 `categoryItemText_<id>`로 읽되 ID 저장 없음) |
| 이미지 AI 표시 | 필수(미설정이면 검증 실패) | 켜기 시도, 실패해도 입력 유지·경고 |

**의도적으로 다른 점**(통합 때 옵션으로 남겨야 함): ① 입력 방식(CDP 한 글자씩 vs execCommand) — 속도·탐지율의 실측 우열이 아직 없음 ② 최종 발행 자동 여부 ③ 인용구/섹션 구조 ④ AI 표시 필수 여부.

## 3. 공통 인터페이스 후보 (이미 BLOG에서 시험으로 굳힌 형태)

엔진이 요구하는 adapter 동작: `prepareEditor`, `ensureAlive`, `snapshot`, `focusTitle`, `focusBody`, `typeText(text,{onProgress,shouldStop})`, `pasteLink`, `uploadImage`, `applyImageAi`, `openPublishSettings`, `applyTags`, `applyCategory`, `cleanup`. 엔진은 chrome API를 모르므로 가짜 adapter로 중복·혼합·외부 끼어듦·이중 업로드·탭 닫힘·중지를 시험한다(`tests/extension-engine.test.cjs` 23개).
에이전트에 맞추려면 `snapshot`의 블록 종류에 `quote`가 추가되고(`unitsFromSnapshot`이 인용구를 단위로 인정), `typeText`를 execCommand 구현으로 갈아 끼우면 된다. `compareUnits`·`createExpected`는 입력 방식과 무관하다.

## 4. 에이전트에 실행 번호·임대 적용 제안 (Codex 검토·주인님 승인 필요)

에이전트 개선 계획 5단계("선점 응답 유실·장시간 단절 복구")와 `AUTOMATION_COMPARISON` §7이 지적한 "무조건 queued로 되돌리면 이미 발행됐을 수 있다" 문제와 같다. BLOG 방식:
1. `nba_posts`에 `run_id uuid`, `lease_expires_at timestamptz` 추가(스키마 변경 — 주인님 승인).
2. 선점(`queued→publishing`) 조건부 갱신 때 새 `run_id`와 임대를 함께 쓰고 응답에 돌려준다(BLOG `app/api/extension/task/route.ts`).
3. 확장이 작성·최종 발행 단계 내내 45초마다 하트비트(BLOG `heartbeat/route.ts`), `finish` 보고에 `runId` 필수. 번호가 다르면 409 `superseded`.
4. 임대가 끝난 `publishing`은 **자동으로 queued로 되돌리지 말고** 회원 화면에 "확인 필요(PC 단절 가능)"로 보여 주고, 회원이 본인 블로그를 확인한 뒤 다시 대기시키게 한다(BLOG `isRunActive`·handoff 규칙 참고).
5. 옛 확장 호환: 번호 없는 보고는 예전 규칙으로 처리(BLOG `input-result`가 이 방식).
마이그레이션은 BLOG `supabase/migrations/20261010200000_blog_extension_run_lease.sql`을 그대로 참고하면 된다(컬럼 이름만 프로그램 규칙에 맞춤).

## 5. 공통 모듈화 방식 — 선택지와 권고

저장소 규칙(`CLAUDE.md` 10번)상 확장 소스는 `<프로그램>/extension/`에만 있어야 하고 ZIP은 그 폴더 내용이다. 그래서 별도 공용 폴더를 두면 규칙과 충돌한다.

| 방식 | 장점 | 단점 |
|---|---|---|
| A. 지금처럼 각자 유지 + **동일 규칙 시험** | 규칙 위반 없음, 위험 낮음 | 코드가 갈라질 수 있음 |
| B. 공용 원본 + 빌드 스크립트가 각 `extension/`으로 복사 | 중복 제거 | 복사본이 생겨 "소스 위치는 한 곳" 규칙과 충돌, 빌드 필요 |
| C. 순수 규칙만 동일 파일로 두고 **해시 일치 시험**으로 동기화 확인 | 위험 낮고 갈라짐 감지 | 파일 복사는 수동 |

**권고: A에서 시작해 C로.** 순서: ① Codex가 BLOG v1.40~v1.44를 검토(§6) ② 에이전트에 §4 적용(DB 승인) ③ 양쪽이 실제 네이버 E2E를 통과하면 순수 규칙(`compareUnits`·`createExpected`·이미지 파일명·연도 정책 등 입력 방식과 무관한 것)만 C방식으로 묶고 해시 일치 시험 추가 ④ 입력 어댑터(execCommand vs CDP)·최종 발행 여부는 옵션으로 남김. B는 주인님이 규칙을 바꾸실 때만.

## 6. Codex 검토 체크리스트

- [ ] BLOG의 `compareUnits`가 에이전트 `matchingWriterPrefix`와 같은 판단인지(연속 문단 합침, `linkPreview` 제외, `other`는 불일치) — 다르면 어느 쪽이 맞는지
- [ ] `naver-page.js`의 `snapshot`/`inspect`가 에이전트 `editor.js`와 같은 선택자인지(옮길 때 일부 단순화함: 인용구·링크 카드 처리)
- [ ] 이미지 업로드 방식 차이: BLOG는 CDP 파일 선택창 가로채기 + 버튼 클릭 + `input.files` 설정, 에이전트는 `input.files` 직접 설정. 어느 쪽이 더 안정적인지 실제 비교
- [ ] 임대·하트비트 설계(§4)가 에이전트의 최종 발행 단계(되돌릴 수 없음)에 맞는지
- [ ] `1. 항목`처럼 번호로 시작하는 줄을 네이버가 자동 목록으로 바꾸는 문제를 에이전트는 어떻게 다루는지(BLOG는 문서 비교 실패로 중지)

## 7. 알려진 한계 (BLOG)

- **실제 네이버 화면 E2E 미검증**: 이 환경의 브라우저 도구가 네이버 접속을 차단해 `naver-page.js`를 실제 화면에서 시험하지 못했습니다(선택자는 에이전트 v1.60~와 기존 BLOG 확장에서 확인된 것만 옮김). 주인님 PC에서 시험 필요: ZIP 설치 → 블로그 ID 저장 → 이미지 포함 시험 글 보내기 → 새 탭에서 입력·AI 표시·카테고리·태그·최종 발행 미클릭 확인.
- 실제 유료 AI 생성(연도·글자수 지침 준수)도 미시험.
- 이 문서의 비교는 코드 읽기와 모의 시험 기준이며 실측 성공률·속도·탐지율 비교가 아닙니다.
