# AI 4컷 만화 자동화 (four-cut-comics) — 작업 지침 (v1.07)

- 이어서 작업하는 CLI/계정은 **먼저 `docs/CLI_HANDOFF.md`(현재 상태·남은 작업 순서)와 `docs/DEVELOPMENT_PLAN.md`(원본 분석·전체 플랜)를 읽는다.** 루트 `CLAUDE.md`·`docs/ERROR_LESSONS.md`도 함께.
- 프로그램명 "AI 4컷 만화 자동화"(주인님 확정 2026-10-14), slug `four-cut-comics`, 폴더 `AIMaster/four-cut-comics`.
- 원칙: 본인 Gemini 키만(폴백 금지), 이미지 서버 저장 금지, 모든 쓰기·유료 호출에 `checkProgramAccessApi`, 당해 연도(2026) 프롬프트 주입, 인물 한국인 기본, 흰색 UI, 버전 `v1.01` 시작(`lib/version.ts`+DB `programs.version`).
- 상태(2026-10-14 밤): v1.07 배포 — 컷마다 다른 비율·웹툰형 나눠 저장(ZIP). 이전: v1.06 웹툰형 세로 저장·서버 보관함 전체 삭제·카탈로그 설명 갱신. 이전: v1.05 스타일 8종·컷 수 3·4·6·비율 4종·서버 보관함(버킷 `four-cut-comics-files`, `src/lib/saved.ts`)·완결 안내. 이전: v1.04 인스타 문구·이어서 만들기·만화 합치기·내 작품(`extras.ts`·`gallery.ts`·`/api/insta`·`/works`). 이전: v1.03 모바일 셸, v1.02 AI 자동 말풍선·말풍선 직접 배치 편집(`src/lib/comic/balloon.ts`·`/api/balloon`·`BalloonEditor.tsx`). 남은 일: 실제 휴대폰 확인. 상세는 docs/CLI_HANDOFF.md §6.


## 2026-10-16 DB 연동 변수 호환 — v1.08 (four-cut-comics)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.09 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/comic/options.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).
