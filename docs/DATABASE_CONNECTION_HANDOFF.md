# 데이터베이스 연동 — 전체 호환 전환 인수인계

2026-10-16 Codex(윈도우). **메인 + 82개 프로그램(총 83개 웹 배포)의 코드 호환·빌드·운영 배포·회원 검수 완료.** 주인님이 "추가해줘"로 새 변수 160개 Production 추가 등록을 승인해 진행 중입니다. 재배포·Edge 재검수 후 완료 수치를 갱신합니다. 기존 환경변수·실제 Supabase 키는 유지했습니다.

> 먼저 [최상위 DB 지침](DATABASE_CONNECTION_POLICY.md)과 [최신 인수인계](HANDOFF.md)를 읽습니다. 앞으로 Codex 개발·회원 검수는 **보이는 Microsoft Edge**를 사용합니다. 로컬 Chrome 83/83은 브라우저 지정 전 이력입니다.

## 완료 증거

| 항목 | 결과 |
|---|---|
| 실제 연결 함수·새/기존 이름·공백·우선순위·자격 증명 분리 검사 | 108/108 |
| 코드 빌드 / 새 이름만 사용한 로컬 회원 Chrome | 83/83 / 83/83 |
| 프로덕션 배포 / 운영 회원 Edge | 83/83 READY / 83/83 |
| DB 프로그램 버전·코드 일치 | 82/82 |
| 확장 DB·manifest·라이브 ZIP 버전/소스 | 7/7, 실패 0·경고 0 |
| 브라우저 JS 서버 키·service_role JWT 검사 | 1,557개 파일, 발견 0 |
| Cron 정의·활성 상태 | 83곳 변경 없음 |

[현황표](supabase-compat-rollout-20261016/STATUS.md), [배포 ID/주소](supabase-compat-rollout-20261016/deployments.json), [운영 Edge](supabase-compat-rollout-20261016/browser-live-results.json), [카탈로그 대조](supabase-compat-rollout-20261016/release-audit.json), [확장 실물 검사](supabase-compat-rollout-20261016/extension-live-results.json).

코드 커밋 **b3d5fc92**, 필독 지침 c8356e27, Edge 최상단 지정 df016e13. 메인 설치 파일 포함 검증 배포는 **dpl_wwRtFkMQi969JwLqqgph4vW6mh18**, 운영 주소 https://www.buylife.xyz 입니다. 문서 푸시의 자동 배포가 설치 파일을 빠뜨리면 아래 절차로 이 검증 배포를 다시 지정합니다. 최종 푸시 뒤 `node scripts/finalize-supabase-compat-main.cjs`로 앱 코드 동일성·자동 배포 완료를 확인한 후 재지정하며, 현장 확인 값은 Git 제외 `.vercel/final-main-promotion.json`에 남습니다.

## 구현과 유지 사항

- 공개는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 우선 → 없거나 공백이면 `NEXT_PUBLIC_SUPABASE_ANON_KEY`. 서버는 `SUPABASE_SECRET_KEY` 우선 → 없거나 공백이면 `SUPABASE_SERVICE_ROLE_KEY`. 설정된 새 키의 인증 실패 후 다른 키를 재시도하지 않습니다.
- 공개/서버 키를 서로 대체하지 않습니다. 메인 utils/supabase와 tarot의 관리자 공개 키 폴백을 제거했습니다. 기존 BASE64 서버 지원은 직접 서버 값이 모두 없을 때만 유지했습니다.
- 공유 DB esgxyikcnnvmlhygjkth 하나, 회원 로그인·권한·FREE·기간·RLS·본인 AI 키/외부 계정 정책을 유지했습니다. 스키마 변경·유료 AI 호출·발행/발송은 하지 않았습니다.
- 앱 82개의 APP_VERSION +0.01·DB 버전·확장 7개 버전/고정 ZIP을 함께 맞췄습니다. [릴리스 목록](supabase-compat-rollout-20261016/releases.json)과 각 폴더 supabase/release_env_compat_20261016.sql 참고. 활성 여부·app_url은 유지했습니다.
- 로컬 파일에 DB 값이 없는 앱은 검수 자식 프로세스에만 공용 DB 값을 공급했습니다. 로컬 .env 파일과 Vercel 변수는 바꾸지 않았습니다. 플랫폼 DB 검수이며 운영자 AI 키 폴백이 아닙니다.
- 여러 검수·버전 도구도 새 이름을 읽습니다. 기존 이름만 쓰는 과거 configure-platform/add-*-vercel-env/rotate-supabase-service-key 일회성 도구가 남아 있으므로 새 연결에는 아래 최신 도구를 사용합니다. 다른 CLI의 미커밋 scripts/verify_slide_builder.mjs는 수정하지 않았습니다.

## 새 변수 추가 — 승인 후 진행 중

