# 감성 글귀 이미지 — AI 에이전트 인수인계

후속(2026-10-12): 주인님 요청("위 메뉴 밑으로 올라줘" - 스크린샷 빨간선 위치 지정)에 따라 사이드바 하단 메뉴를 WORKFLOW 메뉴 바로 아래로 밀착 배치했습니다.
- `justify-between` 제거: 사이드바 내부 래퍼의 `justify-between`을 제거하여, 모니터 해상도가 높아도 `🔑 API키등록·플랫폼연동` 및 계정/로그아웃 섹션이 화면 최하단으로 멀리 떨어지지 않고 WORKFLOW 6번(완성 & 저장) 메뉴 바로 아래에 자연스럽게 이어져 바짝 붙도록 레이아웃 수정.
- v1.06 배포 완료 (DB `programs.version = 'v1.06'`, 패키지 및 `APP_VERSION = 'v1.06'`).

후속(2026-10-12): 주인님 질의("무료 상태가 아닌데 왜 Free 배치가 붙어 있지?")에 따라 사이드바 헤더의 하드코딩된 FREE 배지 태그를 완전 제거하고, 제목 글자 꺾임 밀림을 원천 차단했습니다.
- 사이드바 FREE 배지 제거: 템플릿(ebook-studio) 이식 당시 잔여물이었던 `<span ...>FREE</span>` 하드코딩 태그를 완전 삭제하여 DB 프로그램 정책(유료 권한)과 일치시킴.
- 헤더 제목 꺾임 방지: 사이드바 헤더의 `h1` 태그에 `whitespace-nowrap`을 적용하여 좁은 너비에서도 "감성 글귀 이미지" 글자가 두 줄로 꺾여 밀리는 현상을 원천 차단.
- v1.05 배포 완료 (DB `programs.version = 'v1.05'`, 패키지 및 `APP_VERSION = 'v1.05'`).

후속(2026-10-12): 주인님 요청("제목이 커서 밀린다 수정해주고 메뉴 하단을 끌어올려줘")에 따라 제목 크기 최적화 및 사이드바 높이 슬림화 작업을 완료했습니다.
- 사이드바 컴팩트화: 전체 패딩(`p-3.5`), 항목 간격(`space-y-2.5`), 스텝 항목 슬림화(`py-1.5 px-2`, 원형 배지 `h-5 w-5`), 간결한 키워드형 설명으로 전체 사이드바 높이를 750px+에서 500px 수준으로 대폭 축소하여, 스크롤 없이 하단 `🔑 API키등록·플랫폼연동` 및 로그아웃 버튼이 위로 끌어올려지도록 개선.
- 제목 밀림 방지: 상단 본문 헤더 `h1` 크기를 `22px`로 최적화하고 상하 마진/패딩을 슬림화하여 아래 작업 카드들이 시원하게 위로 올라오도록 정돈. 각 Step 카드 타이틀도 간결하게 단축하여 줄바꿈 밀림 현상 원천 차단.
- v1.04 배포 완료.

최상위: 회원 본인 계정·본인 API 키만 사용합니다. 루트 AGENTS.md, docs/HANDOFF.md, docs/ERROR_LESSONS.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md, docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md를 먼저 읽습니다.

2026-10-12 현재 **v1.04 구현·제목 밀림 방지 및 메뉴 끌어올림·Vercel 프로덕션 배포 완료** 상태입니다. 라이브 서비스 주소는 `https://emotion-writer.buylife.xyz`이며 SSO 게이트(307) 및 메인 카탈로그 노출이 정상 동작함을 검증 완료했습니다.

회원 권한·본인 키는 cardnews-studio의 기존 구조를 재사용합니다. 참고 프로젝트의 브라우저 API 키/암호화 키를 읽거나 이전하지 않습니다. localStorage에는 본인 작업 문구·설정만 회원 ID를 붙여 저장하며 API 키·사진은 저장하지 않습니다.

검수는 이 폴더에서 npm test, npm run lint, npm run build를 실행합니다. 라이브 주소 `https://emotion-writer.buylife.xyz` 및 메인 카탈로그 `https://www.buylife.xyz/programs` 최상단 1위 노출 검증을 마쳤습니다. 확장 프로그램은 사용하지 않습니다.
- v1.07 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.

## v1.08 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/studio/services.ts 글귀 생성 지시에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.08. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.09 (emotion-writer)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.10 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/studio/config.ts` `tests/studio.test.mjs` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.11 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (4묶음 A 직접 호출형, Claude Code 윈도우)
- `src/lib/studio/services.ts` `generateImage()`가 공용 사본(`src/lib/studio/geminiImage.ts`)으로 위임 — 요청 취소 신호(`request.signal`)와 테스트용 가짜 호출을 그대로 넘김, 110초·형식/크기 검사·`providerError()` 문구 그대로. `config.ts` 이미지 모델 목록은 공용 등급표 1K·2K 등급(값 동일).
- 공용 사본이 주는 것: 키 머리글 전송, 시간 제한, 응답의 모든 조각에서 **최종** 이미지 선택(gemini-3-pro-image의 중간 초안 `thought` 조각 제외), 안전 차단·한도·키 오류 구분, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc 0·기존 테스트 통과, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()`/`NANO_BANANA_MODEL_CONFIGS` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.12 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 공용 문구를 그대로 `AppError`로 보여 주므로 연결 코드 변경 없음.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).
