import { LEDGER_LABEL, creditAvailable } from "@/lib/credit";
import { formatDateTime } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import type { LedgerEntry } from "@/lib/store";

// 외상 요약·장부 표 — 손님 마이페이지와 운영자 손님 화면 공통
export default function CreditLedger({ limit, balance, entries }: { limit: number; balance: number; entries: LedgerEntry[] }) {
  return (
    <div className="text-sm" data-credit>
      <p className="flex flex-wrap gap-x-4 gap-y-1" data-credit-summary>
        <span>외상 한도 <b>{formatWon(limit)}</b></span>
        <span>사용 중 <b>{formatWon(balance)}</b></span>
        <span>남은 한도 <b>{formatWon(creditAvailable(limit, balance))}</b></span>
      </p>
      {entries.length > 0 && (
        <table className="mt-3 w-full text-left text-xs" data-ledger>
          <thead className="text-gray-500">
            <tr>
              <th className="py-1">일시</th>
              <th>구분</th>
              <th className="text-right">금액</th>
              <th className="text-right">사용 중</th>
              <th className="pl-3">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-1">{formatDateTime(e.created_at)}</td>
                <td>{LEDGER_LABEL[e.kind]}</td>
                <td className={`text-right ${e.amount < 0 ? "text-blue-700" : ""}`}>{e.amount > 0 ? "+" : ""}{formatWon(e.amount)}</td>
                <td className="text-right">{formatWon(e.balance_after)}</td>
                <td className="pl-3 text-gray-600">{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
