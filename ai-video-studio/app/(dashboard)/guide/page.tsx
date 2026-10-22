import Link from "next/link";
import { MODELS, PROVIDERS } from "@/lib/providers/catalog";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 연동 & 사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 형식(머리 정보 막대·개요·4단계 카드·상세·팁·함정 방지·직링크)
const STEPS = [
  { icon: "🔑", title: "API 키 연결", desc: "쓰려는 영상 AI의 본인 키를 등록합니다. 처음이라면 이미 가진 Gemini 키 하나로 시작하세요.", href: "/settings" },
  { icon: "✍️", title: "영상 설명", desc: "만들 장면을 한국어로 적고 화풍·카메라 움직임을 고릅니다.", href: "/create" },
  { icon: "🎛️", title: "모델·옵션 고르고 만들기", desc: "플랫폼과 모델을 고르고 길이·비율·시작/끝 장면 사진을 정한 뒤 예상 비용을 확인하고 만듭니다.", href: "/create" },
  { icon: "🎞️", title: "갤러리에서 보기", desc: "완성 영상을 보고 MP4로 내려받습니다. 30일 뒤 자동 삭제됩니다.", href: "/library" },
];

export default function GuidePage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-300">
        <span className="font-bold text-white">📖 AI 영상 스튜디오 사용 매뉴얼</span>
        <span className="text-zinc-600">|</span>
        <span>⏱ 첫 영상까지 약 5분</span>
        <span className="text-zinc-600">|</span>
        <span>🔑 필요: 영상 AI 키 1개 이상(Gemini 권장)</span>
        <Link href="/settings" className="ml-auto whitespace-nowrap rounded-full bg-sky-500 px-3 py-1 font-bold text-white hover:bg-sky-400">키 등록하러 가기 →</Link>
      </div>

      <section className="rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/15 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-4xl" aria-hidden="true">🎬</p>
        <h1 className="mt-3 text-2xl font-black text-white md:text-3xl">여러 영상 AI를 한곳에서, 내 키로 바로 만들어 보세요</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
          AI 영상 스튜디오는 Google Gemini Omni Flash·Kling·Seedance 등 여러 AI 영상 모델을 한 화면에서 쓰는 영상 생성 도구입니다.
          글만으로, 또는 시작·끝 장면 사진으로 짧은 영상을 만들고, 완성 영상은 갤러리에 30일 보관됩니다. 영상 생성 비용은 회원 본인 키의 계정에 청구됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">4단계로 끝나는 사용 순서</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <Link key={s.title} href={s.href} className="group flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-sky-500/40">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-black text-white">{i + 1}</span>
                <span className="text-2xl" aria-hidden="true">{s.icon}</span>
              </span>
              <span className="text-sm font-bold text-white">STEP {i + 1}. {s.title}</span>
              <span className="text-xs leading-relaxed text-zinc-400">{s.desc}</span>
              <span className="mt-auto text-[11px] font-bold text-sky-300 group-hover:underline">바로 가기 →</span>
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
                <th className="px-3 py-2 font-semibold">시작 사진</th>
                <th className="px-3 py-2 font-semibold">끝 장면</th>
                <th className="px-3 py-2 font-semibold">길이</th>
                <th className="px-3 py-2 font-semibold">초당 대략 비용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {MODELS.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 font-medium text-white">{m.name}</td>
                  <td className="px-3 py-2">{PROVIDERS[m.provider].name}</td>
                  <td className="px-3 py-2">{m.needsImage ? "필요" : "없어도 됨"}</td>
                  <td className="px-3 py-2">{m.endFrame ? "가능" : "불가"}</td>
                  <td className="px-3 py-2">{m.durations.join("·")}초</td>
                  <td className="px-3 py-2">${m.perSec}{m.perSecEnd ? ` (끝 장면 ${m.perSecEnd})` : ""}</td>
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
          <li>처음에는 <strong>Gemini Omni Flash</strong>로 4~5초짜리를 만들어 보면 비용(약 $0.4~0.5)을 아끼며 품질을 확인할 수 있습니다.</li>
          <li>장면 설명은 「누가·어디서·무엇을·빛·분위기」 순서로 쓰면 결과가 안정적입니다.</li>
          <li>원하는 첫 화면이 있으면 시작 장면 사진을 넣으세요. 끝 장면 사진까지 넣으면 두 장면을 잇는 영상이 됩니다(같은 사진을 넣으면 루프 영상).</li>
          <li>세로 쇼츠는 9:16, 유튜브·뮤직비디오는 16:9를 고르세요.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
        <p className="font-bold">⚠️ 이런 실수를 피하세요</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/90">
          <li>실존 인물·유명인·브랜드 로고를 넣으면 플랫폼 안전 필터가 막을 수 있습니다.</li>
          <li>Gemini 영상은 결제가 연결된 유료 등급 키에서만 됩니다. 무료 키는 오류가 납니다.</li>
          <li>「결과를 받지 못했습니다」가 뜨면 바로 다시 누르지 말고, 해당 플랫폼 사용량을 먼저 확인하세요(이미 요금이 나갔을 수 있습니다).</li>
          <li>영상은 30일 뒤 자동 삭제됩니다. 오래 쓸 영상은 내려받아 두세요.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white">키 발급 콘솔 바로가기</h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(PROVIDERS).map((p) => (
            <a key={p.id} href={p.keyLink} target="_blank" rel="noreferrer"
              className="whitespace-nowrap rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-sky-500/40">
              {p.name} ↗
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
