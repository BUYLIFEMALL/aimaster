# VideoToGIF — 상세페이지 GIF 자동화 (v1.10)

상세페이지용 동영상을 고품질 GIF로 브라우저 내에서 직접 변환하는 AIMaster 서브프로젝트입니다.

- **공식 서비스 URL**: https://video-to-gif.buylife.xyz (대시보드: `/dashboard`)
- **비주얼 가이드북 URL**: https://video-to-gif.buylife.xyz/guide
- **적용 템플릿**: **크리에이티브 아틀리에 스타일 — 이커머스 GIF 랩 에디션 (Creative Atelier Style — eCommerce GIF Lab Edition)**

---

## 1. 아키텍처 (클라이언트 사이드 WASM 구동)

**변환은 서버가 아니라 사용자 브라우저 안에서 처리됩니다** (`@ffmpeg/ffmpeg`, ffmpeg.wasm). 영상 파일은 어디로도 업로드되지 않고, FFmpeg 코어(WASM, 약 25~30MB)만 CDN(jsdelivr)에서 받아와 그 자리에서 실행합니다.

- **100% 프라이버시 보호**: 원본 영상 및 결과 GIF는 브라우저 메모리의 Blob URL로만 존재하며, 서버나 DB로 단 1바이트도 전송되지 않습니다.
- **8MiB 지능형 사다리 (Candidates Ladder)**: 네이버 스마트스토어 및 쿠팡 상세페이지 업로드 기준(8MiB 이하)에 맞춰 원본 영상 재생 길이를 유지한 채 최적 해상도와 팔레트 색상 수를 자동 조율합니다.
- **2-Pass 고화질 팔레트 인코딩**: `palettegen` 및 `paletteuse` 2단계 필터로 디더링 품질을 극대화합니다.

---

## 2. v1.10 디자인 리뉴얼 주요 변경사항 (2026-10-19)

1. **크리에이티브 아틀리에 다크 토큰 시스템 적용**:
   - 딥 차콜 나이트(`--background: #0d1117`, `--surface: #161b22`) 및 이커머스 앰버 골드(`--brand: #f59e0b`) 토큰 체계 완비.
2. **사이드바 메뉴 표준화 (`DESIGN.md` 9번 원칙 충족)**:
   - `v1.10 GIF LAB` 앰버 칩 배지 및 1-2-3단계 넘버링 파이프라인.
   - **`📖 연동 & 사용 매뉴얼` (`/guide`)** 메뉴 신설 (골드 칩 강조).
   - 모바일 햄버거 토글 드로어 완비.
3. **메인 워크스페이스 대시보드 리뉴얼**:
   - 상단 `.studio-hero` 웰컴 배너 및 3대 핵심 KPI 지표 카드 (WASM 무손실, 8MiB 사다리, 20개 일괄 큐) 배치.
   - 드롭존 호버 인터랙션, 진행률 게이지 바, 인라인 GIF 미리보기 모달 지원.
4. **독립 비주얼 가이드북 (`/guide`) 전면 신설**:
   - 4단계 이커머스 파이프라인, 쇼핑몰 플랫폼별 규격 매트릭스, 8단계 사다리 해설, FAQ 5종 아코디언.

---

## 3. 실행 방법

```bash
npm install
npm run dev
```

Next.js Turbopack 빌드:
```bash
npm run build
```
