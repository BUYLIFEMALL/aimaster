# 🧠 coupang-ops 디자인 인수인계서 (DESIGN_HANDOFF.md)

> **공식 채택 템플릿**: **41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩 스타일 (Coupang Item Winner Algorithm Data Intelligence Lab Style)**  
> **적용 버전**: `v1.10`  
> **승인 일시**: 2026-10-31  
> **작업자**: Antigravity AI Assistant

---

## 🌐 1. 공식 링크 및 자산 위치 (5대 필수 세트)
1. **공식 운영 도메인**: [`https://coupang-ops.buylife.xyz`](https://coupang-ops.buylife.xyz)
2. **Vercel 프로덕션 보조 링크**: [`https://coupang-ops.vercel.app`](https://coupang-ops.vercel.app)
3. **관리자 dev-docs 결과함 링크**: [`https://www.buylife.xyz/admin/dev-docs/requests`](https://www.buylife.xyz/admin/dev-docs/requests)
4. **브라우저 쇼케이스 HTML (포트 3800)**: [`http://localhost:3800/showcase.html`](http://localhost:3800/showcase.html) *(또는 [`file:///D:/Antigravity/Design/showcase.html`](file:///D:/Antigravity/Design/showcase.html))*
5. **로컬 영구 자산 폴더 경로**: [`D:\Antigravity\Design\41_쿠팡_아이템위너_알고리즘_데이터_인텔리전스_랩_스타일`](file:///D:/Antigravity/Design/41_쿠팡_아이템위너_알고리즘_데이터_인텔리전스_랩_스타일)
   - *비선택 보존 자산 1*: `D:\Antigravity\Design\39_쿠팡_로켓_셀러_윙_레드_블루_스튜디오_스타일`
   - *비선택 보존 자산 2*: `D:\Antigravity\Design\40_쿠팡_로켓_배송_옐로우_네이비_물류_대시보드_스타일`

---

## 🎨 2. 디자인 컨셉 및 스타일 가이드

### 2.1 비주얼 아이덴티티
- **비주얼 메타포**: 쿠팡 WING 공식 셀러 센터를 넘어서는 **아이템위너 10원 최저가 쟁탈전 분석 & 알고리즘 자동화 연구소(Intelligence Lab)** 감성.
- **슬레이트 클린 화이트 & 로열 인디고**: 깨끗한 `#F8FAFC` 슬레이트 화이트 배경 위에 선명한 로열 인디고 블루(`#1D4ED8` ~ `#2563EB`)를 프라이머리로 사용하여 최첨단 알고리즘의 신뢰감과 기술적 정밀함을 극대화.
- **위너 에메랄드 엑센트**: 아이템위너 매칭 상태, 마진 하한선 안전 상태에 활력 넘치는 에메랄드 그린(`#059669`)을 배색하여 한눈에 성과를 확인.

### 2.2 3D 엠보싱 버튼 규격 (DESIGN.md 원칙 21)
```css
/* 3D 엠보싱 인디고 버튼 */
.btn-3d-indigo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 800;
  padding: 9px 18px;
  border-radius: 10px;
  border: 1px solid #1e40af;
  box-shadow: 0 4px 0 #1e3a8a, 0 6px 14px rgba(29, 78, 216, 0.28);
  transition: all 0.12s ease;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}
.btn-3d-indigo:hover:not(:disabled) {
  transform: translateY(-1.5px);
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 5.5px 0 #1e3a8a, 0 8px 18px rgba(29, 78, 216, 0.35);
}
.btn-3d-indigo:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #1e3a8a, 0 2px 4px rgba(29, 78, 216, 0.2);
}
```

---

## 🛠️ 3. 주요 구현 컴포넌트 및 페이지
1. **`src/app/globals.css`**:
   - 인디고 및 에메랄드 테마 변수 선언
   - `.btn-3d-indigo`, `.btn-3d-emerald`, `.btn-3d-red`, `.lab-card` 정밀 구현
2. **`src/components/layout/Sidebar.tsx` & `TopBar`**:
   - `AI 쿠팡 아이템위너 랩 (v1.1)` 브랜딩
   - WING 10원 최저가 실시간 매칭 엔진 가동중 HUD
   - 위너 방어 모드(94.2%) 실시간 펄스 인디케이터
3. **`src/components/TodayBoard.tsx` & `src/app/(dashboard)/home/page.tsx`**:
   - 4대 핵심 위너 분석 KPI 덱 (위너 사수율, 실시간 10원 매칭, 위너 탈환 대기, WING API 쿼터)
   - 3D 엠보싱 인디고 버튼을 통한 주문/위너 스캔 및 인라인 작업 패널
4. **`src/components/RejectedBoard.tsx`**:
   - 반려 상품 AI 자동 수정 버튼 (`btn-3d-emerald`) 및 WING 바로가기
5. **`src/app/(dashboard)/guide/page.tsx` & `connect/page.tsx`**:
   - 4단계 WING API & Fixie 고정 IP 가이드북 및 3D 엠보싱 연결 시험 버튼

---

## 🧪 4. 검증 내역
- **Next.js Turbopack Production Build**: 성공 (`Compiled successfully in 10.2s`)
- **Unit Test**: 112개 전체 테스트 PASS (`tests/*.test.mjs`)
- **Vercel Production Deploy**: `https://coupang-ops.buylife.xyz` (Ready)
- **네이버 웨일 실세션 검수**:
  - 데스크톱 홈 대시보드 (`cpg_live_desktop_home.png`)
  - 데스크톱 연동 가이드 (`cpg_live_desktop_guide.png`)
  - 모바일 반응형 400px (`cpg_live_mobile.png`)
