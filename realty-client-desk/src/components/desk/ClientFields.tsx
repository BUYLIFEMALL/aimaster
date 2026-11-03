import { DEAL_TYPES, PROPERTY_TYPES } from "@/lib/desk/consent";

// 고객 조건 칸 — 고객 접수 링크(/i/[token])와 중개사 직접 입력(/clients)이 함께 쓴다
const label = "mb-1 block text-xs font-semibold text-mx-muted";

export function ClientFields() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={label} htmlFor="name">이름 *</label>
        <input id="name" name="name" required maxLength={40} className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="phone">휴대폰 *</label>
        <input id="phone" name="phone" required inputMode="tel" placeholder="010-1234-5678" className="mx-input" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={label}>원하는 거래 *</legend>
        <div className="flex flex-wrap gap-3 text-sm text-mx-text">
          {DEAL_TYPES.map((d, i) => (
            <label key={d} className="flex min-h-[40px] items-center gap-2">
              <input type="radio" name="dealType" value={d} defaultChecked={i === 0} className="h-4 w-4" /> {d}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="regions">원하는 지역</label>
        <input id="regions" name="regions" maxLength={200} placeholder="예: 고양시 일산동구 백석동, 마두동" className="mx-input" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={label}>유형(여러 개 가능)</legend>
        <div className="flex flex-wrap gap-3 text-sm text-mx-text">
          {PROPERTY_TYPES.map((t) => (
            <label key={t} className="flex min-h-[40px] items-center gap-2">
              <input type="checkbox" name="propertyTypes" value={t} className="h-4 w-4" /> {t}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className={label} htmlFor="budgetMin">예산 최소 (매매가·보증금)</label>
        <input id="budgetMin" name="budgetMin" placeholder="예: 3억" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="budgetMax">예산 최대</label>
        <input id="budgetMax" name="budgetMax" placeholder="예: 5억" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="monthlyMax">월세 최대(월세일 때)</label>
        <input id="monthlyMax" name="monthlyMax" placeholder="예: 100" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="areaMin">면적 최소(전용 ㎡)</label>
        <input id="areaMin" name="areaMin" inputMode="decimal" placeholder="예: 59" className="mx-input" />
      </div>
      <div>
        <label className={label} htmlFor="moveIn">입주 시기</label>
        <input id="moveIn" name="moveIn" maxLength={40} placeholder="예: 2027년 3월, 협의 가능" className="mx-input" />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="memo">메모</label>
        <textarea id="memo" name="memo" maxLength={1000} rows={3} className="mx-input" />
      </div>
    </div>
  );
}
