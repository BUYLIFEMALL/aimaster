"use client";

import Link from "next/link";
import {
  Sparkles,
  Music,
  Disc3,
  Sliders,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Radio,
  FileMusic,
  CheckCircle2,
  Headphones,
  Mic2,
  Layers,
  ArrowRight,
  HelpCircle,
  Keyboard,
  ListMusic,
  Flame,
} from "lucide-react";

export function UsageGuide() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. Hero Spotlight Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-gradient-to-br from-orange-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide">
              <Sparkles size={14} className="animate-pulse" />
              <span>SUNO AI OFFICIAL STUDIO STANDARD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Suno 음악기획 자동화 완벽 가이드북 🎵
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              머릿속에 떠오른 감성과 멜로디 아이디어를 <strong className="text-orange-400">전문 프로듀서 수준의 곡·앨범 기획</strong>으로 완성하고, 
              클릭 한 번으로 <strong className="text-white">Suno 공식 사이트(suno.com/create)</strong>에서 고음질 음원을 즉시 뽑아낼 수 있습니다.
            </p>
          </div>

          <div className="flex md:flex-col gap-3 w-full md:w-auto">
            <a
              href="https://suno.com/create"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <span>Suno 공식 Create 열기</span>
              <ExternalLink size={15} />
            </a>
            <Link
              href="/?section=builder"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm border border-zinc-700 transition-all"
            >
              <Music size={15} className="text-orange-400" />
              <span>지금 곡 기획하기</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Visual 4-Step Pipeline Architecture */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio size={20} className="text-orange-500" />
              <span>4단계 초고속 음악 제작 파이프라인 (Visual Workflow)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              기획부터 Suno 음원 생성까지 단 3분이면 완성되는 워크플로우를 확인하세요.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-700">
            Flow Wizard v1.10
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 flex flex-col justify-between hover:border-orange-500/40 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-black text-sm flex items-center justify-center border border-orange-500/30">
                  01
                </span>
                <Sliders size={18} className="text-zinc-500 group-hover:text-orange-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white">컨셉 & 스타일 선택</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                461개 장르 프리셋, 243개 스타일 그룹, 200개 댄스 조합 중 마음에 드는 사운드 텍스처를 선택하거나 직접 키워드를 입력합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5 text-[11px] text-orange-400 font-medium">
              <span>장르 / BPM / 무드 매칭</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 flex flex-col justify-between hover:border-purple-500/40 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-black text-sm flex items-center justify-center border border-purple-500/30">
                  02
                </span>
                <Mic2 size={18} className="text-zinc-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white">AI 작사 & 트랙 기획</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                본인의 AI 키(Gemini, OpenAI, Claude)로 곡의 스토리·의도와 곡 구성([Intro], [Verse], [Chorus])을 감성적으로 자동 생성합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5 text-[11px] text-purple-400 font-medium">
              <span>보컬/랩 캐스팅 & 편곡</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 flex flex-col justify-between hover:border-pink-500/40 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 font-black text-sm flex items-center justify-center border border-pink-500/30">
                  03
                </span>
                <Copy size={18} className="text-zinc-500 group-hover:text-pink-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white">클립보드 원클릭 복사</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                빌더 화면의 복사 버튼을 눌러 Suno 호환 <strong className="text-zinc-200">Style of Music 프롬프트</strong>와 <strong className="text-zinc-200">Lyrics 전문</strong>을 복사합니다.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5 text-[11px] text-pink-400 font-medium">
              <span>제목 / 스타일 / 가사 추출</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-colors group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                  04
                </span>
                <Headphones size={18} className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white">Suno 본사이트 생성</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Suno 사이트(suno.com/create)를 열고 Custom 모드에 붙여넣은 뒤 Create를 누르면 초고음질 완곡이 즉시 탄생합니다!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span>Suno v3.5 / v4 / v5 / v6 생성</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Suno Prompt Structure Blueprint */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 shadow-xl space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileMusic size={20} className="text-purple-400" />
            <span>Suno 프롬프트 엔지니어링 구조 설계도 (Prompt Blueprint)</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Suno AI가 최고 수준의 악기 편성 및 보컬 음색을 표현할 수 있도록 설계된 표준 프롬프트 구조입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Style of Music Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                Style of Music (사운드 프롬프트)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono">
                최대 120자 권장
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs text-zinc-300 leading-relaxed">
              <span className="text-orange-400 font-semibold">[Genre: K-Pop Ballad]</span>{" "}
              <span className="text-purple-400 font-semibold">[BPM: 75]</span>{" "}
              <span className="text-pink-400 font-semibold">[Vocal: Emotional Female Baritone]</span>{" "}
              <span>Acoustic Grand Piano, Warm Cello, Orchestral Strings, Melodic Chorus, Nostalgic Cinematic build-up</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              💡 <strong>팁:</strong> 아티스트 이름을 직접 넣는 것보다 구체적인 악기(Rhodes, 808 Bass), 감성 무드(Dreamy, Nostalgic), 보컬 특성(Airy Falsetto, Husky)을 넣을 때 압도적인 퀄리티가 나옵니다.
            </p>
          </div>

          {/* Lyrics Structure Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Lyrics (메타 태그 구조화 가사)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
                구조 메타태그
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs text-zinc-300 leading-relaxed space-y-1">
              <div className="text-purple-400 font-bold">[Intro: Soft Acoustic Piano]</div>
              <div className="text-zinc-400 pl-2">창가에 번지는 저녁 빛, 흐려진 기억들...</div>
              <div className="text-purple-400 font-bold mt-1">[Verse 1]</div>
              <div className="text-zinc-400 pl-2">우리가 함께 걸었던 그 길 위엔...</div>
              <div className="text-purple-400 font-bold mt-1">[Chorus: Grand Orchestral Climax]</div>
              <div className="text-zinc-200 pl-2 font-medium">영원히 잊지 못할 너의 목소리...</div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              💡 <strong>팁:</strong> 대괄호 <code>[Verse]</code>, <code>[Chorus]</code>, <code>[Guitar Solo]</code>, <code>[Outro]</code> 등의 메타 태그를 넣으면 AI가 곡의 기승전결을 극적으로 연출합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Core Features Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <Disc3 size={20} />
          </div>
          <h3 className="text-base font-bold text-white">3~12곡 앨범 일괄 기획</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            단일 싱글뿐 아니라 EP, 정규 앨범 전체의 트랙리스트 순서와 유기적인 스토리라인을 한 번에 구성하고 개별 트랙을 작사할 수 있습니다.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Layers size={20} />
          </div>
          <h3 className="text-base font-bold text-white">200종 댄스 머신 조합</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            클럽, EDM, 하우스, 디스코 등 댄스 장르의 BPM 템포와 시드 스타일을 즉시 믹스 매치하여 트렌디한 댄스 트랙을 설계합니다.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <h3 className="text-base font-bold text-white">100% 로컬 프라이버시</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            내가 기획한 가사와 프로젝트는 본인 브라우저에만 안전하게 암호화 보관되며, 언제든 JSON 백업 파일로 내보내고 가져올 수 있습니다.
          </p>
        </div>
      </div>

      {/* 5. Keycap Shortcut Sheet */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Keyboard size={18} className="text-orange-400" />
          <span>신속한 작업을 위한 키보드 단축키 & 팁</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">빌더 이동</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px]">Alt + 1</kbd>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">앨범 패널</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px]">Alt + 2</kbd>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">스타일 복사</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px]">클릭 1회</kbd>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">JSON 백업</span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px]">보관함</kbd>
          </div>
        </div>
      </div>

      {/* 6. FAQ Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <HelpCircle size={18} className="text-orange-400" />
          <span>자주 묻는 질문 (FAQ)</span>
        </h2>
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <strong className="text-zinc-200 block font-semibold">
              Q. 음악을 생성할 때 비용이 발생하나요?
            </strong>
            <p className="text-zinc-400 leading-relaxed text-xs">
              A. 본 프로그램에서 곡을 기획하고 가사를 작성할 때는 회원이 등록한 본인 AI 키(Gemini Flash-Lite 등)의 극소량 텍스트 토큰만 사용되며, 
              내장 프리셋 탐색은 100% 무료입니다. 이후 복사한 내용을 Suno 공식 사이트에 붙여넣어 생성할 때는 본인의 Suno 계정 크레딧이 사용됩니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <strong className="text-zinc-200 block font-semibold">
              Q. 한국어 가사 발음과 랩은 어떻게 잘 나오게 하나요?
            </strong>
            <p className="text-zinc-400 leading-relaxed text-xs">
              A. 빌더의 세부 설정에서 [보컬/랩 캐스팅]을 [한국어 남성/여성 래퍼] 또는 [R&B 보컬]로 지정하면, 
              프롬프트에 <code>[Pronunciation: Clear Korean Diction]</code> 및 <code>[Flow: Fast Syncopated]</code> 메타태그가 자동 주입되어 발음이 훨씬 정확해집니다.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <strong className="text-zinc-200 block font-semibold">
              Q. 브라우저 캐시를 지우면 작업했던 곡들이 사라지나요?
            </strong>
            <p className="text-zinc-400 leading-relaxed text-xs">
              A. 네, 로컬 저장소에 저장되므로 브라우저 데이터를 삭제하기 전에 반드시 [저장됨] 또는 [검수·보관함] 메뉴에서 
              <strong>[JSON 저장]</strong> 버튼을 눌러 프로젝트 백업 파일을 다운로드해 두시는 것을 권장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
