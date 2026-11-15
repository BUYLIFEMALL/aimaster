import fs from 'fs';
import path from 'path';

const baseDir = 'D:/Antigravity/Design';

const templates = [
  {
    id: '116',
    slug: '116_editorial_magazine_mall',
    name: '116. 에디토리얼 매거진 스타일',
    nameEn: 'Editorial Magazine Style',
    concept: '잡지 표지처럼 가운데 큰 제목과 넓은 여백, 각진 모서리·테두리 없는 4:5 세로 사진. 패션·뷰티·리빙 셀렉트숍에 최적',
    target: '패션의류, 뷰티/코스메틱, 라이프스타일 매거진숍, 디자이너 브랜드몰',
    isDark: false,
    colors: {
      primary: '#1F2937',
      primaryDark: '#111827',
      primaryLight: 'rgba(31, 41, 55, 0.08)',
      bg: '#F5F5F4',
      surface: '#FFFFFF',
      surfaceRaised: '#E7E5E4',
      border: '#D6D3D1',
      text: '#1C1917',
      textMuted: '#78716C'
    },
    band: { text: '이번 시즌의 이야기를 담았습니다', bg: '#1F2937' },
    hero: {
      eyebrow: 'THE EDIT',
      title: 'BUY LIFE EDITORIAL',
      accent: '이번 시즌 셀렉션',
      text: '오래 곁에 두고 싶은 것들만 골라 한 권의 잡지처럼 엮었습니다.',
      feature: false,
      btn1: '셀렉션 보기',
      btn2: '주제별로 보기'
    },
    shape: { radius: '0px', buttonType: 'flat', imageRatio: '4 / 5', cardStyle: 'plain', cols: 4 },
    btnClass: 'btn-flat-charcoal',
    btnStyle: `background: #1F2937 !important; color: #FFFFFF !important; font-weight: 700 !important; border: 1px solid #111827 !important; border-radius: 0px !important; box-shadow: none !important;`,
    badgeStyle: `background: rgba(31, 41, 55, 0.08); color: #1F2937; border: 1px solid rgba(31, 41, 55, 0.2); border-radius: 0px;`
  },
  {
    id: '117',
    slug: '117_minimal_showroom_mall',
    name: '117. 미니멀 리빙 쇼룸 스타일',
    nameEn: 'Minimal Living Showroom Style',
    concept: '차콜 모노톤에 흰 띠와 회색 바탕이 번갈아 나오는 쇼룸 구성, 4:3 가로 사진 3열. 가구·리빙·디지털 쇼룸에 최적',
    target: '디자이너 가구, 조명, 인테리어 소품, 오디오/디지털 오브제 쇼룸',
    isDark: false,
    colors: {
      primary: '#334155',
      primaryDark: '#1E293B',
      primaryLight: 'rgba(51, 65, 85, 0.08)',
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceRaised: '#F1F5F9',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B'
    },
    band: { text: '공간에 어울리는 물건을 천천히 둘러보세요', bg: '#334155' },
    hero: {
      eyebrow: 'SHOWROOM',
      title: '덜어 낼수록',
      accent: '선명해지는 공간',
      text: '형태와 쓰임이 분명한 물건을 골랐습니다.\n쇼룸을 걷듯 천천히 둘러보세요.',
      feature: true,
      btn1: '쇼룸 둘러보기',
      btn2: '공간별로 보기'
    },
    shape: { radius: '4px', buttonType: 'flat', imageRatio: '4 / 3', cardStyle: 'standard', cols: 3 },
    btnClass: 'btn-flat-slate',
    btnStyle: `background: #334155 !important; color: #FFFFFF !important; font-weight: 700 !important; border: 1px solid #1E293B !important; border-radius: 4px !important; box-shadow: none !important;`,
    badgeStyle: `background: rgba(51, 65, 85, 0.08); color: #334155; border: 1px solid rgba(51, 65, 85, 0.2); border-radius: 4px;`
  },
  {
    id: '118',
    slug: '118_street_night_dark_mall',
    name: '118. 스트리트 나이트 다크 스타일',
    nameEn: 'Street Night Dark Style',
    concept: '어두운 밤 거리와 네온 오렌지 포인트, 가로로 넘기는 신상품 줄과 3:4 세로 사진. 스트리트 패션·스니커즈·굿즈몰에 최적',
    target: '스트리트 패션, 한정판 스니커즈, 서브컬처 굿즈, 다크모드 하이프몰',
    isDark: true,
    colors: {
      primary: '#EA580C',
      primaryDark: '#C2410C',
      primaryLight: 'rgba(234, 88, 12, 0.15)',
      bg: '#0C0A09',
      surface: '#171717',
      surfaceRaised: '#262626',
      border: '#404040',
      text: '#F5F5F5',
      textMuted: '#A3A3A3'
    },
    band: { text: '새로운 드롭을 가장 먼저 만나 보세요', bg: '#C2410C' },
    hero: {
      eyebrow: 'NEW DROP',
      title: '밤이 길어질수록',
      accent: '더 선명하게',
      text: '이번 주 새로 들어온 아이템을 한눈에 확인하세요.',
      feature: true,
      btn1: '신상품 보러 가기 →',
      btn2: '스타일별로 보기'
    },
    shape: { radius: '12px', buttonType: '3d', imageRatio: '3 / 4', cardStyle: 'standard', cols: 4 },
    btnClass: 'btn-3d-orange',
    btnStyle: `background: linear-gradient(180deg, #F97316 0%, #EA580C 100%) !important; color: #FFFFFF !important; font-weight: 800 !important; border: 1px solid #FB923C !important; box-shadow: 0 4px 0 #9A3412, 0 6px 16px rgba(234, 88, 12, 0.3) !important; border-radius: 12px !important;`,
    badgeStyle: `background: rgba(234, 88, 12, 0.15); color: #FB923C; border: 1px solid rgba(234, 88, 12, 0.3); border-radius: 6px;`
  },
  {
    id: '119',
    slug: '119_kids_toy_playworld_mall',
    name: '119. 키즈 & 토이 플레이월드 스타일',
    nameEn: 'Kids & Toy Playworld Style',
    concept: '밝고 경쾌한 옐로우 팝 컬러와 부드러운 라운드. 장난감·유아동용품·교구·키즈 라이프스타일 몰에 최적',
    target: '완구/장난감, 창의교구, 유아동 패션/잡화, 키즈 패밀리 셀렉트몰',
    isDark: false,
    colors: {
      primary: '#D97706',
      primaryDark: '#B45309',
      primaryLight: 'rgba(217, 119, 6, 0.12)',
      bg: '#FFFBEB',
      surface: '#FFFFFF',
      surfaceRaised: '#FEF3C7',
      border: '#FDE68A',
      text: '#1F2937',
      textMuted: '#78716C'
    },
    band: { text: '아이들의 꿈과 상상력이 자라나는 공간', bg: '#D97706' },
    hero: {
      eyebrow: 'KIDS PLAY WORLD',
      title: '매일매일 즐거운 놀이',
      accent: '우리아이 행복한 플레이타임',
      text: '상상력과 창의력을 키워주는 특별한 선물을 BUY LIFE에서 골라보세요.',
      feature: true,
      btn1: '인기 장난감 보기 →',
      btn2: '연령별 테마관'
    },
    shape: { radius: '20px', buttonType: '3d', imageRatio: '1 / 1', cardStyle: 'rounded', cols: 4 },
    btnClass: 'btn-3d-yellow',
    btnStyle: `background: linear-gradient(180deg, #F59E0B 0%, #D97706 100%) !important; color: #FFFFFF !important; font-weight: 800 !important; border: 1px solid #FCD34D !important; box-shadow: 0 4px 0 #92400E, 0 6px 16px rgba(217, 119, 6, 0.25) !important; border-radius: 20px !important;`,
    badgeStyle: `background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; border-radius: 20px;`
  },
  {
    id: '120',
    slug: '120_digital_tech_device_mall',
    name: '120. 디지털 테크 & 스마트 디바이스 스타일',
    nameEn: 'Digital Tech & Smart Device Style',
    concept: '고밀도 5열 그리드와 메탈릭 하이테크 레이아웃. 스마트기기·음향·컴퓨터 부품·테크 기어 전문몰에 최적',
    target: '스마트 디바이스, 블루투스 음향, IT 기어, PC 주변기기 전문몰',
    isDark: false,
    colors: {
      primary: '#2563EB',
      primaryDark: '#1D4ED8',
      primaryLight: 'rgba(37, 99, 235, 0.1)',
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceRaised: '#F1F5F9',
      border: '#CBD5E1',
      text: '#0F172A',
      textMuted: '#64748B'
    },
    band: { text: '스마트한 일상을 위한 최신 테크 솔루션', bg: '#1E293B' },
    hero: {
      eyebrow: 'SMART TECH GEAR',
      title: '일상을 바꾸는 스마트한 연결',
      accent: '고성능 디지털 테크 셀렉션',
      text: '정밀한 규격과 뛰어난 기술력의 기어를 BUY LIFE에서 직접 비교해 보세요.',
      feature: true,
      btn1: '스마트 기어 둘러보기 →',
      btn2: '카테고리별 탐색'
    },
    shape: { radius: '4px', buttonType: 'flat', imageRatio: '1 / 1', cardStyle: 'compact', cols: 5 },
    btnClass: 'btn-flat-blue',
    btnStyle: `background: #2563EB !important; color: #FFFFFF !important; font-weight: 700 !important; border: 1px solid #1D4ED8 !important; border-radius: 4px !important; box-shadow: none !important;`,
    badgeStyle: `background: rgba(37, 99, 235, 0.1); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.25); border-radius: 4px;`
  },
  {
    id: '121',
    slug: '121_wholesale_catalog_b2b_mall',
    name: '121. 도매 카탈로그 & 대량납품 B2B 스타일',
    nameEn: 'Wholesale Catalog & Bulk Supply B2B Style',
    concept: '압축된 5열 데이터 카탈로그형 그리드와 단정한 폼. 식자재·판촉물·소모품 등 대량발주와 납품 위주 B2B 도매몰에 최적',
    target: '식자재 공급사, 프랜차이즈 본사, 판촉물/MRO 소모품 도매 공급몰',
    isDark: false,
    colors: {
      primary: '#1E40AF',
      primaryDark: '#1E3A8A',
      primaryLight: 'rgba(30, 64, 175, 0.1)',
      bg: '#EFF6FF',
      surface: '#FFFFFF',
      surfaceRaised: '#F8FAFC',
      border: '#BFDBFE',
      text: '#0F172A',
      textMuted: '#475569'
    },
    band: { text: '기업 및 사업자 회원을 위한 도매 카탈로그 센터', bg: '#1E40AF' },
    hero: {
      eyebrow: 'B2B WHOLESALE CENTER',
      title: '기업 대량 납품 & 도매 발주',
      accent: '사업자 전용 단가 공급',
      text: '안정적인 공급망과 합리적인 도매 공급가로 BUY LIFE에서 제안합니다.',
      feature: true,
      btn1: '도매 카탈로그 받기 →',
      btn2: '견적 문의 신청'
    },
    shape: { radius: '0px', buttonType: '3d', imageRatio: '1 / 1', cardStyle: 'plain', cols: 5 },
    btnClass: 'btn-3d-navy',
    btnStyle: `background: linear-gradient(180deg, #2563EB 0%, #1E40AF 100%) !important; color: #FFFFFF !important; font-weight: 800 !important; border: 1px solid #3B82F6 !important; box-shadow: 0 4px 0 #1E3A8A, 0 6px 16px rgba(30, 64, 175, 0.25) !important; border-radius: 0px !important;`,
    badgeStyle: `background: rgba(30, 64, 175, 0.1); color: #1E40AF; border: 1px solid rgba(30, 64, 175, 0.25); border-radius: 0px;`
  }
];

