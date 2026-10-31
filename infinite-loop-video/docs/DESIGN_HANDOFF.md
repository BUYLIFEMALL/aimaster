# infinite-loop-video 디자인 인수인계서 (DESIGN_HANDOFF.md)

> **최종 갱신**: 2026-10-31 (v1.10 프로 크리에이터 슬레이트 NLE 랩 스타일 리뉴얼 완료)  
> **공식 운영 도메인**: [https://infinite-loop-video.buylife.xyz/studio](https://infinite-loop-video.buylife.xyz/studio)  
> **Vercel 프로덕션 링크**: [https://infinite-loop-video.vercel.app/studio](https://infinite-loop-video.vercel.app/studio)  
> **로컬 영구 자산 경로**: `D:\Antigravity\Design\38_프로_크리에이터_슬레이트_NLE_랩_스타일`  
> **단일 통합 쇼케이스**: `http://localhost:3800/showcase.html`

---

## 🎨 1. 적용 디자인 템플릿 스펙
- **공식 템플릿명**: **38. 프로 크리에이터 슬레이트 NLE 랩 스타일 (Pro Creator Slate NLE Lab Style)**
- **채택 배경**: 기존 칠흑 같은 다크 차콜(`#0b0d12`)의 침침함을 전면 탈피하고, 사용자의 선택에 따라 전문가용 영상편집기(NLE)의 정밀한 조작감과 산뜻한 화이트·슬레이트 그레이를 결합한 최고급 비디오 랩 스타일로 개편.
- **주요 배색 토큰**:
  - 배경: Studio Clean Slate White (`#F8FAFC`, `#FFFFFF`)
  - 카드 & 표면: Pure White (`#FFFFFF`, `border-slate-200`, `shadow-xs`)
  - 프라이머리 포인트: Amber Gold (`#F59E0B`, `#D97706`)
  - 보조 엑센트: Cobalt Deep Blue (`#2563EB`, `#3B82F6`)
  - 텍스트: Slate Deep Dark (`#0F172A`), Muted Slate (`#64748B`)
- **3D 엠보싱 버튼**:
  - `.btn-3d-amber`: 2단 수직 그라데이션 `#F59E0B` → `#D97706`, 하단 5px 입체 그림자 `#78350F`, 4px 누름 모션
  - `.btn-3d-blue`: 2단 수직 그라데이션 `#3B82F6` → `#2563EB`, 하단 5px 입체 그림자 `#1E3A8A`

---

## 📐 2. 표준 사이드바 레이아웃 준수 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)
1. **프로그램명 & 버전**: 무한루프 영상자동화 / 스튜디오 `v1.10` 배지 일체형 헤더
2. **다른 프로그램 보기**: `← 다른 프로그램 보기` 상단 링크
3. **대시보드 진입점**: 🏠 무한루프 스튜디오 홈 (`/studio`)
4. **번호가 붙은 핵심 작업 흐름**:
   - 1. 영상 소스 업로드 (초단위 컷 & 9:16 최적화)
   - 2. 루프 알고리즘 선택 (스마트루프 / 오버랩 / 바운스)
   - 3. 프레임 시임리스 매칭 (SSIM 99.4% 정합 분석)
   - 4. 9:16 쇼츠 고속 렌더 (MP4 / WebM / GIF 내보내기)
5. **부가 도구 & 프리셋**: 일괄 숏폼 루프 변환기, 바이럴 루프 효과 프리셋
6. **하단 고정 영역**:
   - 3D 엠보싱 확장 다운로드 링크 (`.btn-3d-amber`)
   - 사용 매뉴얼 (`/guide`) & 계정/API키 설정 (`/settings`)
   - 사용자 계정 정보 & 로그아웃 버튼

---

## 🚀 3. 배포 및 검증 현황
- **Next.js 16.4.2** Webpack 번들 최적화 빌드 완료 (`npm run build` 통과)
- **19개 단위 테스트 전수 통과** (`npm run test`, 19 pass, 0 fail)
- **Vercel 프로덕션 무중단 배포 완료**: `https://infinite-loop-video.vercel.app` Aliased
- **DB 버전 동기화 완료**: `v1.10`
- **실세션 브라우저 검수 완료**: 데스크톱(1440px) 및 모바일(390px) 렌더링 무결성 확인
