"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectTelegramAction, disconnectTelegramAction, importRealEstateBotAction } from "@/lib/actions/telegram";
import { saveDeliveryAction } from "@/lib/actions/settings";

type Delivery = {
  notifyNew: boolean;
  notifyPriceDrop: boolean;
  notifyPriceChange: boolean;
  notifyGone: boolean;
  deliverTelegram: boolean;
  deliverFile: boolean;
  fileFormat: "xlsx" | "csv";
};
type Telegram = { botUsername: string | null; linkedAt: string | null } | null;
type Msg = { kind: "ok" | "err"; text: string } | null;

const NOTIFY: { key: "notifyNew" | "notifyPriceDrop" | "notifyPriceChange" | "notifyGone"; label: string; desc: string }[] = [
  { key: "notifyNew", label: "🆕 새 매물", desc: "처음 보는 매물이 올라오면" },
  { key: "notifyPriceDrop", label: "📉 가격 내림", desc: "가격이 내려가면" },
  { key: "notifyPriceChange", label: "🔁 가격 변동 전부", desc: "오르거나 내리면 모두" },
  { key: "notifyGone", label: "👋 사라진 매물", desc: "목록에서 없어지면" },
];

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p className={`ra-msg ${msg.kind === "ok" ? "ra-ok" : "ra-err"}`} role="status">{msg.text}</p>;
}

// 텔레그램 연결 — 기준: booking-reminder/components/settings/TelegramConnectForm.tsx
function TelegramCard({ telegram, realEstateBot }: { telegram: Telegram; realEstateBot: { botUsername: string | null } | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  async function connect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const result = await connectTelegramAction({}, new FormData(e.currentTarget));
      if (result.error) setMsg({ kind: "err", text: result.error });
      else {
        setMsg({ kind: "ok", text: result.success ?? "연결됐어요." });
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function importBot() {
    setMsg(null);
    setPending(true);
    try {
      const result = await importRealEstateBotAction();
      if (result.error) setMsg({ kind: "err", text: result.error });
      else {
        setMsg({ kind: "ok", text: result.success ?? "연결됐어요." });
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    try {
      await disconnectTelegramAction();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">🤖 내 텔레그램 봇 연결</h2>
      {telegram ? (
        <>
          <p className="ra-msg ra-ok">
            ✅ @{telegram.botUsername ?? "봇"} 에 연결돼 있어요{telegram.linkedAt ? ` (${new Date(telegram.linkedAt).toLocaleString("ko-KR")})` : ""}.
          </p>
          <button type="button" className="secondary" disabled={pending} onClick={disconnect}>연결 끊기</button>
        </>
      ) : (
        <>
          {realEstateBot && (
            <div className="ra-import">
              <p>
                <b>🏢 부동산 실거래 투자분석 자동화</b>에 연결해 둔 봇(@{realEstateBot.botUsername ?? "봇"})이 있어요. 같은 봇으로 받으면 새로 만들 필요가 없어요.
                <br />
                <small>두 프로그램 알림이 한 대화방에 오고, 이 프로그램 알림에는 「🏠 [매물 알림]」이 붙어요.</small>
              </p>
              <button type="button" className="primary" disabled={pending} onClick={importBot}>{pending ? "연결 중..." : "기존 부동산 봇 가져오기"}</button>
              <p className="card-caption">또는 아래에서 다른 봇을 새로 연결할 수 있어요.</p>
            </div>
          )}
          <ol className="ra-steps">
            <li>텔레그램에서 <b>@BotFather</b>를 열고 <code>/newbot</code>으로 내 봇을 만든 뒤 <b>봇 토큰</b>을 복사합니다.</li>
            <li>방금 만든 내 봇을 열고 아무 말이나 한 번 보냅니다(이 메시지로 받을 대화방을 찾아요).</li>
            <li>아래에 봇 토큰을 붙여 넣고 「연결 시험」을 누르면, 내 봇이 확인 메시지를 보내 줍니다.</li>
          </ol>
          <form onSubmit={connect}>
            <div className="field">
              <label htmlFor="botToken">봇 토큰</label>
              <input id="botToken" name="botToken" required autoComplete="off" placeholder="예: 123456789:AAF..." />
            </div>
            <button className="primary" type="submit" disabled={pending}>{pending ? "확인 중..." : "연결 시험"}</button>
          </form>
        </>
      )}
      <Message msg={msg} />
    </section>
  );
}

export default function DeliveryClient({ telegram, realEstateBot, initial }: { telegram: Telegram; realEstateBot: { botUsername: string | null } | null; initial: Delivery }) {
  const [value, setValue] = useState<Delivery>(initial);
  // 빠르게 여러 칸을 연달아 바꿔도 앞의 변경을 잃지 않도록 마지막 값을 ref로 들고 간다(2026-10-25 시험에서 발견).
  const latest = useRef<Delivery>(initial);
  const queue = useRef<Promise<unknown>>(Promise.resolve()); // 저장 요청을 차례대로(늦게 끝난 앞 요청이 최신 값을 덮지 않게)
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  function update(next: Partial<Delivery>) {
    const before = latest.current;
    const merged = { ...latest.current, ...next };
    latest.current = merged;
    setValue(merged);
    startTransition(async () => {
      const run = queue.current.then(() => saveDeliveryAction(merged));
      queue.current = run.catch(() => undefined);
      const result = await run;
      if (result.error) {
        latest.current = before;
        setValue(before);
        setMsg({ kind: "err", text: result.error });
      } else {
        setMsg({ kind: "ok", text: "저장됐어요." });
      }
    });
  }

  return (
    <>
      <TelegramCard telegram={telegram} realEstateBot={realEstateBot} />
      <section className="card">
        <h2 className="card-title">🔔 어떤 때 알려 드릴까요?</h2>
        <div className="ra-chips">
          {NOTIFY.map((n) => (
            <label key={n.key} className="ra-chip big">
              <input type="checkbox" checked={value[n.key]} disabled={pending} onChange={(e) => update({ [n.key]: e.target.checked })} />
              <span><strong>{n.label}</strong><small>{n.desc}</small></span>
            </label>
          ))}
        </div>
        <p className="card-caption">같은 매물은 한 번만 알려 드리고, 가격이 바뀌면 이전 가격과 함께 다시 알려 드려요.</p>
      </section>
      <section className="card">
        <h2 className="card-title">📎 무엇을 보낼까요?</h2>
        <div className="ra-chips">
          <label className="ra-chip big">
            <input type="checkbox" checked={value.deliverTelegram} disabled={pending} onChange={(e) => update({ deliverTelegram: e.target.checked })} />
            <span><strong>텔레그램 요약</strong><small>새 매물·가격 변동 몇 줄 요약</small></span>
          </label>
          <label className="ra-chip big">
            <input type="checkbox" checked={value.deliverFile} disabled={pending} onChange={(e) => update({ deliverFile: e.target.checked })} />
            <span><strong>정리 파일 첨부</strong><small>매물 표를 파일로 함께</small></span>
          </label>
        </div>
        <div className="field">
          <label htmlFor="fileFormat">파일 형식</label>
          <select id="fileFormat" value={value.fileFormat} disabled={pending} onChange={(e) => update({ fileFormat: e.target.value === "csv" ? "csv" : "xlsx" })}>
            <option value="xlsx">엑셀(xlsx)</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <p className="card-caption">📧 이메일로 받기는 다음 업데이트에서 열립니다. 중개사 전화번호 같은 개인 정보는 파일에 넣지 않아요.</p>
        <Message msg={msg} />
      </section>
    </>
  );
}
