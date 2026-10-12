# 무한루프 영상자동화 (infinite-loop-video)

영상에서 시작과 끝이 가장 닮은 구간을 찾아 끝없이 반복되는 MP4·WebM·GIF로 만드는 도구. **모든 처리는 브라우저 안에서만** 이뤄지고(영상 서버 전송 없음) API 키가 필요 없다.
라이브: https://infinite-loop-video.buylife.xyz · 배지 FREE+new · 카테고리 멀티미디어 · 현재 버전 **v1.02**

## 작업 기록
- **v1.01 (2026-10-12)** 신규 구축·배포. 참고 원본 seamless-loop-studio.vercel.app의 구조·알고리즘만 분석해 새로 구현(코드·문구 복제 없음).
- **v1.02 (2026-10-12)** 녹화 파일(MediaRecorder)처럼 길이 정보가 없는(Infinity) 영상도 길이를 읽도록 보정.

## 구조
- `src/lib/loop/analysis.ts` — 8fps 샘플, 64×64 프레임 특징(밝기 히스토그램·32×32 밝기 격자·4×4 색 격자) → 유사도(0.55/0.25/0.2) → 평활(0.1,0.2,0.4,0.2,0.1)+움직임 연속성 점수로 최적 구간 탐색, 경계 ±0.35초 30fps 정밀 보정.
- `src/lib/loop/plan.ts` — 파라미터 보정(크로스페이드 0.1~2초·구간 절반 이하, 반복 1~200)과 ffmpeg 필터 생성: 스마트(xfade+acrossfade), 강제 오버랩(전체 1초 고정), 바운스(reverse).
- `src/lib/loop/browser.ts` — 프레임 추출(Canvas) + ffmpeg.wasm(@ffmpeg/core 0.12.6, jsdelivr) 렌더링. 소리 유지(MP4 aac / WebM vorbis), GIF는 무음·480px·15fps·1회분(재생기가 무한 반복).
- 접근 판정은 `image-convert-studio`와 같은 핸드폰 확인 포함 코드(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+부여).
- 테스트: `npm test` (순수 함수 + 접근 판정 15개 통과).

## 남은 일 / 알려진 한계
- **실제 영상 끝에서 끝까지 화면 검수 미완료**: 검수 시 Chrome 창이 백그라운드(visibilityState=hidden)라 영상 로딩이 멈춰 업로드 이후 단계를 확인하지 못했다. 화면이 보이는 상태에서 영상 1개로 분석→렌더→재생→다운로드를 확인할 것.
- 원본에 있던 밝기 보정(0.7~1.4), 전체화면 미리보기, 크로스페이드 포함 실시간 미리보기는 미구현(결과 영상으로 확인).
- 분석은 메인 스레드에서 비동기 청크로 실행(Web Worker 미적용, 60초까지 분석).
- 썸네일 미생성(`scripts/generate-program-thumbnail.mjs infinite-loop-video <카테고리id> "<프롬프트>"`).
- 운영비용 없음(브라우저 전용) → 프리미엄 후보 아님.
