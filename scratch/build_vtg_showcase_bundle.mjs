import fs from 'fs';
import path from 'path';

const artifactDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';
const designDir = 'D:/Antigravity/Design';

// 12개 뷰 이미지 base64 변환
const views = [
  'vtg_c1_main.png', 'vtg_c1_detail.png', 'vtg_c1_guide.png', 'vtg_c1_settings.png',
  'vtg_c2_main.png', 'vtg_c2_detail.png', 'vtg_c2_guide.png', 'vtg_c2_settings.png',
  'vtg_c3_main.png', 'vtg_c3_detail.png', 'vtg_c3_guide.png', 'vtg_c3_settings.png'
];

const imgB64 = {};
for (const v of views) {
  const filePath = path.join(artifactDir, v);
  const data = fs.readFileSync(filePath);
  imgB64[v] = `data:image/png;base64,${data.toString('base64')}`;
}

const comparisonTableHtml = `
  <!-- ==================== 상단: 4대 화면 3시안 종합 비교표 ==================== -->
  <section class="max-w-7xl mx-auto px-6 py-8">
    <div class="bg-[#0F1420] border border-slate-800 rounded-3xl p-6 shadow-2xl">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <span class="px-3 py-1 rounded-full text-xs font-black uppercase bg-red-600/20 text-red-400 border border-red-500/30">
            Design Comparison Matrix
          </span>
          <h2 class="text-xl font-black text-white mt-2 flex items-center gap-2">
            <span>📊</span> AI 영상렌더 스튜디오 (video-to-gif) 4대 화면 3시안 종합 비교표
          </h2>
          <p class="text-xs text-slate-400 mt-1">2026-10-29 숏폼/영상 톤앤매너 지침 및 2026-11-01 로그인 5단계 표준 규격 100% 준수</p>
        </div>
        <a href="/comparison.html" target="_blank" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all">
          <span>새 탭에서 비교표 보기</span>
          <span>↗</span>
        </a>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-900/60">
              <th class="p-3.5 rounded-l-xl">구분</th>
              <th class="p-3.5 bg-red-950/20 text-red-300 border-x border-red-500/20">
                ⭐ 시안 1: 54. 시네마틱 헐리우드 네온 REC 렌더러 (추천안)
              </th>
              <th class="p-3.5 bg-amber-950/20 text-amber-300 border-r border-amber-500/20">
                시안 2: 55. 하이퍼 NLE 타임라인 프로덕션 스튜디오
              </th>
              <th class="p-3.5 bg-emerald-950/20 text-emerald-300 rounded-r-xl">
                시안 3: 56. 울트라 하이퍼 스피드 GPU 렌더 엔진 콘솔
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80 font-medium">
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40">컨셉 & 테마</td>
              <td class="p-3.5 bg-red-950/10 text-white font-bold border-x border-red-500/20">
                헐리우드 시네마틱 NLE 렌더 룸 & 숏폼 비디오 인코딩 콘솔
              </td>
              <td class="p-3.5 bg-amber-950/10 text-slate-200 border-r border-amber-500/20">
                다빈치 리졸브 / 프리미어 감성 NLE 다중 트랙 편집 프로덕션
              </td>
              <td class="p-3.5 bg-emerald-950/10 text-slate-200">
                차세대 GPU 하드웨어 가속 14x 초고속 미디어 트랜스코더 랩
              </td>
            </tr>
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40">핵심 컬러 팔레트</td>
              <td class="p-3.5 bg-red-950/10 border-x border-red-500/20">
                <span class="inline-flex items-center gap-1.5 font-mono text-[11px] text-red-400 font-bold">
                  <span class="w-3 h-3 rounded-full bg-[#EF4444] border border-white/20"></span> #EF4444 (헐리우드 레드)
                </span><br>
                <span class="inline-flex items-center gap-1.5 font-mono text-[11px] text-amber-400">
                  <span class="w-3 h-3 rounded-full bg-[#F59E0B] border border-white/20"></span> #F59E0B (시네마 골드)
                </span>
              </td>
              <td class="p-3.5 bg-amber-950/10 border-r border-amber-500/20">
                <span class="inline-flex items-center gap-1.5 font-mono text-[11px] text-amber-400 font-bold">
                  <span class="w-3 h-3 rounded-full bg-[#F59E0B] border border-white/20"></span> #F59E0B (NLE 앰버)
                </span><br>
                <span class="inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan-400">
                  <span class="w-3 h-3 rounded-full bg-[#06B6D4] border border-white/20"></span> #06B6D4 (일렉트릭 사이언)
                </span>
              </td>
              <td class="p-3.5 bg-emerald-950/10">
                <span class="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 font-bold">
                  <span class="w-3 h-3 rounded-full bg-[#10B981] border border-white/20"></span> #10B981 (레이저 에메랄드)
                </span><br>
                <span class="inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                  <span class="w-3 h-3 rounded-full bg-[#00F2FE] border border-white/20"></span> #00F2FE (네온 사이언)
                </span>
              </td>
            </tr>
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40">3D 엠보싱 버튼</td>
              <td class="p-3.5 bg-red-950/10 border-x border-red-500/20 font-bold text-red-400">
                🔴 3D 쇼츠/헐리우드 레드 버튼 (0 4px 0 #991B1B)
              </td>
              <td class="p-3.5 bg-amber-950/10 border-r border-amber-500/20 font-bold text-amber-400">
                🟡 3D 프로페셔널 앰버 골드 버튼 (0 4px 0 #92400E)
              </td>
              <td class="p-3.5 bg-emerald-950/10 font-bold text-emerald-400">
                🟢 3D 레이저 에메랄드 버튼 (0 4px 0 #065F46)
              </td>
            </tr>
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40">01_메인 화면 특징</td>
              <td class="p-3.5 bg-red-950/10 border-x border-red-500/20">
                LIVE 🔴 REC 타임코드 뷰파인더 + 듀얼 슬라이더 Trim (0.1s 정밀 제어) + 목적별 원클릭 프리셋 칩 + 로컬 렌더러 연동
              </td>
              <td class="p-3.5 bg-amber-950/10 border-r border-amber-500/20">
                V1 비디오 썸네일 스트립 + 오디오/모션 파형 트랙 + 조그 셔틀 다이얼 + 디더링 손실도 정밀 노브
              </td>
              <td class="p-3.5 bg-emerald-950/10">
                GPU WebCodecs 파이프라인 그래프 + 실시간 VRAM / FPS 게이지 + 멀티스레드 WASM 렌더 모드
              </td>
            </tr>
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40">02_상세 결과 특징</td>
              <td class="p-3.5 bg-red-950/10 border-x border-red-500/20">
                GIF 실시간 무한루프 플레이어 + 용량 절감 분석(89.2% 압축) + 상세페이지 스튜디오 즉시 전송 버튼 + 4단 썸네일 추출
              </td>
              <td class="p-3.5 bg-amber-950/10 border-r border-amber-500/20">
                16:9 마스터 프리뷰 + 프레임별 색상 히스토그램 + 팔레트 256 분석기
              </td>
              <td class="p-3.5 bg-emerald-950/10">
                GPU WebCodecs 렌더 벤치마크 지표 (CPU 대비 14.2배 단축) + 무손실 GIF 익스포트
              </td>
            </tr>
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40">03_가이드북 특징</td>
              <td class="p-3.5 bg-red-950/10 border-x border-red-500/20">
                4단계 초고속 변환 퀵스타트 + 네이버/쿠팡/자사몰 마켓별 용량 가이드 + PC 로컬 렌더러(.bat) 연동법
              </td>
              <td class="p-3.5 bg-amber-950/10 border-r border-amber-500/20">
                키프레임 인덱싱 기법 + 팔레트 최적화 노하우 + 루프 페이드 블렌딩 가이드
              </td>
              <td class="p-3.5 bg-emerald-950/10">
                WebCodecs API 브라우저 호환성 + 4K 대용량 스트리밍 인코딩 팁
              </td>
            </tr>
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40">04_로그인 화면 특징</td>
              <td class="p-3.5 bg-red-950/10 border-x border-red-500/20">
                64px 슬레이트 로고 + 알약 뱃지 + 볼드 한글 타이틀 + 3D 레드 버튼 + 1행 축소 약관 (5단계 표준 준수)
              </td>
              <td class="p-3.5 bg-amber-950/10 border-r border-amber-500/20">
                64px 골드 타이머 로고 + 알약 뱃지 + 볼드 한글 타이틀 + 3D 골드 버튼 + 1행 축소 약관 (5단계 표준 준수)
              </td>
              <td class="p-3.5 bg-emerald-950/10">
                64px 썬더 볼트 로고 + 알약 뱃지 + 볼드 한글 타이틀 + 3D 에메랄드 버튼 + 1행 축소 약관 (5단계 표준 준수)
              </td>
            </tr>
            <tr>
              <td class="p-3.5 font-bold text-slate-300 bg-slate-900/40 rounded-b-xl">추천 여부 및 이유</td>
              <td class="p-3.5 bg-red-950/20 border-x border-red-500/30 text-red-300 font-bold">
                ⭐ <b class="text-white">강력 추천 (1안 채택 권장)</b><br>
                2026-10-29 숏폼 레드 톤앤매너 지침 부합, LIVE REC 타임코드와 정밀 Trim 슬라이더로 직관적 조작감 최상
              </td>
              <td class="p-3.5 bg-amber-950/20 border-r border-amber-500/30 text-amber-300 font-medium">
                고급 NLE 에디터 스타일 영구 자산화 보존 (55번 템플릿)
              </td>
              <td class="p-3.5 bg-emerald-950/20 text-emerald-300 font-medium rounded-br-xl">
                GPU 렌더 콘솔 스타일 영구 자산화 보존 (56번 템플릿)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
`;

const showcaseHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 영상렌더 스튜디오 (video-to-gif) 4대 화면 3시안 통합 쇼케이스</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800;900&display=swap');
    body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; }
    
    .view-card {
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
    }
    .view-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(239, 68, 68, 0.5);
    }

    #lightbox-modal {
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }
    #lightbox-modal.active {
      opacity: 1;
      visibility: visible;
    }
  </style>
</head>
<body class="bg-[#07090E] text-slate-100 min-h-screen">

  <!-- ==================== 상단 헤더 ==================== -->
  <header class="sticky top-0 z-40 bg-[#0B0F1A]/90 backdrop-blur-md border-b border-slate-800 px-8 py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-red-600/30">
          🎞️
        </div>
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-lg font-black text-white">AI 영상렌더 스튜디오 (video-to-gif)</h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white">12-VIEW SHOWCASE</span>
          </div>
          <p class="text-xs text-slate-400">4대 핵심 화면(메인/상세/가이드/설정) × 3대 디자인 시안 인터랙티브 쇼케이스</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <a href="#comparison" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all">
          <span>📊 종합 비교표</span>
        </a>
        <a href="https://video-to-gif.buylife.xyz" target="_blank" class="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 flex items-center gap-1.5 transition-all">
          <span>현재 운영 사이트 방문</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  </header>

  <div id="comparison">
    ${comparisonTableHtml}
  </div>

  <!-- ==================== 본문: 3열 12뷰 그리드 쇼케이스 ==================== -->
  <main class="max-w-7xl mx-auto px-6 py-6 space-y-12">

    <!-- 그리드 컬럼 헤더 -->
    <div class="grid grid-cols-3 gap-8">
      <!-- 1열 헤더 -->
      <div class="p-5 rounded-2xl bg-red-950/20 border-2 border-red-500/40 relative">
        <span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-red-600 text-white absolute -top-3 left-6 shadow-md">
          ⭐ RECOMMENDED (1안 추천)
        </span>
        <h3 class="text-base font-black text-white mt-1">시안 1: 54. 시네마틱 헐리우드 네온 REC</h3>
        <p class="text-xs text-slate-400 mt-1">LIVE REC 타임코드 뷰파인더 + 0.1초 Trim + 3D 레드 엠보싱 버튼</p>
      </div>

      <!-- 2열 헤더 -->
      <div class="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 relative">
        <span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-amber-600 text-white absolute -top-3 left-6 shadow-md">
          시안 2 (자산화)
        </span>
        <h3 class="text-base font-black text-white mt-1">시안 2: 55. 하이퍼 NLE 타임라인</h3>
        <p class="text-xs text-slate-400 mt-1">다빈치 리졸브 감성 다중 트랙 NLE 콘솔 + 조그 셔틀 다이얼</p>
      </div>

      <!-- 3열 헤더 -->
      <div class="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 relative">
        <span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-600 text-white absolute -top-3 left-6 shadow-md">
          시안 3 (자산화)
        </span>
        <h3 class="text-base font-black text-white mt-1">시안 3: 56. GPU 렌더 엔진 콘솔</h3>
        <p class="text-xs text-slate-400 mt-1">WebCodecs 하드웨어 가속 실시간 렌더 그래프 + 14x 초고속 트랜스코더</p>
      </div>
    </div>

    <!-- 1행: 01_main (메인 렌더 콘솔) -->
    <section class="space-y-4">
      <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
        <span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">01</span>
        <h2 class="text-base font-black text-white">메인 렌더 콘솔 (Main Render Studio)</h2>
        <span class="text-xs text-slate-400 ml-2">비디오 업로드, 타임라인 구간 선택(Trim), 인코딩 옵션 세팅 및 변환 실행</span>
      </div>
      <div class="grid grid-cols-3 gap-8">
        <!-- 1안 메인 -->
        <div class="view-card rounded-2xl overflow-hidden border-2 border-red-500/40 bg-slate-900 group" onclick="openLightbox(0)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c1_main.png']}" alt="시안 1 메인" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-red-400 font-bold block">01_main.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 1: REC 타임코드 & 듀얼 슬라이더 Trim</span>
          </div>
        </div>

        <!-- 2안 메인 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(4)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c2_main.png']}" alt="시안 2 메인" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-amber-400 font-bold block">01_main.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 2: 다중 트랙 NLE 타임라인 & 조그 다이얼</span>
          </div>
        </div>

        <!-- 3안 메인 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(8)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c3_main.png']}" alt="시안 3 메인" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-emerald-400 font-bold block">01_main.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 3: WebCodecs 실시간 렌더 그래프 HUD</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2행: 02_detail (변환 결과 상세) -->
    <section class="space-y-4">
      <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
        <span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">02</span>
        <h2 class="text-base font-black text-white">변환 결과 상세 & 플레이어 (Conversion Result)</h2>
        <span class="text-xs text-slate-400 ml-2">무한루프 재생 플레이어, 용량 절감 분석(89.2%), 상세페이지 스튜디오 전송</span>
      </div>
      <div class="grid grid-cols-3 gap-8">
        <!-- 1안 상세 -->
        <div class="view-card rounded-2xl overflow-hidden border-2 border-red-500/40 bg-slate-900 group" onclick="openLightbox(1)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c1_detail.png']}" alt="시안 1 상세" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-red-400 font-bold block">02_detail.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 1: GIF 루프 플레이어 & 89% 용량 절감 리포트</span>
          </div>
        </div>

        <!-- 2안 상세 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(5)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c2_detail.png']}" alt="시안 2 상세" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-amber-400 font-bold block">02_detail.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 2: 프레임 색상 히스토그램 & 마스터 익스포트</span>
          </div>
        </div>

        <!-- 3안 상세 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(9)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c3_detail.png']}" alt="시안 3 상세" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-emerald-400 font-bold block">02_detail.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 3: GPU 14.2배속 가속 벤치마크 지표</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 3행: 03_guide (사용자 가이드북) -->
    <section class="space-y-4">
      <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
        <span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">03</span>
        <h2 class="text-base font-black text-white">사용자 가이드 & 치트시트 (Guidebook)</h2>
        <span class="text-xs text-slate-400 ml-2">4단계 퀵스타트, 오픈마켓별 상세페이지 GIF 용량 규격, PC 로컬 렌더러 연동</span>
      </div>
      <div class="grid grid-cols-3 gap-8">
        <!-- 1안 가이드 -->
        <div class="view-card rounded-2xl overflow-hidden border-2 border-red-500/40 bg-slate-900 group" onclick="openLightbox(2)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c1_guide.png']}" alt="시안 1 가이드" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-red-400 font-bold block">03_guide.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 1: 4단계 퀵스타트 & 마켓별 용량 가이드</span>
          </div>
        </div>

        <!-- 2안 가이드 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(6)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c2_guide.png']}" alt="시안 2 가이드" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-amber-400 font-bold block">03_guide.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 2: NLE 키프레임 인덱싱 & 팔레트 가이드</span>
          </div>
        </div>

        <!-- 3안 가이드 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(10)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c3_guide.png']}" alt="시안 3 가이드" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-emerald-400 font-bold block">03_guide.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 3: WebCodecs GPU 가속 환경 구축 매뉴얼</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 4행: 04_settings (5단계 표준 로그인) -->
    <section class="space-y-4">
      <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
        <span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">04</span>
        <h2 class="text-base font-black text-white">로그인 & 시스템 설정 (Login & Settings)</h2>
        <span class="text-xs text-slate-400 ml-2">2026-11-01 로그인 5단계 수직 레이아웃 표준 규격 100% 준수</span>
      </div>
      <div class="grid grid-cols-3 gap-8">
        <!-- 1안 로그인 -->
        <div class="view-card rounded-2xl overflow-hidden border-2 border-red-500/40 bg-slate-900 group" onclick="openLightbox(3)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c1_settings.png']}" alt="시안 1 로그인" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-red-400 font-bold block">04_settings.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 1: 5단계 표준 로그인 (3D 레드 엠보싱 버튼)</span>
          </div>
        </div>

        <!-- 2안 로그인 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(7)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c2_settings.png']}" alt="시안 2 로그인" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-amber-400 font-bold block">04_settings.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 2: 5단계 표준 로그인 (3D 앰버 골드 버튼)</span>
          </div>
        </div>

        <!-- 3안 로그인 -->
        <div class="view-card rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group" onclick="openLightbox(11)">
          <div class="aspect-[16/10] bg-black relative overflow-hidden">
            <img src="${imgB64['vtg_c3_settings.png']}" alt="시안 3 로그인" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-lg">🔍 1440px 원본 확대</span>
            </div>
          </div>
          <div class="p-4 bg-slate-900/90 border-t border-slate-800">
            <span class="text-[11px] font-mono text-emerald-400 font-bold block">04_settings.png (1440x900)</span>
            <span class="text-xs font-bold text-white">시안 3: 5단계 표준 로그인 (3D 레이저 에메랄드 버튼)</span>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- ==================== 1440px 고화질 원본 라이트박스 모달 ==================== -->
  <div id="lightbox-modal" class="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-6 opacity-0 pointer-events-none transition-all">
    <div class="flex items-center justify-between text-xs z-10">
      <div class="flex items-center gap-3">
        <span id="lb-badge" class="px-3 py-1 rounded-full text-xs font-black uppercase bg-red-600 text-white"></span>
        <span id="lb-title" class="text-sm font-black text-white"></span>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs text-slate-400">좌우 화살표(←/→) 또는 버튼으로 이동 · ESC로 닫기</span>
        <button onclick="closeLightbox()" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">
          ✕ 닫기
        </button>
      </div>
    </div>

    <!-- 이미지 뷰어 -->
    <div class="relative flex-1 flex items-center justify-center overflow-auto my-4">
      <img id="lb-image" src="" alt="확대 뷰" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800">
    </div>

    <!-- 하단 네비게이션 컨트롤 -->
    <div class="flex items-center justify-between z-10 px-4">
      <button onclick="prevView()" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2">
        <span>← 이전 뷰</span>
      </button>
      <span id="lb-counter" class="text-xs font-mono font-bold text-slate-400">1 / 12</span>
      <button onclick="nextView()" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2">
        <span>다음 뷰 →</span>
      </button>
    </div>
  </div>

  <script>
    const viewData = [
      { img: '${imgB64['vtg_c1_main.png']}', badge: '시안 1 (추천안)', title: '54. 시네마틱 헐리우드 네온 REC - 01_main (메인 렌더 콘솔)' },
      { img: '${imgB64['vtg_c1_detail.png']}', badge: '시안 1 (추천안)', title: '54. 시네마틱 헐리우드 네온 REC - 02_detail (변환 결과 상세 & 플레이어)' },
      { img: '${imgB64['vtg_c1_guide.png']}', badge: '시안 1 (추천안)', title: '54. 시네마틱 헐리우드 네온 REC - 03_guide (사용자 가이드북 & 치트시트)' },
      { img: '${imgB64['vtg_c1_settings.png']}', badge: '시안 1 (추천안)', title: '54. 시네마틱 헐리우드 네온 REC - 04_settings (5단계 표준 로그인)' },

      { img: '${imgB64['vtg_c2_main.png']}', badge: '시안 2 (자산화)', title: '55. 하이퍼 NLE 타임라인 - 01_main (메인 NLE 타임라인 콘솔)' },
      { img: '${imgB64['vtg_c2_detail.png']}', badge: '시안 2 (자산화)', title: '55. 하이퍼 NLE 타임라인 - 02_detail (변환 분석 보고서)' },
      { img: '${imgB64['vtg_c2_guide.png']}', badge: '시안 2 (자산화)', title: '55. 하이퍼 NLE 타임라인 - 03_guide (NLE 편집 매뉴얼)' },
      { img: '${imgB64['vtg_c2_settings.png']}', badge: '시안 2 (자산화)', title: '55. 하이퍼 NLE 타임라인 - 04_settings (5단계 표준 로그인)' },

      { img: '${imgB64['vtg_c3_main.png']}', badge: '시안 3 (자산화)', title: '56. GPU 렌더 엔진 - 01_main (WebCodecs GPU 가속 콘솔)' },
      { img: '${imgB64['vtg_c3_detail.png']}', badge: '시안 3 (자산화)', title: '56. GPU 렌더 엔진 - 02_detail (GPU 벤치마크 분석)' },
      { img: '${imgB64['vtg_c3_guide.png']}', badge: '시안 3 (자산화)', title: '56. GPU 렌더 엔진 - 03_guide (하드웨어 가속 매뉴얼)' },
      { img: '${imgB64['vtg_c3_settings.png']}', badge: '시안 3 (자산화)', title: '56. GPU 렌더 엔진 - 04_settings (5단계 표준 로그인)' },
    ];

    let currentIndex = 0;
    const modal = document.getElementById('lightbox-modal');
    const lbImg = document.getElementById('lb-image');
    const lbBadge = document.getElementById('lb-badge');
    const lbTitle = document.getElementById('lb-title');
    const lbCounter = document.getElementById('lb-counter');

    function openLightbox(index) {
      currentIndex = index;
      updateLightbox();
      modal.classList.add('active');
      modal.classList.remove('pointer-events-none');
    }

    function closeLightbox() {
      modal.classList.remove('active');
      modal.classList.add('pointer-events-none');
    }

    function updateLightbox() {
      const cur = viewData[currentIndex];
      lbImg.src = cur.img;
      lbBadge.textContent = cur.badge;
      lbTitle.textContent = cur.title;
      lbCounter.textContent = (currentIndex + 1) + ' / ' + viewData.length;
    }

    function prevView() {
      currentIndex = (currentIndex - 1 + viewData.length) % viewData.length;
      updateLightbox();
    }

    function nextView() {
      currentIndex = (currentIndex + 1) % viewData.length;
      updateLightbox();
    }

    window.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevView();
      if (e.key === 'ArrowRight') nextView();
    });
  </script>
