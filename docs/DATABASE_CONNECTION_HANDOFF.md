# 데이터베이스 연동 전체 호환 전환 — 인수인계

2026-10-16, Codex. 주인님이 메인뿐 아니라 모든 서브프로젝트 적용과 최상위 필독 지침 등록을 요청했습니다. **진행 중이며 전체 완료로 보고하지 않습니다.** 기존 환경변수와 실제 키 삭제는 하지 않습니다.

## 시작 전에 읽을 것

[최상위 DB 연동 지침](DATABASE_CONNECTION_POLICY.md), 루트 AGENTS.md/CLAUDE.md, [최신 현황](HANDOFF.md), 각 폴더 AGENTS/README. 회원 본인 AI 키·외부 계정 규칙은 유지합니다.

## 승인 범위와 이번 작업

- 전체 연결 코드의 새·기존 환경변수 이름 호환, 관련 테스트/도구·버전/확장·문서 갱신, 빌드·커밋·푸시·운영 배포·회원 검수.
- 기존 Vercel 항목·Supabase 키 유지. 실제 환경변수 추가/수정/삭제와 실제 키 교체·폐기는 수행 전에 대상과 필요한 승인을 확인합니다. DB 메타데이터 버전 갱신과 프로그램별 배포는 공통 작업 권한에 포함됩니다.
- DB 스키마·회원 등급/기간·Cron 활성화·실제 발행/발송·유료 AI 호출은 이번 범위가 아닙니다. 기존 비활성 프로그램은 비활성 그대로 둡니다.

## 조사 완료

- 공용 `programs` **82개** 모두 코드 폴더와 대응 확인. 메인을 포함해 Supabase 참조가 있는 배포 단위 **83개**.
- 메인 `lib/supabase`와 `blog-content-maker`는 앞선 작업에서 호환 처리·배포/검수 완료. 메인의 예전 `utils/supabase`와 나머지 프로그램도 이번 전체 조사에 포함합니다.
- 메인·블로그 초기 구현 `e9322986`, 운영 검수 기록 `c1d524b9`, 블로그 새 공개 변수 등록 후 재배포 기록 `55f42b35`.
- 전환 전 카탈로그의 공개 메타데이터: [catalog-before.json](supabase-compat-rollout-20261016/catalog-before.json). 실제 키는 포함하지 않습니다.
- 로컬 조사 원본은 Git 제외 `.vercel/supabase-compat-inventory.json`·`supabase-compat-plan.json`. 프로그램마다 slug·코드 버전·DB 버전·Vercel 프로젝트 대응을 확인한 자료입니다.

## 주의할 프로그램

- `ai-auto-blog`·`tistory-auto-blog`: 버전 파일 `utils/version.ts`, 기존 확장 빌드/동기화 스크립트 유지.
- `naver-blog-auto-poster_app/web`·`naver-blog-auto-poster_web/web`: 각각 독립 배포. 상위 폴더 전용 지침도 읽습니다. DB에서 두 프로그램은 현재 비활성으로 유지합니다. 웹 확장 다운로드는 기존 메인 사이트 고정 주소를 유지합니다.
- `ai-image-studio`: 기존 `ai-image-studio.vercel.app` 별칭이 새 배포를 가리키는지 반드시 확인합니다.
- `auto-detail-page`: 운영 주소 `shop-page-seven.vercel.app` 유지, 보호 설정·별칭을 임의로 바꾸지 않습니다.
- `youtube-auto-reply` 등 Cron 지침이 있는 프로그램: 설정을 바꾸거나 꺼둔 Cron을 켜지 않습니다. 배포 전 기존 설정과 대조합니다.
- `video-to-gif`: 변환은 브라우저 WASM, 서버 워커를 만들지 않습니다.
- `web-crawler/webapp`: 웹 배포 코드만 우선 적용. 수집/우회 동작·fingerprints 정책을 변경하지 않습니다. Python 서비스의 서버 키 변수 참조도 호환 여부를 기록합니다.

