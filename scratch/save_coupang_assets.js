const fs = require('fs');
const path = require('path');

const t1 = 'D:/Antigravity/Design/39_쿠팡_로켓_셀러_윙_레드_블루_스튜디오_스타일';
const t2 = 'D:/Antigravity/Design/40_쿠팡_로켓_배송_옐로우_네이비_물류_대시보드_스타일';
const t3 = 'D:/Antigravity/Design/41_쿠팡_아이템위너_알고리즘_데이터_인텔리전스_랩_스타일';

[t1, t2, t3].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const src = 'scratch/coupang_screenshots';
const artDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';

// Copy C1
fs.copyFileSync(path.join(src, 'cpg_main_c1.png'), path.join(t1, '01_main.png'));
fs.copyFileSync(path.join(src, 'cpg_detail_c1.png'), path.join(t1, '02_detail.png'));
fs.copyFileSync(path.join(src, 'cpg_guide_c1.png'), path.join(t1, '03_guide.png'));
fs.copyFileSync(path.join(src, 'cpg_settings_c1.png'), path.join(t1, '04_settings.png'));
fs.copyFileSync('D:/Antigravity/Design/showcase.html', path.join(t1, 'showcase_12views.html'));

// Copy C2
fs.copyFileSync(path.join(src, 'cpg_main_c2.png'), path.join(t2, '01_main.png'));
fs.copyFileSync(path.join(src, 'cpg_detail_c2.png'), path.join(t2, '02_detail.png'));
fs.copyFileSync(path.join(src, 'cpg_guide_c2.png'), path.join(t2, '03_guide.png'));
fs.copyFileSync(path.join(src, 'cpg_settings_c2.png'), path.join(t2, '04_settings.png'));
fs.copyFileSync('D:/Antigravity/Design/showcase.html', path.join(t2, 'showcase_12views.html'));

// Copy C3
fs.copyFileSync(path.join(src, 'cpg_main_c3.png'), path.join(t3, '01_main.png'));
fs.copyFileSync(path.join(src, 'cpg_detail_c3.png'), path.join(t3, '02_detail.png'));
fs.copyFileSync(path.join(src, 'cpg_guide_c3.png'), path.join(t3, '03_guide.png'));
fs.copyFileSync(path.join(src, 'cpg_settings_c3.png'), path.join(t3, '04_settings.png'));
fs.copyFileSync('D:/Antigravity/Design/showcase.html', path.join(t3, 'showcase_12views.html'));

// Copy to artifact dir
fs.copyFileSync('scratch/cpg_showcase_fullview.png', path.join(artDir, 'cpg_showcase_fullview.png'));
fs.copyFileSync('scratch/cpg_verified_lightbox.png', path.join(artDir, 'cpg_verified_lightbox.png'));
fs.readdirSync(src).filter(f => f.endsWith('.png')).forEach(f => {
  fs.copyFileSync(path.join(src, f), path.join(artDir, f));
});

// Write README.md files
const r1 = `# 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일 (Coupang Rocket Seller WING Red & Blue Studio Style)

## 📌 개요
- **템플릿 번호:** 39
- **대상 프로그램:** \`coupang-ops\` (쿠팡 WING 셀러 자동화)
- **컨셉:** 쿠팡 공식 WING 판매자 센터의 친숙함과 신뢰도를 극대화한 퓨어 화이트 & 라이트 쿨그레이(#F8FAFC) 바탕에 아이코닉 쿠팡 로켓 레드(#E31A22)와 로켓 블루(#0073E9)를 결합한 최고급 이커머스 셀러 스튜디오.
- **주요 배색:**
  - 배경: Pure White (#FFFFFF) & Cool Gray (#F8FAFC, #F1F5F9)
  - 프라이머리 포인트: Coupang Rocket Red (#E31A22, #FF2E38) & Rocket Blue (#0073E9)
  - 3D 엠보싱 버튼: \`.btn-3d-coupang-red\` (Linear Gradient #FF2E38 -> #E31A22, 하단 5px 입체 엠보싱 그림자 #880B10, 4px 눌림 모션)
  - 보더 & 카드: #E2E8F0, #64748B, #0F172A
- **비주얼 메타포:**
  - WING 셀러 운영 관제 홈, 4대 핵심 매출/위너 KPI, 실시간 판매 위기 알림 덱.
  - 카테고리 AI 매칭 및 10원 단위 실시간 아이템위너 최저가 방어 덱.
- **적용 추천 분야:** 쿠팡 WING 셀러 자동화, 스마트스토어/11번가 이커머스 통합 관리, 오픈마켓 가격 역마진 방어 봇.
`;

const r2 = `# 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일 (Coupang Rocket Logistics Navy & Yellow Dashboard Style)

## 📌 개요
- **템플릿 번호:** 40
- **대상 프로그램:** \`coupang-ops\` (쿠팡 WING 셀러 자동화)
- **컨셉:** 쿠팡 로켓배송 특유의 스피드와 활력을 상징하는 볼드 로켓 옐로우(#FFB800)와 딥 로켓 네이비(#0F172A)를 결합한 풀필먼트·물류 물동량 관제 콘솔 감성.
- **주요 배색:**
  - 배경: Soft Warm Pearl (#FDFBF7, #FFFDF8)
  - 프라이머리 포인트: Rocket Bold Yellow (#FFB800, #F59E0B) & Deep Navy (#0F172A)
  - 3D 엠보싱 버튼: \`.btn-3d-rocket-yellow\` (Linear Gradient #FFC72C -> #F59E0B, 하단 5px 입체 엠보싱 그림자 #92400E)
- **비주얼 메타포:**
  - 로켓그로스 입고 예약, 밀크런 물류 허브 현황, 실시간 배송/반품 트래킹 타임라인.
- **적용 추천 분야:** 풀필먼트/로켓그로스 물류 관리, 3PL/도매 창고 관리, 배송 추적 대시보드.
`;

const r3 = `# 41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩 스타일 (Coupang Item Winner Data Intelligence Lab Style)

## 📌 개요
- **템플릿 번호:** 41
- **대상 프로그램:** \`coupang-ops\` (쿠팡 WING 셀러 자동화)
- **컨셉:** 스마트 클린 슬레이트 화이트 바탕에 인디고 블루(#1D4ED8)와 위너 프로텍트 에메랄드(#059669)를 결합하여 24시간 실시간 최저가 매칭 및 알고리즘 분석에 특화된 데이터 랩 스타일.
- **주요 배색:**
  - 배경: Studio Clean White (#FFFFFF) & Slate Gray (#F8FAFC, #E2E8F0)
  - 프라이머리 포인트: Indigo Blue (#1D4ED8, #3B82F6) & Emerald Green (#059669)
  - 3D 엠보싱 버튼: \`.btn-3d-indigo\` (Linear Gradient #3B82F6 -> #1D4ED8, 하단 5px 입체 엠보싱 그림자 #172554)
- **비주얼 메타포:**
  - 10원 단위 최저가 실시간 변동 차트, 마진 하한선 방어 알고리즘 수식 제어 콘솔.
- **적용 추천 분야:** 실시간 가격 변동 모니터링, 경쟁사 크롤링 분석, 대량 상품 마진 관리 랩.
`;

fs.writeFileSync(path.join(t1, 'README.md'), r1, 'utf8');
fs.writeFileSync(path.join(t2, 'README.md'), r2, 'utf8');
fs.writeFileSync(path.join(t3, 'README.md'), r3, 'utf8');

console.log('✅ Successfully copied all 12 views & created README.md in Design folders!');