function generateProducts(tpl, count) {
  const p = [];
  const titles = {
    '116': ['시즈널 울 블렌드 코트', '실크 릴랙스드 셔츠', '미니멀 레더 토트백', '에센셜 캐시미어 니트', '스트레이트 핏 데님', '클래식 로퍼 슬립온', '소프트 코튼 티셔츠', '울 머플러 스카프'],
    '117': ['오크우드 라운지 체어', '미니멀 모듈러 소파', '세라믹 오브제 화병', '알루미늄 펜던트 조명', '리넨 암체어 쿠션', '호두나무 사이드 테이블', '글래스 플로어 램프', '스튜디오 러그 카페트'],
    '118': ['나이트 러너 그래픽 후디', '카고 와이드 팬츠', '스트리트 하이탑 스니커즈', '네온 로고 볼캡', '테크니컬 슬링백', '오버사이즈 봄버 재킷', '리플렉티브 조거 팬츠', '체인 월렛 스트랩'],
    '119': ['원목 창의력 빌딩 블록', '말랑말랑 동물 플레이세트', '자석 알파벳 놀이판', '무지개 실로폰 악기', '몬테소리 감각 교구', '플레이하우스 인디언 텐트', '친환경 클레이 세트', '키즈 미니 밸런스 바이크'],
    '120': ['울트라 슬림 썬더볼트 독', '액티브 노이즈캔슬링 헤드폰', '마그네틱 고속 무선충전기', '기계식 가스켓 커스텀 키보드', '인체공학 버티컬 무선마우스', '스마트 모니터 라이트바', '알루미늄 듀얼 스탠드', '초소형 GaN 100W 충전기'],
    '121': ['업소용 프리미엄 식자재 벌크팩', '친환경 크라프트 배달 용기 500입', '맞춤 인쇄 판촉 리유저블컵 1000입', '호텔/사무실 위생 타올 100입', 'B2B 벌크 테이프 50롤 묶음', '다목적 프리미엄 복사용지 10박스', '사업장 다목적 세정제 20L', '식품용 니트릴 장갑 대용량 박스']
  };

  const prices = {
    '116': ['189,000', '124,000', '245,000', '158,000', '98,000', '210,000', '45,000', '89,000'],
    '117': ['480,000', '1,250,000', '78,000', '195,000', '45,000', '320,000', '260,000', '145,000'],
    '118': ['119,000', '98,000', '189,000', '49,000', '65,000', '230,000', '89,000', '35,000'],
    '119': ['48,000', '35,000', '29,000', '32,000', '54,000', '89,000', '22,000', '110,000'],
    '120': ['179,000', '329,000', '59,000', '149,000', '89,000', '65,000', '48,000', '45,000'],
    '121': ['45,000', '38,500', '550,000', '62,000', '42,000', '135,000', '28,000', '85,000']
  };

  const list = titles[tpl.id] || titles['116'];
  const plist = prices[tpl.id] || prices['116'];

  for (let i = 0; i < count; i++) {
    const idx = i % list.length;
    p.push({
      title: list[idx],
      price: plist[idx],
      category: tpl.id === '116' ? 'EDITORIAL' : tpl.id === '117' ? 'SHOWROOM' : tpl.id === '118' ? 'STREET' : tpl.id === '119' ? 'KIDS' : tpl.id === '120' ? 'TECH' : 'B2B BULK',
      badge: i === 0 ? 'BEST' : i === 1 ? 'NEW' : ''
    });
  }
  return p;
}

