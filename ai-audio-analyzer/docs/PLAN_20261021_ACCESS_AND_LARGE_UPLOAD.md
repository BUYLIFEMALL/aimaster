# 개발 플랜 — API 이용 권한 확인(F-013)·4.5MB 넘는 파일 업로드(F-014) v1.11

> 2026-10-21 Claude Code(윈도우). 주인님 지시: 음악 병합 분석 결정 5번 「병합보다 AI Audio분석의 권한 확인 누락과 4.5MB 업로드 실패를 먼저 고친다」.
> 근거: [음악 병합 분석 §4-3](../../docs/analysis-music-consolidation-20261021/REPORT.md), [개선 인수인계 F-013·F-014](IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md). 대상 ① 운영, DB 변경 없음.

## 문제
1. `api/analyze`·`api/user-key`가 로그인만 확인하고 프로그램 이용 권한을 보지 않는다. 화면용 판정(`lib/programAccess.ts`)도 옛 버전이라 관리자·구독·등급·핸드폰 확인이 없고, 무기한 권한(`expires_at` 비어 있음)을 1970년으로 계산해 막는다. 지금은 FREE라 영향이 작지만 FREE를 끄면 API를 직접 불러 우회할 수 있다.
2. 브라우저가 파일 전체를 우리 서버로 보낸다. Vercel 함수 본문 한도 4.5MB를 넘으면 413으로 실패하고, 화면은 「25MB」, 가이드는 「100MB」라고 다르게 안내한다.

## 구현
1. 권한: `ai-mastering-studio/src/lib/programAccess.ts`(루트 `lib/access/checkProgramAccess.ts`와 같은 규칙: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+기간) 사본으로 교체, `lib/access.ts`(`requireProgramAccess`·`checkProgramAccessApi`) 추가. 첫 화면·모든 API에 적용, `dynamic`·`fetchCache` 두 줄.
2. 큰 파일: 브라우저가 4MB 조각으로 나눠 우리 서버 `api/upload/start`·`api/upload/chunk`로 보내고, 서버가 **회원 본인 키로 Gemini Files API 이어 올리기(resumable)**에 붙인다. 분석은 `api/analyze`에 파일 주소(`fileUri`)만 JSON으로 보낸다. 키는 서버에만 있다. 올림 주소는 Google 주소인지 검사(다른 주소로 요청 보내기 방지). 분석 뒤 Google 쪽 파일은 지운다(지우지 못해도 Google이 48시간 뒤 자동 삭제).
3. 한도 100MB로 통일(화면·가이드 문구 정정), 분석 시간 제한 60초 → 300초.

## 검수
- `npx tsc --noEmit`, `npm run build`.
- 크롬(일반 회원 계정)에서 4.5MB 넘는 오디오 1개 실제 분석 1회 — 회원 본인 Gemini 키, `gemini-2.5-flash` 1~2회 호출(수십 원 수준).
- 권한 없는 상태 API 직접 호출은 FREE 배지 때문에 막을 대상이 없어 코드 확인으로 대신(FREE 배지를 끄는 시험은 회원에게 영향이 있어 하지 않음).

## 버전·배포
v1.10 → v1.11(코드 + DB `programs.version`), Vercel 프로덕션 배포, 문서(`AGENTS.md`·`docs/IMPROVEMENTS.md`·루트 HANDOFF).

## 비용
개발·시험: Gemini 텍스트·오디오 분석 1~2회(회원 본인 키). 운영 인프라 추가 없음(Gemini 파일 저장소는 무료, 우리 저장소 사용 안 함).
