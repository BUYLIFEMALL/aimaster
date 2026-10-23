# 음악(SUNO)자동화 (music/) v1.06 디자인 리뉴얼 개발 플랜

## 1. 문제 정의 및 목표
- **현재 상태 (v1.05)**: 밝은 회색(`bg-gray-50`, `from-blue-50 to-purple-50`) 파스텔 테마로 되어 있어, Suno 본사이트(`suno.com/discover`, `suno.com/create`) 특유의 다크 & 오렌지 네온 스튜디오 감성이 부족함.
- **목표 (v1.06)**: 주인님께서 제공해주신 Suno 본사이트 스크린샷 5장 스타일을 완벽 구현하는 **`사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`** 템플릿 전면 적용.

---

## 2. 디자인 토큰 및 스타일 사양
- **스타일 템플릿 명칭**: `사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`
- **컬러 팔레트**:
  - Main Background: Deep Pure Black (`#09090b`)
  - Sub Surface / Sidebar: Studio Dark Charcoal (`#121217`)
  - Card & Container Surface: Studio Glass Black (`#18181f` with border `#272732`)
  - Brand Accent: Suno Vibrant Orange (`#f97316`), Electric Orange (`#fb923c`), Coral Gradient
  - Text: High-contrast White (`#ffffff`), Secondary Gray (`#d4d4d8`), Muted Gray (`#a1a1aa` / `#71717a`)
- **UI 요소**:
  - Pill(알약형) 탭, 라운드 뱃지, 부드러운 블러 글래스모피즘 (`backdrop-blur-md`)
  - 오디오 플레이어 및 트랙 카드 다크 테마 커스텀
  - Suno 본사이트 감성의 사이드바 (아이콘 + 알약형 스텝 표시기 + 오렌지 액센트)

---

## 3. 구현 범위 및 세부 작업 순서
1. **버전 및 베이스 테마 개편**:
   - `music/lib/version.ts` `v1.05` ➔ `v1.06` 변경.
   - `music/app/globals.css` 다크 모드 CSS 변수 및 유틸리티 클래스 정의 (`--background: #09090b`, `--foreground: #f4f4f5` 등).
   - `music/tailwind.config.ts` 다크 팔레트 확장.
2. **공통 셸 & 사이드바 (`components/layout/Sidebar.tsx`, `app/(dashboard)/layout.tsx`)**:
   - 사이드바 배경을 딥 차콜 다크(`bg-[#121217]`), 보더(`border-[#272732]`)로 전환.
   - 상단 로고에 Suno 감성의 비비드 오렌지 워드마크 및 배지 추가.
   - 스텝 네비게이션을 오렌지 네온 알약형 및 활성 인디케이터로 업그레이드.
3. **메인 대시보드 및 리믹스 허브 (`app/(dashboard)/remix/page.tsx`, `app/(dashboard)/plannings/page.tsx`)**:
   - 다크 글래스모피즘 카드 컨테이너 적용.
   - 빈 상태(Empty State) 일러스트/아이콘 및 유도 CTA 버튼을 Suno Create 버튼 스타일로 개편.
   - 리믹스 카드 썸네일, 배지, 재생 컨트롤의 시인성 강화.
4. **트랙 생성/관리 상세 컴포넌트 (`components/plannings/TrackCard.tsx`, `components/remix/RemixCard.tsx`)**:
   - 다크 테마 트랙 카드, MR 분리/WAV 변환 액션 버튼 알약형 UI 적용.
   - 로딩/생성 중 스켈레톤 및 펄스 이펙트 오렌지 네온 처리.
5. **사용 가이드 및 비주얼 매뉴얼 시각화 (`components/guide/SunoUsageGuide.tsx` 신설 및 대시보드 연동)**:
   - Suno API 연동, 기획 ➔ 생성 ➔ 리믹스 3단계 프로세스 다이어그램 및 프롬프트 팁 시각화.

---

## 4. 검수 방법 및 환경
- **검수 브라우저**: **Microsoft Edge 전용 (`msedge`)** (규칙 준수, Chrome 절대 사용 금지).
- **테스트 계정**: `buylifemall@naver.com` (일반 회원 세션 검수).
- **반응형 대조 검수**:
  - 데스크톱: 1440 × 900
  - 모바일: 375 × 812 (iPhone 13/14 뷰포트)
- **점검 항목**:
  - Suno 다크 감성 및 폰트/보더 대비율
  - 곡 재생 컨트롤러, 리믹스 카드, 사이드바 동작 상태
  - 콘솔 에러 및 네트워크 렌더링 상태

---

## 5. 비용 및 모델
- 디자인 리뉴얼 작업으로 외부 유료 API 호출 없음 (비용 $0).

---

## 6. 인수인계 및 배포 산출물
- `music/docs/DESIGN_HANDOFF.md` (스타일 템플릿, 컬러 토큰, 컴포넌트 구조, Edge 검수 증거)
- `music/docs/IMPROVEMENTS.md` (개선사항 및 추후 보완점)
- `music/AGENTS.md` 릴리스 기록 갱신 (`v1.06`)
- 루트 `DESIGN.md` 레지스트리 58번(`music-automation`) 업데이트
- Supabase 공유 DB `programs.version = 'v1.06'` 업데이트
- Vercel 프로덕션 배포 (`https://music-rho-virid-22.vercel.app`)
