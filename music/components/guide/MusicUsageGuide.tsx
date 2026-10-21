"use client";

import { useState } from "react";
import Link from "next/link";

type TabType = "steps" | "styles" | "faq";

export function MusicUsageGuide() {
  const [activeTab, setActiveTab] = useState<TabType>("steps");
  const [openStyleIndex, setOpenStyleIndex] = useState<number | null>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleStyle = (idx: number) => {
    setOpenStyleIndex(openStyleIndex === idx ? null : idx);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-6">
      {/* 3대 탭 네비게이션 헤더 */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#14141c] border border-[#272734]">
        <button
          onClick={() => setActiveTab("steps")}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "steps"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a24]"
          }`}
        >
          <span>📋</span>
          <span>4단계 실전 마스터 가이드</span>
        </button>

        <button
          onClick={() => setActiveTab("styles")}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "styles"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a24]"
          }`}
        >
          <span>🎛️</span>
          <span>Suno 스타일 & 메타 태그 비법</span>
        </button>

        <button
          onClick={() => setActiveTab("faq")}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "faq"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a24]"
          }`}
        >
          <span>💡</span>
          <span>사운드 꿀팁 & FAQ</span>
        </button>
      </div>

      {/* 탭 1: 4단계 실전 마스터 가이드 */}
      {activeTab === "steps" && (
        <div className="space-y-5">
          {/* STEP 00: 사전 준비 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#13131a] border border-[#262635] shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-black">
                00
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                필수 API 키 등록 및 플랫폼 연동
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
              Suno 음악 자동화는 회원 본인의 개인 키를 사용하여 안전하고 독립적으로 음원을 생성합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-orange-400 mb-1 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>Suno API 토큰 연동</span>
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  Suno 서비스 API 토큰을 좌측 메뉴의 <strong className="text-zinc-200">[API 키 등록]</strong>에서 안전하게 등록합니다.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>완전한 계정 격리 보장</span>
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  등록된 모든 키는 암호화되어 본인 계정 세션에서만 단독 사용되며, 타인에게 절대 공유되지 않습니다.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 01: 새 음악 기획 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#13131a] border border-[#262635] shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-black">
                01
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                새 음악 기획 (주제·분위기 → 스타일 & 가사 완성)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
              좌측 1단계 <strong className="text-orange-400">[음악 기획]</strong> 메뉴에서 원하는 곡의 주제, 상황, 감성을 입력하면 AI가 Suno에 최적화된 프롬프트를 완성합니다.
            </p>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white">🎯 기획 핵심 옵션 가이드</span>
                  <span className="text-[11px] text-orange-400 font-semibold">PlanningForm</span>
                </div>
                <ul className="space-y-1.5 text-zinc-400">
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-400 shrink-0">•</span>
                    <span><strong>주제 및 상황 설명</strong>: &ldquo;새벽 드라이브에 어울리는 감성 R&amp;B&rdquo;, &ldquo;카페 브이로그용 잔잔한 어쿠스틱&rdquo; 등 구체적으로 적을수록 최상의 가사가 완성됩니다.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-400 shrink-0">•</span>
                    <span><strong>보컬 성별 선택</strong>: 남성(Male), 여성(Female), 혼성 듀엣(Duet) 중 원하는 보컬 톤을 지정합니다.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-400 shrink-0">•</span>
                    <span><strong>연주곡(Instrumental) 모드</strong>: 보컬 없이 배경음악(BGM)으로만 쓰고 싶을 때 연주곡 옵션을 체크하면 가사 없이 고품질 비트/멜로디만 생성됩니다.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-400 shrink-0">•</span>
                    <span><strong>AI 스타일 &amp; 가사 자동 구성</strong>: 생성 버튼을 누르면 인트로, 벌스, 코러스, 브릿지, 아웃트로의 완성형 구조화 가사가 즉시 추출됩니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* STEP 02: Suno AI 생성 & 트랙 관리 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#13131a] border border-[#262635] shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-black">
                02
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Suno AI 생성 &amp; 트랙 관리 (2곡 동시 생성 &amp; 실시간 재생)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
              좌측 2단계 <strong className="text-orange-400">[음악 생성 · 트랙 관리]</strong>에서 기획된 프롬프트로 Suno AI 엔진을 호출하여 고음질 음원을 생성합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-orange-400 mb-1 flex items-center gap-1.5">
                  <span>🎵</span>
                  <span>버전별 2개 트랙 동시 생성</span>
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  1회 요청 시 서로 다른 편곡과 멜로디의 트랙 2개가 동시 생성되어, 더 마음에 드는 버전을 선택할 수 있습니다.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <span>🖼️</span>
                  <span>AI 앨범 커버 자동 탑재</span>
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  곡의 분위기와 장르에 맞춤화된 감각적인 앨범 아트워크가 자동으로 생성되어 플레이어에 함께 표시됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 03: 프로페셔널 후가공 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#13131a] border border-[#262635] shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-black">
                03
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                프로페셔널 후가공: 곡 연장(Extend), MR/보컬 분리, 고음질 WAV
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
              기본 2~3분의 러닝타임을 넘어 긴 음원이 필요하거나, 노래방 반주(MR) 또는 전문 음원 파일이 필요할 때 원클릭으로 가공합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <span className="text-base mb-1 block">⏩</span>
                <p className="font-bold text-white mb-1">곡 연장 (Extend)</p>
                <p className="text-zinc-400 leading-relaxed">
                  곡 끝 30초 전 지점부터 AI가 만든 새 가사(브릿지·마지막 후렴·아웃트로)로 다음 파트를 이어서 작곡·연장합니다.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <span className="text-base mb-1 block">🎤</span>
                <p className="font-bold text-white mb-1">MR / 보컬 분리</p>
                <p className="text-zinc-400 leading-relaxed">
                  AI 분리 엔진으로 목소리를 제거한 순수 반주 트랙(MR)과 아카펠라 보컬을 각각 추출합니다.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <span className="text-base mb-1 block">💾</span>
                <p className="font-bold text-white mb-1">무손실 WAV 추출</p>
                <p className="text-zinc-400 leading-relaxed">
                  압축 손실 없는 스튜디오 마스터링급 24-bit WAV 파일로 다운로드하여 방송·영상에 바로 씁니다.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 04: 음악 Remix 스튜디오 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#13131a] border border-[#262635] shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-black">
                04
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                음악 Remix 스튜디오 (새로운 장르로 재해석 리메이크)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
              좌측 3단계 <strong className="text-orange-400">[음악 Remix 스튜디오]</strong>에서 생성된 트랙이나 외부 오디오 파일을 업로드하여 완전히 새로운 장르와 분위기로 재탄생시킵니다.
            </p>
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30 text-xs">
              <p className="font-bold text-orange-400 mb-1.5 flex items-center gap-1.5">
                <span>🎛️</span>
                <span>Remix 파이프라인 활용 예시</span>
              </p>
              <p className="text-zinc-300 leading-relaxed mb-2">
                &ldquo;조용한 발라드 곡을 신나는 EDM 클럽 리믹스로&rdquo;, &ldquo;어쿠스틱 팝을 트렌디한 시티팝으로&rdquo; 손쉽게 스타일 전환이 가능합니다.
              </p>
              <Link
                href="/remix"
                className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold"
              >
                <span>Remix 스튜디오 바로가기</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 탭 2: Suno 스타일 & 메타 태그 비법 */}
      {activeTab === "styles" && (
        <div className="space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#13131a] border border-[#262635]">
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">
              🎛️ 고품질 음원 생성을 위한 스타일 태그 조합법
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-5">
              Suno는 단순한 문장보다 <strong>[장르 + 악기 + 템포 + 분위기 + 보컬특징 + 믹싱/마스터링]</strong> 형태의 콤마(,) 구분 태그를 입력할 때 가장 뛰어난 사운드를 렌더링합니다.
            </p>

            {/* 인기 스타일 프리셋 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-6">
              <div className="p-4 rounded-xl bg-[#181822] border border-[#272736]">
                <span className="font-bold text-orange-400 block mb-1">🎧 K-Pop / 아이돌 댄스 팝</span>
                <code className="text-[11px] text-zinc-300 bg-[#121217] p-2 rounded-lg block border border-[#23232f] font-mono leading-relaxed">
                  K-Pop, Energetic Synthpop, 126 BPM, Female Vocal, Catchy Hook, Crisp Master, Upbeat
                </code>
              </div>

              <div className="p-4 rounded-xl bg-[#181822] border border-[#272736]">
                <span className="font-bold text-amber-400 block mb-1">☕ 감성 로파이 힐링 비트</span>
                <code className="text-[11px] text-zinc-300 bg-[#121217] p-2 rounded-lg block border border-[#23232f] font-mono leading-relaxed">
                  Lofi Hip Hop, Chillhop, 75 BPM, Vinyl Crackle, Mellow Rhodes Piano, Warm Bass, Instrumental
                </code>
              </div>

              <div className="p-4 rounded-xl bg-[#181822] border border-[#272736]">
                <span className="font-bold text-emerald-400 block mb-1">🌃 시티팝 / 레트로 그루브</span>
                <code className="text-[11px] text-zinc-300 bg-[#121217] p-2 rounded-lg block border border-[#23232f] font-mono leading-relaxed">
                  80s City Pop, Retro Funk, Slap Bass, Brass Section, Nostalgic, Male Vocal, Smooth Groove
                </code>
              </div>

              <div className="p-4 rounded-xl bg-[#181822] border border-[#272736]">
                <span className="font-bold text-sky-400 block mb-1">🎬 시네마틱 웅장한 OST</span>
                <code className="text-[11px] text-zinc-300 bg-[#121217] p-2 rounded-lg block border border-[#23232f] font-mono leading-relaxed">
                  Cinematic Orchestral, Epic Build-up, Deep Cello, Powerful Drums, Hans Zimmer Style, Instrumental
                </code>
              </div>
            </div>

            {/* 메타 태그 아코디언 */}
            <h4 className="text-sm font-bold text-white mb-3">
              📝 가사 구조를 지휘하는 Suno 메타 태그(Meta Tags) 모음
            </h4>
            <div className="space-y-2">
              {[
                {
                  tag: "[Intro]",
                  title: "도입부 인트로",
                  desc: "곡의 시작을 알리는 도입부입니다. [Acoustic Guitar Intro] 처럼 악기를 명시하면 해당 악기 연주로 시작합니다.",
                },
                {
                  tag: "[Verse 1], [Verse 2]",
                  title: "이야기가 전개되는 절 (벌스)",
                  desc: "가사의 스토리를 담담하게 풀어가는 파트입니다. 보컬의 톤이 차분하게 전개됩니다.",
                },
                {
                  tag: "[Pre-Chorus]",
                  title: "코러스 직전 빌드업",
                  desc: "후렴구로 넘어가기 전 긴장감과 리듬감을 점진적으로 고조시키는 브릿지 역할입니다.",
                },
                {
                  tag: "[Chorus]",
                  title: "곡의 절정 후렴구 (싸비)",
                  desc: "가장 멜로디가 강조되고 폭발적인 가창과 비트가 터져 나오는 곡의 하이라이트입니다.",
                },
                {
                  tag: "[Bridge]",
                  title: "새로운 전환 파트 (브릿지)",
                  desc: "반복을 벗어나 곡 후반부 분위기를 반전시키거나 고음 애드리브가 들어가는 파트입니다.",
                },
                {
                  tag: "[Outro] / [Fade Out]",
                  title: "마무리 아웃트로",
                  desc: "곡을 서서히 정리하며 마무리 짓는 페이드 아웃 구간을 연출합니다.",
                },
              ].map((item, idx) => (
                <div
                  key={item.tag}
                  className="rounded-xl border border-[#272736] bg-[#161622] overflow-hidden"
                >
                  <button
                    onClick={() => toggleStyle(idx)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#1a1a28] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <code className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        {item.tag}
                      </code>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-zinc-500 text-xs">
                      {openStyleIndex === idx ? "▲" : "▼"}
                    </span>
                  </button>
                  {openStyleIndex === idx && (
                    <div className="p-3.5 pt-0 text-xs text-zinc-400 border-t border-[#222230] bg-[#12121a]">
                      <p className="leading-relaxed">{item.desc}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 탭 3: 사운드 꿀팁 & FAQ */}
      {activeTab === "faq" && (
        <div className="space-y-4">
          {/* 4대 실전 꿀팁 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#13131a] border border-[#262635]">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3">
              💡 프로 프로듀서 수준의 4대 사운드 꿀팁
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-6">
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-orange-400 mb-1">1. 한글 가사 발음 최적화</p>
                <p className="text-zinc-400 leading-relaxed">
                  가사에 너무 긴 문장을 한 줄에 넣지 말고, 쉼표(,)나 줄바꿈을 자주 주면 AI가 숨 쉬는 타이밍을 자연스럽게 잡아 박자가 밀리지 않습니다.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-amber-400 mb-1">2. 곡 연장(Extend) 이음매 맞추기</p>
                <p className="text-zinc-400 leading-relaxed">
                  곡 연장 시 바로 앞 소절의 마지막 마디(예: 후렴 끝나는 2:15 지점)를 지정하고, 연장 가사의 첫 줄을 [Chorus] 다음 소절로 지정하면 끊김 없이 이어집니다.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-emerald-400 mb-1">3. MR 분리 시 고품질 결과 얻기</p>
                <p className="text-zinc-400 leading-relaxed">
                  보컬에 리버브(울림)가 너무 강한 트랙보다는 담백한 트랙에서 MR을 분리할 때 잡음 없는 깨끗한 반주 파일이 완성됩니다.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181822] border border-[#272736]">
                <p className="font-bold text-sky-400 mb-1">4. 유튜브/쇼츠 저작권 안내</p>
                <p className="text-zinc-400 leading-relaxed">
                  본인이 유료 플랜 계정의 API 키로 생성한 음원은 상업적 사용(유튜브 수익 창출, 광고 BGM, 음원 발매)이 가능합니다.
                </p>
              </div>
            </div>

            {/* 5대 자주 묻는 질문 FAQ */}
            <h4 className="text-sm font-bold text-white mb-3">
              ❓ 자주 묻는 질문 (FAQ)
            </h4>
            <div className="space-y-2">
              {[
                {
                  q: "생성 요청 후 완료까지 얼마나 걸리나요?",
                  a: "보통 1~2분 내외로 2개 트랙이 동시에 완성됩니다. 서버 트래픽이 몰릴 경우 최대 3~4분 정도 소요될 수 있으며, 생성 완료 시 트랙 목록에 자동으로 나타납니다.",
                },
                {
                  q: "곡 연장(Extend)은 몇 번까지 가능한가요?",
                  a: "필요에 따라 2회 이상 연속으로 연장하여 4~5분 이상의 풀랭스 완곡을 완성할 수 있습니다.",
                },
                {
                  q: "WAV 파일과 일반 재생 파일의 차이는 무엇인가요?",
                  a: "웹 브라우저 재생은 빠른 로딩을 위해 MP3 포맷을 사용하며, [WAV 변환]을 누르면 손실 없는 24-bit 스튜디오 마스터 음질로 렌더링되어 다운로드됩니다.",
                },
                {
                  q: "연주곡 모드로 생성했는데 보컬이 조금 섞여 나와요.",
                  a: "스타일 태그에 [Instrumental, No Vocal]을 명시적으로 추가하고, 가사 입력창을 완전히 비워두시면 100% 순수 악기 연주곡으로 안전하게 고정됩니다.",
                },
                {
                  q: "API 키 잔여 크레딧은 어디서 확인하나요?",
                  a: "Suno 공식 콘솔 또는 해당 플랫폼 대시보드에서 실시간 잔여 크레딧을 확인하실 수 있습니다. 본 자동화 프로그램은 회원 본인 키의 크레딧만 차감합니다.",
                },
              ].map((faq, idx) => (
                <div
                  key={faq.q}
                  className="rounded-xl border border-[#272736] bg-[#161622] overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#1a1a28] transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                      Q. {faq.q}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      {openFaqIndex === idx ? "▲" : "▼"}
                    </span>
                  </button>
                  {openFaqIndex === idx && (
                    <div className="p-3.5 pt-0 text-xs text-zinc-400 border-t border-[#222230] bg-[#12121a]">
                      <p className="leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
