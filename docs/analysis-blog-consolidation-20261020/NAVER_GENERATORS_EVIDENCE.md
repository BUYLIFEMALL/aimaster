# 네이버 제작기 근거 — 에이전트·올인원

기준 커밋 `cde4c6fa`(2026-10-20). 운영 재검수가 아니라 소스 분석입니다. `naver-blog-agent`의 v1.97 미커밋 작업은 확정 기능에서 제외합니다. 배경 조사 에이전트는 사용 한도로 중단되어, 최종 근거는 주 담당 Codex가 직접 다시 읽고 정리했습니다.

| 대상 | 코드 근거 | 확인 내용·해석 범위 |
|---|---|---|
| 에이전트 버전 | `naver-blog-agent/src/lib/version.ts:3` | v1.96. 카탈로그 화면의 v1.94보다 새 코드. 라이브 DB/ZIP을 이번에 재조회한 것은 아님 |
| 기획→작성→윤문→검수 | `naver-blog-agent/src/lib/ai/pipeline.ts:19`, `:66`, `:98` | 주제·키워드·목적·페르소나·분량·이미지 계획을 받음. 단계 이름 Research는 외부 검색을 보장하지 않음 |
| 글감과 사실 왜곡 | `naver-blog-agent/docs/IMPROVEMENT_HANDOFF_20261020.md` 「오후 테스트 계정 실검수」 | v1.96 실제 시험에서 원문에 없는 인물 관계를 생성한 사례 기록. 이번 분석에서 다시 유료 생성하지 않음 |
| 후속 진행 | `naver-blog-agent/docs/PLAN_20261020_SOURCE_GROUNDING_SCHEDULE_UX.md:7` | v1.97: 글감 앞 100자 전달 한계, 근거 전체 전달·unsupported 검사·서버 계정 목록 등을 보완하는 승인 계획. 작업 중이므로 해결 완료로 표시하지 않음 |
| 수동 검수 게이트 | `naver-blog-agent/src/lib/postReview.ts:12`, `:22`, `:27` | 원고 지문과 PASS/CONFIRMED 일치가 있어야 실행 허용. 수정하면 기존 검수가 유효하지 않을 수 있음 |
| 대기열·실행 선점 | `naver-blog-agent/src/app/api/extension/task/route.ts:25`, `:47`, `:56` | 소유자·블로그·검수 확인, queued 조건과 updated_at으로 한 실행을 선점. lease/runId 복구 구조 존재 |
| 예약/쇼핑 링크 | `naver-blog-agent/src/lib/scheduleSlots.ts`, `src/lib/shoppingLinks.ts`, `src/lib/extensionBridge.ts:148` | 10분 단위 간격 예약 배정, 쇼핑 링크/대가성 문구 보정. 준비 완료는 실제 예약 목록 등록과 다름 |
| 발행 모드 핵심 | `naver-blog-agent/src/lib/naverPublishing.ts:33` | 저장 모드 없으면 publish로 해석하는 옛 호환 코드. 이번에 순수 함수 호출로 `missingPrefs=publish`, 명시 prepare=prepare 재현. 실제 발행은 실행하지 않음 |
| 최종 버튼 | `naver-blog-agent/extension/background.js:323` | prepare는 330~333행에서 멈춤. publish 경로는 337행에서 최종 버튼 클릭. 문서의 ‘항상 최종 발행 안 함’ 표현으로 축약하면 잘못됨 |
| 생성물 정리 | `naver-blog-agent/src/app/api/cron/cleanup/route.ts:10`, `src/lib/retention.ts:1` | 글감·원고·이미지 30일 정리 코드. 실제 운영 cron 실행 이력은 이번 미조회 |
| 올인원 버전 | `naver-blog-allinone/src/lib/version.ts:3` | v1.49 |
| 사진 후기 | `naver-blog-allinone/src/lib/blog/pipeline.ts:19`, `:108`, `:126` | 주제/사진/키워드 세 진입을 같은 생성 파이프라인으로 연결. 사진 모드는 업로드 사진 최대 6장, 대표 사진 우선 순서. 사진에 없는 경험을 쓰지 말라는 지시 포함 |
| 원문 보존 윤문 | `naver-blog-allinone/src/lib/blog/pipeline.ts:220`, `src/lib/blog/humanizer.ts` | 블록별 edits를 적용하며 숫자·URL 등 보호. 생성 사실 전체의 진위를 증명하지는 않음 |
| 검수 | `naver-blog-allinone/src/lib/blog/pipeline.ts:238` | 분량 코드 측정·AI PASS/WARN/FAIL/UNKNOWN, 검수 실패 시 경고를 남김. 외부 원문과 자동 사실 대조하는 장치와는 다름 |
| 키워드 ‘7엔진’ | `naver-blog-allinone/src/components/KeywordFighterSection.tsx:107`, `:161`, `:275`, `src/lib/blog/askJson.ts:28` | 자동완성은 실제 조회, 뉴스는 RSS, 상위 블로그 평균 글자수/이미지수는 검색 결과를 수집해 산출하는 코드 없이 일반 LLM에 요청. 검색광고/데이터랩 실측 분석과 동등하지 않음 |
| 회원 키 저장 | `naver-blog-allinone/src/lib/storage.ts:17`, `:25`, `:47`, `src/components/SettingsModal.tsx:90`, `src/app/api/my-keys/route.ts:8` | 공용 DB 본인 키 불러오기 경로가 있지만, 실행 설정은 브라우저 공통 키의 localStorage 저장. 새 등록을 공용 DB에 저장하는 완전한 공용 연동 구조로 보지 않음. 계정 전환 시 캐시 격리 검증 필요 |
| 직접 공급사 호출 | `naver-blog-allinone/src/lib/blog/llm.ts:46` | 브라우저에서 선택 공급사를 직접 호출. Claude에는 direct-browser-access 헤더. 서버 대행 방식과 보안/중단/복구 조건이 다름 |
| 개인 보관함 | `naver-blog-allinone/src/app/api/posts/route.ts:15`, `supabase/migrations/20261012100000_allinone_posts_and_bucket.sql:22` | aio_posts의 user_id/RLS. 보관 개수 제한은 시간 만료와 다름 |
| 이미지 공개 URL | 위 SQL `:29`, `src/app/api/posts/images/route.ts:13` | 소스에 public 버킷 설정과 공개 URL 반환. 비추측 URL은 본인만 읽기 권한과 같지 않음. 현재 운영 버킷 public 값은 미조회 |
| 기존 편집기 덮어쓰기 | `naver-blog-allinone/extension/content-naver.js:19`, `:50`, `:93`, `:209` | 직접 제목 innerText·본문 innerHTML fallback 경로. 주입 버튼 경로에 빈 문서/원고 전체 일치 검증이 보이지 않음. 실제 네이버에 실행하지 않은 정적 위험 판정 |
| 부분 성공 표시 | 같은 파일 `:224` | `titleOk 또는 bodyOk`이면 성공 표시. 제목만 또는 본문만 성공해도 성공 문구가 뜰 수 있는 분기. 입력 완전성 검증을 합친 뒤에만 이식해야 함 |

옛 `naver-blog-auto-poster_web`는 이번 화면의 7개 중 하나가 아닙니다. 별도 legacy 제품/확장 정리 대상 목록으로만 남기고 이번 중단 후보 숫자에 포함하지 않습니다.

소스 링크는 저장소 기준 경로와 줄번호입니다. 나중에 파일이 바뀌면 `git show cde4c6fa:<경로>`로 당시 내용을 확인합니다.
