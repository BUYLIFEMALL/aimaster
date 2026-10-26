import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { Notice } from "@/components/ui/PageHeader";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="slw-card overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-7 text-white">
          <p className="text-sm font-bold opacity-90">🧰 판매자 도구함</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">출고·입점 서류 작업, 여기서 한 번에</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50">
            라벨 인쇄부터 QR, 사진 이름 정리, PDF 정리, 서명까지 — 파일은 서버로 올라가지 않고 지금 쓰시는 PC 브라우저 안에서만 처리됩니다.
            AI 키나 외부 계정 연결도 필요 없습니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-slate-900">어떤 작업이세요?</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="slw-card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md">
              <span className="text-3xl" aria-hidden>{t.emoji}</span>
              <span className="mt-2 text-base font-extrabold text-slate-900 group-hover:text-teal-800">{t.label}</span>
              <span className="mt-1 text-[13px] leading-relaxed text-slate-600">{t.description}</span>
              <span className="mt-3 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-600">이럴 때: {t.when}</span>
            </Link>
          ))}
          {/* E5-3(2026-10-26): 사진 속 개인정보 가리기 — 바나나 캔버스 무료 이미지 도구(새 탭, 키·비용 없음) */}
          <a href="https://banana-canvas.buylife.xyz/tools?tab=face" target="_blank" rel="noopener noreferrer" className="slw-card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md">
            <span className="text-3xl" aria-hidden>🙈</span>
            <span className="mt-2 text-base font-extrabold text-slate-900 group-hover:text-teal-800">사진 속 개인정보 가리기 ↗</span>
            <span className="mt-1 text-[13px] leading-relaxed text-slate-600">송장·후기 사진의 얼굴과 송장·전화번호를 자동으로 가리고, 빠진 곳은 끌어서 가립니다(바나나 캔버스 무료 이미지 도구).</span>
            <span className="mt-3 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-600">이럴 때: 배송 사진·후기 캡처를 고객·단체방에 올리기 전</span>
          </a>
          <Link href="/guide" className="slw-card flex flex-col justify-center p-5 hover:border-teal-400">
            <span className="text-3xl" aria-hidden>📖</span>
            <span className="mt-2 text-base font-extrabold text-slate-900">처음이신가요?</span>
            <span className="mt-1 text-[13px] text-slate-600">4단계 사용법과 라벨 위치 맞추는 법을 먼저 보세요.</span>
          </Link>
        </div>
      </section>

      <Notice tone="tip">
        💡 라벨 인쇄는 PC(크롬·엣지)에서 쓰는 것을 권장합니다. QR·파일명·PDF·서명은 휴대폰에서도 쓸 수 있습니다. 작업 시간은 PC 사양과 파일 크기에 따라 달라질 수 있습니다.
      </Notice>
    </div>
  );
}
