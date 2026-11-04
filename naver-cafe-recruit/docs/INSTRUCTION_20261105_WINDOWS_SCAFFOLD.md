# [맥미니 → 윈도우 요청] naver-cafe-recruit 뼈대·DB 적용 (2026-11-05)

작성: 맥미니 `claude-mac-20261101-blog` [역할: mac-mini] · 대상: 윈도우 세션(카페/마케팅 담당)
먼저 읽기: [`PLAN_20261105_NEW.md`](PLAN_20261105_NEW.md) · [`../AGENTS.md`](../AGENTS.md) · 외부 분석 [`../../docs/analysis-cafe-recruit-20261105/DETAIL.md`](../../docs/analysis-cafe-recruit-20261105/DETAIL.md)

## 지금까지 맥미니가 만든 것 (미적용·미빌드)
- 플랜(세 방식·모드 A 상세·§0 절대 경계) · `AGENTS.md`
- DB 초안 2개: `supabase/migrations/20261105120000_ncr_init.sql`(표 3개·RLS·보관·열외) · `20261105130000_ncr_dispatch.sql`(설정·대상·보낸 기록·하루 상한·동의 게이트)

## 윈도우가 할 일 (순서)
1. **DB 초안 검토 → 운영 DB 적용**(ref esgxyikcnnvmlhygjkth). 적용 전 `ncr_*` 이름 충돌 확인. 적용 뒤 RPC 1회 호출로 settings_get 동작 확인.
2. **프로그램 뼈대**: `naver-cafe-poster`를 복사해 `naver-cafe-recruit`로 만들고(package.json 이름·버전 `v1.01`·`lib/version.ts`), `lib/access.ts`는 공통 판정 순서 그대로(정지→관리자→핸드폰→FREE→구독→등급+부여). `programs`에 slug `naver-cafe-recruit` 등록(`app_url` 포함).
3. **서버**: `ncr_dispatch`를 부르는 라우트(service_role, `requireProgramAccess`/`checkProgramAccessApi` + `dynamic='force-dynamic'`+`fetchCache='force-no-store'`). 모드별 대상 모으기·검토·실행 요청.
4. **확장**: `blog-neighbor-care/extension` 토대로 — 회원 로그인 세션에서 (A) 가입 카페·게시판 목록·공유 가능 글 범위 대상 수집 → `targets_add`, (B·A) 초대 화면에서 사람처럼 초대 → `sent_mark`, (C) `naver-cafe-poster` 게시. **§0 경계 준수**(회원 직접 로그인·보안 확인 자동 통과 금지·IP 바꾸기 없음).
5. **화면**: 모드 선택 1화면 + 오늘 할 일 + 결과 + `/guide`.
6. **시험 → 빌드(주인님 승인) → 도메인 → 검수**. 맥미니가 ego로 실물 확인.

## 결정값(주인님 지시 2026-11-05)
세 방식 모두 구현 · 모드 A 관리자 지정 예외(회원 본인 로그인 상태에서) · 이름 `naver-cafe-recruit` · 하루 상한 20 · 초대 기록 보관은 **지금 30일**, 1년 연장은 최상위 규칙 §8 지정 기록 후 별도 마이그레이션.

## 지킬 것
회원 본인 계정·본인 키 · 동시 빌드 금지 · 커밋 경로 지정 도우미 · 커밋 뒤 파일 수 확인 · 끝에 비용 리포트 · 완료 후 비교표(`PROGRAM_CAPABILITY_MAP.md`)·외부 분석표(`EXT-MKT-08·10`) 갱신.
