# 서브프로그램 개발 및 운영 지침 요약

[분야별 색인](README.md) · 운영 서브프로그램 기준입니다. Lab의 독립프로그램은 [Lab 원문](../AIMASTER_DEV_LAB_GUIDELINES.md)을 따릅니다.

## 신규·기존 프로그램의 공통 구조

- 운영 프로그램은 같은 저장소의 `<프로그램>/` 안에서 코드·`package.json`·설정·마이그레이션·설계·검수 문서를 관리하고 자체 Vercel 프로젝트로 배포합니다. 공용 운영 DB·회원·권한·연동을 함께 사용합니다.
- 새 회원가입/결제/권한 체계를 프로그램마다 만들지 않습니다. 페이지와 실제 동작 API 모두 공용 권한 판정을 적용하고, 회원 데이터에는 `user_id`·RLS·소유자 조건을 유지합니다.
- DB 작업 전 [연동 정책](../DATABASE_CONNECTION_POLICY.md)과 [전환 인수인계](../DATABASE_CONNECTION_HANDOFF.md)를 읽습니다. 새/기존 Supabase 키 변수 호환은 기존 기준을 따르며 임의 폐기·다른 종류 키 폴백을 하지 않습니다.
- 회원 키·플랫폼 연결은 [공용 회원 연동](../MEMBER_INTEGRATIONS.md)을 재사용합니다. 권한 결과·회원 응답이 정적으로 공유되지 않게 기존 동적 처리·캐시 방지 패턴을 확인합니다.
- 정기 자동 실행·예약 게시/발송은 [예약 기능 지침](../SCHEDULER_POLICY.md)을 읽습니다. 회원 본인 cron-job.org 키를 공용 연동에 등록하고, 포스팅 예약 시 작업을 자동으로 켜고 남은 예약이 없으면 끄는 기존 방식을 따릅니다. 회원용 토큰과 사이트 `CRON_SECRET`을 구분하며 운영 정리 Cron은 별개입니다.

## 새 프로그램 등록과 서비스 주소

1. 기존 기능·템플릿·공용 부품을 확인하고 등록·권한·본인 키·회원 데이터 수명 설계를 플랜에 포함합니다.
2. `programs`에 slug·확인한 `app_url`·버전·상세 설명을 함께 등록합니다. 기본 요금제는 `ProgramForm`의 `DEFAULT_PLANS`와 기존 정책을 확인해 같은 작업에서 등록합니다.
3. 운영 도메인은 `<이름>.buylife.xyz`, SSO 쿠키는 해당 호스트에서만 `.buylife.xyz`를 사용합니다. 기존 OAuth 콜백·옛 도메인은 임의로 삭제하지 않습니다. [도메인·SSO 원문](../DOMAIN_SSO_POLICY.md).
4. 메뉴·계정·프로그램 목록 돌아가기·API 설정·연동 매뉴얼·모바일 흐름을 확인합니다.
5. [프로그램 소개 표준](../PROGRAM_DESCRIPTION_STANDARD.md)에 맞춰 한 줄 요약·상세 설명·핵심 특징·사용 순서·대상 정보를 작성하고 [역량 지도](../PROGRAM_CAPABILITY_MAP.md)를 갱신합니다.

## 프로그램 문서와 종료 기록

| 문서 | 담을 내용 |
|---|---|
| `AGENTS.md`·`README.md` | 목적/대상, 도구/기법, 기능/아키텍처/장단점, 버전/이력, 대기 작업, 연계/병합 아이디어, UI 개선안의 7대 항목 |
| `docs/IMPROVEMENTS.md` | 발견 근거·영향·우선순위·처리 상태와 기능/UI/연계 개선 제안 |
| `docs/IMPROVEMENT_BACKLOG.md` | 구체적인 대기 체크리스트·선행 조건 |
| `docs/DESIGN_HANDOFF.md` | 공식 템플릿·토큰·레이아웃·반응형·구현/검수 결과 |
| `docs/PLAN_YYYYMMDD_*.md` | 사전 플랜 원본과 범위 변경 |
| `docs/IMPROVEMENT_HANDOFF_YYYYMMDD[_작업].md` | 완료/미완료·증거·한계·비용·커밋/푸시·배포·다음 첫 단계 |

루트 HANDOFF에는 프로그램별 상세 인수인계 링크와 요약을 남깁니다. 디자인 현황과 실제 작업 상태를 맞추고 본인 ACTIVE_WORK 행을 종료 시 정리합니다. [기록 규격 원문](../IMPROVEMENT_HANDOFF_POLICY.md).

## 자동화·독립 운영·외부 키트

- 블로그·티스토리는 생성 → 편집/검수 → 확장 전달 → 실제 플랫폼 입력 → 자동 포스팅 → 실제 URL/상태 기록까지 구분해 확인합니다. `prepared`·`completed`를 실제 발행 완료와 혼동하지 않습니다. [자동화 완성 기준](../BLOG_AUTOMATION_COMPLETION_POLICY.md).
- 독립 배포는 운영 회원/DB를 분리한다는 뜻이 아닙니다. Lab 독립프로그램·기능 병합·기존 도구 독립 유지 판단은 [병합·독립 유지](CONSOLIDATION.md)를 읽습니다.
- 외부 수강생용 설치 키트는 [외부 배포 키트 지침](../DISTRIBUTION_KIT_GUIDE.md)을 읽습니다. 원본 코드와 `NEXT_PUBLIC_STANDALONE_MODE`·`KIT/` 포장을 사용하고, 수강생 소유 Supabase·Vercel·플랫폼 앱/키로 AIMaster 의존 없이 동작하게 합니다. 무료 요금제·설치마법사·Lab 리허설·업데이트/지원 범위를 따릅니다.
