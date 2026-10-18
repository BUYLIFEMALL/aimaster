# 이미지 변환 스튜디오 (image-convert-studio) — v1.07

> **공식 서비스 URL**: https://image-convert-studio.buylife.xyz
> **Vercel Project**: `image-convert-studio` (팀 `buylife`)
> **카테고리**: 멀티미디어 / FREE 배지 (가입 회원 누구나 무료 이용)
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 이미지 스튜디오 에디션 (Creative Atelier Style — Image Studio Edition)**

외부 서버나 유료 소프트웨어 없이, 브라우저 안에서 100% 온디바이스로 여러 이미지를 WebP·AVIF·PNG·JPEG로 일괄 변환하고, Lanczos3 엔진으로 초고화질 확대·축소하며, 자유로운 레이아웃의 콜라주를 제작하는 전문 크리에이터 스튜디오입니다.

---

## 1. 주요 메뉴 및 기능
- **1단계: 변환 & 업스케일 (`/convert`)**:
  - 최대 300장 대용량 파일 드래그앤드롭 업로드.
  - WebP, AVIF, PNG, JPEG 출력 포맷 및 품질 슬라이더(10~100%) 제어.
  - 0.5×~4× 초고화질 업스케일, Lanczos3 필터, 언샵 마스크 샤프닝, 최대 해상도 안전망.
  - 실시간 용량 절감율(%) 계산 및 개별 다운로드 / 1-Click ZIP 일괄 다운로드.
- **2단계: 콜라주 스튜디오 (`/collage`)**:
  - 다중 이미지 순서 변경 및 격자(Grid) / 가로(Horizontal) / 세로(Vertical) 레이아웃 합성.
  - 셀 크기, 간격, 여백, 배경색(컬러 피커), 맞춤(Cover/Contain) 조절 및 Canvas 실시간 렌더링.
- **📖 연동 & 사용 매뉴얼 (`/guide`)**:
  - 5단계 원스톱 파이프라인 다이어그램, 포맷별 매트릭스 비교표, 전문가 팁 4종, 트러블슈팅 FAQ 5종.

---

## 2. 디자인 및 반응형 사양 (v1.07)
- **전체 테마**: 딥 나이트 옵시디언 (`#0b0f17`) 단일 배경, 다크 서피스 (`#111726`), 아틀리에 바이올렛 (`#8b5cf6`) & 인디고 (`#6366f1`) 포인트.
- **375px 모바일 반응형**: 상단 56px 고정 슬림 헤더 + 슬라이딩 드로어(Drawer) 및 백드롭 오버레이 완비 (가로 넘침 0px 방어).
- **검수**: Microsoft Edge 포그라운드(`headless: false`) 실세션 검수 완료 (6종 캡처 보존).

---

## 3. 관련 인수인계 문서 링크
- [`AGENTS.md`](AGENTS.md): 7대 핵심 항목 완벽 규격화 인수인계서
- [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md): 디자인 개발완료 보고서
- [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md): 필수 3대 항목 및 타 프로그램 탐색 개선 제안서
- [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md): 작업 대기 백로그
- [`docs/PLAN_20261018_DESIGN_RENEWAL.md`](docs/PLAN_20261018_DESIGN_RENEWAL.md): 사전 개발 플랜
