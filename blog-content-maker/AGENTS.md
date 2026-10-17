# AI 블로그 콘텐츠 제작 자동화 — 인수인계

2026-10-16, Codex. **v1.03**, slug `blog-content-maker`. 주인님이 이름과 개발 진행을 확정했습니다. 신규 테이블 6개·비공개 Storage·새 Vercel 프로젝트의 공용 DB 환경변수 3개도 승인된 범위입니다. 같은 승인을 다시 요청하지 않습니다.

먼저 루트 AGENTS.md, docs/HANDOFF.md, TOP_RULE_PERSONAL_ACCOUNT_API.md, ERROR_LESSONS.md, AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md, SIDEBAR_LAYOUT_STANDARD.md, EXTENSION_RELEASE_RULES.md와 이 폴더 README·개발 계획·검수 기록을 읽습니다.

## 구현 상태

- Next.js·TypeScript 웹앱, 통합 로그인·권한·SSO·본인 키 재사용. 대시보드, 글감, 작성, 점검, 이미지, 내보내기, 보관함, 설정, 안내 9개 화면.
- 주제/원문/파일 입력, 작성 방식 5종, 원문·수정본 분리, DB RPC의 원자적 수정본 저장과 충돌 차단.
- Gemini/OpenAI 텍스트, Gemini 이미지. 제공사 직접 REST API. 다른 회원·운영자 키나 환경변수 AI 키로 대체하지 않음. 현재 날짜·연도 동적 주입.
- 개별 이미지 생성·업로드·제품 참고 사진·장면 계획, 비공개 저장. 새 원고의 계획 ID는 고유하며 현재 계획에 속하는 최신 파일만 내보내기·확장에 포함. 이전 파일은 보존.
- 연결 토큰 7일, SHA-256 해시만 DB 저장. 만료·폐기·사용 권한·소유자를 조회마다 확인. 확장에 AI 키를 전달하지 않음.
- 확장 editor.js/writer.js는 자사 naver-blog-agent 입력기 재사용. 허용 명령은 inspect/snapshot/title/paragraph/quote/image. 최종 발행·임의 클릭·설정 조작 없음. 기존 원고·불확실한 이미지 입력을 덮어쓰거나 자동 재시도하지 않음.

## 운영 구조