## 다음 순서

1. 프로그램별 지침/예외·서버 공개 키 폴백·기존 BASE64 지원·버전 파일을 대조합니다.
2. 기존 환경변수명만 직접 읽는 브라우저·서버·프록시/설정 판정을 새 이름 우선/기존 이름 호환으로 바꿉니다. 공개/서버 자격증명 선택은 분리합니다.
3. 새 이름 등록 여부를 값 없이 조사해 프로젝트별 목록에 남깁니다. 신규 발급·기존 삭제는 하지 않습니다.
4. 프로그램별 검수·빌드·버전/ZIP·기록·커밋/푸시·배포·실제 Chrome 확인을 진행하고, 성공/실패/보류를 구분합니다.
5. 완료 후 이 문서·프로그램별 지침·역량 지도·최상위 지침의 적용 범위를 실제 결과로 갱신합니다.

**다른 CLI는 이 작업 도중 같은 프로그램의 연결 코드·버전·확장을 동시에 바꾸기 전에 최신 상태를 확인해야 합니다.** 다른 CLI의 미커밋 파일을 스테이징하거나 배포에 섞지 않습니다.


## 코드 적용·검수 중간 기록 (2026-10-16)

- 필독 지침 등록·원격 푸시: `c8356e27`. AGENTS.md/CLAUDE.md 최상단과 HANDOFF.md에서 이 문서로 연결합니다.
- 메인과 82개 프로그램에 연결 변수 호환 코드 및 운영 도구 호환 반영 중. 각 프로그램의 다음 마이너 버전과 릴리스 DML은 [release 목록](supabase-compat-rollout-20261016/releases.json), 자기 폴더 `supabase/release_env_compat_20261016.sql`에 보관합니다. 아직 DB 버전 갱신/전체 배포 완료가 아닙니다.
- 각 프로그램의 실제 공개/서버/관리자 연결 함수를 가짜 표식 값으로 검사: `node --test scripts/test-platform-supabase-compat.cjs` **86/86 통과**. 운영 자격 증명은 출력하지 않습니다. 실제 이름만 바꿔 연결하는 새 이름 전용 빌드를 전체 프로그램에서 진행 중입니다.
- Vercel 83개 Production 환경변수 이름 조회 완료: 새 공개 이름은 `aimaster`, `ai-auto-blog`, `blog-content-maker`, `tistory-auto-blog` 4개, 새 서버 이름은 `aimaster` 1개. 실제 변수 추가·변경·삭제는 수행하지 않았습니다. [값 없는 이름/환경 목록](supabase-compat-rollout-20261016/vercel-environment-names.json), [요약](supabase-compat-rollout-20261016/environment-summary.json).
- `ai-image-studio`는 공개 키 환경변수가 없고 기존 코드 기본 공개 키로 운영합니다. `video-to-gif`는 서버 작업자가 없는 브라우저 변환기여서 서버 전용 키를 사용하지 않습니다. 필요 없는 서버 키를 무조건 추가하지 않습니다.
- 빌드에서 상위 루트 미들웨어를 섞어 읽던 7개 Next.js 16 프로그램에 `turbopack.root`를 자기 작업 폴더로 고정했습니다. 구체 증상과 해결은 ERROR_LESSONS.md의 2026-10-16 항목에 기록합니다.


## 새 변수 일괄 추가 제안 (아직 미실행)

