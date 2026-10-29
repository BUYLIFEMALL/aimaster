import type { ReactNode } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { requireProgramAccess } from "@/lib/access";
import { CATEGORY_FEES } from "@/lib/marketFees";
import { TARIFF_CHECKED_AT, TARIFF_LOOKUP_URL, TARIFF_ROWS } from "@/lib/customs/tariffTable";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface FeeRow {
  category: string;
  values: string[];
}

// v1.27(E1): 수수료 숫자는 공용 기준 코드 market-fees 사본(lib/marketFees.ts) 한 곳에서만 읽는다(계산기와 같은 값).
const pct = (n: number) => `${Number.isInteger(n) ? n.toFixed(1) : n}%`;
const COUPANG_FEES: FeeRow[] = (CATEGORY_FEES.coupang?.rows ?? []).map((r) => ({ category: r.label, values: [pct(r.ratePct)] }));

// 2026-10-25 재확인: G마켓·옥션은 ESM PLUS 공식 「서비스 이용료 안내」 표의 대분류 「전체」 값을 그대로 옮겼다(중분류는 다를 수 있음).
// 예전 표(옥션·G마켓 6.5~10%, 「ESM 통합이라 동일」)는 공식 값(대부분 13%)보다 낮아 마진이 높게 보였다.
const ESM_HEADERS = ["대분류(ESM 공식 이름)", "G마켓", "옥션", "중분류 예외(예)"];
const gRows = CATEGORY_FEES.gmarket?.rows ?? [];
const aRows = CATEGORY_FEES.auction?.rows ?? [];
const ESM_FEES: FeeRow[] = gRows.map((g, k) => ({ category: g.label, values: [`${g.ratePct}%`, `${aRows[k]?.ratePct ?? g.ratePct}%`, g.exception ?? "—"] }));

