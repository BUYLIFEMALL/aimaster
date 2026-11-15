import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { CopyBox } from "@/components/CopyBox";
import { SHOP_DETAIL_SITE } from "@/lib/version";

export const dynamic = "force-dynamic";

// 연동·사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 규격(헤더 바·소개·4단계 카드·상세 단계·팁/주의·직링크)

const STEPS = [
  { emoji: "🏪", title: "ESM+ 준비", desc: "ESM+에 로그인하고 「배송정보관리」에 택배사·출고지·배송비 정책을 만들어 둡니다." },
  { emoji: "⚙", title: "기본값 적기", desc: "배송비 정책 번호·출고지 이름·고시 상품군을 한 번만 적습니다." },
  { emoji: "🧩", title: "확장 연결", desc: "크롬 확장을 설치하고 버튼 한 번으로 내 계정과 연결합니다." },
  { emoji: "🛒", title: "보내기·확인", desc: "상품을 고르고 「입력만」으로 보낸 뒤 ESM+ 화면과 등록 기록을 확인합니다." },
];

const FAQ = [
  ["G마켓과 옥션에 따로 올려야 하나요?", "아니요. ESM+ 한 화면에서 판매사이트 두 곳을 함께 체크해 한 번에 올립니다. 기본값에서 한 곳만 고를 수도 있습니다."],
  ["API 키나 비밀번호가 필요한가요?", "필요 없습니다. 회원 본인 크롬에서 회원이 직접 로그인한 ESM+ 화면에 확장이 입력합니다."],
  ["배송비 정책 번호는 어디서 보나요?", "ESM+ 「상품등록」 화면 배송 구역의 「배송비 선택」 버튼 글자 끝 괄호 안 숫자(예: 37246700)입니다. 「배송정보관리」 메뉴에서도 볼 수 있습니다."],
  ["수수료는 얼마인가요?", "카테고리마다 다릅니다. 확장이 카테고리를 고른 뒤 화면에 보이는 「카테고리 기본이용료」를 등록 기록에 남깁니다."],
  ["확장이 중간에 멈췄어요.", "그 자리에서 멈추고 「등록 기록」에 멈춘 칸을 남깁니다. ESM+ 탭에서 그 칸부터 직접 채우고 저장하면 됩니다. 결과가 불확실하면 확장이 자동으로 다시 등록하지 않습니다."],
];

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <div className="space-y-5">
      <PageHeader emoji="📖" title="연동 & 사용 매뉴얼" description="처음 쓰는 분도 순서대로 따라 하면 G마켓·옥션에 상품을 올릴 수 있습니다.">
        <a className="btn-3d-secondary !py-2 !px-4 text-xs" href="https://www.esmplus.com" target="_blank" rel="noreferrer">ESM+ 열기 ↗</a>
      </PageHeader>

      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">⏱ 처음 설정 약 10분</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">🔑 API 키 필요 없음</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">🖥 크롬(PC) 필요</span>
      </div>

      <section className="slw-card p-5">
        <p className="text-base font-black text-slate-900">🛒 상세페이지 상품을 G마켓·옥션에 한 번에</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          AI 상세페이지 자동화에서 만든 상품을 불러와, 크롬 확장이 ESM+ 「상품등록」 화면의 칸을 위에서부터 채웁니다.
          카테고리를 먼저 고르고(수수료 기록) → 가격·재고 → 사진·상세 이미지 → 인증·고시 → 배송·반품 순서입니다.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="slw-card p-4">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">STEP {i + 1}</span>
            <p className="mt-2 text-sm font-black text-slate-900">{s.emoji} {s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>

      <section className="slw-card space-y-3 p-5 text-sm leading-relaxed text-slate-700">
        <h2 className="text-base font-black text-slate-900">1. ESM+ 준비</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>크롬에서 ESM+에 로그인합니다(G마켓·옥션 판매자 회원).</li>
          <li>「판매자정보 → 배송정보관리」에서 출고지·반품지 주소와 <b>배송비 정책</b>을 하나 이상 만들어 둡니다. 배송비는 상품등록 화면에서 새로 만들 수 없습니다.</li>
        </ol>
        <CopyBox text="https://www.esmplus.com" label="ESM+ 주소 복사" />

        <h2 className="pt-2 text-base font-black text-slate-900">2. 기본값 적기</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li><Link href="/defaults" className="font-bold text-emerald-700 underline">ESM+ 기본값</Link>에서 판매사이트(G마켓+옥션)·재고·부가세를 고릅니다.</li>
          <li>배송정보 템플릿 이름을 적거나, 비워 두고 택배사·발송정책·출고지 이름·배송비 정책 번호를 적습니다(ESM+ 화면 글자 그대로).</li>
          <li>고시 상품군(예: 주방용품)과 인증 「인증대상이 아님」 여부를 정합니다. KC 인증 대상 상품은 체크를 끄세요.</li>
        </ol>

        <h2 className="pt-2 text-base font-black text-slate-900">3. 확장 연결</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li><Link href="/extension" className="font-bold text-emerald-700 underline">확장 연결</Link>에서 ZIP을 받아 압축을 풉니다.</li>
          <li>크롬 주소창에 아래 주소 → 오른쪽 위 「개발자 모드」 켜기 → 「압축해제된 확장 프로그램을 로드합니다」 → 풀어 둔 폴더 선택.</li>
          <li>확장 연결 화면에서 「이 계정으로 연결」을 누릅니다.</li>
        </ol>
        <CopyBox text="chrome://extensions" label="확장 관리 주소 복사" />

        <h2 className="pt-2 text-base font-black text-slate-900">4. 보내기·확인</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li><a className="font-bold text-emerald-700 underline" href={`${SHOP_DETAIL_SITE}/products`} target="_blank" rel="noreferrer">AI 상세페이지 자동화</a>에서 상품을 만들고 「검토 완료」를 누릅니다.</li>
          <li><Link href="/products" className="font-bold text-emerald-700 underline">등록할 상품</Link>에서 상품을 고르고 카테고리 검색어·판매가를 확인합니다.</li>
          <li>등록 방식은 처음에 <b>「입력만」</b>을 고르고 보냅니다. ESM+에 로그인된 크롬에서 확장이 새 탭으로 「상품등록」을 열고 채웁니다.</li>
          <li>채운 화면을 확인한 뒤 「임시저장」 또는 「등록하기」를 직접 누르거나, 다음부터 「임시저장까지」·「바로 등록」을 고릅니다.</li>
          <li><Link href="/history" className="font-bold text-emerald-700 underline">등록 기록</Link>에서 결과·상품번호·수수료·멈춘 칸을 봅니다.</li>
        </ol>
      </section>

      <Notice tone="tip">💡 상품명은 ESM+ 기준 한글 50자(영문·숫자 100자)까지입니다. 판매가는 10원 단위여야 하며, 할인가가 있으면 할인가가 판매가로 들어갑니다.</Notice>
      <Notice tone="warn">⚠️ 확장이 채우는 동안 ESM+ 탭을 닫거나 다른 칸을 누르지 마세요. 「바로 등록」은 실제 상품이 생기므로 확인 상자를 체크해야 보낼 수 있습니다.</Notice>

      <section className="slw-card p-5">
        <h2 className="mb-2 text-base font-black text-slate-900">자주 묻는 질문</h2>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">{q}</summary>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
