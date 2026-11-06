const fs = require('fs');
const path = require('path');

const concepts = [
  {
    num: 57,
    name: "57. 헐리우드 9컷 시네마틱 디렉터스 뷰파인더 스타일",
    enName: "Hollywood 9-Cut Cinematic Director's Viewfinder Style",
    folder: "57_hollywood_9cut_directors_viewfinder",
    color: "딥 옵시디언 나이트 (#090D13) & 헐리우드 레드 (#EF4444) & 시네마 골드 (#F59E0B)",
    type: "헐리우드 9컷 시네마틱 디렉터스 뷰파인더 덱 (추천안)",
    btn: "3D 엠보싱 헐리우드 레드 버튼 (.btn-3d-red)",
    desc: "실제 헐리우드 영화 촬영 현장의 감독용 뷰파인더 덱. 9컷 씬 타임라인(16:9 와이드), REC 🔴 실시간 타임코드, 샷 사이즈 칩(Close-Up, Wide, Bird-Eye), 3D 엠보싱 헐리우드 레드 버튼 일체화",
    recommend: "⭐ 공식 1순위 추천 (숏폼/영상 레드 톤앤매너 지침 부합 & 몰입도 극대화)"
  },
  {
    num: 58,
    name: "58. 네오 NLE 스토리보드 프로덕션 타임라인 스타일",
    enName: "Neo NLE Storyboard Production Timeline Style",
    folder: "58_neo_nle_storyboard_timeline",
    color: "다크 에스프레소 슬레이트 (#14171F) & 프로 앰버 골드 (#F59E0B) & 일렉트릭 사이언 (#06B6D4)",
    type: "다빈치 리졸브 감성 다중 트랙 NLE 스토리보드 타임라인 (자산화)",
    btn: "3D 엠보싱 프로 앰버 골드 버튼 (.btn-3d-gold)",
    desc: "프리미어/파이널컷 감성의 전문 NLE 스토리보드 시퀀스 트랙. 씬별 대사·오디오·카메라 무빙 노브, 다크 에스프레소 슬레이트 베이스, 3D 엠보싱 프로 앰버 골드 버튼",
    recommend: "대안 템플릿 (전문 NLE 영상 제작자 선호)"
  },
  {
    num: 59,
    name: "59. 하이퍼 애니메이틱 씬 디퓨전 콘솔 스타일",
    enName: "Hyper Animatic Scene Diffusion Console Style",
    folder: "59_hyper_animatic_scene_diffusion",
    color: "매트 옵시디언 딥블랙 (#070A12) & 레이저 에메랄드 (#10B981) & 네온 사이언 (#00F2FE)",
    type: "차세대 AI 애니메이틱 & 뉴럴 디퓨전 씬 렌더러 HUD (자산화)",
    btn: "3D 엠보싱 레이저 에메랄드 버튼 (.btn-3d-emerald)",
    desc: "차세대 AI 애니메이틱 및 뉴럴 디퓨전 씬 렌더러 HUD. GPU 렌더 속도 게이지, 캐릭터 일관성 시드 락커, 3D 엠보싱 에메랄드 버튼",
    recommend: "대안 템플릿 (웹툰/애니메이션 생성형 AI 특화)"
  }
];

// 각 폴더 README.md 작성
for (const c of concepts) {
  const readmeContent = `# ${c.name}

> **영문명**: ${c.enName}  
> **프로그램**: AI 시네마틱 스토리보드 자동화 (\`cinematic-storyboard-studio\`)  
> **폴더 경로**: \`D:\\Antigravity\\Design\\${c.folder}\`  
> **생성 일자**: 2026-11-06  

---

## 1. 디자인 컨셉 & 스펙
- **테마 배색**: ${c.color}
- **핵심 UI 유형**: ${c.type}
- **대표 버튼**: ${c.btn}
- **설명**: ${c.desc}
- **추천 여부**: ${c.recommend}

---

## 2. 4대 화면 고화질 캡처 자산 (1440px)
- \`01_main.png\`: 메인 스토리보드 뷰파인더 콘솔
- \`02_detail.png\`: 씬별 카메라 앵글 & 프롬프트 인스펙터
- \`03_guide.png\`: 헐리우드 9컷 연출 가이드 & 샷 치트시트
- \`04_settings.png\`: 2026-11-01 표준 5단계 수직 레이아웃 로그인/설정
`;

  fs.writeFileSync(path.join('D:/Antigravity/Design', c.folder, 'README.md'), readmeContent, 'utf8');
  console.log(`Wrote README: ${c.folder}`);
}

