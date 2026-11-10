# 작업 대기 — AI 11번가 상품 자동등록기

플랜: `../../docs/PLAN_20261111_ELEVENST_REGISTER.md` §4

## 2단계 연동 화면
- [ ] (주인님) 11번가 「API 관리 › IP 직접 입력: 사용 › 실서버 IP」에 Fixie 고정 IP 2개 등록
- [ ] `/connect` 「API키등록·플랫폼연동」: 11번가 키(공용 `elevenst_api_key`) + 고정 IP(공용 `fixed_ip_proxy_url`, 쿠팡 운영 `ProxyKeyForm` 재사용) + 키 만료일
- [ ] 「연결 시험」: 출고지·반품지·발송마감 템플릿 조회(읽기만), 접근 거부면 나가는 IP 표시
- [ ] 11번가 요청 함수(`undici` ProxyAgent, 헤더 `openapikey`, EUC-KR, 재시도 0)

## 3단계 등록 화면
- [ ] 상세페이지 상품 목록(검토 완료 먼저) → 카테고리 찾기(최하위만) → 가격·재고·옵션 → 고시·KC → 「검사하기」
- [ ] 기본값(출고지·반품지 순번·발송마감 템플릿·배송비·A/S·반품교환 안내) 한 번 저장

## 4단계 보내기
- [ ] 이미지 공개 주소(쿠팡 운영 `/i/[id]` 방식, Content-Type 이미지)
- [ ] `sending` 기록 → 등록 → 바로 전시중지 → `stopped`/`registered`/`failed`/`unknown`, 불확실하면 다시 보내지 않음
- [ ] 30일 정리(관리자·시험 계정 `retention_exempt` 열외) + `CRON_SECRET`

## 5·6단계
- [ ] `shop-detail-page/lib/markets.ts` 11번가 한 줄
- [ ] 주인님 승인 1건 실제 등록 → 전시중지 확인 → 기록
- [ ] 공개 전: 상세 소개(`detail_sections`)·썸네일·FREE/프리미엄 판단
