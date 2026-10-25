"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectTelegramAction, disconnectTelegramAction, importRealEstateBotAction } from "@/lib/actions/telegram";
import { saveChannelAction, saveDeliveryAction } from "@/lib/actions/settings";
import { deleteResendKeyAction, saveResendKeyAction, sendTestEmailAction, sendTestKakaoAction } from "@/lib/actions/notify";

type Delivery = {
  notifyNew: boolean;
  notifyPriceDrop: boolean;
  notifyPriceChange: boolean;
  notifyGone: boolean;
  deliverTelegram: boolean;
  deliverFile: boolean;
  fileFormat: "xlsx" | "csv";
};
export type ChannelInitial = { notifyKakao: boolean; notifyEmail: boolean; emailTo: string };
export type KakaoInfo = { ok: true; nickname: string | null } | { ok: false; message: string; connectUrl: string };
export type EmailInfo = { hasKey: boolean; loginEmail: string };
export type Telegram = { botUsername: string | null; linkedAt: string | null } | null;
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
export function TelegramCard({ telegram, realEstateBot }: { telegram: Telegram; realEstateBot: { botUsername: string | null } | null }) {
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
      <div className="ra-card-head">
        <h2 className="card-title">🤖 내 텔레그램 봇 연결</h2>
        <span className={`ra-status ${telegram ? "on" : "off"}`}>{telegram ? "✅ 연결됨" : "⚪ 연결 전"}</span>
      </div>
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

function useTest(action: () => Promise<{ error?: string; success?: string; suggestEmail?: string }>) {
  const [msg, setMsg] = useState<Msg>(null);
  const [suggest, setSuggest] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return {
    msg,
    pending,
    suggest,
    clearSuggest: () => setSuggest(null),
    run: () =>
      start(async () => {
        setMsg(null);
        setSuggest(null);
        const r = await action();
        setMsg(r.error ? { kind: "err", text: r.error } : { kind: "ok", text: r.success ?? "보냈어요." });
        if (r.suggestEmail) setSuggest(r.suggestEmail);
      }),
  };
}

// 💬 카톡 받기 — 「카카오 자동화」에서 연결한 공용 카카오 계정을 그대로 쓴다(요약만, 파일은 못 보냄)
function KakaoCard({ kakao, on, onToggle, disabled }: { kakao: KakaoInfo; on: boolean; onToggle: (v: boolean) => void; disabled: boolean }) {
  const test = useTest(sendTestKakaoAction);
  return (
    <section className="card">
      <div className="ra-card-head">
        <h2 className="card-title">💬 카카오톡으로 받기</h2>
        <span className={`ra-status ${kakao.ok ? "on" : "off"}`}>{kakao.ok ? `✅ 연결됨${kakao.nickname ? ` (${kakao.nickname})` : ""}` : "⚪ 연결 전"}</span>
      </div>
      <p className="card-caption">카카오톡 「나와의 채팅」으로 <b>요약</b>을 보내 드려요(새 매물·가격 변동 건수 + 결과 보기 버튼). 카톡으로는 파일을 보낼 수 없어서 엑셀은 텔레그램·이메일로 받아 주세요.</p>
      {kakao.ok ? (
        <>
          <label className="ra-chip big">
            <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} />
            <span><strong>카톡 요약 받기</strong><small>{on ? "켜짐 — 수집할 때마다 보내요" : "꺼짐"}</small></span>
          </label>
          <div className="ra-row-actions">
            <button type="button" className="secondary" disabled={test.pending} onClick={test.run}>{test.pending ? "보내는 중..." : "💬 시험 메시지 보내기"}</button>
          </div>
        </>
      ) : (
        <div className="ra-import">
          <p>{kakao.message}<br /><small>「카카오 자동화」에서 한 번 연결하면 이 프로그램도 그대로 써요(카카오 앱을 또 만들 필요 없음).</small></p>
          <a className="primary" href={kakao.connectUrl} target="_blank" rel="noopener noreferrer">💬 카카오 자동화에서 연결하기 ↗</a>
        </div>
      )}
      <Message msg={test.msg} />
    </section>
  );
}

