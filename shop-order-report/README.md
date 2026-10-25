# AI 쇼핑몰 주문·매출 리포트 자동화

마켓 주문 엑셀을 올리면 **주문 현황 · 매출·순이익 · 재고 소진 예측 · 리뷰 분석**을 한 화면에 정리합니다. 구매자 개인정보 열은 읽지 않고, 주문은 회원 PC 브라우저에만 보관합니다(서버 데이터 표 없음).

- 운영: https://shop-order-report.buylife.xyz
- 개발: `npm install` → `npm run dev` · 시험 `npm test` · 빌드 `npm run build`
- 배포: 루트에서 `node scripts/deploy.mjs shop-order-report --go --owner <세션> --set-version`
- 상세 7개 항목: [`AGENTS.md`](AGENTS.md)
