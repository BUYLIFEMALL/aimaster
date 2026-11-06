const fs = require('fs');
let app = fs.readFileSync('allinone-graphic/src/components/studio/AllInOneGraphicApp.tsx', 'utf8');

// 1. Banner
app = app.replace('bg-gradient-to-r from-amber-500/10 to-orange-500/10', 'bg-gradient-to-r from-indigo-500/10 to-pink-500/10');
app = app.replace('bg-amber-500 text-white border-amber-600 shadow-sm', 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white border-indigo-700 shadow-sm');
app = app.replace('border-amber-200/80 hover:bg-amber-50', 'border-indigo-200/80 hover:bg-indigo-50/50');
app = app.replace('bg-amber-100 text-amber-600', 'bg-indigo-100 text-indigo-600');
app = app.replace('text-amber-100', 'text-indigo-100');
app = app.replace('bg-white text-amber-600', 'bg-white text-indigo-700');
app = app.replace('bg-amber-100 text-amber-700', 'bg-indigo-100 text-indigo-700');

// 2. Search
app = app.replace('focus:ring-amber-500', 'focus:ring-indigo-500');

// 3. Template card selection
app = app.replace('bg-amber-50/70 border-amber-300 shadow-xs', 'bg-indigo-50/70 border-indigo-300 shadow-xs');
app = app.replace('bg-amber-500 text-white', 'bg-indigo-600 text-white');
app = app.replace('text-amber-900', 'text-indigo-950');

// 4. Pipeline banner injection
const pipelineBanner = `        {/* 4단계 그래픽 파이프라인 인디케이터 배너 (60번 피그마 프로 비주얼 아틀리에) */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/30 rounded-2xl p-4 text-white shadow-lg shadow-indigo-950/20 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase text-indigo-300">
                🎨 FIGMA PRO VISUAL GRAPHIC PIPELINE
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold">
                123 PRESETS LOADED
              </span>
              <span>Gemini & Claude Multi-Engine</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-indigo-600/30 border border-indigo-400/40 rounded-xl p-2.5">
              <div className="text-[10px] text-indigo-300 font-black">STEP 01</div>
              <div className="font-bold text-white text-xs mt-0.5">123종 프리셋 탐색</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-black">STEP 02</div>
              <div className="font-bold text-slate-200 text-xs mt-0.5">필드 변수 튜닝</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-black">STEP 03</div>
              <div className="font-bold text-slate-200 text-xs mt-0.5">스마트 인페인팅</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-black">STEP 04</div>
              <div className="font-bold text-slate-200 text-xs mt-0.5">벡터/HD 에셋 추출</div>
            </div>
          </div>
        </div>
`;

const targetCentralCRLF = '      {/* 3. 중앙 작업 영역 (입력 및 세부 설정) */}\r\n      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-slate-50/50">\r\n';
const targetCentralLF = '      {/* 3. 중앙 작업 영역 (입력 및 세부 설정) */}\n      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-slate-50/50">\n';

if (app.includes(targetCentralCRLF)) {
  app = app.replace(targetCentralCRLF, targetCentralCRLF + pipelineBanner);
  console.log('Injected pipeline banner with CRLF');
} else if (app.includes(targetCentralLF)) {
  app = app.replace(targetCentralLF, targetCentralLF + pipelineBanner);
  console.log('Injected pipeline banner with LF');
} else {
  console.log('Could not find targetCentral');
}

// 5. Selected template header card
app = app.replace('bg-amber-50 text-amber-600', 'bg-indigo-50 text-indigo-600');
app = app.replace('bg-amber-50/60 border-amber-200/60', 'bg-indigo-50/60 border-indigo-200/60');
app = app.replace('text-amber-900', 'text-indigo-900');
app = app.replace('text-amber-800/90', 'text-indigo-800/90');

// 6. Mode toggle
app = app.replace('bg-white text-amber-600 shadow-xs font-bold', 'bg-white text-indigo-600 shadow-xs font-bold');

// 7. AI Model buttons
app = app.replaceAll('bg-amber-50/70 border-amber-400 shadow-xs text-amber-900', 'bg-indigo-50/70 border-indigo-400 shadow-xs text-indigo-900');
app = app.replaceAll('text-amber-600', 'text-indigo-600');
app = app.replaceAll('bg-amber-100', 'bg-indigo-100');

// 8. Generate Action Button
app = app.replace(
  'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50',
  'btn-3d-indigo text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-500/20'
);

fs.writeFileSync('allinone-graphic/src/components/studio/AllInOneGraphicApp.tsx', app, 'utf8');
console.log('Successfully updated AllInOneGraphicApp.tsx');
