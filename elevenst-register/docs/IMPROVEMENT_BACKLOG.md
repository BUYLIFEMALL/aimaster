# 작업 대기 — AI 11번가 상품 자동등록기

플랜: `../../docs/PLAN_20261111_ELEVENST_REGISTER.md` §4

## 2단계 연동 화면
- [x] (주인님) 11번가 「API 관리」 IP 등록(Fixie IP, 결과적으로 불필요했지만 그대로 둠)
- [x] `/connect` 「API키등록·플랫폼연동」: 11번가 키 + 고정 IP 저장(v1.02 배포) — 키 만료일 저장은 설정 표가 생길 때(지금은 안내 문구)
- [x] 「연결 시험」: 출고지·반품/교환지 조회(읽기만), 거절이면 나가는 IP 표시(v1.02 배포) — 발송마감 템플릿 조회는 응답 칸 확인 뒤 3단계에서
- [x] 11번가 요청 함수(`undici` ProxyAgent, 헤더 `openapikey`, EUC-KR, 재시도 0)
- [x] 실제 연결 시험 — v1.03 서울 지역에서 성공(2026-11-11, 출고지 #2·반품지 #3), 키 하나로 Seller API·`https` 확정

## 3단계 등록 화면
- [ ] 상세페이지 상품 목록(검토 완료 먼저) → 카테고리 찾기(최하위만) → 가격·재고·옵션 → 고시·KC → 「검사하기」
- [ ] 기본값(출고지·반품지 순번·발송마감 템플릿·배송비·A/S·반품교환 안내) 한 번 저장

## 4단계 보내기
- [ ] 이미지 공개 주소(쿠팡 운영 `/i/[id]` 방식, Content-Type 이미지)
- [ ] `sending` 기록 → 등록 → 바로 전시중지 → `stopped`/`registered`/`failed`/`unknown`, 불확실하면 다시 보내지 않음
- [ ] 보관 정리 라우트 신설(보내기 기능과 같은 배포에) — 기본 규칙 「발행 1년·생성만 30일」(`docs/HANDOFF_20261111_RETENTION_PUBLISH_1Y.md` §3): 등록 성공(`registered`·`stopped`, 상품번호 있음) 기록은 1년, `sending`·`failed`·`unknown`은 30일. 「상품 등록 = 발행」 여부는 주인님 결정 대기 — 결정 전이면 전부 30일로 만들고 조건만 나눠 둠. 열외 `src/lib/retentionExempt.ts`(이미 복사됨) + `vercel.json` crons + `CRON_SECRET`

## 5·6단계
- [ ] `shop-detail-page/lib/markets.ts` 11번가 한 줄
- [ ] 주인님 승인 1건 실제 등록 → 전시중지 확인 → 기록
- [ ] 공개 전: 상세 소개(`detail_sections`)·썸네일·FREE/프리미엄 판단
