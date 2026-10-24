# 셀러 라벨·QR·서류 자동화

판매자가 반복하는 서류 작업 5가지 — **A4 라벨 인쇄 · QR 만들기 · 파일명 일괄 변경 · PDF 정리 · 문서 서명** — 를 내 PC 브라우저 안에서만 처리하는 도구함입니다. 파일은 서버로 올라가지 않고 API 키도 필요 없습니다.

- 운영: https://seller-label-docs.buylife.xyz (AIMaster 계정 로그인 + 이용 권한)
- 개발: `npm install` → `npm run dev` (PDF 작업자 파일 자동 복사) · 시험 `npm test` · 빌드 `npm run build`
- 배포: 루트에서 `node scripts/deploy.mjs seller-label-docs --go --owner <세션> --set-version`
- 기능·구조·버전·남은 일·연계 아이디어·UI 개선안: [`AGENTS.md`](AGENTS.md) 7개 항목
