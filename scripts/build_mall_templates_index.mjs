import fs from 'fs';
import path from 'path';

const baseDir = 'D:/Antigravity/Design';

const allTemplates = [
  {
    id: '113',
    slug: '113_luxury_boutique_black_mall',
    name: '113. 럭셔리 부티크 & 누아르 블랙 에디션',
    nameEn: 'Luxury Boutique & Noir Black Edition',
    industry: '명품 패션 · 시계/보석 · VIP 폐쇄몰',
    primaryColor: '#F59E0B',
    bgColor: '#0B0F17',
    mode: 'Dark Mode (어두운 테마)',
    shape: '3열 세로형 (3:4) · 3D 골드 버튼 · VIP 띠',
    badge: '1안 템플릿',
    desc: '누아르 블랙과 샴페인 골드의 압도적 프라이빗 하이엔드 룩',
    featureImg: '01_main.png'
  },
  {
    id: '114',
    slug: '114_trendy_select_pop_mall',
    name: '114. 트렌디 셀렉트샵 & 네오 파스텔 팝',
    nameEn: 'Trendy Lifestyle Select Shop & Neo Pastel Pop',
    industry: '생활소품 · 패션 · 리셀러 분양몰',
    primaryColor: '#FF5722',
    bgColor: '#FFFDF9',
    mode: 'Light Mode (웜 크림)',
    shape: '4열 박스형 (1:1) · 3D 팝 버튼 · 감성 셀렉션',
    badge: '2안 템플릿',
    desc: '2030 감성과 비비드 팝 포인트의 발랄한 라이프스타일 룩',
    featureImg: '01_main.png'
  },
  {
    id: '115',
    slug: '115_clean_wellness_green_mall',
    name: '115. 클린 웰니스 & 사이언스 테크 그린',
    nameEn: 'Clean Wellness & Science Tech Green',
    industry: '뷰티 · 이너뷰티 · 건강식품 · B2B',
    primaryColor: '#059669',
    bgColor: '#F6FBF8',
    mode: 'Light Mode (클린 화이트)',
    shape: '4열 상자형 (1:1) · 3D 웰니스 버튼 · 신뢰 인증 띠',
    badge: '3안 공식 채택 ★',
    desc: '순수 자연과 사이언스 테크의 신뢰성을 담은 청량한 웰니스 룩',
    featureImg: '01_main.png'
  },
  {
    id: '116',
    slug: '116_editorial_magazine_mall',
    name: '116. 에디토리얼 매거진 스타일',
    nameEn: 'Editorial Magazine Style',
    industry: '패션 · 코스메틱 · 라이프스타일 매거진',
    primaryColor: '#1F2937',
    bgColor: '#F5F5F4',
    mode: 'Light Mode (매거진 페이퍼)',
    shape: '4열 테두리 없는 카드 (4:5) · 플랫 차콜 · 깊은 여백',
    badge: 'D5+ 확장 (프론트)',
    desc: '한 권의 잡지 표지처럼 큰 제목과 넓은 여백의 감성 에디토리얼 룩',
    featureImg: '01_main.png'
  },
  {
    id: '117',
    slug: '117_minimal_showroom_mall',
    name: '117. 미니멀 리빙 쇼룸 스타일',
    nameEn: 'Minimal Living Showroom Style',
    industry: '가구 · 인테리어 · 조명 · 리빙 오브제',
    primaryColor: '#334155',
    bgColor: '#F8FAFC',
    mode: 'Light Mode (쇼룸 슬레이트)',
    shape: '3열 와이드 (4:3) · 플랫 미니멀 · 대표 상품 히어로',
    badge: 'D5+ 확장 (프론트)',
    desc: '공간의 미학을 극대화하는 차분한 쇼룸과 가로형 오브제 뷰',
    featureImg: '01_main.png'
  },
  {
    id: '118',
    slug: '118_street_night_dark_mall',
    name: '118. 스트리트 나이트 다크 스타일',
    nameEn: 'Street Night Dark Style',
    industry: '스트리트웨어 · 스니커즈 · 서브컬처 굿즈',
    primaryColor: '#EA580C',
    bgColor: '#0C0A09',
    mode: 'Dark Mode (어두운 테마)',
    shape: '4열 가로 롤링 (3:4) · 3D 오렌지 버튼 · 네온 하이프',
    badge: 'D5+ 확장 (프론트)',
    desc: '어두운 밤거리와 네온 오렌지, 가로 스크롤 드롭의 힙한 스트리트 룩',
    featureImg: '01_main.png'
  },
  {
    id: '119',
    slug: '119_kids_toy_playworld_mall',
    name: '119. 키즈 & 토이 플레이월드 스타일',
    nameEn: 'Kids & Toy Playworld Style',
    industry: '완구 · 장난감 · 교구 · 키즈 패밀리',
    primaryColor: '#D97706',
    bgColor: '#FFFBEB',
    mode: 'Light Mode (머스터드 팝)',
    shape: '4열 둥근 카드 (1:1) · 3D 젤리 버튼 (radius: xl)',
    badge: 'D5+ 확장 (agy)',
    desc: '아이들의 상상력을 자극하는 부드러운 라운드와 경쾌한 플레이타임 룩',
    featureImg: '01_main.png'
  },
  {
    id: '120',
    slug: '120_digital_tech_device_mall',
    name: '120. 디지털 테크 & 스마트 디바이스 스타일',
    nameEn: 'Digital Tech & Smart Device Style',
    industry: '스마트기기 · IT 기어 · 컴퓨터/음향 · 전자부품',
    primaryColor: '#2563EB',
    bgColor: '#F8FAFC',
    mode: 'Light Mode (메탈릭 하이테크)',
    shape: '5열 고밀도 그리드 (1:1) · 플랫 테크 · 사양 스펙 바',
    badge: 'D5+ 확장 (agy)',
    desc: '고밀도 5열 정보형 레이아웃과 정밀한 메탈릭 테크 룩',
    featureImg: '01_main.png'
  },
  {
    id: '121',
    slug: '121_wholesale_catalog_b2b_mall',
    name: '121. 도매 카탈로그 & 대량납품 B2B 스타일',
    nameEn: 'Wholesale Catalog & Bulk Supply B2B Style',
    industry: '식자재 도매 · MRO 소모품 · 프랜차이즈 · 판촉물',
    primaryColor: '#1E40AF',
    bgColor: '#EFF6FF',
    mode: 'Light Mode (도매 카탈로그)',
    shape: '5열 데이터형 테이블 (1:1) · 3D 네이비 · 대량발주 바',
    badge: 'D5+ 확장 (agy)',
    desc: '압축된 대량납품 카탈로그와 사업자 전용 단가 표기 B2B 전용 룩',
    featureImg: '01_main.png'
  }
];

const indexHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1440, initial-scale=1" />
  <title>AIMaster AI 쇼핑몰 빌더 손님 화면 템플릿 카탈로그 (9종 종합 비교)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0F172A;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      min-width: 1440px;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 80px;
    }
    .header-banner {
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      border-bottom: 1px solid #334155;
      padding: 40px 48px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 28px;
      margin-top: 36px;
    }
    .card {
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: #60A5FA;
      box-shadow: 0 16px 36px rgba(37,99,235,0.25);
    }
    .card-preview {
      height: 240px;
      background: #0B0F17;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-preview iframe {
      width: 1440px;
      height: 900px;
      transform: scale(0.24);
      transform-origin: top left;
      border: none;
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 0;
    }
    .card-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .badge-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    }
    .badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .btn-3d {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 800;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.1s ease;
      white-space: nowrap !important;
    }
    .btn-primary {
      background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
      color: #FFFFFF;
      border: 1px solid #60A5FA;
      box-shadow: 0 4px 0 #1D4ED8, 0 6px 12px rgba(37,99,235,0.3);
    }
    .btn-primary:active {
      transform: translateY(3px);
      box-shadow: 0 1px 0 #1D4ED8;
    }
    .btn-secondary {
      background: #334155;
      color: #F8FAFC;
      border: 1px solid #475569;
      box-shadow: 0 3px 0 #1E293B;
    }
    .btn-secondary:active {
      transform: translateY(2px);
      box-shadow: 0 1px 0 #1E293B;
    }
  </style>