/** 표마다 붙이는 확인 정보 — 확인일·부가세·출처, 공식 표 확인 여부 */
function SourceNote({ verified, children, date = "2026-10-25" }: { verified: boolean; children: ReactNode; date?: string }) {
  return (
    <p className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${verified ? "border-mx-success/30 bg-mx-success/10 text-[#a7f3d0]" : "border-amber-400/40 bg-amber-400/10 text-[#fde68a]"}`}>
      <span className="font-bold">{verified ? `✅ 공식 표 확인 · ${date}` : `⚠ 공식 표 미확인 · 참고치 · ${date} 기준`}</span> — {children}
    </p>
  );
}

function FeeTable({ headers, rows }: { headers: string[]; rows: FeeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-mx-border">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="bg-mx-raised text-left text-xs text-mx-muted">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-t border-mx-border">
              <td className="px-3 py-2 text-mx-text">{row.category}</td>
              {row.values.map((v, i) => (
                <td key={i} className="px-3 py-2 tabular-nums text-mx-text">
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHero
        badge="🧾 참고표"
        title="플랫폼·카테고리별 판매수수료"
        description="마진계산기의 「판매 플랫폼 수수료율」을 실제 판매 플랫폼·카테고리에 맞게 조정할 때 참고하는 표입니다. 표마다 확인일·부가세 포함 여부·출처를 적었습니다. 「⚠ 공식 표 미확인」 표는 판매자 로그인 화면에서만 보이는 값이라 참고치이니, 판매 전 각 판매자 센터에서 내 카테고리 값을 꼭 확인해 주세요."
      />

      {/* v1.27(E1): 이 표의 숫자는 마진 계산기와 같은 파일에서 읽는다 — 계산기에서 마켓·카테고리를 고르면 자동으로 채워진다 */}
      <a href="/sourcing" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-mx-primary/40 bg-mx-primary/10 px-4 py-3 text-sm text-mx-text hover:bg-mx-primary/20">
        <span>💰 마진 계산기에서 「판매할 마켓」과 카테고리를 고르면 이 요율이 자동으로 들어가고, 5개 마켓을 나란히 비교할 수 있습니다.</span>
        <span className="font-bold text-mx-link">마진 계산하러 가기 →</span>
      </a>

      <section className="space-y-2 rounded-2xl border border-mx-border bg-mx-surface p-4">
        <div>
          <h2 className="text-base font-extrabold text-mx-text">🏪 G마켓 · 옥션 (ESM)</h2>
          <p className="text-xs text-mx-muted">
            서비스 이용료 = (판매가 + 주문옵션·추가구성 금액) × 카테고리별 요율 + 선결제 배송비 × 3.3%(무료배송·착불은 해당 없음).
            옥션은 전월 판매대금 500만원 이상이면 서버 이용료 월 55,000원이 붙습니다. 두 마켓은 대분류 요율이 대부분 같지만 일부 대분류·중분류가 다릅니다.
          </p>
        </div>
        <FeeTable headers={ESM_HEADERS} rows={ESM_FEES} />
        <SourceNote verified>
          출처: ESM PLUS 공식 「
          <a href="https://item.esmplus.com/gmarket-service-fee.html" target="_blank" rel="noopener noreferrer" className="underline">G마켓 서비스 이용료 안내 ↗</a>」·「
          <a href="https://item.esmplus.com/auction-service-fee.html" target="_blank" rel="noopener noreferrer" className="underline">옥션 서비스 이용료 안내 ↗</a>」(대분류 「전체」 값, 위 표는 그중 주요 대분류만). 부가세 포함 여부는 공식 안내에 표기되지 않았습니다. 중분류별 전체 요율은 링크에서 확인하세요.
        </SourceNote>
      </section>

      <section className="space-y-2 rounded-2xl border border-mx-border bg-mx-surface p-4">
        <div>
          <h2 className="text-base font-extrabold text-mx-text">🛒 쿠팡</h2>
          <p className="text-xs text-mx-muted">
            카테고리 판매수수료(아래 표, 최종 결제금액 기준) + 월 매출 100만원 이상이면 서비스 이용료(월 5.5만원 별도)
          </p>
        </div>
        <FeeTable headers={["카테고리", "수수료율"]} rows={COUPANG_FEES} />
        <SourceNote verified={false}>
          쿠팡 공식 카테고리 수수료표는 판매자 센터(쿠팡 WING) 로그인 뒤에만 보여 직접 대조하지 못했습니다. 위 값은 여러 판매자 안내 자료와 일치하는 참고치이며 부가세 별도로 안내되는 경우가 많습니다. 내 카테고리 값은 WING의 상품 등록 화면 「카테고리 수수료」에서 확인하세요.
        </SourceNote>
      </section>

      <section className="space-y-2 rounded-2xl border border-mx-border bg-mx-surface p-4">
        <div>
          <h2 className="text-base font-extrabold text-mx-text">🏬 11번가</h2>
          <p className="text-xs text-mx-muted">
            서비스 이용료 = (판매가 × 카테고리 요율) − (추가 할인 × 90%). 판매자 안내 자료 기준 카테고리별 대략 <span className="font-semibold">7~13%</span>입니다.
          </p>
        </div>
        <SourceNote verified={false}>
          11번가 카테고리별 요율표는 판매자 센터(셀러오피스) 로그인 뒤 「상품관리 › 상품등록 › 카테고리별 서비스이용료 안내」에서만 보여, 예전에 적어 둔 카테고리별 숫자는 근거를 확인할 수 없어 뺐습니다. 내 카테고리 값을 그 화면에서 확인해 마진계산기에 넣어 주세요(신규 판매자 할인 등 조건에 따라 달라질 수 있음).
        </SourceNote>
      </section>

      <section className="space-y-2 rounded-2xl border border-mx-border bg-mx-surface p-4">
        <h2 className="text-base font-extrabold text-mx-text">🛍️ 네이버 스마트스토어</h2>
        <p className="text-xs leading-relaxed text-mx-muted">
          다른 오픈마켓과 달리 카테고리별로 수수료가 나뉘어 있지 않고, <span className="font-semibold">결제수단·유입경로</span> 기준으로 정해집니다.
          <br />
          <span className="font-semibold">주문관리(결제) 수수료 + 판매수수료</span>가 각각 별도로 붙습니다.
        </p>

        <div>
          <p className="mb-1 text-xs font-semibold text-mx-text">
            ① 주문관리(Npay) 수수료 — 국세청 신고 매출 등급(영세·중소1~3·일반)에 따라 다릅니다(2025-10-01 결제부터)
          </p>
          <FeeTable
            headers={["매출 등급", "주문관리 수수료(부가세 포함)"]}
            rows={[
              { category: "영세", values: ["1.947%"] },
              { category: "중소1", values: ["2.563%"] },
              { category: "중소2", values: ["2.728%"] },
              { category: "중소3", values: ["3.003%"] },
              { category: "일반", values: ["3.630%"] },
            ]}
          />
        </div>

        <div>
          <p className="mb-1 mt-2 text-xs font-semibold text-mx-text">② 판매수수료 — 유입경로 기준(매출 등급 무관, 2025-06-02 개편). 정산은 부가세 포함 비율(괄호는 공지 표기·부가세 제외)</p>
          <FeeTable
            headers={["유입경로", "스마트스토어", "브랜드스토어"]}
            rows={[
              { category: "판매수수료(네이버 검색·쇼핑·플러스스토어 등)", values: ["3% (2.73%)", "4% (3.64%)"] },
              { category: "판매자 마케팅(마케팅 링크·쇼핑 검색광고 유입)", values: ["1% (0.91%)", "2% (1.82%)"] },
            ]}
          />
        </div>
        <SourceNote verified date="2026-10-29">
          스마트스토어 판매자 고객센터 공식 도움말(「매출 규모에 따른 Npay 수수료 기준」·「판매수수료의 정산 기준 수수료율」)로 2026-10-29 확인했습니다. Npay 수수료와 판매수수료는 함께 붙고, 쇼핑라이브·렌탈 등 일부 상품은 별도 수수료가 더해집니다. 내 등급은 스마트스토어센터 「정산관리 › 정산 내역(일별/건별) › 나의 수수료 정보」에서 확인하세요.
        </SourceNote>
        <div className="rounded-lg border border-mx-success/30 bg-mx-success/10 p-3 text-xs leading-relaxed text-[#a7f3d0]">
          <p className="font-bold">💡 마케팅 링크를 쓰면 수수료가 더 낮아집니다</p>
          <p className="mt-1">
            판매자센터에서 스토어홈·카테고리·상품상세·쇼핑스토리 페이지별로 &quot;마케팅
            링크&quot;를 발급받아, 그 링크로 블로그·SNS·검색광고 등 <span className="font-semibold">직접 마케팅</span>을 통해 고객이 들어오면 판매수수료가 3% →{" "}
            <span className="font-semibold">1%</span>로 낮아집니다(정산 기준, 부가세 포함). 예를 들어 &quot;일반&quot;
            등급(Npay 수수료 3.63%)이라면, 총 부담이 일반 유입 약 6.63% → 마케팅 링크 유입 약 4.63%로
            줄어듭니다(본인 등급의 Npay 수수료와 판매수수료를 더하면 됩니다).
            유입 후 스토어를 이탈하지 않고 다른 상품을 구매해도 똑같이 적용되지만,
            네이버플러스스토어·가격비교 등 다른 경로로 이탈하면 적용되지 않습니다.
          </p>
        </div>
      </section>

      {/* EC-W7(2026-10-26): 수입 관세율 참고표 — 숫자는 lib/customs/tariffTable.ts 한 곳 */}
      <section id="tariff" className="space-y-3 rounded-2xl border border-mx-border bg-mx-surface p-5">
        <h2 className="text-base font-bold text-mx-text">🛃 수입 관세율 참고표 (해외 소싱)</h2>
        <SourceNote verified={false} date={TARIFF_CHECKED_AT}>
          일반적으로 알려진 기본세율이며, {TARIFF_CHECKED_AT} 기준 관세청 공식 표로 숫자를 대조하지 못했습니다. 같은 품목군이라도
          HS 부호마다 세율이 다르고, 원산지·FTA 적용 여부에 따라 낮아질 수 있습니다. 부가세는 별도(10%)입니다.
        </SourceNote>
        <FeeTable headers={["품목군", "대표 HS 부호", "기본세율(참고)", "주의"]} rows={TARIFF_ROWS.map((r) => ({ category: r.group, values: [r.hs, r.basicRate, r.note] }))} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-mx-muted">
          <a href={TARIFF_LOOKUP_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-mx-primary px-3 py-1.5 font-bold text-white hover:bg-[#1d4ed8]">
            관세법령정보포털에서 내 품목 세율 조회 ↗
          </a>
          <span>품목분류(HS 부호)를 찾은 뒤 「세율」에서 기본·FTA 세율을 확인하세요. 확실하지 않으면 관세사에게 물어보세요.</span>
        </div>
        <p className="text-[11px] leading-relaxed text-mx-muted">
          마진계산기의 관세는 <span className="font-semibold text-mx-text">(원가 + 해외 운송비) × 관세율</span>, 부가세는{" "}
          <span className="font-semibold text-mx-text">(원가 + 운송비 + 관세) × 10%</span>로 계산합니다. 판매 목적 수입은 개인 소액 면세가 적용되지 않을 수 있습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-mx-accent/30 bg-mx-accent/10 p-4 text-xs leading-relaxed text-[#fde68a]">
        <p className="mb-1 font-bold">💡 마진계산기에 반영하는 방법</p>
        <p>
          <a href="/sourcing" className="font-semibold text-mx-link underline">
            상품소싱 마진계산기
          </a>
          의 &quot;판매 플랫폼 수수료율&quot; 입력창에, 위 표를 참고하여 판매하실 플랫폼/카테고리에
          해당하는 값을 입력 후 사용하시면 됩니다.
          <br />
          프로모션(할인) 판매 시 쿠팡은 최종 결제금액 기준, G마켓·옥션은 판매가(옵션·추가구성 금액 포함) 기준,
          11번가는 판매가 기준 요율에서 추가 할인의 90%를 뺀 금액으로 수수료가 정해집니다.
        </p>
      </section>
    </div>
  );
}
