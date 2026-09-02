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

const NAVERPAY_FEES: FeeRow[] = [
  { category: "영세 — 연매출 3억원 미만", values: ["1.87%"] },
  { category: "중소1 — 연매출 3억~5억원", values: ["2.53%"] },
  { category: "중소2 — 연매출 5억~10억원", values: ["2.695%"] },
  { category: "중소3 — 연매출 10억~30억원", values: ["2.97%"] },
  { category: "일반 — 연매출 30억원 이상", values: ["3.74%"] },
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
          <span className="font-semibold">결제수수료 + 판매수수료</span>가 각각 별도로 붙습니다(둘 다 부가세 포함 표기).
        </p>

        <div>
          <p className="mb-1 text-xs font-semibold text-gray-700">
            ① 결제수수료 — 직전연도 매출 등급에 따라 5단계로 다릅니다
          </p>
          <FeeTable headers={["매출 등급", "결제수수료"]} rows={NAVERPAY_FEES} />
        </div>

        <div>
          <p className="mb-1 mt-2 text-xs font-semibold text-gray-700">② 판매수수료 — 유입경로 기준(매출 등급 무관, 정액)</p>
          <FeeTable
            headers={["유입경로", "판매수수료"]}
            rows={[
              { category: "일반 유입(네이버쇼핑 검색 등)", values: ["2.73%"] },
              { category: "마케팅 링크 유입", values: ["0.91%"] },
            ]}
          />
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs leading-relaxed text-emerald-900">
          <p className="font-bold">💡 마케팅 링크를 쓰면 수수료가 더 낮아집니다</p>
          <p className="mt-1">
            판매자센터에서 스토어홈·카테고리·상품상세·쇼핑스토리 페이지별로 &quot;마케팅
            링크&quot;를 발급받아, 그 링크로 블로그·SNS·검색광고 등 <span className="font-semibold">직접 마케팅</span>을 통해 고객이 들어오면 판매수수료가 2.73% →{" "}
            <span className="font-semibold">0.91%</span>로 낮아집니다. 예를 들어 &quot;일반&quot;
            등급(결제수수료 3.74%)이라면, 총 부담이 일반 유입 6.47% → 마케팅 링크 유입 4.65%로
            줄어듭니다(본인 매출 등급의 결제수수료를 위 표에서 확인해 판매수수료와 더하면 됩니다).
            유입 후 스토어를 이탈하지 않고 다른 상품을 구매해도 똑같이 적용되지만,
            네이버플러스스토어·가격비교 등 다른 경로로 이탈하면 적용되지 않습니다.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-900">
        <p className="mb-1 font-bold">💡 마진계산기에 반영하는 방법</p>
        <p>
          <a href="/sourcing" className="font-semibold text-sky-700 underline">
            상품소싱 마진계산기
          </a>
          의 &quot;판매 플랫폼 수수료율&quot; 입력창에, 위 표를 참고하여 판매하실 플랫폼/카테고리에
          해당하는 값을 입력 후 사용하시면 됩니다.
          <br />
          프로모션(할인) 판매시 쿠팡은 최종 결제금액 기준, 11번가/옥션/G마켓은 할인 전 가격
          기준으로 수수료가 책정됩니다.
        </p>
      </section>
    </div>
  );
}
