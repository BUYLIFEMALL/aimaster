# AI 부동산 매물 알림 자동화 (`realty-listing-alert`)

> 개발 중 — 0단계 사전 검증 단계(2026-10-24). 담당 [역할: realty] Claude Code(윈도우) `claude-win-20261024-realty`.
> 기준 문서: [`docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md`](../docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md)

## 지금 들어 있는 것
- `extension/` — **0단계 사전 검증용 임시 확장**(주인님 지시: 프로그램 폴더 안에 둠). 네이버 부동산 단지 화면에서
  ① 페이지가 불러온 매물 목록 응답 읽기 ② 같은 주소 직접 부르기 ③ 창 최소화 상태 예약 타이머 ④ 텔레그램 파일 보내기를 시험하고,
  개인 정보 칸(전화·주소·대표자)을 뺀 결과 JSON을 다운로드 폴더에 저장한다.
  3단계에서 실제 확장으로 교체한다(버전 규칙·ZIP 빌드는 그때 적용).
- 웹 앱(Next.js)은 1단계에서 `naver-blog-seo-studio` 뼈대를 복사해 만든다.

## 절대 원칙 (주인님 결정, 인수인계 §0)
- 네이버 접속·조회·스크롤은 회원 PC에서 회원 본인 로그인으로만. 우리 서버는 네이버에 요청하지 않고 매물 데이터를 받거나 저장하지 않는다.
- 회원 쿠키·비밀번호를 받지 않는다. 차단·보안 문자·확인 화면이 나오면 멈추고 알린다(우회 금지).
