# 연주곡·효과음 모델 정밀 검토 (2026-11-05, [역할: music])

주인님 지시: 「연주곡,효과음 생성시 필요한 용도로서 정밀히 분석하고 사용가능한지 검토해」. 처음 제안(Small Music·Small SFX 추가)을 공식 자료로 다시 따져 **추가하지 않기로** 바꿨다.

## 1. 근거
- 기술 보고서 arXiv 2605.17991 표 3(연주곡 120초, 사람 평가 5점): small-music 전체 품질 3.20·음악성 3.15 vs **medium 4.20·4.15**. 본문: 「small variant performs noticeably worse than the larger models」. 속도(H200)는 0.45초 vs 0.78초로 차이가 작다.
- 표 5(효과음 5초): small-sfx 품질 3.35·설명 충실도 3.25 vs **medium 3.65·3.95** — 효과음도 Medium이 낫다.
- README 모델 표: small 두 개는 433M, 최대 120초, **CPU 전용 PC용**(「no GPU required」). 우리 추가 엔진은 지금 윈도우 + NVIDIA만 지원해 그 장점을 쓰지 못한다.
- `stable-audio-3-optimized`: TensorRT는 sm_90(H100 계열)만, 나머지는 CPU용 TFLite — RTX 5080(sm_120)에 바로 못 씀 → 제외.
- 모델 카드: 설명문(프롬프트)은 **영어로만 학습**(「Trained on English descriptions; other languages will underperform」). 보고서 권장 앞머리 「TrackType: Music, VocalType: Instrumental」이 품질을 「significantly」 올림.
- 라이선스(stability.ai/license): 연매출 100만 달러 미만 무료, **만든 결과물은 회원 소유**, 표시 의무 문구는 요약 페이지에 없음. 상업 제품·서비스 안에서 쓰면 Stability AI 등록이 필요한 경우가 있다(원문 확인 대상).
- 그 밖: Stable Audio Open 1.0·Open Small(2024~2025, 47초)은 3세대보다 오래됨, MusicGen은 CC BY-NC(개인용)·30초 → 넣지 않음. MiniMax 3은 24GB 전용.

## 2. 결론
- 마스터PC급(NVIDIA 8GB 이상)에서는 **Stable Audio 3 Medium 하나로 연주곡과 효과음을 모두** 만드는 것이 품질·관리 모두 낫다. Small 두 개는 추가하지 않는다(받기 3.5GB씩 늘고 품질은 낮음).
- 대신 Medium을 제대로 쓰게 하는 화면 개선이 필요하다:
  1. **효과음 모드**: 길이 1~30초(지금 실행 코드가 최소 10초로 자름 — `run_stableaudio3.py`), 효과음용 앞머리.
  2. **영어 설명 만들기**: 회원이 한국어로 쓰면 영어로 바꿔 넣기(회원 본인 AI 키, 이미 있는 AI 작사 연결 재사용) 또는 장르·분위기·악기·BPM 선택 칩으로 영어 설명 조립(키 없이).
  3. **공식 권장 앞머리 자동 추가**: 연주곡 「TrackType: Music, VocalType: Instrumental」.
- Small 모델은 나중에 「그래픽카드 없는 PC 지원」을 따로 할 때 다시 검토한다(그때는 CPU 전용이라는 장점이 의미가 있음).
