# 데이터베이스 연동 — 전체 호환 전환 인수인계

2026-10-16 Codex(윈도우). **메인 + 82개 프로그램(총 83개 웹 배포)의 코드 호환·빌드·운영 배포·회원 검수 완료.** 주인님이 "추가해줘"로 승인한 새 변수 160개 Production 추가 등록을 완료했습니다. 전체 조회 83곳: 새 공개 이름 83곳·새 서버 이름 82곳(서버 키 불필요 video-to-gif 제외). 기존 변수의 이름·환경·유형은 모두 보존했습니다. 대상 83곳의 신규 설정 배포와 Microsoft Edge 회원 재검수는 완료했습니다. 공개 변수 79개는 Config, 서버 변수 81개는 Secret으로 확인했습니다. 기존 변수와 실제 키는 유지합니다. 기존 환경변수·실제 Supabase 키는 유지했습니다.

> 먼저 [최상위 DB 지침](DATABASE_CONNECTION_POLICY.md)과 [최신 인수인계](HANDOFF.md)를 읽습니다. 앞으로 Codex 개발·회원 검수는 **보이는 Microsoft Edge**를 사용합니다. 로컬 Chrome 83/83은 브라우저 지정 전 이력입니다.

> **2026-10-16 최신 메인 복구 기준:** 경쟁사 v1.07 최종 푸시 후 installer 404를 복구하면서 다른 CLI의 최신 SEO Studio 새 주소 전달도 보존했습니다. 메인 소스 `325710c4`, 배포 **`dpl_5ptzk1yEsWQSfdt9LgLkaYU8ZGHR`**, https://aimaster-lp7mxzpqb-buylife.vercel.app, 홈·EXE·ZIP 200. 실제 기준은 `supabase-compat-rollout-20261016/deployments.json` 루트 행과 `scripts/finalize-supabase-compat-main.cjs`이며 아래 과거 3Yjt/3RZ 기록은 당시 이력입니다. [복구 증거](../competitor-analysis/docs/evidence/main-artifacts.json).

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

코드 커밋 **b3d5fc92**, 필독 지침 c8356e27, Edge 최상단 지정 df016e13. 이번 신규 설정의 메인 설치 파일 포함 검증 배포는 **dpl_3YjtVTKpe2Hjmvkr6633P5rHRGDs**, 운영 주소 https://www.buylife.xyz 입니다. 문서 푸시의 자동 배포가 설치 파일을 빠뜨리면 아래 절차로 이 검증 배포를 다시 지정합니다. 최종 푸시 뒤 `node scripts/finalize-supabase-compat-main.cjs`로 앱 코드 동일성·자동 배포 완료를 확인한 후 재지정하며, 현장 확인 값은 Git 제외 `.vercel/final-main-promotion.json`에 남습니다.

## 구현과 유지 사항

- 공개는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 우선 → 없거나 공백이면 `NEXT_PUBLIC_SUPABASE_ANON_KEY`. 서버는 `SUPABASE_SECRET_KEY` 우선 → 없거나 공백이면 `SUPABASE_SERVICE_ROLE_KEY`. 설정된 새 키의 인증 실패 후 다른 키를 재시도하지 않습니다.
- 공개/서버 키를 서로 대체하지 않습니다. 메인 utils/supabase와 tarot의 관리자 공개 키 폴백을 제거했습니다. 기존 BASE64 서버 지원은 직접 서버 값이 모두 없을 때만 유지했습니다.
- 공유 DB esgxyikcnnvmlhygjkth 하나, 회원 로그인·권한·FREE·기간·RLS·본인 AI 키/외부 계정 정책을 유지했습니다. 스키마 변경·유료 AI 호출·발행/발송은 하지 않았습니다.
- 앱 82개의 APP_VERSION +0.01·DB 버전·확장 7개 버전/고정 ZIP을 함께 맞췄습니다. [릴리스 목록](supabase-compat-rollout-20261016/releases.json)과 각 폴더 supabase/release_env_compat_20261016.sql 참고. 활성 여부·app_url은 유지했습니다.
- 로컬 파일에 DB 값이 없는 앱은 검수 자식 프로세스에만 공용 DB 값을 공급했습니다. 로컬 .env 파일은 바꾸지 않았습니다. Vercel 새 변수만 승인 범위에서 추가했습니다. 플랫폼 DB 검수이며 운영자 AI 키 폴백이 아닙니다.
- 여러 검수·버전 도구도 새 이름을 읽습니다. 기존 이름만 쓰는 과거 configure-platform/add-*-vercel-env/rotate-supabase-service-key 일회성 도구가 남아 있으므로 새 연결에는 아래 최신 도구를 사용합니다. 다른 CLI의 미커밋 scripts/verify_slide_builder.mjs는 수정하지 않았습니다.

## 새 변수 추가 — 등록·운영 검수 완료

추가 전 기준 Production 새 공개 이름은 aimaster·ai-auto-blog·blog-content-maker·tistory-auto-blog **4곳**, 새 서버 이름은 aimaster **1곳**이었습니다. 추가 후 공개 **83곳**, 서버 **82곳**입니다. 코드 적용/배포와 변수 등록을 혼동하지 않습니다.

