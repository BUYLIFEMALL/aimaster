export default function GuidePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">사용방법</h1>
      </div>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">1️⃣ 상품 등록 방식</h2>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-sm font-medium text-neutral-900">🔗 링크·검색으로 등록</p>
          <p className="text-xs text-neutral-500">
            상품 URL이나 검색만으로 최소 정보를 넣고 바로 등록합니다.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">2️⃣ 플랫폼 탭 선택</h2>
        <p className="mb-3 text-xs text-neutral-500">
          쿠팡파트너스 / 알리익스프레스 / 네이버 브랜드커넥트 / 토스쇼핑 쉐어링크 중 하나를
          고릅니다.
          <br />
          플랫폼마다 등록 방법과 필요한 API 키가 다릅니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-neutral-500">
                <th className="py-2 pr-3 font-medium">플랫폼</th>
                <th className="py-2 pr-3 font-medium">&quot;링크로 빠르게&quot; 등록 방법</th>
                <th className="py-2 font-medium">사전 준비</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="py-2 pr-3 align-top font-medium text-neutral-900">🛒 쿠팡파트너스</td>
                <td className="py-2 pr-3 align-top text-neutral-700">
                  (A) 키워드 검색 → 결과에서 상품 &quot;선택&quot;
                  <br />
                  (B) 쿠팡파트너스 사이트에서 직접 발급받은 제휴 링크 URL을 붙여넣기
                </td>
                <td className="py-2 align-top text-neutral-500">
                  (A)만 Access/Secret Key 필요 — 매출 15만원 달성해야 발급됨. (B)는 키 없이 바로
                  가능
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-3 align-top font-medium text-neutral-900">🌏 알리익스프레스</td>
                <td className="py-2 pr-3 align-top text-neutral-700">
                  상품명 입력 + 알리익스프레스 상품 URL 붙여넣기 → 제출 시 서버가 Affiliate API로
                  제휴 링크를 자동 생성
                </td>
                <td className="py-2 align-top text-neutral-500">App Key/Secret/Tracking ID 등록 필요</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 align-top font-medium text-neutral-900">📎 네이버 브랜드커넥트</td>
                <td className="py-2 pr-3 align-top text-neutral-700">
                  공식 API가 없어서, 브랜드커넥트 사이트에서 직접 발급받은 링크를 그대로 붙여넣기
                </td>
                <td className="py-2 align-top text-neutral-500">키 등록 불필요</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 align-top font-medium text-neutral-900">💙 토스쇼핑 쉐어링크</td>
                <td className="py-2 pr-3 align-top text-neutral-700">
                  키워드 검색이 아니라 베스트/카테고리/오늘의특가 목록에서 상품을 골라 등록
                </td>
                <td className="py-2 align-top text-neutral-500">
                  Access/Secret Key/Publisher ID 등록 + 고정 IP 2개를 본인 토스 어드민에 등록 필요
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          → API 키는 왼쪽 메뉴 <span className="font-medium text-neutral-700">&quot;API키등록·플랫폼연동&quot;</span>에서
          미리 등록해두면 됩니다.
        </p>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">3️⃣ 등록 완료 후</h2>
        <p className="text-xs text-neutral-700">
          제출하면 등록된 상품 목록에 바로 나타납니다. 이후{" "}
          <span className="font-medium">게시글 관리 → 새 게시글 작성</span> 화면에서 이 상품을
          골라 제휴 고지 문구가 포함된 캡션을 AI가 자동으로 만들어줍니다.
        </p>
      </section>
    </div>
  );
}
