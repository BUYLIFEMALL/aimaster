# CLAUDE.md — AIMaster Shorts 개발 가이드

이 파일은 Claude Code 및 다른 AI 개발 에이전트가 `shots` 폴더 내 프로젝트를 작업할 때 참조하는 프로젝트 안내서입니다.

## 🚀 프로젝트 디렉토리 구조
```
shots/
├── AGENTS.md               # AI Agent 협업 가이드라인
├── CLAUDE.md               # 에이전트 지침서 및 명령어
├── README.md               # 프로젝트 개요 및 로드맵
├── docs/                   # 상세 아키텍처 및 진행상황 문서
│   ├── ARCHITECTURE.md     # 전체 아키텍처 및 알고리즘 명세
│   └── PROGRESS.md         # 개발 진행 상황 체크리스트
├── src/                    # 소스 코드 모듈
│   ├── stt/                # Faster-Whisper / STT 파서
│   ├── scorer/             # LLM 5대 평가 지표 스코어링 엔진
│   ├── video/              # FFmpeg / 9:16 인물 추적 스마트 크롭
│   └── analytics/          # YouTube Analytics API 피드백
└── python/                 # 비디오/AI 가속 파이프라인 스크립트
```

## 🛠️ 주요 개발 명령어 (Commands)
```bash
# 로컬 개발 테스트
npm run dev

# Python 비디오 처리 환경 (가상환경)
python -m venv venv
source venv/bin/activate # (Windows: venv\Scripts\activate)
pip install -r python/requirements.txt

# 테스트 스크립트 실행
python python/extract_shorts.py --input sample.mp4
```

## 📐 핵심 디자인 & 코딩 원칙
1. **비동기 큐 작업**: 영상 처리 및 STT 작업은 시간이 소요되므로 비동기 백그라운드 작업(Task Worker)으로 처리합니다.
2. **단어 단위 타임스탬프 (Word-level Timestamps)**: Whisper 자막 추출 시 Word-level 타임스탬프를 유지하여 숏폼 자막 애니메이션(Word Popup)을 구현합니다.
3. **가로비 스마트 변환**: 인물 추적 좌표 기반으로 16:9 ➔ 9:16 Crop 시 화자가 항상 렌즈 중심에 위치하도록 보정합니다.
