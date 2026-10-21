import { requireProgramAccess } from "@/lib/access";
import { APP_VERSION, PROGRAM_NAME } from "@/lib/version";

// 2026-10-21 병합 D(v1.06): 이 앱의 기능(컴포넌트 갤러리·인터랙티브 데모·TSX 코드·AI 컴포넌트 생성)은
// UI Canvas 자동화 「🧩 컴포넌트 갤러리」로 옮겼다. 이 앱은 저장 데이터가 없어 옮길 것이 없고, 주소만 유지한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const UI_CANVAS = "https://ui-canvas.buylife.xyz";

export default async function MovedPage() {
  await requireProgramAccess();
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0a0d14]">
      <section className="w-full max-w-lg rounded-2xl border border-[#222d42] bg-[#111622] p-8 text-center space-y-4">
        <div className="text-4xl" aria-hidden>🧩</div>
        <h1 className="text-xl font-extrabold text-slate-50">{PROGRAM_NAME}가 「UI Canvas 자동화」로 옮겨졌습니다</h1>
        <p className="text-sm leading-relaxed text-slate-300">
          컴포넌트 갤러리·인터랙티브 데모·TSX 코드 라이브러리·AI 컴포넌트 생성기는 이제 <b className="text-sky-300">UI Canvas 자동화 → 🧩 컴포넌트 갤러리</b>에서 그대로 쓸 수 있습니다.
          새로 생긴 기능으로 <b className="text-sky-300">AI가 만든 컴포넌트를 캔버스 프로젝트에 저장</b>하고, 캔버스에서 그린 화면을 <b className="text-sky-300">React + Tailwind 코드로 내보낼</b> 수 있습니다.
        </p>
        <p className="text-xs text-slate-400">Gemini 키는 AIMaster 공용 저장소의 본인 키를 그대로 쓰므로 다시 등록하지 않아도 됩니다.</p>
        <a
          href={`${UI_CANVAS}/gallery`}
          className="inline-block rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-500"
        >
          🧩 컴포넌트 갤러리로 가기
        </a>
        <p className="text-[11px] text-slate-500">{PROGRAM_NAME} {APP_VERSION}</p>
      </section>
    </main>
  );
}