// ✉️ 이메일 받기 — 회원 본인 Resend 키(공용 user_api_keys resend_api_key), 확장이 회원 PC에서 요약 + 엑셀 첨부로 보낸다
function EmailCard({ email, on, emailTo, onToggle, onEmailTo, disabled }: { email: EmailInfo; on: boolean; emailTo: string; onToggle: (v: boolean) => void; onEmailTo: (v: string) => void; disabled: boolean }) {
  const router = useRouter();
  const [saveState, saveAction, saving] = useActionState(async (prev: { error?: string; success?: string }, fd: FormData) => {
    const r = await saveResendKeyAction(prev, fd);
    if (r.success) router.refresh();
    return r;
  }, {});
  const [del, startDel] = useTransition();
  const test = useTest(sendTestEmailAction);
  const [to, setTo] = useState(emailTo);
  return (
    <section className="card">
      <div className="ra-card-head">
        <h2 className="card-title">✉️ 이메일로 받기</h2>
        <span className={`ra-status ${email.hasKey ? "on" : "off"}`}>{email.hasKey ? "✅ 키 등록됨" : "⚪ 키 등록 전"}</span>
      </div>
      <p className="card-caption">요약과 <b>엑셀 파일</b>을 메일로 보내 드려요. 메일은 회원님 본인 <b>Resend</b>(무료 메일 발송 서비스) 계정으로 보내요 — 무료로 하루 100통, 가입한 본인 메일 주소로만 받을 수 있어요.</p>
      {!email.hasKey ? (
        <>
          <ol className="ra-addr-steps">
            <li><span>1</span><div><b>Resend 가입</b><small>구글 계정으로 바로 가입돼요. 가입한 메일이 받는 주소가 돼요.</small><a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer">✉️ resend.com 가입 ↗</a></div></li>
            <li><span>2</span><div><b>API 키 만들기</b><small>API Keys → Create API Key → 권한 <b>Sending access</b> → <code>re_</code>로 시작하는 키 복사</small><a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">🔑 API Keys 열기 ↗</a></div></li>
            <li><span>3</span><div><b>아래 칸에 붙여 넣고 저장</b><small>칸 클릭 → <kbd>Ctrl</kbd>+<kbd>V</kbd> → 「키 저장」</small></div></li>
          </ol>
          <form action={saveAction} className="ra-inline-form">
            <div className="field"><label htmlFor="resendKey">🔑 Resend API 키</label><input id="resendKey" name="resendKey" required autoComplete="off" placeholder="re_로 시작하는 키" /></div>
            <button className="primary" type="submit" disabled={saving}>{saving ? "저장 중..." : "키 저장"}</button>
          </form>
          {saveState.error && <p className="ra-msg ra-err">{saveState.error}</p>}
        </>
      ) : (
        <>
          <label className="ra-chip big">
            <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} />
            <span><strong>이메일 받기</strong><small>{on ? "켜짐 — 수집할 때마다 요약 + 엑셀" : "꺼짐"}</small></span>
          </label>
          <div className="ra-inline-form">
            <div className="field">
              <label htmlFor="emailTo">📮 받는 메일 주소(Resend에 가입한 주소)</label>
              <input id="emailTo" type="email" value={to} placeholder="Resend에 가입한 메일(예: me@gmail.com)" onChange={(e) => setTo(e.target.value)} />
            </div>
            <button type="button" className="secondary" disabled={disabled || to.trim() === emailTo} onClick={() => onEmailTo(to.trim())}>주소 저장</button>
          </div>
          <div className="ra-row-actions">
            <button type="button" className="secondary" disabled={test.pending} onClick={test.run}>{test.pending ? "보내는 중..." : "✉️ 시험 메일 보내기"}</button>
            <button type="button" className="secondary" disabled={del} onClick={() => startDel(async () => { await deleteResendKeyAction(); router.refresh(); })}>키 지우기</button>
          </div>
        </>
      )}
      {saveState.success && <p className="ra-msg ra-ok">{saveState.success}</p>}
      <Message msg={test.msg} />
      {test.suggest && (
        <div className="ra-row-actions">
          <button type="button" className="primary" disabled={disabled} onClick={() => { setTo(test.suggest!); onEmailTo(test.suggest!); test.clearSuggest(); }}>📮 {test.suggest} 로 바꾸기</button>
        </div>
      )}
    </section>
  );
}

// 💬 카톡 + ✉️ 이메일 카드 묶음 — 「받는 방법」·「API키등록·플랫폼연동」 두 화면이 같이 쓴다(같은 저장값)
export function ChannelCards({ kakao, email, initial }: { kakao: KakaoInfo; email: EmailInfo; initial: ChannelInitial }) {
  const router = useRouter();
  const [value, setValue] = useState<ChannelInitial>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  function save(next: Partial<ChannelInitial>) {
    const before = value;
    setValue({ ...value, ...next });
    start(async () => {
      const r = await saveChannelAction(next);
      if (r.error) {
        setValue(before);
        setMsg({ kind: "err", text: r.error });
      } else {
        setMsg({ kind: "ok", text: "저장됐어요." });
        router.refresh();
      }
    });
  }
  return (
    <>
      <KakaoCard kakao={kakao} on={value.notifyKakao} disabled={pending} onToggle={(v) => save({ notifyKakao: v })} />
      <EmailCard email={email} on={value.notifyEmail} emailTo={value.emailTo} disabled={pending} onToggle={(v) => save({ notifyEmail: v })} onEmailTo={(v) => save({ emailTo: v })} />
      <Message msg={msg} />
    </>
  );
}

export default function DeliveryClient({ telegram, realEstateBot, initial, kakao, email, channel }: { telegram: Telegram; realEstateBot: { botUsername: string | null } | null; initial: Delivery; kakao: KakaoInfo; email: EmailInfo; channel: ChannelInitial }) {
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
      <ChannelCards kakao={kakao} email={email} initial={channel} />
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
        <p className="card-caption">파일은 텔레그램·이메일에 함께 붙어요. 중개사 전화번호 같은 개인 정보는 파일에 넣지 않아요.</p>
        <Message msg={msg} />
      </section>
    </>
  );
}
