import Link from "next/link";
import { TOOLS } from "@/lib/tools";

export const metadata = { title: "연동 & 사용 매뉴얼 | 셀러 라벨·QR·서류 자동화" };

const STEPS = [
  { emoji: "🔑", title: "로그인", body: "AIMaster 계정으로 로그인하면 끝입니다. AI 키·외부 계정 연결은 필요 없습니다." },
  { emoji: "🧰", title: "도구 고르기", body: "왼쪽 메뉴나 도구함 홈에서 할 일(라벨·QR·파일명·PDF·서명)을 고릅니다." },
  { emoji: "📂", title: "파일 넣기", body: "엑셀·사진·PDF를 끌어 놓습니다. 파일은 서버로 올라가지 않고 이 PC 브라우저 안에서만 처리됩니다." },
  { emoji: "💾", title: "저장·인쇄", body: "미리보기를 확인하고 인쇄하거나 PNG·PDF·ZIP으로 저장합니다." },
];

const CALIBRATE = [
  "라벨지 포장(또는 제조사 규격표)에 적힌 칸 수·칸 크기를 확인하고 같은 규격을 고릅니다. 다르면 「직접 입력」으로 여백·간격까지 넣습니다.",
  "「칸 테두리 함께 인쇄」를 켜고 보통 A4 종이에 1장 인쇄합니다(인쇄 창: 배율 100%, 여백 없음).",
  "인쇄한 종이를 라벨지 위에 겹쳐 밝은 곳에 비춰 봅니다. 테두리가 오른쪽으로 2mm 밀려 있으면 「위치 보정 → 오른쪽」에 -2를 넣습니다.",
  "맞으면 테두리를 끄고 라벨지에 인쇄합니다. 설정은 이 브라우저에 저장돼 다음에도 그대로입니다.",
];

const FAQ = [
  { q: "프로그램을 설치해야 하나요?", a: "아니요. 웹 브라우저(크롬·엣지 권장)만 있으면 됩니다. 처리 속도는 PC 사양과 파일 크기에 따라 달라질 수 있습니다." },
  { q: "내 파일이 서버에 저장되나요?", a: "저장되지 않습니다. 엑셀·사진·PDF는 내 PC 브라우저 안에서만 열고 바로 결과 파일로 저장합니다. 창을 닫으면 작업 중이던 파일은 사라지니 저장을 먼저 해 주세요." },
  { q: "라벨 위치가 조금씩 어긋나요.", a: "인쇄 창에서 「실제 크기(100%)」를 골랐는지 먼저 확인하세요. 그래도 어긋나면 위 「라벨 위치 맞추기」 3번처럼 위치 보정값을 넣습니다. 프린터마다 종이가 들어가는 위치가 조금 달라 한 번은 맞춰야 합니다." },
  { q: "엑셀 열 이름은 어떻게 쓰나요?", a: "첫 줄을 열 이름(예: 상품명, 가격, 바코드)으로 쓰고, 둘째 줄부터 내용을 넣습니다. 라벨 글자 칸에 {상품명}처럼 쓰면 줄마다 값이 바뀌어 들어갑니다. 「예시 표 받기」로 양식을 받아 쓰셔도 됩니다." },
  { q: "바코드 번호는 아무거나 넣어도 되나요?", a: "매장에서 읽히는 상품 바코드(EAN-13)는 GS1(대한상공회의소 유통물류진흥원)에서 발급받은 번호를 넣어야 합니다. 이 도구는 자릿수와 검증 숫자만 확인합니다. 창고 관리용이면 Code128에 내부 관리 번호를 넣어도 됩니다." },
  { q: "식품 표시사항 틀은 그대로 써도 되나요?", a: "항목 이름만 담은 빈 틀입니다. 식품 유형마다 의무 항목과 글자 크기 기준이 다르니 식품의약품안전처 「식품등의 표시기준」을 직접 확인해 주세요. 내용의 정확성은 판매자 책임입니다." },
  { q: "서명 기능은 전자서명인가요?", a: "아닙니다. 문서에 서명 그림을 얹는 기능으로, 공동·금융인증서 같은 법적 효력이 있는 전자서명이 아닙니다." },
  { q: "암호가 걸린 PDF는요?", a: "열 수 없습니다. PDF 프로그램에서 암호를 해제한 뒤 넣어 주세요." },
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <header className="slw-card flex flex-wrap items-center gap-4 p-5">
        <span className="text-4xl" aria-hidden>📖</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">연동 & 사용 매뉴얼</h1>
          <p className="mt-1 text-sm text-slate-600">⏱ 처음 설정 약 3분 · 🔌 연동할 것 없음 · 💻 PC 크롬·엣지 권장(라벨 인쇄)</p>
        </div>
        <Link href="/home" className="slw-primary">도구함으로 →</Link>
      </header>

      <section className="slw-card overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-emerald-600 p-5 text-white">
          <p className="text-sm font-bold opacity-90">한눈에 보기</p>
          <p className="mt-1 text-base font-extrabold sm:text-lg">출고 라벨 · QR · 사진 이름 · PDF · 서명을 내 PC 안에서 무료로</p>
          <p className="mt-1 text-[13px] text-teal-50">파일이 서버로 가지 않아 개인정보가 담긴 주소 라벨·계약서도 안심하고 처리할 수 있습니다.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-slate-900">4단계로 끝내기</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="slw-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">{i + 1}</span>
                <span className="text-2xl" aria-hidden>{s.emoji}</span>
              </div>
              <p className="mt-2 font-extrabold text-slate-900">{s.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-slate-900">도구별로 이럴 때 쓰세요</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="slw-card flex gap-3 p-4 hover:border-teal-400">
              <span className="text-3xl" aria-hidden>{t.emoji}</span>
              <span>
                <span className="block font-extrabold text-slate-900">{t.label}</span>
                <span className="mt-0.5 block text-[13px] text-slate-600">{t.description}</span>
                <span className="mt-1 block text-[12px] font-bold text-teal-800">이럴 때: {t.when}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="slw-card p-5">
        <h2 className="text-base font-extrabold text-slate-900">🏷 라벨 위치 맞추기(처음 한 번)</h2>
        <ol className="mt-3 space-y-2">
          {CALIBRATE.map((c, i) => (
            <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-slate-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-800 ring-1 ring-teal-200">{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-[13px] leading-relaxed text-teal-900">
          <p className="font-extrabold">💡 팁</p>
          <p className="mt-1">엑셀에서 표를 복사해 「붙여 넣기」 칸에 넣으면 파일 없이도 바로 채워집니다. 미리보기 칸을 누르면 그 칸부터 인쇄를 시작해 쓰다 남은 라벨지를 아낄 수 있습니다.</p>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-900">
          <p className="font-extrabold">⚠ 주의</p>
          <p className="mt-1">인쇄 창에서 「페이지에 맞게」·「맞춤」을 고르면 칸이 줄어들어 어긋납니다. 반드시 「실제 크기 100%」로 인쇄하세요. 라벨지 규격의 기본 여백은 가운데 정렬 기준 추정값입니다.</p>
        </div>
      </div>

      <section className="slw-card p-5">
        <h2 className="text-base font-extrabold text-slate-900">❓ 자주 묻는 질문</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {FAQ.map((f) => (
            <details key={f.q} className="py-3">
              <summary className="cursor-pointer text-[14px] font-bold text-slate-900">{f.q}</summary>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