function generateHtml(tpl, viewType) {
  const c = tpl.colors;
  const isDark = tpl.isDark;
  const rad = tpl.shape.radius;
  const products = generateProducts(tpl, tpl.shape.cols === 5 ? 10 : 8);

  const topBarHtml = `
    <div style="background: ${tpl.band.bg}; color: #FFFFFF; font-size: 11.5px; padding: 7px 32px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; letter-spacing: -0.01em;">
      <span>${tpl.band.text}</span>
      <div style="display: flex; gap: 18px; font-weight: 500;">
        <span>고객센터 1588-0000</span>
        <span>공지사항</span>
        <span>발주·배송조회</span>
      </div>
    </div>
  `;

  const gnbHtml = `
    <header style="background: ${c.surface}; border-bottom: 1px solid ${c.border}; height: 72px; padding: 0 40px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50;">
      <div style="display: flex; align-items: center; gap: 36px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: ${rad}; background: ${c.primary}; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #FFFFFF; font-size: 16px;">
            ${tpl.id === '116' ? 'M' : tpl.id === '117' ? 'S' : tpl.id === '118' ? 'N' : tpl.id === '119' ? 'K' : tpl.id === '120' ? 'T' : 'B'}
          </div>
          <div>
            <span style="font-size: 19px; font-weight: 900; letter-spacing: -0.02em; color: ${c.text};">
              ${tpl.nameEn.toUpperCase().slice(0, 16)}
            </span>
            <span style="font-size: 10px; font-weight: 800; margin-left: 6px; padding: 2px 7px; ${tpl.badgeStyle}">
              TEMPLATE ${tpl.id}
            </span>
          </div>
        </div>
        <nav style="display: flex; gap: 26px; font-size: 14px; font-weight: 800;">
          <a href="#" style="color: ${c.primary}; text-decoration: none;">베스트 셀렉션</a>
          <a href="#" style="color: ${c.text}; text-decoration: none;">신규 등록</a>
          <a href="#" style="color: ${c.text}; text-decoration: none;">테마 기획전</a>
          <a href="#" style="color: ${c.text}; text-decoration: none;">카테고리별</a>
          <a href="#" style="color: ${c.textMuted}; text-decoration: none;">커뮤니티</a>
        </nav>
      </div>
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="position: relative;">
          <input type="text" placeholder="상품명 또는 키워드 검색" style="background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text}; border-radius: ${rad === '0px' ? '0px' : '20px'}; padding: 8px 16px; font-size: 12.5px; width: 220px; outline: none;" />
          <span style="position: absolute; right: 12px; top: 8px; font-size: 13px; color: ${c.textMuted};">🔍</span>
        </div>
        <button style="${tpl.btnStyle} padding: 8px 18px; font-size: 12.5px; cursor: pointer; white-space: nowrap !important;">
          로그인 / 가입
        </button>
        <button style="background: ${c.surfaceRaised}; border: 1px solid ${c.border}; color: ${c.text}; padding: 8px 14px; border-radius: ${rad}; font-size: 12.5px; font-weight: 800; cursor: pointer;">
          장바구니 (0)
        </button>
      </div>
    </header>
  `;

  let contentHtml = '';

  if (viewType === 'main') {
    contentHtml = `
      <!-- Hero Block (type: hero) -->
      <section style="background: ${c.bg}; border-bottom: 1px solid ${c.border}; padding: 64px 48px; position: relative; overflow: hidden;">
        <div style="max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: ${tpl.hero.feature ? '1.2fr 0.8fr' : '1fr'}; gap: 48px; align-items: center; text-align: ${!tpl.hero.feature ? 'center' : 'left'};">
          <div>
            <div style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 800; margin-bottom: 16px; letter-spacing: 0.05em; ${tpl.badgeStyle}">
              ${tpl.hero.eyebrow}
            </div>
            <h1 style="font-size: 40px; font-weight: 900; line-height: 1.25; letter-spacing: -0.03em; color: ${c.text}; margin-bottom: 16px;">
              ${tpl.hero.title}<br>
              <span style="color: ${c.primary};">${tpl.hero.accent}</span>
            </h1>
            <p style="font-size: 15px; line-height: 1.6; color: ${c.textMuted}; margin-bottom: 28px; white-space: pre-line; ${!tpl.hero.feature ? 'max-width: 600px; margin-left: auto; margin-right: auto;' : ''}">
              ${tpl.hero.text}
            </p>
            <div style="display: flex; gap: 12px; ${!tpl.hero.feature ? 'justify-content: center;' : ''}">
              <a href="#showcase" style="${tpl.btnStyle} display: inline-block; padding: 12px 28px; font-size: 14px; text-decoration: none; cursor: pointer;">
                ${tpl.hero.btn1}
              </a>
              <a href="#tabs" style="background: ${c.surfaceRaised}; border: 1px solid ${c.border}; color: ${c.text}; display: inline-block; padding: 12px 24px; border-radius: ${rad}; font-size: 14px; font-weight: 800; text-decoration: none; cursor: pointer;">
                ${tpl.hero.btn2}
              </a>
            </div>
          </div>
          ${tpl.hero.feature ? `
            <!-- Feature Product Card -->
            <div style="background: ${c.surface}; border: 1px solid ${c.border}; border-radius: ${rad}; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16px;">
              <div style="aspect-ratio: ${tpl.shape.imageRatio}; background: ${c.surfaceRaised}; border-radius: ${rad}; display: flex; align-items: center; justify-content: center; font-size: 48px; color: ${c.textMuted}; overflow: hidden; position: relative;">
                <span>🎁</span>
                <span style="position: absolute; top: 12px; left: 12px; font-size: 10px; font-weight: 900; padding: 3px 8px; ${tpl.badgeStyle}">
                  FEATURED PICK
                </span>
              </div>
              <div>
                <span style="font-size: 11px; font-weight: 700; color: ${c.textMuted};">${products[0].category}</span>
                <h3 style="font-size: 17px; font-weight: 900; color: ${c.text}; margin: 4px 0 8px 0;">${products[0].title}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 20px; font-weight: 900; color: ${c.primary};">₩${products[0].price}</span>
                  <button style="${tpl.btnStyle} padding: 6px 14px; font-size: 12px; cursor: pointer;">바로보기</button>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </section>

      <!-- Showcase Section (Grid) -->
      <section id="showcase" style="padding: 60px 48px; max-width: 1360px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px;">
          <div>
            <span style="font-size: 12px; font-weight: 800; color: ${c.primary}; letter-spacing: 0.05em;">CURATED PICKS</span>
            <h2 style="font-size: 26px; font-weight: 900; color: ${c.text}; margin-top: 4px;">주목할 만한 컬렉션</h2>
          </div>
          <a href="#" style="font-size: 13px; font-weight: 800; color: ${c.textMuted}; text-decoration: none;">전체보기 &rarr;</a>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(${tpl.shape.cols}, 1fr); gap: ${tpl.shape.cols === 5 ? '16px' : '24px'};">
          ${products.map((item, idx) => `
            <div style="background: ${c.surface}; border: ${tpl.shape.cardStyle === 'plain' ? 'none' : '1px solid ' + c.border}; border-radius: ${rad}; overflow: hidden; display: flex; flex-direction: column;">
              <div style="aspect-ratio: ${tpl.shape.imageRatio}; background: ${c.surfaceRaised}; display: flex; align-items: center; justify-content: center; font-size: 32px; color: ${c.textMuted}; position: relative;">
                <span>📦</span>
                ${item.badge ? `<span style="position: absolute; top: 10px; left: 10px; font-size: 9px; font-weight: 900; padding: 2px 6px; ${tpl.badgeStyle}">${item.badge}</span>` : ''}
              </div>
              <div style="padding: ${tpl.shape.cardStyle === 'plain' ? '12px 0' : '16px'};">
                <span style="font-size: 11px; font-weight: 700; color: ${c.textMuted};">${item.category}</span>
                <h4 style="font-size: 14.5px; font-weight: 800; color: ${c.text}; margin: 4px 0 8px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.title}</h4>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 16px; font-weight: 900; color: ${c.text};">₩${item.price}</span>
                  <span style="font-size: 12px; color: ${c.textMuted};">★ 4.9</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Tabs Section -->
      <section id="tabs" style="background: ${c.surface}; border-top: 1px solid ${c.border}; border-bottom: 1px solid ${c.border}; padding: 60px 48px;">
        <div style="max-width: 1360px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="font-size: 26px; font-weight: 900; color: ${c.text};">테마별 셀렉션 큐레이션</h2>
            <p style="font-size: 14px; color: ${c.textMuted}; margin-top: 6px;">공간과 상황에 맞춘 엄선된 라인업을 둘러보세요.</p>
            <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
              <button style="${tpl.btnStyle} padding: 8px 20px; font-size: 13px; cursor: pointer;">테마 01</button>
              <button style="background: ${c.surfaceRaised}; border: 1px solid ${c.border}; color: ${c.text}; padding: 8px 20px; border-radius: ${rad}; font-size: 13px; font-weight: 800; cursor: pointer;">테마 02</button>
              <button style="background: ${c.surfaceRaised}; border: 1px solid ${c.border}; color: ${c.text}; padding: 8px 20px; border-radius: ${rad}; font-size: 13px; font-weight: 800; cursor: pointer;">테마 03</button>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(${tpl.shape.cols}, 1fr); gap: 20px;">
            ${products.slice(0, tpl.shape.cols).map((item) => `
              <div style="background: ${c.bg}; border: 1px solid ${c.border}; border-radius: ${rad}; padding: 14px; display: flex; flex-direction: column;">
                <div style="aspect-ratio: ${tpl.shape.imageRatio}; background: ${c.surfaceRaised}; border-radius: ${rad}; display: flex; align-items: center; justify-content: center; font-size: 28px; color: ${c.textMuted};">
                  <span>✨</span>
                </div>
                <h5 style="font-size: 13.5px; font-weight: 800; color: ${c.text}; margin: 10px 0 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.title}</h5>
                <span style="font-size: 15px; font-weight: 900; color: ${c.primary};">₩${item.price}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Customer Reviews & Notice Section -->
      <section style="padding: 60px 48px; max-width: 1360px; margin: 0 auto; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px;">
        <div>
          <h3 style="font-size: 20px; font-weight: 900; color: ${c.text}; margin-bottom: 20px;">생생한 구매 후기</h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${[1, 2, 3].map(n => `
              <div style="background: ${c.surface}; border: 1px solid ${c.border}; border-radius: ${rad}; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 13px; font-weight: 800; color: ${c.text};">완벽한 마감과 핏감에 감탄했습니다. 공간이 달라졌어요.</div>
                  <div style="font-size: 11px; color: ${c.textMuted}; margin-top: 4px;">회원 구매자 (verified) · 2026-11-15</div>
                </div>
                <span style="color: ${c.primary}; font-size: 14px; font-weight: 900;">★★★★★</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <h3 style="font-size: 20px; font-weight: 900; color: ${c.text}; margin-bottom: 20px;">공지 & 발주 가이드</h3>
          <div style="background: ${c.surface}; border: 1px solid ${c.border}; border-radius: ${rad}; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed ${c.border}; padding-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 800; color: ${c.text};">정기 배송 및 발주 마감 시간 안내</span>
              <span style="font-size: 11.5px; color: ${c.textMuted};">11.15</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed ${c.border}; padding-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 800; color: ${c.text};">품질 검수 기준 및 교환 규정 안내</span>
              <span style="font-size: 11.5px; color: ${c.textMuted};">11.14</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 800; color: ${c.text};">기업 회원 대량 납품 프로세스 가이드</span>
              <span style="font-size: 11.5px; color: ${c.textMuted};">11.12</span>
            </div>
          </div>
        </div>
      </section>
    `;
  } else if (viewType === 'detail') {
    contentHtml = `
      <!-- Product Detail View -->
      <section style="padding: 60px 48px; max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
        <div>
          <div style="aspect-ratio: ${tpl.shape.imageRatio}; background: ${c.surfaceRaised}; border-radius: ${rad}; border: 1px solid ${c.border}; display: flex; align-items: center; justify-content: center; font-size: 80px; color: ${c.textMuted};">
            <span>📦</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
            ${[1, 2, 3, 4].map(() => `
              <div style="aspect-ratio: 1/1; background: ${c.surfaceRaised}; border-radius: ${rad}; border: 1px solid ${c.border}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                <span>✨</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <div style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 800; margin-bottom: 10px; ${tpl.badgeStyle}">
              VERIFIED ITEM
            </div>
            <h1 style="font-size: 28px; font-weight: 900; color: ${c.text}; margin-bottom: 8px;">
              ${products[0].title}
            </h1>
            <p style="font-size: 14px; color: ${c.textMuted}; line-height: 1.5;">
              정밀한 설계와 고품질 소재로 일상의 격을 높여주는 시그니처 아이템입니다.
            </p>
          </div>
          
          <div style="border-top: 1px solid ${c.border}; border-bottom: 1px solid ${c.border}; padding: 18px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 14px; font-weight: 700; color: ${c.textMuted};">판매가</span>
              <span style="font-size: 28px; font-weight: 900; color: ${c.primary};">₩${products[0].price}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 12.5px;">
              <span style="color: ${c.textMuted};">배송비</span>
              <span style="color: ${c.text}; font-weight: 700;">기본 배송비 3,000원</span>
            </div>
          </div>
          
          <!-- Options -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="font-size: 13px; font-weight: 800; color: ${c.text};">옵션 선택</label>
            <select style="background: ${c.surface}; border: 1px solid ${c.border}; color: ${c.text}; border-radius: ${rad}; padding: 10px 14px; font-size: 13px; outline: none;">
              <option>옵션을 선택하세요 (사이즈 / 규격)</option>
              <option>기본형 (+0원)</option>
              <option>대용량 / 플러스 (+15,000원)</option>
            </select>
          </div>
          
          <!-- CTA Buttons -->
          <div style="display: flex; gap: 12px; margin-top: 10px;">
            <button style="${tpl.btnStyle} flex: 1; padding: 14px; font-size: 15px; cursor: pointer;">
              바로 구매하기
            </button>
            <button style="background: ${c.surfaceRaised}; border: 1px solid ${c.border}; color: ${c.text}; flex: 0.6; padding: 14px; border-radius: ${rad}; font-size: 15px; font-weight: 800; cursor: pointer;">
              장바구니 담기
            </button>
          </div>
        </div>
      </section>
    `;
  } else if (viewType === 'list') {
    contentHtml = `
      <!-- Category List View -->
      <section style="padding: 40px 48px; max-width: 1360px; margin: 0 auto;">
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 26px; font-weight: 900; color: ${c.text};">카테고리 전체 상품</h1>
          <p style="font-size: 13px; color: ${c.textMuted}; margin-top: 4px;">총 ${products.length}개의 엄선된 상품이 등록되어 있습니다.</p>
        </div>
        
        <!-- Filter Bar -->
        <div style="background: ${c.surface}; border: 1px solid ${c.border}; border-radius: ${rad}; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; font-size: 13px; font-weight: 800;">
            <span style="color: ${c.primary}; cursor: pointer;">추천순</span>
            <span style="color: ${c.textMuted}; cursor: pointer;">신상품순</span>
            <span style="color: ${c.textMuted}; cursor: pointer;">낮은 가격순</span>
            <span style="color: ${c.textMuted}; cursor: pointer;">높은 가격순</span>
          </div>
          <div style="font-size: 12px; color: ${c.textMuted};">
            보기: 4열 / 5열
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(${tpl.shape.cols}, 1fr); gap: 20px;">
          ${products.map((item) => `
            <div style="background: ${c.surface}; border: 1px solid ${c.border}; border-radius: ${rad}; overflow: hidden; padding: 12px;">
              <div style="aspect-ratio: ${tpl.shape.imageRatio}; background: ${c.surfaceRaised}; border-radius: ${rad}; display: flex; align-items: center; justify-content: center; font-size: 28px;">
                <span>📦</span>
              </div>
              <h4 style="font-size: 14px; font-weight: 800; color: ${c.text}; margin: 8px 0 4px 0;">${item.title}</h4>
              <span style="font-size: 15px; font-weight: 900; color: ${c.primary};">₩${item.price}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  } else if (viewType === 'builder') {
    contentHtml = `
      <!-- Builder Preview & Mobile Viewport -->
      <section style="background: #111827; padding: 60px 48px; min-height: 800px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;">
        <div style="color: #9CA3AF; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
          <span>📱 스마트폰 모바일 (390px Viewport) 반응형 렌더링 뷰파인더</span>
          <span style="background: #374151; color: #F3F4F6; padding: 2px 8px; border-radius: 4px; font-size: 11px;">TEMPLATE ${tpl.id}</span>
        </div>
        
        <!-- Mobile Frame (390px) -->
        <div style="width: 390px; height: 780px; background: ${c.bg}; border: 12px solid #1F2937; border-radius: 44px; overflow-y: auto; overflow-x: hidden; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <!-- Mobile Status Bar -->
          <div style="height: 28px; background: ${isDark ? '#000000' : '#FFFFFF'}; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; font-size: 11px; font-weight: 700; color: ${c.text}; position: sticky; top: 0; z-index: 100;">
            <span>09:41</span>
            <span>5G 100%</span>
          </div>
          
          <!-- Mobile Header -->
          <div style="background: ${c.surface}; border-bottom: 1px solid ${c.border}; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 15px; font-weight: 900; color: ${c.text};">${tpl.nameEn.slice(0, 14)}</span>
            <div style="display: flex; gap: 10px; font-size: 14px;">
              <span>🔍</span>
              <span>🛒</span>
            </div>
          </div>
          
          <!-- Mobile Hero -->
          <div style="padding: 24px 16px; background: ${c.bg}; border-bottom: 1px solid ${c.border};">
            <span style="font-size: 9.5px; font-weight: 800; ${tpl.badgeStyle}">${tpl.hero.eyebrow}</span>
            <h2 style="font-size: 20px; font-weight: 900; color: ${c.text}; margin: 8px 0 4px 0;">
              ${tpl.hero.title}
            </h2>
            <div style="font-size: 18px; font-weight: 900; color: ${c.primary}; margin-bottom: 10px;">${tpl.hero.accent}</div>
            <button style="${tpl.btnStyle} width: 100%; padding: 10px; font-size: 12px; cursor: pointer;">
              ${tpl.hero.btn1}
            </button>
          </div>
          
          <!-- Mobile 2-col List -->
          <div style="padding: 16px;">
            <h3 style="font-size: 14px; font-weight: 900; color: ${c.text}; margin-bottom: 12px;">추천 컬렉션</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              ${products.slice(0, 4).map(p => `
                <div style="background: ${c.surface}; border: 1px solid ${c.border}; border-radius: ${rad}; padding: 8px;">
                  <div style="aspect-ratio: ${tpl.shape.imageRatio}; background: ${c.surfaceRaised}; border-radius: ${rad}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                    <span>📦</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: ${c.text}; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.title}</div>
                  <div style="font-size: 12px; font-weight: 900; color: ${c.primary}; margin-top: 2px;">₩${p.price}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  const footerHtml = `
    <!-- Footer -->
    <footer style="background: ${c.surface}; border-top: 1px solid ${c.border}; padding: 48px 40px; color: ${c.textMuted}; font-size: 12px; line-height: 1.6;">
      <div style="max-width: 1360px; margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 16px; font-weight: 900; color: ${c.text}; margin-bottom: 10px;">BUY LIFE MALL BUILDER</div>
          <div>상호: (주)바이라이프 · 대표: 관리자 · 사업자등록번호: 000-00-00000</div>
          <div>통신판매업신고: 제2026-서울강남-0000호 · 개인정보보호책임자: buylifemall@gmail.com</div>
          <div style="margin-top: 10px; color: ${c.textMuted};">본 몰은 독립된 쇼핑몰 솔루션으로 안전한 거래 환경을 제공합니다.</div>
        </div>
        <div style="display: flex; gap: 40px;">
          <div>
            <div style="font-weight: 800; color: ${c.text}; margin-bottom: 8px;">안내</div>
            <div>이용약관</div>
            <div>개인정보처리방침</div>
            <div>공급사 입점신청</div>
          </div>
          <div>
            <div style="font-weight: 800; color: ${c.text}; margin-bottom: 8px;">고객지원</div>
            <div>고객센터: 1588-0000</div>
            <div>운영시간: 09:00 - 18:00</div>
            <div>주말 및 공휴일 휴무</div>
          </div>
        </div>
      </div>
    </footer>
  `;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1440, initial-scale=1" />
  <title>${tpl.name} - ${viewType.toUpperCase()} - AIMaster 쇼핑몰 디자인 빌더</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${c.bg};
      color: ${c.text};
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif;
      min-width: 1440px;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body>
  ${topBarHtml}
  ${gnbHtml}
  ${contentHtml}
  ${footerHtml}
</body>
</html>`;
}

// Generate files for 116 to 121
for (const tpl of templates) {
  const dir = path.join(baseDir, tpl.slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'view_c1_s1.html'), generateHtml(tpl, 'main'), 'utf-8');
  fs.writeFileSync(path.join(dir, 'view_c1_s2.html'), generateHtml(tpl, 'detail'), 'utf-8');
  fs.writeFileSync(path.join(dir, 'view_c1_s3.html'), generateHtml(tpl, 'list'), 'utf-8');
  fs.writeFileSync(path.join(dir, 'view_c1_s4.html'), generateHtml(tpl, 'builder'), 'utf-8');

  const readmeContent = `# ${tpl.name} (${tpl.nameEn})

> **AIMASTER DESIGN STANDARD — ${tpl.id}번 공식 템플릿**  
> **적용 대상**: \`mall-builder\` (B2B 공급몰 / 리셀러 분양몰 / D2C 독립몰)  
> **제작일**: 2026-11-15  
> **담당**: Antigravity (agy, 윈도우)

---

## 1. 디자인 철학 및 비주얼 정체성
- **컨셉**: ${tpl.concept}
- **추천 도메인 및 타겟**: ${tpl.target}
- **시그니처 팔레트**: Primary \`${tpl.colors.primary}\`, Background \`${tpl.colors.bg}\`, Surface \`${tpl.colors.surface}\`
- **모서리 및 버튼**: Radius \`${tpl.shape.radius}\`, Button \`${tpl.btnClass}\`

---

## 2. 4대 핵심 화면 구성
1. \`view_c1_s1.html\`: 손님 메인 첫 화면 (Hero 배너 슬라이드, 쇼윈도 그리드, 탭 셀렉션)
2. \`view_c1_s2.html\`: 상품 상세 페이지 (상세 뷰파인더, 가격/옵션 선택, 배송비 안내 카드)
3. \`view_c1_s3.html\`: 카테고리 상품 목록 (필터 바, 상품 그리드, 정렬/배지 셀렉터)
4. \`view_c1_s4.html\`: 모바일 스마트폰 390px 뷰파인더 & 위지위그 디자인 빌더 관제 덱
`;
  fs.writeFileSync(path.join(dir, 'README.md'), readmeContent, 'utf-8');
  console.log(`Generated: ${tpl.slug}`);
}

console.log('All 6 template packages generated successfully!');