</head>
<body>

  <header class="header-banner">
    <div class="container title-row">
      <div>
        <div style="display: inline-block; background: rgba(59, 130, 246, 0.2); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.4); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; margin-bottom: 12px;">
          AIMASTER OFFICIAL MALL TEMPLATES
        </div>
        <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.02em;">
          AI 쇼핑몰 빌더 손님 화면 템플릿 카탈로그 (9종 종합 비교)
        </h1>
        <p style="color: #94A3B8; font-size: 14.5px; margin-top: 6px;">
          주인님께서 손님 화면 디자인을 한눈에 보시고 바로 채택·지정하실 수 있는 마스터 갤러리 덱입니다.
        </p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 13px; color: #94A3B8;">총 등록 템플릿</span>
        <div style="font-size: 28px; font-weight: 900; color: #60A5FA;">9 DESIGN SUITES</div>
      </div>
    </div>
  </header>

  <main class="container" style="margin-top: 32px;">
    <!-- Filter bar -->
    <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; gap: 16px; font-size: 13.5px; font-weight: 800;">
        <span style="color: #60A5FA;">전체 9종 보기</span>
        <span style="color: #94A3B8;">·</span>
        <span style="color: #CBD5E1;">라이트 모드 (7)</span>
        <span style="color: #94A3B8;">·</span>
        <span style="color: #CBD5E1;">다크 모드 (2)</span>
        <span style="color: #94A3B8;">·</span>
        <span style="color: #CBD5E1;">B2B / 도매 특화 (3)</span>
      </div>
      <div style="font-size: 12px; color: #94A3B8;">
        ※ 각 카드의 [메인 화면 크게보기]를 누르면 1440px 원본 뷰파인더로 이동합니다.
      </div>
    </div>

    <!-- 3x3 Grid -->
    <div class="grid">
      ${allTemplates.map(tpl => `
        <div class="card">
          <div class="card-preview">
            <iframe src="${tpl.slug}/view_c1_s1.html" loading="lazy"></iframe>
            <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; color: #FFF;">
              1440px LIVE PREVIEW
            </div>
          </div>
          <div class="card-body">
            <div class="badge-bar">
              <span class="badge" style="background: rgba(59,130,246,0.15); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3);">
                ${tpl.badge}
              </span>
              <span class="badge" style="background: #334155; color: #E2E8F0;">
                ${tpl.mode}
              </span>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: ${tpl.primaryColor}; border: 1px solid #FFF; margin-left: auto;" title="Primary: ${tpl.primaryColor}"></div>
            </div>

            <h3 style="font-size: 18px; font-weight: 900; color: #F8FAFC; margin-bottom: 6px;">
              ${tpl.name}
            </h3>
            <p style="font-size: 13px; color: #94A3B8; line-height: 1.5; margin-bottom: 14px; flex: 1;">
              ${tpl.desc}
            </p>

            <div style="background: #0F172A; border-radius: 8px; padding: 10px 12px; font-size: 12px; margin-bottom: 16px; border: 1px solid #1E293B;">
              <div style="color: #64748B; margin-bottom: 4px;">추천 업종 & 레이아웃 규격:</div>
              <div style="color: #E2E8F0; font-weight: 700;">${tpl.industry}</div>
              <div style="color: #94A3B8; font-size: 11.5px; margin-top: 2px;">${tpl.shape}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <a href="${tpl.slug}/view_c1_s1.html" target="_blank" class="btn-3d btn-primary">
                메인 화면 크게보기 &rarr;
              </a>
              <a href="${tpl.slug}/view_c1_s4.html" target="_blank" class="btn-3d btn-secondary">
                모바일 390px 뷰 &rarr;
              </a>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              <a href="${tpl.slug}/view_c1_s2.html" target="_blank" style="text-align: center; font-size: 11.5px; color: #94A3B8; text-decoration: none; padding: 4px;">
                상품상세 (view_c1_s2)
              </a>
              <a href="${tpl.slug}/view_c1_s3.html" target="_blank" style="text-align: center; font-size: 11.5px; color: #94A3B8; text-decoration: none; padding: 4px;">
                카테고리목록 (view_c1_s3)
              </a>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </main>

  <footer style="margin-top: 60px; text-align: center; color: #64748B; font-size: 12px;">
    AIMaster Design System · B2B Mall Builder Template Suites 113 ~ 121 · Antigravity (agy, 윈도우)
  </footer>

</body>
</html>`;

fs.writeFileSync(path.join(baseDir, 'mall_templates_index.html'), indexHtml, 'utf-8');
console.log('✅ Generated D:/Antigravity/Design/mall_templates_index.html (9 suites master showcase)!');