- [실제 변수 이름/환경 목록](supabase-compat-rollout-20261016/vercel-environment-names.json), [구체 추가 제안](supabase-compat-rollout-20261016/environment-addition-plan.json): **82개 프로젝트·160개 Production 항목(공개 79·서버 81)**. 기존 변수는 유지하고 새 이름만 추가하며 Supabase 키를 새로 발급하지 않습니다. video-to-gif에는 사용하지 않는 서버 키를 추가하지 않습니다.
- `node scripts/add-platform-supabase-aliases.cjs`는 기본값이 목록만 출력하는 미리보기입니다. **주인님이 환경변수 추가를 승인한 뒤에만** --approved로 실행합니다. 이미 등록된 항목은 덮어쓰지 않습니다. 값은 명령줄·문서·로그에 넣지 않습니다.
- 추가 후 대상 83곳의 운영 배포·같은 배포 ID의 Edge 회원 재검수를 완료했습니다. Preview/Development는 변경하지 않았습니다. 기존 변수 삭제 시점은 아직 확정하지 않았습니다.

## markdown-studio — Antigravity 작업 종료 후 후속 처리 완료

2026-10-16 주인님 재지시대로 Antigravity CLI 디자인 작업 종료·작업 중 표 해제·인수인계를 확인한 뒤 후속 검수했습니다. v1.09 후속 검사 뒤 추가 가이드 작업 완료까지 확인해 최종 **v1.10**, 운영 배포 **dpl_FBiuRpYxQT1BJDHH4Rc6LSNcSvpJ**를 보존했습니다. 새 변수 등록 뒤 생성된 배포이므로 중복 배포 없이 신규 이름만 사용한 로컬 빌드와 Edge 일반 회원 검수·버전 표시·모바일 확인을 통과했습니다. 이전 v1.08 호환 릴리스를 다시 배포하지 않았습니다. v1.09 → v1.10 검사 이력은 [후속 이력](supabase-compat-rollout-20261016/markdown-studio-followup-history.json)에 남겼습니다. [후속 증거](supabase-compat-rollout-20261016/markdown-studio-followup.json).

1. Antigravity가 배포를 마쳤다면 그 최신 소스·코드/DB 버전을 보존하고 실제 배포가 신규 환경변수 등록 이후 생성됐는지 확인합니다.
2. 신규 변수가 적용된 최신 배포가 있으면 기존 호환 릴리스(v1.04 등 과거 값)를 다시 배포하지 않고 그 배포를 Edge 회원 검수합니다. 필요한 경우에만 최신 커밋으로 재배포합니다.
3. 현재 전체 전환 표의 markdown-studio 버전/배포/검수 기록을 최신 값으로 갱신하고 공통 인수인계에 결과를 추가합니다. 기존 변수는 삭제하지 않습니다.

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

## 이번 추가 작업의 범위와 계정

- 대상은 작업 시작 때의 **메인 + 기존 82개 프로그램, 83개 웹 배포**입니다. 이후 새로 만드는 프로그램까지 이 검수에 포함됐다고 해석하지 않습니다. 새 프로젝트도 DB 지침을 먼저 읽고 새 변수 이름으로 설정합니다.
- 관리자 `buylifemall@gmail.com`, 일반 회원 시험 `buylifemall@naver.com`. 실제 DB 관리자 여부 true/false를 확인했습니다. [계정 역할 확인](supabase-compat-rollout-20261016/account-role-audit.json).
- 새 변수 160개 = 공개 79·서버 81, 82개 프로젝트 Production. 기존 이름/적용 환경/유형 유지, 실제 키 발급·폐기 없음. [추가 결과](supabase-compat-rollout-20261016/environment-addition-results.json), [최종 감사](supabase-compat-rollout-20261016/environment-addition-audit.json).
- 공개 79개는 CLI 기본 Secret 저장을 발견해 이번에 생성한 신규 별칭만 **같은 값으로 Config 재등록**했습니다. 기존 변수와 서버 키는 건드리지 않았고, 배포의 키 값은 동일합니다. 도구에 공개 `--no-sensitive`를 명시했습니다. [유형 보정 결과](supabase-compat-rollout-20261016/public-alias-config-corrections.json).
- 전자책 한 곳의 networkidle 시간 초과는 단독 재검수 7초 통과로 복구됐습니다. 첫 실패를 [재검수 이력](supabase-compat-rollout-20261016/browser-recheck-history.json)에 보존했습니다. 앱 코드 수정은 없었습니다.
- 다음 CLI의 첫 단계: 이 문서·현황표·ACTIVE_WORK를 읽고 현재 대상/계정/버전부터 대조합니다. **기존 변수 정리·키 폐기·Preview/Development 전환을 임의 실행하지 않습니다.** 안정화 후 주인님과 삭제 시점을 확정해야 합니다.

- markdown-studio는 v1.09 검사 후 v1.10 UI/가이드 작업 완료까지 확인하고 **v1.10의 배포 ID 기준 검사도 통과**했습니다. 후속 변경을 이전 소스로 되돌리지 않았습니다. 현재 파일/버전이 이 증거와 다르면 최신 프로그램 인수인계를 먼저 읽습니다.

- 검수 결과는 각 기록의 **배포 ID·버전·확인 시각 기준**입니다. 이후 다른 CLI가 진행하는 music-player 디자인 등 후속 업데이트를 이번 완료 증거로 대신하지 않으며, 그 프로그램의 최신 작업 인수인계가 우선합니다.
