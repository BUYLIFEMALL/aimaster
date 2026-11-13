# 메인 사이트(www.buylife.xyz) 개선사항 원장

> 담당 [역할: policy]. 메인 사이트(루트 `app/`·`components/`·`lib/`·`middleware.ts`)를 고치거나 분석하다 발견한 것을 여기에 적는다. 상세 기록은 `docs/HANDOFF.md`, 미배포는 `docs/PENDING_DEPLOYS.md`.

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-11-13 | 편의성 | 「API 설정」 화면 AI 키 4종·Cloudinary 옆에 「📖 발급 방법」 버튼이 없었음 | `app/(dashboard)/api-settings/page.tsx` | 높음 | 코드 넣음(미배포) |
| 2 | 2026-11-13 | 편의성 | 공용 연동 항목 20개가 매뉴얼 글과 연결돼 있지 않았음(`integration_catalog.guide_id` 전부 빈 값) | 운영 DB 조회 | 높음 | DB 11개 연결(0070 적용), 화면 버튼은 코드 넣음(미배포) |
| 3 | 2026-11-13 | 문서 | 연동 매뉴얼 글이 없는 항목 9개: `newsblur`·`cronjob_org`·`groq`·`openrouter`·`cloudflare_workers_ai`·`huggingface`·`wordpress`·`naver_blog`(+비활성 `nvidia_nim`) — 글을 쓰고 `guide_id`를 채워야 함. 특히 `cronjob_org`는 예약 기능 공용 키(핵심 원칙 26)라 우선 | 0070 주석 | 중간 | 대기 |
| 4 | 2026-11-13 | 매뉴얼 | 자주 묻는 질문이 옛 정책이었음(1계정 1세션·등급만 되면 이용) → 4개 답 수정 + 5개 질문 추가(핸드폰 번호·저장공간 4개) | 0071 | 높음 | 운영 반영·화면 확인 완료 |
| 5 | 2026-11-13 | 기능 | 「API 설정」은 AI 키 4종만 보여 줌. DB는 키 종류 60여 개를 받고 회원은 프로그램 설정 화면에서 등록함(예: `threads_app_id` 15명, `youtube_api_key` 10명) → 「내가 등록한 키 전체 목록(읽기·삭제)」을 한 곳에서 보여 주면 「한 번 등록하면 재사용」이 눈에 보임 | 운영 DB `user_api_keys` 집계 | 중간 | 제안 |
| 6 | 2026-11-13 | 정리 | `lib/apiKeys.ts`의 `ApiKeyProvider` 타입이 14종에 멈춰 있음(DB 제약은 60여 종) — 새 키를 쓰는 코드가 생기면 타입부터 맞출 것 | `lib/apiKeys.ts` | 낮음 | 대기 |
| 7 | 2026-11-13 | 정책 | 용량 검사 공용 코드(`lib/storage/storageQuota.ts`)를 쓰는 프로그램이 점검한 7곳 중 0곳 — 「가득 차면 새 저장을 막는다」가 실제로는 대부분 적용 전. 각 프로그램 다음 배포 때 붙이도록 `pending-check` 알림 추가를 검토 | `docs/analysis-ecommerce-bundle-20261024/POLICY_REVIEW_20261113_MAKER.md` §1 | 중간 | 제안 |
| 8 | 2026-11-13 | 수정 | 옛 주소 이동 대상이 잘못돼 있었음: 공개된 옛 주소는 `aimaster-five.vercel.app`(화면 200), `aimaster-buylife.vercel.app`은 Vercel 로그인으로 보호된 팀 주소 → 두 주소 모두 대상으로 수정 | Vercel 프로젝트 도메인 조회·응답 확인 | 높음 | 코드 넣음(미배포) |
| 9 | 2026-11-13 | 확인 필요 | 로그인 기록의 기기 정보 `Vercel Edge Functions` 15건이 「옛 주소 로그인」 때문이라는 것은 **추정**이다(브라우저 로그인은 주소와 상관없이 브라우저 정보가 찍히므로 근거가 약함). 서버·미들웨어에서 로그인(또는 세션 교환)을 하는 프로그램이 원인일 수 있음 → `pending-check`의 「서버 로그인 기기 정보」 남은 프로그램과 대조해 출처를 특정할 것 | `docs/HANDOFF_20261113_LOGIN_POLICY_ROLLOUT.md` | 중간 | 대기 |
| 10 | 2026-11-13 | 운영 | 역할 파일 3개가 3일 넘게 갱신 안 됨, 작업 중 표에 오래 남은 줄 3개, 공개 프로그램 중 담당이 정해지지 않은 것이 있음 | `docs/DEV_STATUS_20261113.md` §2-4·§4 | 중간 | 주인님 결정 대기 |
