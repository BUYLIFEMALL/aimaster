# 🤖 AI Agent 협업 가이드라인 — Coupang Seller Copilot (AGENTS.md)

이 문서는 **AIMaster Coupang Seller Copilot (쿠팡 셀러 운영 & Product Intelligence AI)** 프로젝트에서 AI Agent가 작업할 때 준수해야 할 가이드라인 및 안전 수칙입니다.

---

## 🛡️ 에이전트 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사전 승인 없이 자율적으로 수행합니다:
- CSV/Excel 파서 작성, 수식 계산 모듈, 프롬프트 엔지니어링, 코드 수정
- 패키지 설치 (`npm`, `pip` 등)
- 로컬 테스트 및 빌드 실행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 6가지 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포**
4. **데이터베이스 마이그레이션 또는 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출**

---

## 🎯 프로젝트 목적
쿠팡 셀러의 **판매/광고/원가/재고 데이터(CSV/Excel/WING API)**를 통합 분석하여 **매출, ROAS, 공헌이익, 재고 소진일 자동 계산**, **이상 징후(Anomaly Detection) 자동 감지**, **VOC/리뷰 불만사항 기반 상품 상세페이지 개선안**, 그리고 **경쟁사 분석 기반 Product Intelligence(신제품 기획서 자동 생성)** 시스템을 구현합니다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `coupang/`
* 모든 데이터 파서, 계산 엔진, AI 이상감지 훅, UI 컴포넌트는 `coupang/` 폴더 내에서 개발하고 동기화합니다.

---

## 🏗️ 4단계 서브 프로젝트 로드맵

| 단계 | 서브 프로젝트명 | 주요 기능 |
| :--- | :--- | :--- |
| **Phase 1** | **CSV Data Copilot (MVP)** | CSV/Excel 업로드 ➔ 손익/ROAS/재고 자동 계산 ➔ Claude 이상 징후 자동 탐지 리포트 |
| **Phase 2** | **VOC & Review Intelligence** | 리뷰/반품 CSV 파싱 ➔ 불만사항 클러스터링 ➔ 상세페이지 수정 가이드 & 제품 개선안 제안 |
| **Phase 3** | **Coupang WING API Automation** | WING Open API 연동 ➔ 실시간 데이터 동기화 & 카카오톡/이메일 경고 알림 |
| **Phase 4** | **Market & Product Intelligence** | 경쟁사 데이터 크롤링 ➔ 시장 빈틈 발견 ➔ 신제품 기획서 & USP & 상세페이지 자동 생성 |
