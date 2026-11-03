import { Cpu, Download, ShieldCheck, Clock } from "lucide-react";

// 내 PC 엔진 안내 — 엔진 앱은 플랜 2단계에서 붙는다. 사양 표는 2026-11-03 사전 검증 결과(플랜 §8) 기준.
const SPECS = [
  { pc: "NVIDIA 그래픽카드 (예: RTX 4060 이상)", mode: "고품질 모드 — 작사 보조 모델까지 켜서 생성", speed: "빠름" },
  { pc: "Apple Silicon 맥 (M1 이상)", mode: "고품질 모드", speed: "아직 측정 전" },
  { pc: "Intel 맥", mode: "지원하지 않음 — 음악 모델이 Intel 맥용으로 나오지 않습니다", speed: "—" },
  { pc: "그래픽카드 없는 PC · Intel 내장 그래픽", mode: "CPU 모드 — 빠른 모델로 생성", speed: "30초 곡 약 1분 30초, 3분 곡 약 6분" },
];

const STEPS = [
  { n: 1, title: "엔진 내려받기", body: "이 화면의 [내려받기]로 설치 파일을 받습니다." },
  { n: 2, title: "설치·첫 실행", body: "처음 한 번 음악 모델(약 10GB)을 자동으로 받습니다. 디스크 20GB 여유를 확인해 주세요." },
  { n: 3, title: "이 화면에서 연결", body: "엔진이 켜지면 위쪽 상태가 「연결됨」으로 바뀌고, 곡 만들기 화면에서 바로 노래를 만들 수 있습니다." },
];

export default function EnginePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Cpu className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🖥️ 내 PC 엔진</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              노래는 회원님 PC에서 만들어지고, 음원 파일도 회원님 PC에만 저장됩니다. API 키나 생성 요금이 없습니다.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-300">
            <Clock className="h-3.5 w-3.5" /> 엔진 준비 중
          </span>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Download className="h-4 w-4 text-emerald-300" /> 원클릭 다운로드 센터
        </h2>
        <p className="text-xs text-slate-400">윈도우·맥용 엔진 앱을 준비하고 있습니다. 공개되면 이곳에서 최신 버전을 바로 받을 수 있습니다.</p>
        <button type="button" disabled className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-500">
          내려받기 (준비 중)
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
        <h2 className="text-sm font-bold text-slate-100">초간단 3단계 설치</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
              <span className="text-[11px] font-bold text-emerald-300">STEP {s.n}</span>
              <p className="mt-1 text-sm font-bold text-slate-100">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
        <h2 className="text-sm font-bold text-slate-100">내 PC에서 얼마나 걸리나요?</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-3 font-semibold">PC 종류</th>
                <th className="py-2 pr-3 font-semibold">동작 방식</th>
                <th className="py-2 font-semibold">속도</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {SPECS.map((s) => (
                <tr key={s.pc} className="border-t border-slate-800">
                  <td className="py-2 pr-3">{s.pc}</td>
                  <td className="py-2 pr-3">{s.mode}</td>
                  <td className="py-2">{s.speed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          음악 모델은 상업 이용이 허용된 공개 모델(MIT)을 씁니다. 커버는 회원님이 권리를 가진 곡으로만 만들 수 있습니다.
        </p>
      </section>
    </div>
  );
}
