export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STEPS = [
  { icon: "⚙️", title: "1단계 · 모집 방식 고르기", body: "「⚙️ 모집 방식·설정」에서 아는 사람·카페 홍보 글·카페 활동 회원 중 쓸 방식을 켭니다. 하루 상한(기본 20, 최대 25)과 동작 시간대(기본 09:00~22:00)를 확인하고 저장합니다." },
  { icon: "👥", title: "2단계 · 초대할 사람 모으기", body: "「👥 초대할 사람 모으기·승인」에 서로이웃·지인의 네이버 아이디나 블로그 주소를 붙여 넣습니다. 카페 활동 회원 방식을 켰다면 확장이 내 로그인 브라우저에서 모아 넣습니다." },
  { icon: "✅", title: "3단계 · 목록 한 번에 승인", body: "빼고 싶은 사람만 「제외」를 누르고 「이 목록 승인」을 한 번 누릅니다. 승인한 사람만 초대합니다." },
  { icon: "🧩", title: "4단계 · 확장이 초대", body: "내가 네이버에 직접 로그인한 브라우저에서 확장이 하루 상한·시간대 안에서 사람처럼 초대합니다. 결과는 「📊 보낸 결과」에 남고 엑셀로 내려받을 수 있습니다. (확장 연결은 준비 중)" },
];
const FAQ = [
  ["비밀번호를 프로그램에 넣나요?", "아니요. 프로그램은 로그인을 대신하지 않습니다. 내가 직접 로그인한 브라우저에서만 동작합니다."],
  ["같은 사람에게 두 번 초대하나요?", "아니요. 같은 카페에 같은 사람은 한 번만 초대합니다(30일 기록 기준)."],
  ["네이버에서 제한 안내가 뜨면요?", "그날은 더 보내지 않고 멈춥니다. 다음 날 다시 시작합니다."],
  ["모은 명단은 얼마나 보관하나요?", "30일 뒤 자동으로 지워집니다. 필요하면 「보낸 결과」에서 엑셀로 내려받아 두세요."],
];

export default function GuidePage() {
  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-6 border border-emerald-100">
      <p className="text-xs font-bold text-emerald-700">⏱ 처음 설정 약 3분 · 매일 조작 1번(목록 승인) · 동의 1번</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">📖 연동 & 사용 매뉴얼</h1>
      <p className="mt-1 text-sm text-slate-600">내 카페에 들어올 사람을, 내가 고르고 승인한 범위에서만 초대합니다.</p>
    </div>
    <ol className="grid gap-3">{STEPS.map(s => <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-bold text-slate-900">{s.icon} {s.title}</p><p className="mt-1 text-sm text-slate-600">{s.body}</p></li>)}</ol>
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">💡 아는 사람(서로이웃·지인) 초대부터 시작하면 가장 안전합니다. 카페 활동 회원 방식은 책임 고지에 동의해야 켜집니다.</div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">⚠️ 네이버 초대는 카페 운영진만 할 수 있습니다. 내가 운영하는 카페가 아니면 초대 단계에서 건너뜁니다.</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">자주 묻는 질문</h2>
      <dl className="mt-2 divide-y text-sm">{FAQ.map(([q, a]) => <div key={q} className="py-2"><dt className="font-semibold">{q}</dt><dd className="mt-1 text-slate-600">{a}</dd></div>)}</dl></section>
  </div>;
}
