import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface FeeRow {
  category: string;
  values: string[];
}

const COUPANG_FEES: FeeRow[] = [
  { category: "도서", values: ["10.8%"] },
  { category: "가구·홈인테리어", values: ["10.8%"] },
  { category: "식품", values: ["10.6%"] },
  { category: "패션의류", values: ["10.5%"] },
  { category: "자동차용품", values: ["10.0%"] },
  { category: "뷰티", values: ["9.6%"] },
  { category: "가전디지털", values: ["7.8%"] },
  { category: "생활용품", values: ["7.8%"] },
  { category: "게임", values: ["6.8%"] },
  { category: "신선식품(쌀/잡곡)", values: ["5.8%"] },
  { category: "냉난방가전", values: ["5.8%"] },
  { category: "컴퓨터·태블릿PC", values: ["5.0%"] },
  { category: "모니터", values: ["4.5%"] },
  { category: "쥬얼리(순금/골드바)", values: ["4.0%"] },
];

const OPENMARKET_HEADERS = ["카테고리", "11번가", "옥션", "G마켓"];
const OPENMARKET_FEES: FeeRow[] = [
  { category: "패션·의류·잡화", values: ["11%", "10%", "10%"] },
  { category: "생활·주방·인테리어", values: ["9%", "8%", "8%"] },
  { category: "식품·건강", values: ["9%", "9%", "9%"] },
  { category: "디지털·가전", values: ["7%", "6.5%", "6.5%"] },
  { category: "뷰티·화장품", values: ["10%", "9%", "9%"] },
  { category: "스포츠·레저", values: ["10%", "9%", "9%"] },
  { category: "도서·음반", values: ["7%", "7%", "7%"] },
  { category: "유아동·완구", values: ["10%", "9%", "9%"] },
  { category: "자동차용품", values: ["8%", "7%", "7%"] },
];

function FeeTable({ headers, rows }: { headers: string[]; rows: FeeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-t border-gray-100">
              <td className="px-3 py-2 text-gray-800">{row.category}</td>
              {row.values.map((v, i) => (
                <td key={i} className="px-3 py-2 tabular-nums text-gray-700">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function FeesPage() {
  await requireProgramAccess();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">플랫폼·카테고리별 판매수수료</h1>
        <p className="text-sm text-gray-500">
          상품소싱 마진계산기의 &quot;판매 플랫폼 수수료율&quot; 값을 실제 판매하실 플랫폼·
          카테고리에 맞게 조정할 때 참고하는 표입니다. 아래 수치는 2026년 9월 기준으로 조사한
          참고용 자료라, <span className="font-semibold text-gray-700">플랫폼 정책 변경으로 실제
          수수료율과 다를 수 있습니다</span> — 실제 판매 전에는 반드시 각 플랫폼의 판매자
          센터(쿠팡윙/스마트스토어센터/11번가 셀러오피스 등)에서 최신 수수료를 다시 확인해주세요.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">🛒 쿠팡</h2>
          <p className="text-xs text-gray-500">
            카테고리 판매수수료(아래 표) + 월 매출 100만원 이상이면 서비스 이용료(월 5.5만원 별도)
          </p>
        </div>
        <FeeTable headers={["카테고리", "수수료율"]} rows={COUPANG_FEES} />
      </section>

      <section className="space-y-2 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">🏪 11번가 · 옥션 · G마켓</h2>
          <p className="text-xs text-gray-500">
            결제수수료(신용카드 기준 3.74%, 실시간 이체 시 2.0%)는 별도이며, 아래는 카테고리
            판매수수료입니다. 옥션·G마켓은 ESM 통합 판매관리라 수수료가 동일합니다.
          </p>
        </div>
        <FeeTable headers={OPENMARKET_HEADERS} rows={OPENMARKET_FEES} />
      </section>

      <section className="space-y-2 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-extrabold text-gray-900">🛍️ 네이버 스마트스토어</h2>
        <p className="text-xs leading-relaxed text-gray-600">
          다른 오픈마켓과 달리 카테고리별로 수수료가 나뉘어 있지 않고, <span className="font-semibold">결제수단·유입경로</span> 기준으로 정해집니다.
          <br />
          · 네이버페이 결제수수료: <span className="font-semibold">3.74%</span>(영세·중소 사업자
          기준, 연매출 3억 이상이면 상향)
          <br />
          · 네이버쇼핑 매출연동수수료: 쇼핑탭을 거쳐 유입된 주문에는{" "}
          <span className="font-semibold">2%</span>가 추가로 붙어(합계 5.74%), 스토어에 직접
          접속해서 산 주문은 결제수수료 3.74%만 적용됩니다.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-900">
        <p className="mb-1 font-bold">💡 마진계산기에 반영하는 방법</p>
        <p>
          <a href="/sourcing" className="font-semibold text-sky-700 underline">
            상품소싱 마진계산기
          </a>
          의 &quot;판매 플랫폼 수수료율&quot; 입력창에, 위 표에서 실제 판매하실 플랫폼·카테고리에
          해당하는 값을 그대로 넣어주시면 됩니다. 프로모션(할인)을 자주 진행하신다면, 쿠팡은
          최종 결제금액 기준·11번가/옥션/G마켓은 할인 전 가격 기준으로 수수료를 매긴다는 점도
          참고해주세요.
        </p>
      </section>
    </div>
  );
}
