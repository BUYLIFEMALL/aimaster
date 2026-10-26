import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { SHOP_DETAIL_SITE } from "@/lib/version";

const STEPS = [
  { n: 1, emoji: "🛍", title: "상세페이지 먼저 만들기", body: "AI 상세페이지 자동화에서 상품명·정상가·대표 사진을 넣고 섹션 이미지를 만듭니다. 이 프로그램은 그 상품을 그대로 불러옵니다.", time: "상품마다 1회" },
  { n: 2, emoji: "⚙", title: "스토어 기본값 넣기", body: "A/S 전화번호(필수)·원산지·상품군·배송 템플릿 이름을 한 번 넣습니다. 템플릿 이름은 스마트스토어센터 「템플릿 관리」에 저장된 이름 그대로 적습니다.", time: "처음 1회" },
  { n: 3, emoji: "🧩", title: "상품 고르고 확장으로 보내기", body: "카테고리 검색어(예: 텀블러)와 등록 방식을 고릅니다. 처음에는 「입력만」이나 「임시저장까지」를 권합니다.", time: "1분" },
  { n: 4, emoji: "🧾", title: "결과 확인", body: "확장이 채운 결과(입력 완료·상품번호·멈춘 칸)가 「등록 기록」에 남습니다. 멈춘 칸만 판매자센터에서 직접 고치면 됩니다.", time: "바로" },
];

const FAQ = [
  { q: "판매자센터 비밀번호를 맡겨야 하나요?", a: "아니요. 회원님이 크롬에서 스마트스토어센터에 직접 로그인해 두면, 확장은 그 화면에서만 칸을 채웁니다. 비밀번호·판매자 키는 받지 않습니다." },
  { q: "「입력만」과 「임시저장까지」는 무엇이 다른가요?", a: "「입력만」은 칸만 채우고 멈춥니다. 「임시저장까지」는 판매자센터의 「임시저장」 버튼까지 눌러 두어, 실제 상품은 생기지 않지만 나중에 이어서 등록할 수 있습니다." },
  { q: "「바로 등록」하면 바로 판매되나요?", a: "기본값은 전시중지(판매대기)로 올라갑니다. 「스토어 기본값」에서 「바로 전시하기」를 켰을 때만 바로 전시됩니다." },
  { q: "같은 상품을 두 번 등록하면 어떻게 되나요?", a: "확장 대기 중인 작업이 있으면 새 작업을 만들지 않습니다. 또 판매자 관리 코드에 이 상품 표시(AIM-…)를 넣어, 이미 올린 상품인지 판매자센터에서 찾을 수 있습니다." },
  { q: "칸이 채워지지 않고 멈췄어요.", a: "판매자센터 화면이 바뀌었거나 로그인이 풀렸을 수 있습니다. 「등록 기록」의 멈춘 칸을 보고 그 칸부터 직접 입력해 주세요. 결과가 확실하지 않으면 확장은 자동으로 다시 등록하지 않습니다." },
];

export default function GuidePage() {
  return (
    <div className="space-y-5">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="상세페이지 → 기본값 → 확장으로 보내기 → 결과 확인, 4단계로 끝납니다." />
      <div className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s) => (
          <div key={s.n} className="slw-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-emerald-700">STEP {s.n}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">⏱ {s.time}</span>
            </div>
            <p className="mt-1 text-base font-extrabold text-slate-900">{s.emoji} {s.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
          </div>
        ))}
      </div>
      <Notice tone="tip">💡 상품을 아직 만들지 않았다면 <a className="font-bold underline" href={`${SHOP_DETAIL_SITE}/products/new`} target="_blank" rel="noreferrer">AI 상세페이지 자동화 ↗</a>에서 먼저 만들어 주세요.</Notice>
      <Notice tone="warn">⚠️ 크롬 확장은 다음 업데이트에서 내려받을 수 있습니다. 지금은 등록할 값 확인과 작업 만들기까지 됩니다.</Notice>
      <div className="slw-card divide-y divide-slate-100 p-0">
        {FAQ.map((f) => (
          <details key={f.q} className="p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-900">Q. {f.q}</summary>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
