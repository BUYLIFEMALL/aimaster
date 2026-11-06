# AI 올인원 그래픽 자동화 (allinone-graphic) — 2차 전면 리뉴얼 인수인계서 (v1.20)

- **작업 일시**: 2026-11-06 23:25 (agy-win-mvs-v2)
- **담당 에이전트**: Antigravity (`agy`, 윈도우)
- **버전**: `v1.05` ➔ **`v1.20`**
- **공식 채택 템플릿**: **60. 피그마 프로 비주얼 그래픽 캔버스 아틀리에 스타일 (Figma Pro Visual Graphic Canvas Atelier Style)**
- **공식 운영 도메인**: [https://graphic.buylife.xyz](https://graphic.buylife.xyz)
- **Vercel 프로덕션 보조 링크**: [https://allinone-graphic-pd909amgs-buylife.vercel.app](https://allinone-graphic-pd909amgs-buylife.vercel.app) *(배포 ID: `dpl_GTGQ8aupKpjgDiR9EZK4CGYxA1wz`)*
- **단일 통합 쇼케이스 웹서버 링크**: [http://localhost:3800/showcase.html](http://localhost:3800/showcase.html) 및 [http://localhost:3800/comparison.html](http://localhost:3800/comparison.html)
- **로컬 영구 자산 폴더 경로**: `D:\Antigravity\Design\60_figma_pro_visual_canvas`

---

## 1. 2차 전면 리뉴얼 핵심 변경 내역

### ① 피그마 프로 비주얼 아틀리에 UI/UX 전면 적용
- **배색 테마**:
  - 메인 캔버스: 라이트 퓨어 슬레이트 (`#F8FAFC`) & 서피스 화이트 (`#FFFFFF`), 모눈 그리드 (`canvas-grid`)
  - 포인트 악센트: 피그마 인디고 (`#6366F1`) & 비비드 마젠타 (`#EC4899`)
- **4단계 그래픽 파이프라인 인디케이터 배너**:
  - `STEP 01: 123종 프리셋 탐색` → `STEP 02: 필드 변수 튜닝` → `STEP 03: 스마트 인페인팅` → `STEP 04: 벡터/HD 에셋 추출`
- **3D 엠보싱 버튼 규격**:
  - `.btn-3d-indigo` (`background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 4px 0 #3730a3, 0 8px 20px rgba(99, 102, 241, 0.35); border: 1px solid #818cf8;`)
  - `.btn-3d-pink` (`background: linear-gradient(180deg, #ec4899 0%, #db2777 100%); box-shadow: 0 4px 0 #9d174d, 0 8px 20px rgba(236, 72, 153, 0.35); border: 1px solid #f472b6;`)

### ② 2026-11-01 로그인 5단계 수직 레이아웃 표준 규격 준수
1. **[맨 위] 64px 프로그램 심볼 로고**: 인디고/핑크 그라데이션 라운드 스퀘어 심볼 (`Palette`)
2. **[그 밑] 알약 캡슐 뱃지**: `AIMASTER ALL-IN-ONE GRAPHIC`
3. **[그 밑] 한글명 볼드 메인 타이틀**: `AI 올인원 그래픽 자동화` + 서브 안내 카피
4. **[중앙] 폼 카드**: 2단 탭 세그먼트 + `.btn-3d-indigo` 입체 섀도우 버튼 (`로그인 →`)
5. **[맨 아래] 약관 문구 1행 축소**: `진행 시 이용약관 및 개인정보 처리방침에 동의합니다.`

---

## 2. 품질 및 라이브 배포 검증 내역

- **단위 테스트**: `5/5` 100% PASS (`allinone-graphic`)
- **로컬 빌드**: Next.js 16.4.2 Turbopack `Compiled successfully`, 정적 페이지 6/6 생성 완료
- **Vercel 프로덕션 배포**: `dpl_GTGQ8aupKpjgDiR9EZK4CGYxA1wz` (도메인 `https://graphic.buylife.xyz` 연동)
- **실세션 라이브 브라우저 검수**:
  - `aog_v120_live_login.png`: 5단계 표준 규격 및 1행 약관 일치 검증 완료
  - `aog_v120_live_guide.png`: 가이드북 인디고/핑크 3D CTA 렌더링 검증 완료
