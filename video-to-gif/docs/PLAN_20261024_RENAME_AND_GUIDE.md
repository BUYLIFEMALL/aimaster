# 초고속 영상 렌더링 & GIF 스튜디오 명칭 개편 및 표준 매뉴얼 리뉴얼 플랜

- **작성일**: 2026-10-24
- **작성자**: Antigravity (웨일 브라우저) · 세션 `agy-win-20261024-videorender`
- **대상 프로그램**: `video-to-gif` (36번 프로그램, `https://video-to-gif.buylife.xyz`)
- **버전 예정**: v1.25 (명칭 전면 개편 + 표준 가이드북 7대 컴포넌트 탑재)

---

## 1. 개요 및 배경

- **배경**: 기존 "상세페이지 GIF 자동화 (VideoToGIF)"는 이커머스 쇼핑몰 상세페이지 GIF 제작에 한정된 이미지였으나,
  - 프레임 정밀 구간 자르기(`TrimBar`), 실시간 프레임 미리보기, 구간 루프 반복,
  - 10단계 지능형 화질/해상도/FPS 자동 사다리(`gifLadder.ts`),
  - 브라우저 WASM FFmpeg 렌더링,
  - **⚡ 「내 PC 고속 변환」(로컬 렌더러 v1.30)**을 통한 H.264/AAC 영상 규격화(`normalize`), 초고속 용량 압축(`compress`), 무한 루프 인코딩(`loop`), 오디오 마스터링(`audio`) 지원 등
  - AIMaster 생태계 전반의 영상 변환 및 렌더링을 책임지는 **전문 영상 렌더링 허브 스튜디오**로 완전히 업그레이드됨.
- **목적**:
  1. 프로그램 로직과 최신 기능에 걸맞은 전문 프로그램 명칭으로 전면 개편.
  2. 사용자가 누구나 쉽게 이해하고 활용할 수 있도록 [`docs/MANUAL_AND_INTEGRATION_GUIDELINES.md`](../../docs/MANUAL_AND_INTEGRATION_GUIDELINES.md) 표준 7대 컴포넌트 기반의 연동 & 사용 매뉴얼 리뉴얼.

---

## 2. 프로그램 신규 명칭

- **공식 명칭**: **초고속 영상 렌더링 & GIF 스튜디오**
- **영문/브랜드 표기**: **VideoRender Studio (VideoToGIF)**
- **서브 타이틀**: AI 영상 전문 고속 변환 · 스마트 렌더링 엔진
- **핵심 정체성**:
  - 무설치 브라우저 100% 프라이빗 WASM 렌더링
  - 내 PC 하드웨어 가속 네이티브 고속 렌더링 (2~4배 고속)
  - 프레임 정밀 편집, 지능형 8MiB 용량 사다리, 영상 규격화/압축 통합 지원

---

## 3. 작업 범위 및 세부 계획

### 가. 프로그램 UI 전면 명칭 및 문구 쇄신
1. `video-to-gif/app/layout.tsx`: 메타데이터 타이틀 및 설명 변경
2. `video-to-gif/components/layout/Sidebar.tsx`:
   - 브랜드명: VideoRender Studio (초고속 영상 렌더링 & GIF 스튜디오)
   - 파이프라인 1-2-3단계: 이커머스 전용 문구 ➔ 전문 영상/GIF 렌더링 파이프라인
   - 가이드북 메뉴: 표준 명칭 및 뱃지 적용
3. `video-to-gif/components/ConverterWorkspace.tsx`:
   - 상단 히어로 배너: "초고속 영상 렌더링 & GIF 스튜디오"
   - 3대 KPI 카드: 엔진 아키텍처 / 스마트 용량 최적화 / 일괄 대기열
   - 우측 설정 패널 프리셋: 범용 해상도 프리셋 (560px 스탠다드 / 780px HD / 860px 와이드)
4. `video-to-gif/app/page.tsx`:
   - 랜딩 페이지 헤드라인 및 소개 문구 전면 개편
5. `video-to-gif/lib/version.ts`:
   - v1.25 버전 승급

### 나. 연동 & 사용 매뉴얼 리뉴얼 (`app/guide/page.tsx`)
- [`docs/MANUAL_AND_INTEGRATION_GUIDELINES.md`](../../docs/MANUAL_AND_INTEGRATION_GUIDELINES.md) 7대 핵심 컴포넌트 탑재:
  1. **헤더 메타데이터 바**: 아이콘, 카테고리 뱃지, 소요 시간("즉시 / 1분"), 작업 스튜디오 바로가기
  2. **개요 히어로 카드**: 글래스모피즘 비주얼, 100% 클라이언트 무저장 프라이버시 & 무설치 WASM vs 내 PC 가속 2-Track 렌더링 안내
  3. **핵심 4단계 시각 카드 뷰어**: Step 1 동영상 등록 ➔ Step 2 구간/옵션 설정 ➔ Step 3 초고속 렌더링 ➔ Step 4 결과 다운로드/연계
  4. **단계별 상세 안내 블록**: 1~4단계 상세 지침 + 내 PC 고속 변환 확장/렌더러 윈도우/맥 1초 복사 설치 안내
  5. **💡 전문가 실전 팁 배너**: 목적별 최적 해상도/FPS, 용량 최적화 노하우
  6. **⚠️ 핵심 주의사항 / 함정 방지 배너**: 대용량 파일 가이드, 윈도우/맥 보안 경고 대응, 탭 백그라운드 전환 안내
  7. **원클릭 액션 버튼**: 작업실(`/dashboard`) 및 AIMaster 메인 직링크
  8. **자주 묻는 질문(FAQ) 8종 아코디언 인터랙션**: 최신 기능 및 질문 반영

---

## 4. 검증 및 배포 절차

1. 로컬 무결성 검증: `tsc --noEmit`, `npm run build`
2. Vercel 배포
3. 네이버 웨일 브라우저(`whale.exe`, Antigravity 고정 브라우저) 실세션 검수
4. `docs/ACTIVE_WORK.md` 및 `docs/HANDOFF.md` 인수인계 기록
