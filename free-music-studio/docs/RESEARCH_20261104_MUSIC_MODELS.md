# 로컬 실행 노래·연주곡 생성 모델 조사 (2026-11-04)

주인님 지시: 「이런 류의 음악 생성 모델이 더 있는지 찾아서 보고해 줘」. 웹 검색과 공식 저장소·모델 카드 확인으로 조사했다. Tencent SongGeneration·SongBloom은 원문을 열지 못해 2차 자료끼리 비교했다. 비용은 없다(웹 조회만).

**지금 쓰는 엔진:** ACE-Step 1.5(MIT, 상업용) · YuE2(CC BY-NC 4.0, 비상업용). 2026-11-04 마스터PC에서 주인님은 YuE2가 음질과 음악적인 느낌 모두 ACE-Step보다 좋다고 평가했다.

## 보컬 완성곡

| 모델 | 라이선스 판정 | 로컬 조건 | 한국어 | 평판 |
|---|---|---|---|---|
| HeartMuLa-oss-3B(2026-01·02, MuLaCover 2026-09) | Apache 2.0(가중치 포함, 2026-01-20 변경) → **상업용 가능**. 다만 비상업 코드가 섞였다는 2차 주장이 있어 LICENSE·NOTICE 원문 확인 필요 | 8GB 최소·16GB 권장(2차 자료), RTX 50 계열 호환 문제 보고 | 2차 자료상 지원 | 「평범한 팝」 |
| MiniMax Music 3(2026-08) | 전용 커뮤니티 라이선스 → **불명확**(「이름 표시 조건 상업용, 연매출 2천만 달러 초과 시 허가」라는 자료와 CC BY-NC라는 자료가 엇갈림) | 약 22~24GB, 8GB 스트리밍은 느림 | 확인 못함 | YuE2 논문 표 가사 정확도 1위·종합 6.28(YuE2 6.73, ACE-Step 1.5 6.01) |
| YuE 원판 s1-7B | Apache 2.0 → 상업용 가능, 일·한 전용판 있음 | 24GB 이상, 매우 느림 | 전용판 있음 | YuE2에 밀림 |
| DiffRhythm 2(2025-10) / 1 | Apache 2.0 → 상업용 가능 | 1판 8GB, 2판은 확인 못함 | 확인 못함 | 보컬이 ACE-Step·LeVo보다 약함(논문 스스로 인정) |
| Muse 0.6B(2026-01) | 코드 MIT, 가중치 불명확, 학습 데이터가 Suno 합성곡이라 위험 | 확인 못함 | 확인 못함 | 엇갈림 |
| LeVo 2 / SongGeneration 2(Tencent) | 학술·연구 전용 → **비상업용** | 12~22GB, GGUF판 있음 | 확인 못함 | 「가장 자연스럽다」는 평가 |
| SongBloom(Tencent 등) | 불명확(Apache 2.0 / 학술 전용 엇갈림) | 확인 못함 | 영어·중국어 | 확인 못함 |
| Khala(2026-05) | CC BY-NC 4.0 → 비상업용 | 확인 못함 | 확인 못함 | 불안정(저자) |
| Seed-Music(ByteDance) · JEN-1 | 가중치 미공개 또는 확인 못함 | — | — | — |

## 연주곡 전용

| 모델 | 라이선스 판정 | 로컬 조건 | 비고 |
|---|---|---|---|
| Stable Audio 3.0 Small·Medium(2026-05) | 커뮤니티 라이선스 → **조건부 상업용**(연매출 100만 달러 미만 무료) | Medium 약 6.5GB | 최대 6분 20초, 구간 고치기·이어 만들기, 허가 데이터로 학습 |
| InspireMusic(Alibaba) | Apache 2.0 → 상업용 가능 | 12~24GB | 48kHz 긴 곡 |
| Magenta RealTime 2(Google) | 코드 Apache 2.0, 가중치 CC BY 4.0 | 맥 우선 | 실시간 즉흥용 |
| MusicGen(Meta) | 가중치 CC BY-NC 4.0 → 비상업용 | 8~16GB | 30초, 오래됨 |
| Stable Audio Open 1.0 | 커뮤니티 라이선스 | — | 효과음·루프 47초 |

## 추가 후보 순위(조사 결론)

1. **HeartMuLa-oss-3B** — 두 번째 상업용 보컬 엔진 후보. 먼저 LICENSE·NOTICE 원문 확인, RTX 5080 호환 확인.
2. **Stable Audio 3.0 Medium** — 상업용(조건부) 연주곡 전용. 연매출 조건을 화면에 안내.
3. **MiniMax Music 3** — 음질 근거가 가장 강하나 라이선스 원문 확인·한국어 시험 뒤에.

비상업 전용으로 더 넣을 수 있는 것: LeVo 2(자연스러움 평판). 넣지 않음: YuE 원판(24GB+·느림), MusicGen(오래됨).

## 주요 근거
- https://github.com/HeartMuLa/heartlib
- https://huggingface.co/MiniMaxAI/MiniMax-Music3 · https://docs.comfy.org/tutorials/audio/minimax/minimax-music-3 · https://mer.vin/news/minimax-music-3-is-open-weight-but-not-open-for-business/
- https://huggingface.co/stabilityai/stable-audio-3-medium · https://the-decoder.com/stability-ai-launches-stable-audio-3-0-with-up-to-six-minute-tracks-and-open-weights/
- https://huggingface.co/ASLP-lab/DiffRhythm2 · https://huggingface.co/m-a-p/YuE-s1-7B-anneal-en-cot · https://github.com/yuhui1038/Muse · https://github.com/FunAudioLLM/FunMusic
- https://arxiv.org/html/2605.17991v1 · https://arxiv.org/html/2609.33757v1
- https://www.it-jim.com/blog/best-open-source-ai-music-generator/ · https://boppy.me/blog/best-open-source-ai-music-models · https://songcreator.pro/blog/best-open-source-ai-music-models

주의: 비교 수치는 YuE2 쪽 논문이 낸 것이라 독립 재현되지 않았고, 한국어 청취 비교는 찾지 못했다. 넣기 전에는 공식 모델 카드로 라이선스를 다시 확인한다(로드맵 「모델 이용 조건」 규칙).
