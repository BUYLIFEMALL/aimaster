# CLAUDE.md — Sourcing Agent 개발 가이드

이 파일은 Claude Code 및 다른 AI 개발 에이전트가 `sourcing` 프로젝트 모듈을 작업할 때 참조하는 개발 지침서입니다.

## 🚀 디렉토리 구조
```
sourcing/
├── AGENTS.md               # 에이전트 협업 수칙 및 안전 가이드
├── CLAUDE.md               # 기술 지침서 및 명령어
├── README.md               # 프로젝트 개요 및 로드맵
├── docs/                   # 상세 아키텍처 및 데이터 스키마
│   ├── ARCHITECTURE.md     # 멀티모달 데이터 파이프라인 & LLM 추출 알고리즘
│   └── LANDED_COST.md      # 착한 마진 & 관부과세 수식 명세
├── data/                   # 상품별 소싱 데이터 입력 폴더
│   └── [product_name]/     # (예: tumbler, desk_lamp) 견적서/위챗대화 저장
└── src/                    # 소스 코드
    ├── parsers/            # PDF, Excel, OCR(이미지), TXT 파서
    ├── matrix/             # 공장별 비교 매트릭스 생성기
    ├── tracker/            # 미답변 / 미확인 사항 추적 엔진
    └── translator/         # 공장 전달용 중문/영문 질문 생성기
```

## 🛠️ 주요 개발 규칙 (Development Principles)
1. **다중 언어 처리 (Multi-Lingual Handling)**: 견적서 및 위챗 대화는 한국어, 영어(USD/EXW), 중국어(RMB/FOB)가 혼용되므로 통화(Currency: USD, RMB, KRW)와 단위(MOQ, Pcs)를 원본과 환율 적용값으로 각각 정형화해야 합니다.
2. **멀티모달 캡처 분석**: 위챗 대화 캡처 이미지 또는 PDF 견적서는 Gemini Vision / Claude 3.5 Sonnet 비전 모델을 사용하여 구조화 데이터(JSON)로 추출합니다.
