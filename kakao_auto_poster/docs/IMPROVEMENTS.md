> ⚠ 최상위 규칙 점검 필요 (2026-11-13 전체 점검): 리포트 「💬 카카오톡 공유」 버튼(`src/components/KakaoScript.tsx:29`)이 운영자 환경변수 `NEXT_PUBLIC_KAKAO_JS_KEY`(운영자 카카오 앱 JavaScript 키)로 카카오 SDK를 초기화한다. 공유는 회원 본인 카카오톡에서 회원이 직접 보내는 방식이라 발행 대행은 아니지만, 「운영자 공용 앱」 형태라 최상위 규칙 예외로 둘지 주인님 확인이 필요하다(고치지 않음).

# 카카오톡 뉴스레터 자동화 (kakao_auto_poster) 개선 제안 및 백로그

## 1. 최근 적용 완료 내역 (v1.20 - 2026-10-19)
- **플로우 위저드 카카오 옐로우 뉴스레터 에디션 디자인 전면 개편**:
  - 다크 차콜(`191919`)과 카카오 옐로우(`fee500`)를 조화시킨 현대적 UI 적용.
  - 대시보드 `.studio-hero` 프리미엄 배너 및 3대 핵심 KPI 통계 카드 도입.
  - 4단계 파이프라인 스텝퍼 바(구독자 관리 ➔ 뉴스레터 작성 ➔ 발송 테스트 ➔ 예약 & 성과 분석) 신설.
- **`📖 연동 & 사용 매뉴얼` (`/guide`) 독립 비주얼 가이드북 구축**:
  - 발송 채널별(카카오톡 나에게/친구톡, 텔레그램, 이메일) 기능 매트릭스 표 제공.
  - 뉴스레터 오픈율 극대화 7대 황금 수칙 및 5종 인터랙티브 FAQ 아코디언 제공.
- **모바일 375px 완벽 반응형 대응**:
  - 상단 56px 모바일 헤더 및 햄버거 토글 슬라이드 오버레이 드로어 장착.
- **버전 3중 동기화**:
  - `package.json` (`1.20.0`), `version.ts` (`v1.20`), Supabase `programs` (`v1.20`).

---

## 2. 향후 추가 개선 제안 3대 항목 (Next Backlog)
1. **AI 뉴스레터 원클릭 카피라이팅 & A/B 테스트 생성기**:
   - 블로그 링크나 핵심 키워드를 입력하면, Gemini Flash를 활용해 카카오톡 친구톡에 최적화된 매력적인 제목 3종과 본문 요약 카피를 3초 만에 자동 생성하고 클릭률을 비교 테스트할 수 있는 기능.
2. **구독자 그룹별 태그 기반 스마트 세그먼트 발송 필터**:
   - 관심사 태그(예: 마케팅, 재테크, IT뉴스 등) 및 최근 열람일 기준으로 수신자를 스마트하게 그룹핑하여, 그룹별 맞춤형 뉴스레터를 타겟팅 발송하는 고도화 기능.
3. **실시간 링크 클릭 추적 & 오픈율 히트맵 리포트**:
   - 뉴스레터 내 삽입된 URL에 단축 추적 파라미터를 자동 부여하여, 어떤 링크가 가장 많이 클릭되었는지와 시간대별 열람 분포를 시각적 히트맵 차트로 제공하는 리포트 대시보드.

## 2026-10-20 — 정기 자동 생성이 프로그램 이용 권한을 확인하지 않음 (Claude Code 윈도우 발견, 처리 상태: ✅ v1.22에서 처리 — 2026-10-20 주인님 지시)
- 근거: v1.21 작업 중 `src/lib/schedulerMember/dispatch.ts`(예전 `generate-reports`)가 핸드폰 번호만 확인하고 `checkProgramAccess`(구독·사용기간)는 확인하지 않음 → 사용기간이 끝난 회원의 켜 둔 주제가 계속 생성될 수 있다(회원 본인 AI 키 비용). 네이버 카페 v1.21과 같은 구조라 함께 처리 권장(네이버 카페 `docs/IMPROVEMENTS.md` 같은 날 항목).
- 다음 첫 단계: 사용기간이 끝난 회원의 예약 켜진 주제 수를 DB로 세어 영향 범위 확인 → 플랜 보고.
- **미배포 대기(2026-10-23, 커밋 `22c6cda35`)**: 좌측 메뉴 계정·로그아웃이 화면 맨 아래로 밀리던 것을 마지막 메뉴 바로 아래(8~16px)로 — `docs/SIDEBAR_LAYOUT_STANDARD.md` 「계정 이메일·로그아웃 위치」(메뉴 `flex-1`/틀 `justify-between`/계정 `mt-auto` 제거). 클래스만 바꿈, tsc 통과. **다음 배포 때 함께 내보내고(버전 +0.01) 데스크톱·휴대폰 폭에서 계정 위치 확인 후 이 줄과 `docs/PENDING_DEPLOYS.md` 줄 지우기.** (Claude Code 윈도우, YOUTUBE Shots v1.38과 같은 수정)