</body>
</html>`;

const comparisonHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AI 영상렌더 스튜디오 (video-to-gif) 4대 화면 3시안 종합 비교표</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800;900&display=swap');
    body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; }
  </style>
</head>
<body class="bg-[#07090E] text-slate-100 min-h-screen p-8">
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <a href="/showcase.html" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
        ← 12개 뷰 쇼케이스로 돌아가기
      </a>
      <span class="text-xs text-slate-400">포트 3800 실시간 서빙 중</span>
    </div>
    ${comparisonTableHtml}
  </div>
</body>
</html>`;

// 1. D:\Antigravity\Design\showcase.html 및 comparison.html 저장
fs.writeFileSync(path.join(designDir, 'showcase.html'), showcaseHtml);
fs.writeFileSync(path.join(designDir, 'comparison.html'), comparisonHtml);
console.log('Updated D:\\Antigravity\\Design\\showcase.html & comparison.html');

// 2. 3대 독립 템플릿 폴더 생성 및 영구 보존
const tpl54 = path.join(designDir, '54_cinematic_hollywood_rec');
const tpl55 = path.join(designDir, '55_hyper_nle_timeline');
const tpl56 = path.join(designDir, '56_ultra_gpu_engine');

for (const dir of [tpl54, tpl55, tpl56]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 템플릿별 showcase_12views.html 복사
const vtgShowcaseRaw = fs.readFileSync('scratch/vtg_showcase_12views.html', 'utf8');
fs.writeFileSync(path.join(tpl54, 'showcase_12views.html'), vtgShowcaseRaw);
fs.writeFileSync(path.join(tpl55, 'showcase_12views.html'), vtgShowcaseRaw);
fs.writeFileSync(path.join(tpl56, 'showcase_12views.html'), vtgShowcaseRaw);

// 템플릿별 README.md 작성
fs.writeFileSync(path.join(tpl54, 'README.md'), `# 54. 시네마틱 헐리우드 네온 REC 렌더러 스타일 (Cinematic Hollywood Neon REC Renderer Style)

> **상태**: AI 영상렌더 스튜디오 (\`video-to-gif\`) 1안 추천안  
> **도메인**: 비디오 NLE 인코딩, 이커머스 상세페이지 GIF 제작, 숏폼 클립 변환  
> **핵심 배색**: 딥 옵시디언 나이트 (\`#0B0F19\`) + 아이코닉 헐리우드 레드 (\`#EF4444\` / \`#DC2626\`) + 네온 시네마 골드 (\`#F59E0B\`)  
> **3D 버튼**: 3D 엠보싱 헐리우드 레드 버튼 (\`.btn-3d-red\`, 섀도우 \`0 4px 0 #991b1b\`)

## 4대 화면 구성
1. \`01_main.png\`: LIVE 🔴 REC 타임코드 뷰파인더 + 듀얼 슬라이더 Trim (0.1s 단위) + 마켓별 원클릭 프리셋
2. \`02_detail.png\`: 무한루프 실시간 플레이어 + 89.2% 용량 절감 분석 + 상세페이지 스튜디오 즉시 전송
3. \`03_guide.png\`: 4단계 퀵스타트 치트시트 + 네이버/쿠팡/자사몰 용량 기준 + PC 로컬 렌더러 연동
4. \`04_settings.png\`: 2026-11-01 로그인 5단계 수직 레이아웃 표준 규격 준수 화면
`);

fs.writeFileSync(path.join(tpl55, 'README.md'), `# 55. 하이퍼 NLE 타임라인 프로덕션 스튜디오 스타일 (Hyper NLE Timeline Production Studio Style)

> **상태**: AI 영상렌더 스튜디오 (\`video-to-gif\`) 2안 자산화  
> **도메인**: 다빈치 리졸브 감성 다중 트랙 NLE 타임라인, 키프레임 인덱서  
> **핵심 배색**: 다크 에스프레소 슬레이트 (\`#14171F\`) + 프로페셔널 앰버 골드 (\`#F59E0B\`) + 일렉트릭 사이언 (\`#06B6D4\`)  
> **3D 버튼**: 3D 엠보싱 앰버 골드 버튼 (\`.btn-3d-gold\`, 섀도우 \`0 4px 0 #92400e\`)
`);

fs.writeFileSync(path.join(tpl56, 'README.md'), `# 56. 울트라 하이퍼 스피드 GPU 렌더 엔진 콘솔 스타일 (Ultra Hyper-Speed GPU Render Engine Console Style)

> **상태**: AI 영상렌더 스튜디오 (\`video-to-gif\`) 3안 자산화  
> **도메인**: WebCodecs GPU 하드웨어 가속 트랜스코더 랩  
> **핵심 배색**: 매트 옵시디언 딥블랙 (\`#080A10\`) + 레이저 에메랄드 (\`#10B981\`) + 네온 사이언 (\`#00F2FE\`)  
> **3D 버튼**: 3D 엠보싱 레이저 에메랄드 버튼 (\`.btn-3d-emerald\`, 섀도우 \`0 4px 0 #065f46\`)
`);

console.log('All templates and showcase files generated successfully!');