// 상단 종합 비교표가 탑재된 단일 통합 쇼케이스 HTML 생성
const showcaseHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 시네마틱 스토리보드 자동화 - 4대 화면 3시안 쇼케이스</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif; }
    body { background: #07090E; color: #F0F6FC; padding: 32px; }
    .header { text-align: center; margin-bottom: 32px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 9999px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #EF4444; font-size: 12px; font-weight: 800; margin-bottom: 12px; }
    h1 { font-size: 32px; font-weight: 900; letter-spacing: -0.5px; }
    h1 span { color: #EF4444; }
    p.sub { font-size: 14px; color: #8B949E; margin-top: 6px; }

    /* 종합 비교표 */
    .comparison-section { background: #0E131F; border: 1px solid #1E293B; border-radius: 20px; padding: 24px; margin-bottom: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .comparison-title { font-size: 18px; font-weight: 900; color: #F0F6FC; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .comparison-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    .comparison-table th { background: #141B2D; padding: 12px 16px; color: #C9D1D9; font-weight: 800; border-bottom: 2px solid #283342; }
    .comparison-table td { padding: 14px 16px; border-bottom: 1px solid #1E293B; vertical-align: middle; }
    .comparison-table tr:hover { background: #131A2B; }
    .recommend-badge { background: #EF4444; color: #fff; font-weight: 900; padding: 3px 8px; border-radius: 6px; font-size: 10px; display: inline-block; }

    /* 3열 쇼케이스 그리드 */
    .showcase-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .concept-col { background: #0E131F; border: 1px solid #1E293B; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .concept-header { border-bottom: 1px solid #1E293B; padding-bottom: 12px; }
    .concept-tag { font-size: 11px; font-weight: 800; color: #8B949E; font-family: monospace; }
    .concept-name { font-size: 16px; font-weight: 900; color: #fff; margin-top: 4px; }

    .view-card { background: #07090E; border: 1px solid #1E293B; border-radius: 14px; overflow: hidden; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
    .view-card:hover { border-color: #EF4444; transform: translateY(-4px); box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3); }
    .view-thumb { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; }
    .view-info { padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
    .view-title { font-size: 12px; font-weight: 800; color: #E2E8F0; }
    .view-action { font-size: 10px; color: #EF4444; font-weight: 700; }

    /* 라이트박스 모달 */
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 9999; justify-content: center; align-items: center; flex-direction: column; }
    .modal.active { display: flex; }
    .modal-content { max-width: 90vw; max-height: 85vh; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 20px 60px rgba(0,0,0,0.9); }
    .modal-nav { display: flex; gap: 16px; margin-top: 16px; }
    .modal-btn { background: #1E293B; color: #fff; border: 1px solid #475569; padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; }
    .modal-btn:hover { background: #EF4444; border-color: #EF4444; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">🎬 AIMASTER DESIGN SHOWCASE v2.0</div>
    <h1>AI 시네마틱 스토리보드 (<code>cinematic-storyboard-studio</code>) <span>4대 화면 3시안</span> 쇼케이스</h1>
    <p class="sub">1440px 고화질 원본 렌더링 · 상단 종합 비교표 · 카드 클릭 시 라이트박스 팝업 확대</p>
  </div>

  <!-- 상단 종합 비교표 필수 탑재 -->
  <section class="comparison-section">
    <div class="comparison-title">
      <span>📊 4대 화면 3시안 한눈에 보는 종합 비교표</span>
      <a href="http://localhost:3800/comparison.html" style="font-size: 11px; color: #EF4444; text-decoration: underline;">독립 비교표 전체화면 보기 →</a>
    </div>
    <table class="comparison-table">
      <thead>
        <tr>
          <th style="width: 14%;">시안 번호 및 명칭</th>
          <th style="width: 16%;">핵심 컨셉 & UI 유형</th>
          <th style="width: 22%;">메인 테마 배색</th>
          <th style="width: 18%;">대표 버튼 & 컴포넌트</th>
          <th style="width: 18%;">차별화 특장점</th>
          <th style="width: 12%;">추천 여부</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1안. 57번 시안</strong><br><span style="color: #8B949E; font-size: 11px;">디렉터스 뷰파인더</span></td>
          <td><strong>헐리우드 9컷 시네마틱 디렉터스 뷰파인더 덱</strong></td>
          <td>딥 옵시디언 나이트 (<code style="color: #8B949E;">#090D13</code>)<br>+ 헐리우드 레드 (<code style="color: #EF4444;">#EF4444</code>) & 골드</td>
          <td>3D 엠보싱 레드 (<code style="color: #EF4444;">.btn-3d-red</code>)<br>LIVE REC 타임코드 헤더</td>
          <td>실제 영화 촬영 현장 감독 모니터 덱, 9컷 타임라인, 샷 사이즈 칩</td>
          <td><span class="recommend-badge">⭐ 1순위 강력추천</span></td>
        </tr>
        <tr>
          <td><strong>2안. 58번 시안</strong><br><span style="color: #8B949E; font-size: 11px;">NLE 타임라인</span></td>
          <td>다빈치 리졸브 감성 다중 트랙 NLE 타임라인</td>
          <td>다크 에스프레소 슬레이트 (<code style="color: #8B949E;">#14171F</code>)<br>+ 프로 앰버 (<code style="color: #F59E0B;">#F59E0B</code>) & 사이언</td>
          <td>3D 엠보싱 골드 (<code style="color: #F59E0B;">.btn-3d-gold</code>)<br>멀티트랙 시퀀서 노브</td>
          <td>프리미어/다빈치 감성 V1/A1 타임라인, 키프레임 인스펙터</td>
          <td><span style="color: #8B949E; font-weight: 700;">대안 자산화</span></td>
        </tr>
        <tr>
          <td><strong>3안. 59번 시안</strong><br><span style="color: #8B949E; font-size: 11px;">디퓨전 콘솔</span></td>
          <td>차세대 AI 뉴럴 씬 디퓨전 HUD</td>
          <td>매트 옵시디언 딥블랙 (<code style="color: #8B949E;">#070A12</code>)<br>+ 레이저 에메랄드 (<code style="color: #10B981;">#10B981</code>) & 사이언</td>
          <td>3D 엠보싱 에메랄드 (<code style="color: #10B981;">.btn-3d-emerald</code>)<br>GPU 연산 게이지 HUD</td>
          <td>실시간 GPU 텐서 VRAM 모니터링, 캐릭터 일관성 시드 락커</td>
          <td><span style="color: #8B949E; font-weight: 700;">대안 자산화</span></td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- 3열 쇼케이스 그리드 (총 12뷰) -->
  <div class="showcase-grid">
    <!-- 1안 열 -->
    <div class="concept-col">
      <div class="concept-header">
        <div class="concept-tag">CONCEPT 01 · 57번 시안</div>
        <div class="concept-name">헐리우드 9컷 시네마틱 디렉터스 뷰파인더</div>
        <div style="font-size: 11px; color: #EF4444; font-weight: 800; margin-top: 2px;">★ 1순위 추천안</div>
      </div>
      ${[
        { name: "01_main", title: "01. 메인 9컷 뷰파인더 콘솔", folder: "57_hollywood_9cut_directors_viewfinder" },
        { name: "02_detail", title: "02. 씬 03 프롬프트 인스펙터", folder: "57_hollywood_9cut_directors_viewfinder" },
        { name: "03_guide", title: "03. 헐리우드 9컷 연출 가이드북", folder: "57_hollywood_9cut_directors_viewfinder" },
        { name: "04_settings", title: "04. 5단계 표준 로그인/설정", folder: "57_hollywood_9cut_directors_viewfinder" }
      ].map(v => `
        <div class="view-card" onclick="openModal('${v.folder}/${v.name}.png')">
          <img class="view-thumb" src="${v.folder}/${v.name}.png" alt="${v.title}">
          <div class="view-info">
            <span class="view-title">${v.title}</span>
            <span class="view-action">🔍 1440px 팝업</span>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- 2안 열 -->
    <div class="concept-col">
      <div class="concept-header">
        <div class="concept-tag">CONCEPT 02 · 58번 시안</div>
        <div class="concept-name">네오 NLE 스토리보드 프로덕션 타임라인</div>
        <div style="font-size: 11px; color: #F59E0B; font-weight: 800; margin-top: 2px;">전문가용 NLE 대안</div>
      </div>
      ${[
        { name: "01_main", title: "01. 메인 NLE 타임라인 콘솔", folder: "58_neo_nle_storyboard_timeline" },
        { name: "02_detail", title: "02. 키프레임 트랜지션 상세", folder: "58_neo_nle_storyboard_timeline" },
        { name: "03_guide", title: "03. 멀티트랙 프로덕션 가이드", folder: "58_neo_nle_storyboard_timeline" },
        { name: "04_settings", title: "04. 5단계 표준 로그인/설정", folder: "58_neo_nle_storyboard_timeline" }
      ].map(v => `
        <div class="view-card" onclick="openModal('${v.folder}/${v.name}.png')">
          <img class="view-thumb" src="${v.folder}/${v.name}.png" alt="${v.title}">
          <div class="view-info">
            <span class="view-title">${v.title}</span>
            <span class="view-action">🔍 1440px 팝업</span>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- 3안 열 -->
    <div class="concept-col">
      <div class="concept-header">
        <div class="concept-tag">CONCEPT 03 · 59번 시안</div>
        <div class="concept-name">하이퍼 애니메이틱 씬 디퓨전 콘솔</div>
        <div style="font-size: 11px; color: #10B981; font-weight: 800; margin-top: 2px;">차세대 GPU 뉴럴 대안</div>
      </div>
      ${[
        { name: "01_main", title: "01. 메인 뉴럴 디퓨전 HUD", folder: "59_hyper_animatic_scene_diffusion" },
        { name: "02_detail", title: "02. 씬 레이턴트 디퓨전 에디터", folder: "59_hyper_animatic_scene_diffusion" },
        { name: "03_guide", title: "03. 캐릭터 일관성 가이드", folder: "59_hyper_animatic_scene_diffusion" },
        { name: "04_settings", title: "04. 5단계 표준 로그인/설정", folder: "59_hyper_animatic_scene_diffusion" }
      ].map(v => `
        <div class="view-card" onclick="openModal('${v.folder}/${v.name}.png')">
          <img class="view-thumb" src="${v.folder}/${v.name}.png" alt="${v.title}">
          <div class="view-info">
            <span class="view-title">${v.title}</span>
            <span class="view-action">🔍 1440px 팝업</span>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- 라이트박스 모달 -->
  <div id="modal" class="modal" onclick="closeModal(event)">
    <img id="modal-img" class="modal-content" src="" alt="확대 뷰">
    <div class="modal-nav">
      <button class="modal-btn" onclick="prevImg(event)">◀ 이전 뷰</button>
      <button class="modal-btn" onclick="closeModalDirect()">✕ 닫기 (ESC)</button>
      <button class="modal-btn" onclick="nextImg(event)">다음 뷰 ▶</button>
    </div>
  </div>

  <script>
    const images = [
      '57_hollywood_9cut_directors_viewfinder/01_main.png',
      '57_hollywood_9cut_directors_viewfinder/02_detail.png',
      '57_hollywood_9cut_directors_viewfinder/03_guide.png',
      '57_hollywood_9cut_directors_viewfinder/04_settings.png',
      '58_neo_nle_storyboard_timeline/01_main.png',
      '58_neo_nle_storyboard_timeline/02_detail.png',
      '58_neo_nle_storyboard_timeline/03_guide.png',
      '58_neo_nle_storyboard_timeline/04_settings.png',
      '59_hyper_animatic_scene_diffusion/01_main.png',
      '59_hyper_animatic_scene_diffusion/02_detail.png',
      '59_hyper_animatic_scene_diffusion/03_guide.png',
      '59_hyper_animatic_scene_diffusion/04_settings.png'
    ];
    let currentIndex = 0;

    function openModal(src) {
      currentIndex = images.indexOf(src);
      document.getElementById('modal-img').src = src;
      document.getElementById('modal').classList.add('active');
    }
    function closeModal(e) {
      if (e.target.id === 'modal') {
        document.getElementById('modal').classList.remove('active');
      }
    }
    function closeModalDirect() {
      document.getElementById('modal').classList.remove('active');
    }
    function prevImg(e) {
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      document.getElementById('modal-img').src = images[currentIndex];
    }
    function nextImg(e) {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % images.length;
      document.getElementById('modal-img').src = images[currentIndex];
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModalDirect();
      if (e.key === 'ArrowLeft') prevImg(e);
      if (e.key === 'ArrowRight') nextImg(e);
    });
  </script>
</body>
</html>`;

fs.writeFileSync('D:/Antigravity/Design/showcase.html', showcaseHtml, 'utf8');
console.log('Updated D:/Antigravity/Design/showcase.html');

// 독립 비교표 comparison.html 생성
const comparisonHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 시네마틱 스토리보드 - 4대 화면 3시안 종합 비교표</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, sans-serif; }
    body { background: #07090E; color: #F0F6FC; padding: 40px; }
    .header { text-align: center; margin-bottom: 32px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 9999px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #EF4444; font-size: 12px; font-weight: 800; margin-bottom: 12px; }
    h1 { font-size: 28px; font-weight: 900; }
    .table-card { background: #0E131F; border: 1px solid #1E293B; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { background: #141B2D; padding: 14px 18px; color: #C9D1D9; font-weight: 800; border-bottom: 2px solid #283342; }
    td { padding: 18px; border-bottom: 1px solid #1E293B; vertical-align: top; line-height: 1.5; }
    tr:hover { background: #131A2B; }
    .recommend-badge { background: #EF4444; color: #fff; font-weight: 900; padding: 4px 10px; border-radius: 6px; font-size: 11px; display: inline-block; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">🎬 AIMASTER DESIGN MATRIX</div>
    <h1>AI 시네마틱 스토리보드 (<code>cinematic-storyboard-studio</code>) <span>종합 비교표</span></h1>
    <p style="color: #8B949E; margin-top: 8px; font-size: 13px;"><a href="http://localhost:3800/showcase.html" style="color: #EF4444; text-decoration: underline;">← 12뷰 인터랙티브 쇼케이스로 돌아가기</a></p>
  </div>

  <div class="table-card">
    <table>
      <thead>
        <tr>
          <th style="width: 15%;">시안 명칭</th>
          <th style="width: 18%;">핵심 테마 & UI 유형</th>
          <th style="width: 20%;">메인 배색 시스템</th>
          <th style="width: 18%;">대표 버튼 & 인터랙션</th>
          <th style="width: 17%;">핵심 특장점</th>
          <th style="width: 12%;">추천 여부</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1안 (57번)<br>헐리우드 9컷 디렉터스 뷰파인더</strong></td>
          <td>실제 헐리우드 영화 촬영 현장 감독 모니터 콘솔 덱</td>
          <td>딥 옵시디언 나이트 (<code style="color: #8B949E;">#090D13</code>)<br>+ 헐리우드 레드 (<code style="color: #EF4444;">#EF4444</code>) & 골드</td>
          <td>3D 엠보싱 헐리우드 레드 (<code style="color: #EF4444;">.btn-3d-red</code>)<br>LIVE REC 타임코드 덱</td>
          <td>2026-10-29 숏폼 레드 지침 최적화, 9컷 타임라인, 샷 사이즈 칩</td>
          <td><span class="recommend-badge">⭐ 1순위 추천</span></td>
        </tr>
        <tr>
          <td><strong>2안 (58번)<br>네오 NLE 프로덕션 타임라인</strong></td>
          <td>다빈치 리졸브 감성 다중 트랙 NLE 타임라인 트랙</td>
          <td>다크 에스프레소 슬레이트 (<code style="color: #8B949E;">#14171F</code>)<br>+ 프로 앰버 (<code style="color: #F59E0B;">#F59E0B</code>) & 사이언</td>
          <td>3D 엠보싱 프로 앰버 골드 (<code style="color: #F59E0B;">.btn-3d-gold</code>)<br>V1/A1 조그 셔틀 휠</td>
          <td>전문 NLE 영상 제작자 친화적 인터페이스, 씬 트랜지션 인스펙터</td>
          <td><span style="color: #8B949E; font-weight: 700;">자산화 보존</span></td>
        </tr>
        <tr>
          <td><strong>3안 (59번)<br>하이퍼 씬 디퓨전 콘솔</strong></td>
          <td>차세대 AI 뉴럴 씬 디퓨전 & 애니메이틱 HUD</td>
          <td>매트 옵시디언 딥블랙 (<code style="color: #8B949E;">#070A12</code>)<br>+ 레이저 에메랄드 (<code style="color: #10B981;">#10B981</code>) & 사이언</td>
          <td>3D 엠보싱 레이저 에메랄드 (<code style="color: #10B981;">.btn-3d-emerald</code>)<br>GPU 텐서 VRAM 게이지</td>
          <td>캐릭터 일관성 시드 락커, 포즈 스켈레톤, 생성형 AI 파이프라인 특화</td>
          <td><span style="color: #8B949E; font-weight: 700;">자산화 보존</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

fs.writeFileSync('D:/Antigravity/Design/comparison.html', comparisonHtml, 'utf8');
console.log('Updated D:/Antigravity/Design/comparison.html');
