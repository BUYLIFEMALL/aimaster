# 🎨 58번 YOUTUBE Shorts 자동화 디자인 인수인계서 (DESIGN_HANDOFF.md)

## 1. 템플릿 정보
- **스타일 대분류**: 다크/사이버 톤 (유튜브 다크 콘솔 스타일)
- **에디션**: Shorts Studio Edition
- **버전**: `v1.20`
- **배포 주소**: https://shots.buylife.xyz

## 2. 디자인 시스템 및 컬러 팔레트
- **배경 (Background)**: `#0f0f0f` (유튜브 공식 옵시디언 다크)
- **표면 (Surface/Card)**: `#181818` (스튜디오 다크 카드), `#1a1a1a` (서브 패널)
- **보더 (Border)**: `#272727` (다크 디바이더), `#383838` (호버 상태)
- **브랜드 레드 (Brand/Accent)**: `#ff0000` (유튜브 공식 레드), `#ff4e45` (소프트 레드)
- **텍스트**:
  - 제목 및 볼드 텍스트: `#f1f1f1`
  - 설명 및 라벨: `#aaaaaa`
  - 부가 정보 및 타임스탬프: `#717171`

## 3. 핵심 컴포넌트 규격
- **`.studio-hero`**:
  - `background: linear-gradient(135deg, rgba(255, 0, 0, 0.12) 0%, rgba(24, 24, 24, 0.95) 70%, rgba(15, 15, 15, 1) 100%)`
  - `border: 1px solid rgba(255, 0, 0, 0.25)`
  - `box-shadow: 0 10px 30px -10px rgba(255, 0, 0, 0.2)`
- **`.stat-card`**:
  - `background: #181818; border: 1px solid #272727; border-radius: 0.75rem; padding: 1.25rem`
- **사이드바**:
  - 폭 260px, 다크 보더 `#272727`, 활성 탭 `bg-[#ff0000] text-white shadow-md shadow-[#ff0000]/30`
  - 하단 `/guide` 전용 링크 및 뱃지 완비
  - 모바일 해상도(width < 768px)에서 햄버거 버튼 및 오버레이 드로어 지원
