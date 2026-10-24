# 인스타 프로그램 통합·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 인스타 카테고리 담당 역할은 아직 없다. 완료 표시는 git 커밋·버전 파일로 확인한 것만 적었고, 실제 화면·실제 게시 검수 여부는 각 프로그램 인수인계 문서를 따른다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 이 문서 작성으로 운영 코드·DB·권한·버전·배포는 바뀌지 않았다.

## 읽는 순서

[인스타 자동화 완성 기준](INSTAGRAM_COMPLETION_POLICY.md) → [인스타 기능 상세 비교표](INSTAGRAM_FEATURE_MATRIX.md) → 이 작업목록 → [ACTIVE_WORK](ACTIVE_WORK.md)·[HANDOFF](HANDOFF.md) 맨 위 → 대상 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`·최신 플랜.

- 결정 근거: [인스타 통합 분석 보고서](analysis-insta-consolidation-20261020/REPORT.md) §2·§5(주인님 결정 2026-10-20)
- 병합 A 플랜: [`insta_auto_poster/docs/PLAN_20261020_CARDNEWS_MERGE.md`](../insta_auto_poster/docs/PLAN_20261020_CARDNEWS_MERGE.md)
- 병합 B 플랜: [`instagram-comment-reply/docs/PLAN_20261020_DM_MERGE.md`](../instagram-comment-reply/docs/PLAN_20261020_DM_MERGE.md)

## 유지할 역할

| 유지할 프로그램 | 담당 역할 | 흡수한·흡수할 것 | 원본 처리 |
|---|---|---|---|
| INSTA 포스팅 자동화 `auto-instagram-posting` | 인스타 연결 출발점, 피드·카드뉴스 제작·게시 | `cardnews-studio` 스튜디오 전체 | 카드뉴스는 옛 주소 전달·노출 중지 |
| INSTA 댓글·DM 자동화 `instagram-comment-reply` | 댓글·DM 응대 | `instagram-dm-reply` DM 기능 전체 | DM은 옛 주소 전달·노출 중지 |
| AI 인플루언서 자동화 `ai-influencer-studio` | 가상 인물 화보 | 공용 게시 엔진 사본만 | 독립 |
| AI 웹툰 자동화 `ai-webtoon-studio` | 장편 웹툰 연재 | 공용 게시 엔진 기준 일부 보유 | 독립(4컷과 엔진 공유, 재검토 대기) |

## 순차 작업 표

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**. 근거가 없으면 「확인 필요」로 적는다.

| ID | 대상과 범위 | 필요한 이유 | 완료 기준 | 현재 상태 |
|---|---|---|---|---|
| INC-A1 | 병합 A 1단계: 카드뉴스 스튜디오를 INSTA 안 `/cardnews/*`로 이식 | 같은 목적의 두 프로그램, 한글 깨짐 없는 카드뉴스 엔진 하나로 | INSTA에서 5단계 화면·저장·불러오기·예약 게시 | **완료** INSTA v1.35 `97b56ba45`, 화면 정리 v1.36 `5876884d7` |
| INC-A2 | 병합 A 2단계: 게시·예약 보관함 하나로 | 보관함이 `insta_posts`·`cns_insta_posts`로 나뉨 | 게시글 관리에서 두 기록을 함께 보고 예약 취소 | **완료** v1.37 `30c9c8025`. 표 두 개는 그대로이고 화면만 합침 |
| INC-A2b | 예약 실행 방식 설정 통합 | 플랜에 「남은 일」로 기록됨 | 피드·카드뉴스 한 곳에서 실행 방식 선택 | **완료** v1.39 `7d26818f4` |
| INC-A3 | 병합 A 3단계: 옛 카드뉴스 정리 | 회원 혼란 방지, 옛 콜백·북마크 보존 | 옛 주소 이동·API 전달, 메인 상세 주소 이동, 공용 기준 위치 이동 | **완료** cardnews v1.32 `e574afed2`, 인수인계 `afea29ea1` |
| INC-B1 | 병합 B 1단계: DM 화면·기능을 댓글 앱 `/dm/*`로 | 같은 흐름·같은 파일 19개, 연결 두 번 | 연결 한 번(「DM 답변도 사용」)으로 댓글·DM | **완료** 댓글 v1.18 `f93923238` |
| INC-B2 | 병합 B 2단계: 대시보드·기록 하나로 | 응대 현황 한 화면 | 댓글·DM 대기 수·기록 탭 | **완료** v1.23 `e95121e29` |
| INC-B3 | 병합 B 3단계: 옛 DM 정리 | 옛 웹훅·콜백 보존 | 옛 주소 이동·API 전달, 카탈로그 노출 중지, 텔레그램 DM 봇·Meta 웹훅 재등록 | **완료** DM v1.17 `258d6b15c`, 카탈로그 `a4c7ac9d3` |
| INC-C1 | 병합된 두 원본의 데이터·이용권 정리(`cns_*` 표 유지 여부, `user_program_access` 이전, 원본 폴더 정리) | 보고서 §3-2·3-3 | 주인님 결정 후 회원 권한·데이터 이전 계획과 되돌리기 계획 | **일부 완료** — 코드 정리 `8b1cee2e2`(사용 종료 5개, 두 원본 포함: 백업 태그 `backup/old-apps-20261021` 뒤 옛 주소 전달·안내 화면만 남김). DB 표(`cns_*`·`dm_accounts`)와 이용권 이전 여부는 **확인 필요** |
| INC-C2 | 대체 연결 표 정리(`insta_accounts`·`ig_accounts`·`dm_accounts`) | 공용 `member_platform_accounts`가 생겼는데 프로그램마다 대체 표가 남음 | 모든 프로그램이 공용 값만 읽고, 대체 표 정리 전 백업·회원 영향 확인 | 대기([`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md) 「`insta_accounts`는 아직 없애지 않는다」) |
| INC-D1 | 게시 엔진: 시간 초과 때 `media_publish` 재요청 점검 | 완성 기준 ④(불확실하면 다시 게시하지 않음)와 충돌 가능, 중복 게시 위험 | 기준 `insta_auto_poster/src/lib/instagram/publish.ts` 수정 → 사본 3곳 동기화·시험 | **대기 — 플랜 필요**(이번 초안에서 발견) |
| INC-D2 | INSTA 피드 글·이미지 30일 정리 | 최상위 규칙(생성 데이터 30일), 카드뉴스만 정리 중 | `/api/cron/cleanup-media` 등, 미리보기 건수 확인 후 실행 | **승인 대기** [플랜](../insta_auto_poster/docs/PLAN_20261022_MEDIA_RETENTION.md) |
| INC-D3 | 댓글·DM 기록 30일 정리 확인 | 정리 코드를 찾지 못함 | 정리 위치 확인 또는 구현 플랜 | 확인 필요 |
| INC-E1 | 웹툰 AI 캡션·해시태그 | 웹툰만 기본 문구 | INSTA `generator.ts` 방식 참고, 회원 본인 키 | 후보 |
| INC-E2 | 웹툰 ↔ 4컷 재검토 | 보고서 §2 「중기 재검토」 | 사용 회원 수 확인 후 비교 보고 | 대기 |
| INC-E3 | 인플루언서 하루 일과 자동 예약 켜기 | 2026-10-20 주인님 지시로 꺼 둠(`ROUTINE_SCHEDULE_MODE="off"`) | 주인님 결정 후 스위치만 | 주인님 결정 |
| INC-E4 | 릴스·스토리 게시 | 어느 인스타 프로그램에도 없음 | 완성 기준에 형식별 규칙 추가 → 플랜 | 후보 |

## 항목마다 지킬 완료 조건

1. 착수 직전 ACTIVE_WORK·미커밋 변경·최신 인수인계를 확인하고 **프로그램 하나씩** 진행한다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 먼저 보고한다.
3. 공용 기준 코드(게시 엔진·예약·그래프)는 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`로 사본을 맞춘 뒤 사본 쓰는 프로그램을 모두 시험한다.
4. 실제 게시 시험은 시험 계정 `buylifemall@naver.com` 본인 연결 계정으로, 승인된 범위에서만 한다. 하지 않았으면 「모의 검수만」으로 적는다.
5. 끝나면 비교표 해당 칸·§7 이력, 이 표의 상태 칸, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, 루트 HANDOFF를 같은 작업에서 고친다.
