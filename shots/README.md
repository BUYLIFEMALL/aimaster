# 🎬 AIMaster Shorts — YouTube Long-Form to Short-Form AI Content Factory

AIMaster 플랫폼의 **유튜브 롱폼 ➔ 숏폼(Shorts) 3종 자동 생성 및 멀티채널 마케팅 자동화(Content Factory)** 모듈 프로젝트입니다.

---

## 📌 주요 기능 (Features)

1. **촬영 원본 편집 자동화 (Long-Form Pipeline)**
   - 원본 영상 멀티 파일 업로드
   - `Faster-Whisper` 기반 STT 및 단어 단위 타임스탬프 추출
   - 무음/NG/중복 발화 구간 자동 제거 (Silence & Blooper Removal)
   - LLM 기반 롱폼 스토리라인 작성 및 무손실 자동 컷편집

2. **숏폼 3종 스마트 자동 추출 (Shorts Extraction Engine)**
   - 롱폼 완성본 스크립트 분석 ➔ 숏폼 후보 10개 추출
   - **5대 평가 지표 (Hook 강도, 정보 밀도, 독립성, 감정/반전, 완주율)** 스코어링
   - 상위 3개 숏폼 구간 자동 최종 채택
   - **9:16 인물 추적 세로 스마트 크롭** (`MediaPipe` / `YOLO`)
   - Word-by-Word 애니메이션 자막 + 1~3초 후킹 타이틀 텍스트 오버레이
   - 숏폼 전용 제목, 설명문, 해시태그 패키지 자동 생성

3. **YouTube Analytics 성과 피드백 루프 (Feedback Loop)**
   - YouTube Analytics API를 통한 조회수, CTR, 시청지속율, 완주율 모니터링
   - 성과 데이터를 DB에 축적하여 잘 되는 Hook 스타일 및 구간 가중치 프롬프트 자동 학습

4. **One Source Multi Use (Content Factory)**
   - 롱폼 1개 제작 시 ➔ Shorts 3개 + Threads(`threads/`) 포스팅 + Blog(`blog/`) 포스팅 + Instagram Reels 일괄 자동 재가공

---

## 🚦 단계별 로드맵 (Roadmap)

- [ ] **Phase 1: Shorts Extraction MVP** (롱폼 완성본 ➔ 숏폼 3종 추출 및 세로 크롭 파이프라인)
- [ ] **Phase 2: Long-Form Auto Edit** (원본 촬영 클립 ➔ STT ➔ 무음/NG 컷팅 ➔ 롱폼 자동 완성)
- [ ] **Phase 3: YouTube Analytics Feedback** (성능 지표 수집 ➔ LLM 프롬프트 가중치 피드백)
- [ ] **Phase 4: Content Factory Expansion** (Threads, Blog, Instagram 채널 연동)

---

## 📚 참조 문서
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 전체 아키텍처 및 상세 알고리즘 설계서
- [AGENTS.md](AGENTS.md): AI Agent 간 협업 지침서
- [CLAUDE.md](CLAUDE.md): 개발 환경 및 에이전트 명령어 안내