- Vercel 팀 `buylife`, 프로젝트 `blog-content-maker`, ID `prj_Q9Ei24ZuVzCfYX031UGZfqiwEuxR`. .vercel·.env.local은 Git 제외.
- 플랫폼 DB URL과 공개/서버 키만 등록. v1.03부터 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`·`SUPABASE_SECRET_KEY` 우선, 없거나 공백이면 기존 `NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY` 호환. **안정화 전 기존 환경변수·Supabase 키 삭제 금지**. 이번 작업은 실제 환경변수를 추가·변경·삭제하지 않음. 상세: `../docs/SUPABASE_API_KEY_COMPATIBILITY.md`.
- 공용 DB `esgxyikcnnvmlhygjkth`, 테이블 접두사 `blog_content_maker_`: settings/projects/revisions/assets/jobs/extension_tokens. 비공개 버킷 `blog-content-maker`. 소유자 RLS, 복합 소유자 외래 키와 서비스 역할 전용 revision RPC.
- 구조 SQL: `supabase/migrations/20261015150454_blog_content_maker_v101.sql`. 등록: `20261015152556_register_blog_content_maker.sql`. 상세 설명 조정: `supabase/update_program_description.sql`.
- programs 코드·확장 버전 v1.03, 기본 요금제 3종과 연동 가이드 등록. 등급 접근 등록 트리거가 기간 권한도 만드므로 수동 권한 등록은 ON CONFLICT 처리.
- 2026-10-16 프로그램 상세 소개 표준과 전용 썸네일 지침 적용 완료. 53자 요약·500자/6단락 소개·특징 4개·순서 4단계·실사 16:9 썸네일을 기존 등록에 반영. `docs/CATALOG_REGISTRATION.md`에 백업·최종 문안·SQL·이미지·프롬프트·운영 Chrome 검수 17개 기록. DB·공개 이미지 변경이므로 앱/확장 v1.02 유지, Vercel 재배포·확장 재설치 불필요.
- `src/lib/version.ts`가 이름·버전·URL 기준. 확장 Chrome 숫자 버전 1.3.0, version_name v1.03. ZIP 고정 경로 `public/downloads/blog-content-maker-extension-latest.zip`, prebuild 자동 생성.

## 검수·재개

[VERIFICATION.md](docs/VERIFICATION.md)에 자동 검사·실제 회원 Chrome·DB/RLS·네이버 입력·운영 배포를 구분해 기록합니다. 외부 입력 미검수를 자동 검사로 대신 보고하지 않습니다.

이 폴더에서 `vercel deploy --prod --yes --scope buylife`. 최초 배포 READY 뒤 도메인 추가. 루트에서 `node scripts/check-extension-release.mjs blog-content-maker`로 운영 ZIP과 DB 버전 검증. 운영 확인 후 인수인계·커밋·푸시 결과를 함께 보고합니다.

## 분석·구현 경계

원본은 실행하지 않았습니다. NSIS→7z→ASAR 정적 분석과 REA·직접 번들 검토를 근거로 기능을 새로 구현했습니다. REA 전체 의미 그래프는 자원 한계로 부분 분석입니다. 추출 자료는 `D:/PDS/analysis/naver-blog-seo-6.5.4-20261015/`에만 있으며 원본 코드·아이콘·고유 지시문·인증 체계를 복사하지 않았습니다.

점검은 내부 규칙·AI 의견·회원 확인을 구분합니다. 실제 검색량·네이버 공식 점수·상위 노출 보장으로 표현하지 않습니다. 가상 체험을 본인 후기로 만들지 않으며 장면 이미지를 영상 파일로 부르지 않습니다. 다른 서브프로젝트는 수정하지 않습니다.

## v1.03 (2026-10-16)

주인님이 Production에 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 직접 추가한 후 재배포 완료. 기존 공개 키와 값 일치·실제 공개 DB 조회 정상, 기존 항목과 서버 키 유지. 현재 배포 `dpl_J5cGCQjKvRgxLyMonwhkzPSSQZgy` / https://blog-content-maker-bwm3go3l2-buylife.vercel.app, 운영 별칭 유지·READY. 소스 변경 없는 환경변수 반영으로 v1.03 유지. 실제 Chrome 운영 10/10·공용 릴리스 검사 실패 0/경고 0, ZIP v1.03·소스 7개 일치. 주인님 추가 설정 불필요, 기존 값 삭제는 안정화 후 별도 확정.

메인과 이 프로그램에 새·기존 Supabase 키 환경변수 이름 호환 적용. 브라우저·서버·미들웨어·설정 준비 판정과 운영/검수 도구를 함께 수정. 서버 키 모듈은 server-only로 분리. 공통 회귀 22개, 기존 단위 10개, 린트 통과. 새 이름만 전달한 메인·블로그 프로덕션 빌드와 실제 일반 회원 Chrome 10개 검사 통과, 브라우저 비밀 키 바이트 0건. 구현 `e9322986` 푸시 후 양쪽 프로덕션 READY, 기존 이름만 등록된 블로그/양쪽 이름이 공존하는 메인 실제 회원 운영 검수 10/10 통과. DB·라이브 ZIP v1.03·소스 7개 일치, 공용 릴리스 검사 실패 0/경고 0. 결과는 VERIFICATION.md에 기록. 이전 v1.02 설치 확장도 API 호환 유지. 기존 값 삭제는 안정화 후 주인님과 별도 확정.

## v1.02 (2026-10-16)

Gemini 검색은 같은 본인 모델·키로 자연어 근거 조사 후 JSON 구성을 나누어 호출합니다. 출처 누락 시 중단하며 두 번 호출을 설정 화면에 안내합니다. 실제 검색 출처 반환 검수 통과. 버전 SQL은 `supabase/migrations/20261015155731_release_v102.sql`. 제품 참고 JPEG 합성·첫/끝 장면 두 이미지·ZIP 검수도 통과했습니다. 커밋 `33213b57` 푸시·운영 READY, 운영 일반 회원 연결 20개·검색 14개·모바일·ZIP v1.02 검수 통과.

2026-10-16 확장 업데이트 후 실제 기본 Chrome에 **이 프로그램의 `extension/` 폴더**를 로드해 네이버 본인 계정의 빈 편집기까지 재검수 완료. 제목·본문 전체/마지막 문장·한글/이모지·표 행·태그·소제목·이미지 2장과 AI 표시, 재입력 차단·기존 글 보존 확인. 검수용 연결은 종료 후 제거·폐기, 임시 페이지와 서버 정리. 최종 발행 없음. 상세 증거는 검수 기록을 따릅니다.

재현 도구: `scripts/verify-native-extension.mjs`와 `tests/native-extension-client.js`. 임시 페이지는 `extension/verify-session/` 안에만 생성하고 Git·Vercel·ZIP에서 제외·종료 시 삭제합니다. 설치 폴더를 프로그램 밖에 새로 만들거나 다른 프로그램의 확장을 대신 사용하지 않습니다. 앱 배포 코드 변경 없이 v1.02 검수만 추가했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.04 (blog-content-maker)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.05 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/types.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).
