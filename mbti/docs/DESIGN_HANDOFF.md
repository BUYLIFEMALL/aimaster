# 🎨 39번 성격코드(MBTI) 측정기 디자인 인수인계서 (DESIGN_HANDOFF.md)

## 1. 템플릿 정보
- **스타일 대분류**: 크리에이티브 아트 & 아틀리에 캔버스 스타일군
- **공식 템플릿명**: **크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 랩 에디션 (Creative Atelier — Pastel Personality Lab Edition)**
- **버전**: `v1.20`
- **배포 주소**: https://personality-code.buylife.xyz

## 2. 디자인 시스템 및 컬러 팔레트
- **배경 (Background)**: `#faf8f5` (따뜻한 웜 파스텔 크림)
- **카드 서피스 (Surface)**: `#ffffff` (클린 화이트), `#f5f2eb` (서브 서피스)
- **테두리 (Border)**: `#e8e5df` (소프트 슬레이트), `#f0ece3` (미세 라인)
- **텍스트**:
  - 메인 타이틀: `#1c1917` (딥 차콜)
  - 설명 및 라벨: `#78716c` (웜 그레이)
  - 부가 정보 및 타임스탬프: `#a8a29e`
- **4대 이분지표 시그니처 컬러**:
  - **E/I (에너지)**: 바이올렛 `#8b5cf6`, 인디고 `#6366f1`
  - **S/N (인식)**: 에메랄드 `#10b981`, 틸 `#14b8a6`
  - **T/F (판단)**: 로즈 `#f43f5e`, 핑크 `#fb7185`
  - **J/P (생활)**: 앰버 `#f59e0b`, 오렌지 `#f97316`

## 3. 핵심 컴포넌트 규격
- **`.studio-hero`**:
  - `background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(245, 158, 11, 0.08) 100%)`
  - `border: 1px solid rgba(232, 229, 223, 0.9)`
  - `box-shadow: 0 10px 25px -5px rgba(120, 113, 108, 0.06)`
- **`.stat-card`**:
  - `background: #ffffff; border: 1px solid #e8e5df; border-radius: 1rem; padding: 1.25rem`
- **모바일 반응형 최적화**:
  - 뷰포트 너비 375px~390px 기준 가로 오버플로우 제로 검증 완료
  - 헤더 `16성격 가이드북` 퀵 버튼 및 2열 그리드의 1열 모바일 스택 대응
