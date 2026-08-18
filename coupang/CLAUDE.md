# CLAUDE.md — Coupang Seller Copilot 개발 가이드

이 파일은 Claude Code 및 다른 AI 개발 에이전트가 `coupang` 프로젝트 모듈을 작업할 때 참조하는 안내서입니다.

## 🚀 디렉토리 구조
```
coupang/
├── AGENTS.md               # 에이전트 협업 수칙 및 안전 가이드
├── CLAUDE.md               # 기술 지침서 및 명령어
├── README.md               # 프로젝트 개요 및 로드맵
├── docs/                   # 아키텍처 및 손익 수식 명세서
│   ├── ARCHITECTURE.md     # 이상감지 알고리즘 및 데이터 파이프라인
│   └── METRICS_FORMULA.md  # 이커머스 핵심 지표 계산 공식
└── src/                    # 소스 코드
    ├── parsers/            # CSV/Excel/Coupang WING 데이터 파서
    ├── calculator/         # 매출/광고비/ROAS/공헌이익/재고소진일 계산 엔진
    ├── anomaly/            # Claude AI 이상 징후 감지 엔진
    ├── voc/                # 리뷰/반품 불만사항 NLP 클러스터링
    └── product_intel/      # 경쟁사 비교 & 신제품 기획서 파이프라인
```

## 📊 핵심 지표 계산 수식 (Calculator Engine Specs)
1. **ROAS (%)**: `(매출액 / 광고비) * 100`
2. **CPA (원)**: `광고비 / 판매수량`
3. **공헌이익 (Contribution Margin)**: `매출액 - (변동비 + 원가 + 광고비 + 쿠팡수수료 + 택배비)`
4. **공헌이익률 (%)**: `(공헌이익 / 매출액) * 100`
5. **일평균 판매 속도 (Daily Sales Rate)**: `최근 N일 총 판매량 / N`
6. **재고 소진 예상일 (Run-out Days)**: `현재 재고 / 일평균 판매 속도`
