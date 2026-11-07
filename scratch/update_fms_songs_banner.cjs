const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../free-music-studio/src/app/(dashboard)/songs/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const targetOld = `      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Music2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🎵 곡 만들기</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              노래나 연주곡을 고르고 스타일을 정하면, 내 PC 엔진이 키 없이 음악을 만듭니다. 가사는 직접 쓰거나 AI 작사로 채울 수 있습니다.
            </p>
          </div>
        </div>
      </div>`;

const targetNew = `      {/* 6단계 DAW 트랙 파이프라인 인디케이터 배너 (63. 사이버 DAW 네온 스튜디오 덱 스타일) */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-[#0a0f1d] via-[#0c1626] to-[#070b14] p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-2.5 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)]">
              <Music2 className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-100">🎵 곡 만들기 — DAW 스튜디오</h1>
                <span className="rounded-full bg-emerald-950/80 border border-emerald-500/35 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400">
                  CYBER DAW PRO
                </span>
                <span className="rounded-md bg-slate-900 border border-slate-700/80 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  24-TRACK
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                내 PC 로컬 GPU 100% 무료 무제한 연산 · 24트랙 DAW 스템 믹싱 & 마스터링 콘솔
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              로컬 GPU 무제한 연산중
            </span>
            <span className="rounded-full bg-amber-950/50 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
              무손실 24bit FLAC 지원
            </span>
          </div>
        </div>

        {/* 6단계 파이프라인 스텝퍼 */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-3 py-2 text-emerald-300 font-extrabold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-slate-950">1</span>
            <span className="truncate">01. 곡 기획·스타일</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">2</span>
            <span className="truncate">02. 내 PC 로컬 엔진</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">3</span>
            <span className="truncate">03. 작업 대기열 (GPU)</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">4</span>
            <span className="truncate">04. 24트랙 믹싱</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">5</span>
            <span className="truncate">05. AI 가사/마스터링</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-400 font-bold">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">6</span>
            <span className="truncate">06. 4K 비디오 렌더</span>
          </div>
        </div>

        {/* 24트랙 스테레오 오디오 파형 뷰파인더 덱 목업 */}
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-[#060911]/90 p-3.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-extrabold">실시간 24트랙 스테레오 오디오 뷰파인더</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono">
              <span>00:03:42</span>
              <span>•</span>
              <span className="text-emerald-400">48kHz 24bit FLAC</span>
              <span>•</span>
              <span className="text-amber-400">-14.0 LUFS</span>
            </div>
          </div>
          <div className="flex items-center gap-1 h-8 px-1">
            {Array.from({ length: 64 }).map((_, i) => {
              const h = 20 + Math.sin(i * 0.25) * 45 + Math.cos(i * 0.6) * 20;
              const isCurrent = i >= 24 && i <= 26;
              return (
                <div
                  key={i}
                  style={{ height: \`\${Math.max(12, Math.min(100, h))}%\` }}
                  className={\`flex-1 rounded-sm transition-all \${isCurrent ? "bg-white shadow-[0_0_8px_#fff]" : i < 24 ? "bg-emerald-400" : "bg-emerald-800/40"}\`}
                />
              );
            })}
          </div>
        </div>
      </div>`;

if (!content.includes(targetOld)) {
  console.error("targetOld not found!");
  process.exit(1);
}

content = content.replace(targetOld, targetNew);
fs.writeFileSync(targetFile, content, 'utf8');
console.log("Successfully injected 6-step DAW pipeline banner and waveform deck mockup!");
