# v1.01 검수와 운영 준비

2026-10-12 / Codex. 잠정 추천 명칭: Suno 음악 기획 스튜디오.

## 구현

스타일/작사/앨범/검수·보관 4단계, 흰색 작업 화면·모바일 메뉴·개인 계정·로그아웃. 독립 프리셋 20개(장르 12·댄스 8), 장르/분위기/악기 태그, BPM·보컬·한영/랩/비유 비율·화음·콜 앤 리스폰스·편곡·구조·Style 잠금. 3~12곡 앨범과 6가지 흐름, 개별 작사 및 미완성 곡 순차 처리·중지·완료 보존. 제목/Style/가사 직접 편집, 최종 확인, 분리 복사/TXT·JSON 다운로드와 검증·병합 가져오기. 본인 Suno 화면 및 기존 음악 자동화 링크, 사용 매뉴얼.

공용 권한 판정·개인 user_api_keys·SSO 쿠키 재사용. API/페이지 모두 권한 검사 및 dynamic/no-store. AI는 서버에서 선택한 모델/본인 키만 사용. 폴백·자동 재시도·설정 변경 생성 호출 없음. 생성 API와 순차 처리 구현을 모의 공급사로 확인했으며 실제 AI 음악/가사 품질 검수는 별도입니다. 키 조회 테스트는 생성 대신 모델 메타데이터 GET을 사용합니다.

## 완료한 검사

- npm test: 17/17 성공. 입력/모델/영문 스타일/출력 형식/곡 수·중복/BPM/당해 연도/Style 잠금/회원 격리/백업·미완성 초안 보존/취소·재시도 금지/여러 텍스트 블록/키 URL 배제/공급사 오류/공용 권한 규칙.
- npm run lint: 오류·경고 0. npm run build: 타입·컴파일 성공, 인증 페이지와 API는 동적 경로.
- npm audit --omit=dev: 0개. 전체 개발 의존성 audit는 ESLint 전이 의존성 high 5개. force 업데이트는 적용하지 않았습니다.
- 코드 검토: 회원 ID는 서버 인증 결과를 사용하며 본인 행 조건으로만 키 조회/저장. 키는 브라우저 저장·백업/응답에 포함하지 않음. 미완성 편집 초안은 입력 검수와 별도로 복원. 동시/취소 요청은 컨트롤러와 순차 큐로 결과 적용 방지.
- 유료 AI 호출, Suno 생성, 회원 대신 최종 발행·외부 공개 없음. 실제 브라우저/생성 검수는 완료로 보고하지 않음.

## 운영 준비

Vercel buylife/suno-music-studio, project ID `prj_BHh3me01sTyn12CQJrOgihl7Fyvu` 생성·연결 완료. 환경변수 0개(조회 확인), 아직 배포하지 않았습니다.

공용 DB에 프로그램·기본 3요금제 등록 DML 적용. 배포 검수 전 `is_active=false`로 유지하여 회원에게 아직 동작하지 않는 링크를 노출하지 않습니다. 최소 일반 등급 + 사용기간 또는 구독 정책을 사용하며 FREE는 기본 등록하지 않습니다. 스키마 변경 없음. SQL: `supabase/migrations/20261012054845_register_suno_music_studio.sql` (CLI 2.120.0 migration new로 생성).

## 승인 후 재개

루트 AGENTS.md §2에서 환경변수 변경을 사전 승인 대상으로 지정했습니다. 새 프로젝트의 다음 4개 production 환경변수와 로컬 검수용 동일 접속 설정 등록이 필요합니다. 기존 AIMaster 공용 Supabase 설정을 재사용하며 회원 AI 키를 복사·수정하지 않습니다.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`.

1. 주인님 승인 확인 후 `node scripts/configure-vercel.mjs --approved` (이 프로젝트 폴더). 비밀 값 출력 금지. 필요한 값이 없으면 안전하게 실패하며 타인 키 폴백을 추가하지 않습니다.
2. 등록 메타데이터만 `vercel env ls --scope buylife`로 확인하고 커밋·푸시 상태 점검.
3. `vercel domains add suno-music-studio.buylife.xyz --scope buylife` 및 `vercel deploy --prod --yes --scope buylife`.
4. 비로그인 페이지 리다이렉트/API JSON 401, 로그인 SSO 및 회원 화면·설정 변경/프리셋 적용/백업 확인. 설정 키를 읽거나 바꾸지 않음. 실제 유료 생성은 별도 승인된 호출 범위만 사용.
5. 운영 상태 정상 확인 후 programs.is_active=true와 이름/버전/app_url 확인. 카탈로그 등록·요금제·서버/클라이언트 버전 확인. 최종 검수 결과 기록·문서 커밋·푸시·보고.

권한 우회로 임시 공개하거나 환경변수 없이 고장 난 앱을 배포하지 않습니다. 기존 music 및 참고 사이트는 변경하지 않았습니다. 참고 원본의 전체 아티스트 프리셋 데이터·웹 검색과 음악 파일 자동 생성은 이 릴리스에 포함하지 않으며, 구현된 범위를 UI/안내에서 명확히 표시했습니다.

## 참고 문서

공개 원본 기능/코드 분석: [분석과 계획](ANALYSIS_AND_PLAN.md). 모델 ID·SSR 구현 확인: [Gemini 모델](https://ai.google.dev/gemini-api/docs/models), [Gemini 구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output), [Claude 모델](https://platform.claude.com/docs/en/models/overview), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
