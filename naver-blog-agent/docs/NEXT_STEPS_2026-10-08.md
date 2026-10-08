# 네이버 블로그 에이전트 — Claude Code 인수 분석 & 남은 작업 (2026-10-08, v1.42 기준)

> Codex에서 Claude Code로 작업을 넘겨받은 직후 코드·문서를 전부 읽고 정리한 분석입니다. 코드는 수정하지 않았습니다.
> 다음 세션은 이 문서 → `CONTINUATION.md` 최상단 요약 → `AGENTS.md` 순서로 읽고 이어갑니다. 다음 코드 배포는 **v1.43**입니다.

## 1. 핵심 지침 요약

- 작업은 `naver-blog-agent/` 안에서만. 이용 권한은 AIMaster 통합 권한, API 키는 회원 본인 키만(관리자 키 폴백 금지).
- API는 `checkProgramAccessApi()`로 JSON 401/403, 권한 파일에는 `force-dynamic` + `force-no-store`. 확장은 토큰 소유자 권한을 `evaluateProgramAccessForUser()`로 재검증.
- 흰색 베이스 UI, 표준 사이드바(번호형 1~3 + 구분선 아래 API키등록·플랫폼연동), 당해 연도(2026) 3중 방어막.
- 코드 변경 배포마다 버전 +0.01. 5곳 동기화: `src/lib/version.ts`, `package.json`, `extension/manifest.json`, DB `programs.version`, `supabase/migrations/00XX_bump_version_v1_XX.sql`.
- 작업 세트: 빌드 → 커밋 → 푸시 → `vercel deploy --prod --yes --scope buylife` → 문서 갱신. `git add -A` 금지, `naver-blog-agent/`와 관련 문서만 스테이징(다른 CLI의 Threads 파일 보존).
- 에러/점검 사항은 `docs/ERROR_LESSONS.md`에 같은 커밋으로 기록.
- 사전 승인 필요: 파괴적 삭제, 환경변수·DB 스키마 변경, 유료 API 대량 호출, 회원 대신 최종 발행.
- 검수 명령(이 폴더): `npm run test:personas`, `test:categories`, `test:writing-styles`, `test:navigation`, `npm run build`. `npm run lint`는 `eslint.config.*` 부재로 실행 불가.

## 2. 코드 분석으로 새로 확인한 사실

1. **확장이 웹 큐와 연결되지 않음 (가장 심각).**
   - `extension/background.js`는 `http://127.0.0.1:46321`에 `/pair`, `/poll`, `/result`, `/progress`, `/task/status`, `/heartbeat`, `/stage`, `/waiting`, `/asset`, `/session/request`를 호출합니다. 기존 데스크톱 앱(`naver-blog-auto-poster_web`)의 프로토콜입니다.
   - 웹에는 `/api/extension/auth|task|finish` 3개뿐이며 경로·형식이 다릅니다. 배포된 확장은 웹 큐의 글을 가져올 수 없을 가능성이 매우 높습니다(실제 설치 검수는 미실시).
   - 확장 폴더에 티스토리 코드(`tistory.js`, `tistory-writer.js`, `*.tistory.com` 권한)가 섞여 있습니다.
2. **모델 선택 ≠ 실제 호출** (`src/lib/ai/models.ts`): gpt-4.1/gpt-5*/gpt-6* → gpt-4o, gemini-3* → gemini-2.0-flash, Claude는 구형 3종 중 하나로 치환. UI 모델 목록은 `src/lib/ai/contentModels.ts`(아직 읽지 않음). README·매뉴얼에 옛 모델명 문구가 남아 있음.
3. **`pipeline.ts` 품질 문제**: Writer가 원본 키워드·목적을 직접 받지 않음 / Reviewer가 본문 앞 1,500자만 검수하고 파싱 실패를 PASS로 처리하며 로그는 "검수 통과" 표시 / 이미지 프롬프트 2개가 고정 문구.
4. **`sanitizeYear` 부작용**: 2020~2025를 전부 2026으로 치환해 "2024년 개정" 같은 과거 사실이 왜곡됨.
5. 기타: 크론(`vercel.json`, 매일 18:00 UTC)은 `CRON_SECRET` 검증 → Vercel 환경변수 확인 필요. 계정·분류 일부가 브라우저 localStorage라 기기 간 동기화 안 됨.
6. Git: 분석 시점 `origin/master`와 0/0 동기화, `naver-blog-agent/` 미커밋 변경 없음.

## 3. 남은 작업 체크리스트

| 순서 | 작업 | 상태 | 승인 |
|---|---|---|---|
| 1 | 확장 ↔ 웹 큐 연결 | **v1.43 코드 완료**(어댑터·티스토리 제거·`test:extension`). 실제 Chrome 설치·페어링·네이버 발행 검수는 미실시(승인 필요) | 실제 발행 테스트는 승인 |
| 2 | 모델 매핑 정직화 (선택 ID 그대로 호출, 실패 시 명확한 오류 또는 명시적 폴백, 모의 요청 테스트, 옛 모델명 문구 정리) | **v1.44 완료**(`test:models`) | 불필요 |
| 3 | Writer에 키워드·목적 직접 전달, 페르소나 즉시 생성 시 주제 혼합(`overrideTopic`) 해소 | **v1.45 완료** | 불필요 |
| 4 | Reviewer 전체 본문 검수, 파싱 실패≠PASS, 글자수 준수 판정 | 미착수 | 불필요 |
| 5 | 연도 치환: 최신 정보는 2026, 역사적 날짜 보존 | **v1.47 완료**(올해 기준, 본문 과거 사실 보존, `test:years`) | 불필요 |
| 6 | 계정·분류 회원별 DB 이관 | **v1.49 완료**(승인 후 테이블 생성·API·동기화·`test:member-data`) | 승인 완료 |
| 7 | ESLint 설정 추가, 크론 `CRON_SECRET` 확인 | **v1.48 ESLint 완료.** `CRON_SECRET`은 프로덕션에 없음 → 설정은 승인 대기 | 환경변수 추가 승인 |

진행 현황: 1번 v1.43, 2번 v1.44, 3번 v1.45, 5번 v1.47까지 완료 → 남은 6번(DB 스키마 승인 필요)·7번(환경변수 확인).
제안 진행 순서: 1 → 2 → 3·4 (v1.43부터 한 번에 하나씩 배포). 5·6은 별도 승인 후.
