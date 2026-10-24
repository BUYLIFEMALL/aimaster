# AI 부동산 매물 알림 자동화 (`realty-listing-alert`)

> 개발 중 — 0단계 사전 검증 단계(2026-10-24). 담당 [역할: realty] Claude Code(윈도우) `claude-win-20261024-realty`.
> 기준 문서: [`docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md`](../docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md)

## 지금 들어 있는 것 (v1.01, 미배포)
- 웹 앱(Next.js 16) — 기준 `naver-blog-seo-studio` 뼈대 복사: 로그인·권한(`lib/access.ts`, 핸드폰·FREE 순서, 권한 표 조회는 서버 키)·좌측 메뉴(767px ☰)·`/guide` 매뉴얼·`/settings`(확장 연결 코드, 공용 `personal_access_tokens` `program_slug='realty-listing-alert'`)·`/dashboard`(원클릭 다운로드 센터)·`/api/extension/whoami`·공개 `/api/extension/version`. `/targets`·`/schedule`·`/delivery`는 2단계에서 채울 「준비 중」 화면.
- `extension/` — 크롬 확장 v1.01(`manifest` `1.1.0`/`v1.01`). 지금은 **0단계 사전 검증 메뉴**(① 페이지가 불러온 매물 목록 응답 읽기 ② 같은 주소 직접 부르기 ③ 창 최소화 상태 예약 타이머 ④ 텔레그램 파일 보내기)와 웹 연결(`web-bridge.js` ping·connect)만 있다. 결과 JSON은 개인 정보 칸(전화·주소·대표자)을 빼고 다운로드 폴더에 저장. 3단계에서 수집 엔진으로 교체.
- 다운로드: `npm run build`의 `prebuild`(`scripts/build-extension-archive.mjs`, 기준 `naver-blog-agent`)가 `lib/version.ts` → manifest 버전을 맞추고 `public/downloads/realty-listing-alert-extension-latest.zip`을 만든다. 이 프로그램 사이트(대시보드 다운로드 센터·좌측 메뉴 「확장 프로그램 받기」)에서 내려받는다.
- 남은 등록 일(주인님 승인 뒤): 운영 DB `programs` 등록·요금제 3단계, Vercel 프로젝트·`realty-listing-alert.buylife.xyz`, `scripts/check-extension-release.mjs` 목록·`docs/EXTENSION_RELEASE_RULES.md` §3 표 추가.

## 절대 원칙 (주인님 결정, 인수인계 §0)
- 네이버 접속·조회·스크롤은 회원 PC에서 회원 본인 로그인으로만. 우리 서버는 네이버에 요청하지 않고 매물 데이터를 받거나 저장하지 않는다.
- 회원 쿠키·비밀번호를 받지 않는다. 차단·보안 문자·확인 화면이 나오면 멈추고 알린다(우회 금지).
