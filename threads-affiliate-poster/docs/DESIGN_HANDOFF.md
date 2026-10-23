# Threads 쇼핑제휴 자동화 (threads-affiliate-poster) v1.61 디자인 인수인계서

> **작성일**: 2026-10-17  
> **작성자**: Antigravity CLI (`agy`, 윈도우)  
> **프로그램 대상**: `threads-affiliate-poster` (https://threads-affiliate-poster.buylife.xyz)  
> **최신 버전**: `v1.61` (DB 동기화 완료)  
> **적용 디자인 템플릿**: **스레드 바이럴 스튜디오 스타일 — 쇼핑제휴 변형 (Threads Viral Studio Style - Affiliate Variant)**  

---

## 1. 디자인 리뉴얼 개요
- **목적**: 기존 흰색/회색 라이트 테마를 Meta Threads 고유의 모노 다크 콘솔과 이커머스 쇼핑제휴 전환율을 극대화하는 골드/앰버 & 로열 블루 포인트 스타일로 전면 개편.
- **주요 변경 사항**:
  1. **모노 다크 테마 일관화**: 전체 웹앱 배경을 `#171717`(메인 캔버스), 서페이스를 `#1f1f1f`, 보더를 `#262626`/`#333333`으로 일원화.
  2. **모바일 반응형 완벽 지원**: 375px 모바일 폭에서 상단 고정 헤더(`Threads 쇼핑제휴 자동화` + 버전 칩 + 햄버거 토글 버튼) 및 슬라이드 오버레이 드로어 메뉴 구축.
  3. **사이드바 표준 규격화**: 메뉴명을 `📖 연동 & 사용 매뉴얼`로 표준화하고, 3단계 작업 파이프라인 칩 시각화.
  4. **비주얼 사용 매뉴얼 (`/guide`) 신규 구축**:
     - 🤖 마스코트 안내 말풍선
     - 4단계 핵심 프로세스 비주얼 다이어그램 카드
     - 4대 제휴사(쿠팡, 알리, 네이버, 토스) 연동 및 API 조건 비교표
     - 공정거래위원회 추천·보증 심사지침 필수 준수 가이드 박스
     - 자주 묻는 질문(FAQ) 4종 아코디언 카드
  5. **대시보드 (`/dashboard`) 다크 정돈**: 상단 프로그램 소개, 5단계 프로세스 가이드 카드, 상태 통계 5개 카드, 예약 게시 목록 다크 테마 완비.

---

## 2. 디자인 컬러 토큰 시스템
| 토큰명 | 색상 코드 | 용도 |
|---|---|---|
| **Canvas Background** | `#171717` | 전체 메인 캔버스 배경 (Threads 모노톤) |
| **Surface Background** | `#1f1f1f` | 카드, 사이드바, 패널 서페이스 배경 |
| **Elevated / Border** | `#262626` / `#333333` | 카드 테두리, 구분선, 모달 테두리 |
| **Text Primary** | `#ffffff` | 메인 헤드라인, 액티브 텍스트 |
| **Text Secondary** | `#e5e5e5` / `#d4d4d4` | 본문, 주요 설명 |
| **Text Muted** | `#a3a3a3` / `#737373` | 보조 텍스트, 메타 정보 |
| **Accent Amber (골드)** | `#f59e0b` / `#fbbf24` | 쇼핑제휴 포인트, 수익화, CTA 버튼 |
| **Accent Blue (로열)** | `#3b82f6` / `#60a5fa` | 플랫폼 연동, 제휴 링크, 정보성 배지 |
| **Accent Emerald (성공)** | `#10b981` | 게시 완료, 정상 연동 배지 |

---

## 3. 수정 및 신규 파일 목록
- `src/app/globals.css`: 다크 테마 변수 `--background: #171717`, `--foreground: #f5f5f5` 적용
- `src/app/layout.tsx`: 루트 body에 다크 테마 클래스(`bg-[#171717] text-neutral-100 dark`) 적용
- `src/app/(dashboard)/layout.tsx`: 대시보드 래퍼 다크 캔버스 적용
- `src/components/layout/Sidebar.tsx`: 모바일 헤더, 드로어 메뉴, 다크 테마 데스크톱 사이드바 전면 리뉴얼
- `src/app/(dashboard)/guide/page.tsx`: 4단계 다이어그램, 4대 제휴사 비교표, 공정위 고지, FAQ 구축
- `src/app/(dashboard)/dashboard/page.tsx`: 다크 테마 통계 카드 및 5단계 가이드 카드 정돈
- `src/app/(dashboard)/settings/page.tsx`: 헤더 다크 시인성 개선
- `src/components/ui/Button.tsx`: 다크 모노 테마에 최적화된 버튼 variant 정의
- `src/components/posts/StatusBadge.tsx`: 다크 테마 전용 투명 컬러 배지 적용

---

## 4. 검수 결과 및 증빙
- **로컬 빌드**: `npm run build` 에러 0건 (Next.js 16.2.11 Turbopack)
- **Vercel 프로덕션 배포**: `https://threads-affiliate-poster.buylife.xyz` 반영 완료
- **DB 버전 동기화**: `programs.version = 'v1.61'` 갱신 완료
- **Microsoft Edge 포그라운드 실세션 검수 증빙**:
  - `edge_threads_affiliate_desktop_dashboard_v161.png` (데스크톱 1440x900 대시보드)
  - `edge_threads_affiliate_desktop_guide_v161.png` (데스크톱 1440x900 사용 매뉴얼)
  - `edge_threads_affiliate_mobile_dashboard_v161.png` (모바일 375x812 대시보드)
  - `edge_threads_affiliate_mobile_menu_v161.png` (모바일 375x812 햄버거 메뉴 열림)
  - `edge_threads_affiliate_mobile_guide_v161.png` (모바일 375x812 사용 매뉴얼)