## 2026-10-23 미배포 대기 — SOLAPI 발송 코드 공용 기준 코드 `solapi-client` (Claude Code 윈도우 · 세션 `claude-win-20261023-solapi-shared`)
- 주인님 승인(「진행, 미배포 대기」). 플랜: `crm-google-form/docs/PLAN_20261023_SOLAPI_SHARED.md`. 기준 `crm-google-form/lib/solapi/client.ts`, 사본 5곳(booking-reminder·stepmail·kakao_auto_poster·trending-product-finder·real_estate_sales) — **사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.** 계정 저장 `lib/actions/solapiAccount.ts`는 프로그램마다 기능이 달라 공용 아님.
- 사본으로 맞춤: 주석 정리 + 쓰지 않는 RCS 발송 함수 `sendRcs` 추가(동작 같음). tsc 통과.
- ⚠ **로컬 `npm run build`가 Next.js 보안 경고(SecurityFatalError: 설치된 Next.js 16.4.0에 알려진 취약점)로 종료 코드 1** — 화면 생성·타입 검사는 끝까지 통과, 이번 수정과 무관하게 원래 있던 문제. **다음 배포 전에 Next.js 보안 업데이트가 필요할 수 있음**(Vercel 빌드도 같은 이유로 실패할 수 있음, 업그레이드는 주인님 승인 뒤).
- 배포: 미배포 대기(급하지 않은 공용 변경·작은 문구 버그) — 다음 배포 때 버전 +0.01.

## 2026-11-13 전체 점검에서 발견 (정책 담당 세션 `claude-win-20261112-policy`)
### 1) 프로그램 로직·기능
- **설정의 Claude 키가 실제로 쓰이지 않음** — 근거 `src/lib/reportEngine.ts:33-36`(OpenAI 키만 조회), 설정 섹션은 OpenAI·Anthropic을 함께 보여 줌. 영향: Claude 키만 등록한 회원은 리포트 생성이 실패. 우선순위 높음. 상태: 안내 문구는 이번에 고침(미배포), 실제 Claude 선택 지원(또는 칸 숨김)은 제안.
- **30일 자동 정리 없음** — 근거: `vercel.json` 크론은 생성뿐, `kakao_reports`·`kakao-report-images` 정리 코드 없음. 영향: 회원 저장공간·보관 규칙(일반 회원 30일) 미적용. 우선순위 중간. 상태: 제안(정리 시 `retention_exempt` 회원 제외).
- **리포트 삭제 시 대표 이미지 파일이 남음** — 근거 `src/lib/actions/reports.ts:73-79`(행만 삭제), 이미지는 공개 버킷 `kakao-report-images/<userId>/…`(`src/lib/ai/reportImage.ts:62-69`). 우선순위 중간. 상태: 제안.
- **`package.json` 버전 1.27.0 vs 코드 v1.30** — 근거 `package.json`, `src/lib/version.ts`. 우선순위 낮음. 상태: 다음 배포 때 맞추기 제안.
- **링크 기본값이 옛 주소** — 근거 `src/lib/kakaoSend.ts:8`, `src/lib/telegramReview.ts:4` 등 `NEXT_PUBLIC_SITE_URL` 기본값 `kakao-auto-poster.vercel.app`/`kakaoautoposter.vercel.app`이 서로 다름(환경변수가 있으면 무관, 실제 값은 미확인). 우선순위 낮음. 상태: 제안.
### 2) 화면·가독성·사용 편의
- **설정 화면 「⏰ 예약 발행」 문구가 실제 동작과 반대**(「카카오 발송은 사람이 결정」) — 근거 `src/lib/reportEngine.ts:70`, `src/lib/schedule.ts` 주석(카카오톡 칩 = 즉시 발행). 우선순위 높음. 상태: 이번에 고침(미배포).
- **키 입력 칸 옆에 매뉴얼 버튼이 없었음**(맨 아래 상자에만 있음) — 상태: 이번에 고침(미배포). cron-job.org는 매뉴얼 글이 없어 버튼 없음(매뉴얼 글 없음).
### 3) 다른 자동화 프로그램과 연계
- 수신자 목록(`kakao_broadcast_recipients`)과 stepmail 리드·crm-google-form 연락처가 서로 따로 관리됨 — 공용 연락처 가져오기(엑셀 형식 동일)를 제안. 우선순위 낮음. 상태: 제안.
### 4) 매뉴얼과 실제 기능의 차이 (이번에 고친 것 / 남은 것)
- 고친 것(미배포): 카카오 나에게 보내기 = 「원클릭, 개발자 키 불필요」 → 본인 카카오 앱 + Redirect URI 등록 필요 / Perplexity·Gemini 「권장」 → 필수, Claude 키 미사용 안내 / 예약 FAQ 「카카오 자동 발송 안 함」 → 카카오톡 칩 즉시 발송 / 텔레그램 「Chat ID 등록」 → 봇에게 메시지 1개(자동 탐색) / Solapi 「건당 15~20원」(근거 없는 수치) → Solapi 요금표 확인 / FAQ 추가: 비용 버튼, 보관·삭제.
- 남은 것: 「7대 황금 수칙」은 운영 팁이라 코드 대조 대상 아님(그대로 둠). 로그인 기기 정책 안내는 매뉴얼에 없음(정책 코드 적용 후 함께 추가 제안).
### 5) 정책 점검 (pending-check 결과)
- 저작권 고지: 경고 없음(적용됨). 저장공간 위젯: 미적용(다음 배포 때 레이아웃에 한 줄). 로그아웃 범위: `src/lib/actions/auth.ts:45` `signOut()` 범위 없음 → `scope: "local"` 필요. 서버 로그인 기기 정보: 서버 Supabase 클라이언트 User-Agent 미전달. 30일 정리 예외 회원: 정리 작업 자체가 없어 해당 없음(위 1번).
