# 🏭 Sourcing Agent — 제조 공장 & 소싱 데이터 AI 자동 분석 코파일럿

제조 공장과의 **견적서(Quotation), 제품 스펙시트, 위챗(WeChat) 대화, 이메일** 파일들을 상품별 폴더(`sourcing/data/[product_name]/`)에 넣어두면, AI가 멀티모달로 자동 분석하여 **공장별 비교표**, **미확인/미답변 사항 추적**, **다음 공장 질문 리스트**를 자동으로 정형화해 주는 Sourcing Copilot 시스템입니다.

---

## 🎯 핵심 자동화 기능 (Core Features)

### 1️⃣ 공장별 5대 핵심 조건 자동 비교표 (Factory Matrix)
- **MOQ (최소 주문 수량)**: 공장 A (1,000개) vs 공장 B (500개) vs 공장 C (2,000개)
- **단가 (Unit Price)**: EXW / FOB 기준 가격 및 수량별 구간 단가 (Tier Pricing)
- **샘플비 (Sample Fee)**: 샘플 제작비 및 금형비(Mould Fee) / 샘플 발송 리드타임
- **생산 기간 (Lead Time)**: 양산(Mass Production) 소요 기간 (예: 25일)
- **결제 조건 (Payment Terms)**: T/T 30% 선금 / 70% 잔금, 알리바바 에스크로 등

### 2️⃣ 미확인 사항 (Unconfirmed Specs)
- KC/FDA 인증서 보유 여부 미확인
- Custom Logo 샌딩/레이저 인쇄 비용 및 위치 미확인
- 개별 패키지(박스 디자인) 인쇄 포함 여부 미확인

### 3️⃣ 미답변 사항 (Pending Follow-ups)
- *"7월 28일 위챗으로 1,000개 구매 시 패키지 무료 변경 여부 문의했으나 답변받지 못함"*
- *"8월 1일 포장 박스 칼선(Dieline) AI 파일 요청했으나 미발송 상태"*

### 4️⃣ 다음 공장에 물어볼 질문 리스트 (Actionable Questions)
- 네고(가격 협상) 타겟 금액 제시 문구
- **한국어 ➔ 영어(EN) & 중국어(CN 🇨🇳) 자동 변환** (위챗 복사/붙여넣기용)
  - 예: *"Dear Factory A, If we place an order for 2,000 units, can you lower the unit price to $3.20 and include custom box printing?"*
  - 예: *"A공장님, 2,000개 주문 시 단가를 $3.20로 낮춰주시고 맞춤 상자 인쇄를 포함해 주실 수 있나요? (如果您订购2000台...)"*

---

## 📚 참조 문서
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 멀티모달 파이프라인 & 소싱 데이터 파싱 명세서
- [AGENTS.md](AGENTS.md): AI Agent 안전 수칙 및 작업 가이드
- [CLAUDE.md](CLAUDE.md): 개발 환경 및 다국어 다중 포맷 지침