추가 전 기준 Production 새 공개 이름은 aimaster·ai-auto-blog·blog-content-maker·tistory-auto-blog **4곳**, 새 서버 이름은 aimaster **1곳**입니다. 코드 적용/배포와 변수 등록을 혼동하지 않습니다.

- [실제 변수 이름/환경 목록](supabase-compat-rollout-20261016/vercel-environment-names.json), [구체 추가 제안](supabase-compat-rollout-20261016/environment-addition-plan.json): **82개 프로젝트·160개 Production 항목(공개 79·서버 81)**. 기존 변수는 유지하고 새 이름만 추가하며 Supabase 키를 새로 발급하지 않습니다. video-to-gif에는 사용하지 않는 서버 키를 추가하지 않습니다.
- `node scripts/add-platform-supabase-aliases.cjs`는 기본값이 목록만 출력하는 미리보기입니다. **주인님이 환경변수 추가를 승인한 뒤에만** --approved로 실행합니다. 이미 등록된 항목은 덮어쓰지 않습니다. 값은 명령줄·문서·로그에 넣지 않습니다.
- 추가 후 해당 프로젝트 재배포 → Edge 회원 재검수 → 환경 목록/현황표 갱신. Preview/Development는 별도로 확인합니다. 기존 변수 삭제 시점은 아직 확정하지 않았습니다.

## 안정화 후 기존 이름 정리

1. 모든 사용처의 새 이름 등록과 검수 증거를 확인합니다. 빠진 곳에는 기존 연결값을 한 번 추가 등록합니다.
2. 주인님과 삭제 시점을 확정한 뒤 **Vercel의 기존 변수 이름만** 프로젝트별로 정리하고 재배포·회원 검수합니다. 문제가 있으면 이전 설정을 복원합니다.
3. **Vercel 변수 삭제와 Supabase 실제 키 폐기는 별개**입니다. 새 이름에서 같은 실제 키를 쓰고 있으면 그 키를 폐기하면 안 됩니다. 실제 키 교체/폐기는 별도 승인과 전체 사용처 전환이 필요합니다.
4. 새 이름 등록이 완료돼 있으면 주인님이 값을 다시 수정할 필요가 없습니다. 전체 전환 확인 전 호환 코드를 제거하지 않습니다.

## 예외·관찰·다음 CLI 주의

- 활성 80개 프로그램 + 메인은 시험 회원 흐름을 확인했습니다. 비활성 네이버 App/Web 두 곳은 접근 제한 유지가 정상이며 활성화하지 않았습니다. 메인은 접속 확인 쿠키가 필요한 대시보드 대신 상세 페이지의 회원 이용 권한·프로필을 검수했습니다. 초기 전용 검사 10개도 통과했습니다. 관리자·외부 최종 발행 검수로 확대하지 않습니다.
- 메인의 기존 타입 검사 생략 설정은 유지했습니다. 다른 앱의 빌드 타입 검사는 통과했습니다. Next.js 16 프로그램 7개에는 turbopack.root를 자기 작업 폴더로 고정해 상위 미들웨어 혼입을 막았습니다.
- ai-image-studio.vercel.app도 최신 배포로 이동했고 shop-page-seven.vercel.app은 유지했습니다. 카카오의 옛 주소 → 새 SSO 도메인 이동은 시험 쿠키를 두 도메인에 제공해 재검수 통과했습니다.
- **메인 Git 자동 배포와 설치 파일:** 기존 69MB 설치 파일은 Git 제외입니다. 문서 푸시도 자동 배포가 운영 주소를 바꾸면 다운로드를 404로 만들 수 있습니다. 최종 자동 배포가 끝난 다음 앱 코드가 같은지 확인하고 파일 포함 검증 배포를 `vercel promote <배포ID> --yes --scope buylife`로 다시 지정하거나 파일을 포함해 수동 배포합니다. 다운로드 HTTP 200을 확인합니다. 바이너리를 임의로 Git에 넣거나 삭제하지 않습니다.
- web-crawler/service/supabase_client.py도 새 서버 이름을 지원하지만, 별도 Python 작업자 서버 배포/환경 변경은 이번 83개 웹 배포에 포함하지 않았습니다.
- **별도 UI 관찰:** ai-web-ui와 naver-blog-seo-studio의 400px 가로 넘침이 Chrome/Edge에서 관찰됐습니다. 후속 UI 작업으로 남깁니다. 전체 UI/AI 생성 기능까지 정상이라고 확대하지 않습니다.
- 확장 최신 설치: ZIP 재다운로드 → 기존 폴더 덮어쓰기 → 확장 관리 새로고침. 서버 API 변경 없이 기존 확장과 호환을 유지했습니다.

시험 비용: 무료 로컬·모의 표식·읽기 전용 회원 화면 / 유료 AI 호출 0회 / 상위 모델 호출 없음.
