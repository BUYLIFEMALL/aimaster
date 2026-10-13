# Markdown Studio 운영 연결 설정안

2026-10-13. 1단계 구현 결과를 검토할 수 있도록 준비한 설정안입니다. **아래 환경변수는 아직 등록하지 않았습니다.**

## 별도 승인이 필요한 변경

대상은 새 Vercel 프로젝트 **buylife/markdown-studio**입니다. 기존 AIMaster의 현재 공유 Supabase(`esgxyikcnnvmlhygjkth`) 인증 설정 3개를 이 프로젝트의 Production·Development 환경 및 일반 회원 로컬 검수에 연결합니다.

| 설정 이름 | 목적 | 공개 범위 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공용 회원 인증·권한 DB 주소 | 브라우저 공개 값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 본인 로그인 세션 생성 | 브라우저 공개 값, RLS 적용 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버에서 프로그램 이용 권한 조회 | 서버 전용 비밀 값 |

값은 루트의 현재 공용 설정에서 확인하며 폐기된 옛 서브프로젝트 값을 복사하지 않습니다. 비밀 값은 문서·로그·명령 인수·Git에 쓰지 않고 서버 환경변수로만 전달합니다. Preview는 실제 검수가 필요할 때 별도로 범위를 확인합니다. AI 제공자 키, Google 앱/키, 회원 비밀번호 변경은 이번 설정 범위에 없습니다.

이는 플랫폼 회원 인증 연결이며 회원 대신 외부 API를 사용하는 공용 키 폴백이 아닙니다. 기본 문서 기능은 AI API 키가 필요하지 않습니다. Drive는 후속 단계에서 회원 본인의 OAuth 앱·계정으로 연결합니다.

루트 `AGENTS.md` §2는 **“환경변수/DB 스키마 변경”을 사전 승인 대상**으로 정했습니다. 위 설정의 승인을 받은 뒤에 등록합니다. 1단계에서 새 테이블·DB 마이그레이션은 필요하지 않습니다.

## 승인 이후의 작업

1. 환경변수 등록 후 새 빌드. 공개 Supabase 값은 빌드 시 반영되므로 기존 빌드 그대로 재사용하지 않습니다.
2. 등록 전에는 권한 판정이 `program_not_found`로 거절하는 것이 정상입니다. 운영 검수를 위해 카탈로그 등록 시 표시명·FREE 여부·`app_url`·`version`과 기본 요금제 3개를 같은 작업에서 처리합니다. 원본과 같은 편집·변환·Drive 기능이 모두 준비되기 전에는 정식 완성 프로그램으로 홍보하지 않습니다.
3. 일반 회원 본인 세션으로 로그인/권한/다른 회원 전환/로그아웃/휴대폰 등록 정책 확인. 운영자 우회·가짜 세션·키 폴백을 넣지 않습니다.
4. 프로덕션 배포 후 HTTP·캐시·쿠키·실제 화면 확인. 새 도메인은 `markdown-studio.buylife.xyz` 후보이며 충돌 확인 후 연결합니다. Vercel 원래 주소도 유지합니다.

이번 턴의 완료 범위는 **코드·로컬 검수·인수인계·커밋·푸시**입니다. 운영 환경변수 등록·실제 회원 검수·운영 배포는 이 별도 승인 규칙 때문에 대기합니다.

## 실행 결과 (2026-10-13, 주인님 승인 후 Claude Code)

- 주인님이 `buylifemall@gmail.com`에 등록된 기존 값 사용을 승인. 루트 `.env.local`의 값을 `scripts/add-markdown-studio-vercel-env.mjs`로 표준입력 전달해 **Production·Development 각 3개(총 6건) 등록** — 비밀 값은 출력·기록하지 않음. `NEXT_PUBLIC_MAIN_SITE_URL`은 코드 기본값이 있어 등록하지 않음. Preview 미등록.
- 프로젝트에 프레임워크 설정이 없어 첫 배포가 `public` 출력 폴더 오류로 실패 → `vercel.json {"framework":"nextjs"}` 추가 후 재배포 성공(기존 ERROR_LESSONS 항목 동일).
- 프로덕션 배포 `markdown-studio-lwfc7et96-buylife.vercel.app`, 도메인 `https://markdown-studio.buylife.xyz` 연결(응답 확인: `/`→307 대시보드→로그인 흐름, `/login` 200, `/api/session` 401 + `no-store`).
- `programs` 등록(`supabase/migrations/0001_register_program.sql`, 적용 완료): 표시명 **마크다운 문서 자동화**, 카테고리 Tools, 최소 등급 일반, **FREE+new**, v1.01, `app_url` 새 주소, 요금제 3개, VIP 등급 표 1건. 설명에는 현재 제공 범위(편집·보관·.md 저장)와 미제공 기능(변환·가져오기·Drive)을 명시. 표시명·FREE는 제안값이며 주인님이 바꾸면 관리자 화면에서 수정.
- 관리자 계정으로 운영 화면 검수: SSO 쿠키 인식, 문서 만들기, 실제 키보드 한글 입력, Ctrl+B 굵게, 미리보기 반영 확인. **일반 회원(`buylifemall@naver.com`) 로그인 검수는 비밀번호 입력이 필요해 미실행.**
