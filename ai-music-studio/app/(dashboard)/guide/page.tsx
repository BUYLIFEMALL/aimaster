import Link from "next/link";
import { MODELS, PROVIDERS, VISIBLE_PROVIDERS } from "@/lib/providers/catalog";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 형식(머리 정보 막대·개요·4단계 카드·상세·팁·함정 방지·직링크)
const STEPS = [
  { icon: "🔑", title: "API 키 연결", desc: "쓰려는 음악 AI의 본인 키를 등록합니다. 처음이라면 Gemini 키 하나로 시작하세요.", href: "/settings" },
  { icon: "✍️", title: "곡 설명·가사", desc: "장르·분위기를 적고 보컬곡/연주곡을 고릅니다. 가사는 직접 쓰거나 AI 가사 쓰기로 받습니다.", href: "/create" },
  { icon: "🎛️", title: "모델 고르고 만들기", desc: "모델 하나로 만들거나, 모델 비교에서 최대 3개로 한 번에 만듭니다.", href: "/compare" },
  { icon: "🎧", title: "보관함에서 듣기", desc: "완성곡을 나란히 듣고 내려받습니다. 30일 뒤 자동 삭제됩니다.", href: "/library" },
];

export default function GuidePage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-300">
        <span className="font-bold text-white">📖 AI 음악 스튜디오 사용 매뉴얼</span>
        <span className="text-zinc-600">|</span>
        <span>⏱ 첫 곡까지 약 5분</span>
        <span className="text-zinc-600">|</span>
        <span>🔑 필요: 음악 AI 키 1개 이상</span>
        <Link href="/settings" className="ml-auto whitespace-nowrap rounded-full bg-violet-500 px-3 py-1 font-bold text-white hover:bg-violet-400">키 등록하러 가기 →</Link>
      </div>

      <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-4xl" aria-hidden="true">🎧</p>
        <h1 className="mt-3 text-2xl font-black text-white md:text-3xl">여러 음악 AI를 한곳에서, 나란히 듣고 고르세요</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
          AI 음악 스튜디오는 Google Lyria(실시간 연주 Lyria RealTime 포함)·ElevenLabs·Suno·MiniMax·Stable Audio 3·ACE-Step을 한 화면에서 쓰는 음악 생성 도구입니다.
          같은 곡 설명으로 여러 모델을 한 번에 돌려 보고, 내 영상·채널에 가장 잘 맞는 소리를 고를 수 있습니다. 음악 생성 비용은 회원 본인 키의 계정에 청구됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">4단계로 끝나는 사용 순서</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <Link key={s.title} href={s.href} className="group flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-violet-500/40">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-xs font-black text-white">{i + 1}</span>
                <span className="text-2xl" aria-hidden="true">{s.icon}</span>
              </span>
              <span className="text-sm font-bold text-white">STEP {i + 1}. {s.title}</span>
              <span className="text-xs leading-relaxed text-zinc-400">{s.desc}</span>
              <span className="mt-auto text-[11px] font-bold text-violet-300 group-hover:underline">바로 가기 →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">모델 고르는 법</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-semibold">모델</th>
                <th className="px-3 py-2 font-semibold">필요한 키</th>
                <th className="px-3 py-2 font-semibold">보컬</th>
                <th className="px-3 py-2 font-semibold">길이</th>
                <th className="px-3 py-2 font-semibold">대략 비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {MODELS.map((m) => (
                <tr key={m.key}>
                  <td className="px-3 py-2 font-medium text-white">{m.name}</td>
                  <td className="px-3 py-2">{PROVIDERS[m.provider].name}</td>
                  <td className="px-3 py-2">{m.vocals ? (m.lyricsRequired ? "가능(가사 필요)" : "가능") : "연주곡 전용"}</td>
                  <td className="px-3 py-2">{m.durationControl ? `지정(최대 ${m.maxDurationS}초)` : m.maxDurationS <= 30 ? "30초" : "모델이 정함"}</td>
                  <td className="px-3 py-2">{m.costNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-zinc-500">비용은 2026-10 공개 가격을 바탕으로 한 대략값이며, 실제 청구는 각 플랫폼 기준입니다.</p>
      </section>

      <section className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm leading-relaxed text-sky-100">
        <p className="font-bold">💡 팁</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-sky-100/90">
          <li>처음에는 <strong>Google Lyria 3.5</strong>(곡당 약 $0.08)로 시작하면 가장 저렴하게 품질을 확인할 수 있습니다.</li>
          <li>가사에 [Verse 1]·[Chorus]·[Bridge] 같은 구간 표시를 넣으면 곡 구성이 더 정확해집니다.</li>
          <li>영상 배경음악은 「연주곡」 + Stable Audio·ACE-Step으로 길이를 정해 만들면 편집이 쉽습니다.</li>
          <li>모델 비교에서 같은 가사로 Suno·Lyria·MiniMax를 들어 보면 내 장르에 맞는 모델을 빨리 찾습니다.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
        <p className="font-bold">⚠️ 이런 실수를 피하세요</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/90">
          <li>실존 가수 이름·기존 곡 가사를 넣으면 플랫폼 안전 필터가 막습니다. 분위기·장르로 설명해 주세요.</li>
          <li>Gemini Lyria는 결제 등록된 유료 등급 키에서만 됩니다. 무료 키는 오류가 납니다.</li>
          <li>「결과를 받지 못했습니다」가 뜨면 바로 다시 누르지 말고, 해당 플랫폼 사용량을 먼저 확인하세요(이미 요금이 나갔을 수 있습니다).</li>
          <li>곡은 30일 뒤 자동 삭제됩니다. 오래 쓸 곡은 내려받아 두세요.</li>
        </ul>
      </section>

      {/* v1.11 매뉴얼 지침 ④ 단계별 상세 안내 — 공급자별 키 발급 3단계 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">공급자별 키 발급 순서</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {VISIBLE_PROVIDERS.map((p) => (
            <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-sm font-bold text-white">{p.name}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-zinc-300">
                <li><a href={p.keyLink} target="_blank" rel="noreferrer" className="font-bold text-violet-300 underline">키 발급 화면 열기 ↗</a> — 본인 계정으로 로그인합니다.</li>
                <li>새 키를 만들고 복사합니다(모양: <code className="rounded bg-zinc-950 px-1 text-zinc-200">{p.placeholder}</code>).</li>
                <li><Link href="/settings" className="font-bold text-violet-300 underline">API키등록·플랫폼연동</Link>의 「{p.keyLabel}」 칸에 붙여 넣고 저장합니다.</li>
              </ol>
              <p className="mt-2 text-[11px] leading-snug text-zinc-500">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* v1.11 자주 묻는 질문 */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-white">자주 묻는 질문</h2>
        {[
          ["한 번에 몇 곡이 나오나요?", "Suno·Mureka는 한 번에 2곡, 나머지 모델은 1곡입니다. 모델 비교를 쓰면 최대 3개 모델 결과를 나란히 받습니다."],
          ["보관함 곡을 이어서 들을 수 있나요?", "곡 카드의 ▶를 누르면 화면 아래 미니 플레이어로 재생되고, 끝나면 화면에 보이는 다음 곡으로 넘어갑니다."],
          ["다른 프로그램에서 쓰려면?", "곡 카드의 「가사 영상」「쇼츠 원스톱 배경음악」「뮤직비디오」「플레이리스트」 링크를 누르면 그 프로그램에 곡이 바로 들어갑니다."],
          ["Lyria RealTime은 무엇인가요?", "구글의 실험 모델로, 실시간 연주를 서버가 정한 길이(10~120초)만큼 녹음해 고음질 WAV로 저장합니다. 연주곡 전용이고 길이만큼 시간이 걸립니다."],
          ["비용은 어디서 확인하나요?", "곡 카드 아래의 「사용량 확인」 링크가 각 플랫폼 사용량 페이지로 연결됩니다. 이 프로그램은 요금을 받지 않고, 비용은 회원 본인 키 계정에 청구됩니다."],
        ].map(([q, a]) => (
          <details key={q} className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 open:border-violet-500/30">
            <summary className="cursor-pointer list-none text-sm font-bold text-white">
              <span className="mr-2 text-violet-300 group-open:hidden">＋</span><span className="mr-2 hidden text-violet-300 group-open:inline">－</span>{q}
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">{a}</p>
          </details>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">키 발급 콘솔 바로가기</h2>
        <div className="flex flex-wrap gap-2">
          {VISIBLE_PROVIDERS.map((p) => (
            <a key={p.id} href={p.keyLink} target="_blank" rel="noreferrer"
              className="whitespace-nowrap rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-violet-500/40">
              {p.name} ↗
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