- [구체 추가 목록](supabase-compat-rollout-20261016/environment-addition-plan.json): 82개 프로젝트·160개 Production 항목(공개 79·서버 81). 기존 항목 변경/삭제와 새 Supabase 키 발급은 포함하지 않습니다. `video-to-gif`에는 사용하지 않는 서버 키를 추가하지 않습니다.
- `node scripts/add-platform-supabase-aliases.cjs`는 기본값이 목록만 출력하는 미리보기입니다. 실제 환경변수 변경 승인을 받은 뒤에만 `--approved`를 붙입니다. 새 이름이 이미 존재하면 덮어쓰지 않고 건너뜁니다. 키를 명령줄·로그·문서에 넣지 않습니다.
- 과거 `configure-platform`/`add-*-vercel-env`/`rotate-supabase-service-key` 도구는 기존 변수 이름을 직접 쓰는 일회성 운영 도구가 남아 있습니다. 새 연결/이전 변수 정리에는 위 최신 도구와 공통 지침을 사용합니다. 실제 키 교체는 이름 추가와 별개이며, 과거 회전 도구를 그대로 실행하면 새 이름의 키가 함께 갱신된다고 가정할 수 없습니다. 다른 CLI의 미커밋 `scripts/verify_slide_builder.mjs`는 수정하지 않았습니다.
- 앱이 새 이름을 지원하는 것과 Vercel에 새 이름이 등록된 것은 별개입니다. 새 변수 등록 후에는 다시 빌드/배포하고 운영 회원 흐름을 확인합니다. Preview/Development 등록·삭제는 대상 환경을 별도로 확인합니다.

## 프로그램별 실제 증거

[현황표](supabase-compat-rollout-20261016/STATUS.md)를 먼저 확인합니다. 빌드·새 이름 전용 로컬 Chrome·Vercel 새 이름 등록·운영 배포·운영 Chrome 상태를 각각 표시합니다. 완료되지 않은 칸을 추정으로 완료 처리하지 않습니다. 생성 명령: `node scripts/report-supabase-compat-rollout.cjs`.


## 배포 직전 상태

- 공통 연결 검사 **108/108**, 메인·82개 앱 코드 빌드 **83/83** 통과. 기존 메인 앱의 타입 검사 생략 설정은 변경하지 않았습니다. 나머지 앱은 빌드의 타입 검사를 통과했습니다.
- 로컬 `.env.local`에 OIDC 토큰만 있는 앱은 검수 자식 프로세스에 공통 DB 값 세 항목만 공급하고 기존 변수 이름은 빈 값으로 둡니다. 실제 파일과 Vercel 환경변수는 바꾸지 않습니다. 이 설정으로 공개 값이 포함된 빌드를 다시 만들고 실제 Chrome을 확인합니다. 운영자 AI 키 폴백이 아니라 플랫폼 공용 DB 연결만 대상으로 합니다.
- 운영 전 Cron 설정 83개 조회: 로컬과 운영 정의 차이 0개. 켜거나 끄지 않습니다.
- 브라우저 자바스크립트 1,545개 검사에서 서버 비밀 키·service_role JWT 리터럴 0건. 최종 빌드 뒤 같은 검사를 갱신합니다.
- 새 이름 전용 로컬 Chrome 검수는 현황표에서 계속 갱신합니다. 시험 회원 `buylifemall@naver.com`으로 이동·조회만 하며 생성·발행·발송 POST는 차단합니다. 비활성 네이버 두 앱은 기존 접근 제한 유지가 정상입니다. 메인은 별도 접속 확인 쿠키를 요구하는 대시보드 대신 프로그램 상세에서 회원 이용 권한과 프로필을 확인하며, 앞선 전용 검사 10개도 통과했습니다.
- `web-crawler/service/supabase_client.py`도 새 서버 변수 이름을 지원하도록 수정했습니다. 별도 Python 작업자 서버의 배포/환경 변경은 이번 83개 웹 배포에 포함하지 않았습니다. 실제 키 폐기 전 별도 사용처를 확인해야 합니다.
- 화면 관찰: `react-ui-showcase`(ai-web-ui)의 400px 가로 넘침이 관찰됐습니다. DB 연결 수정과 별개이며 화면을 전체 정상으로 보고하지 않습니다. 앱별 버전 표기/모바일 관찰은 Chrome 결과 JSON에 남습니다.
