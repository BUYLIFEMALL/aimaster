"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectTelegramAction, disconnectTelegramAction, importRealEstateBotAction } from "@/lib/actions/telegram";
import { saveAiModelAction, saveChannelAction, saveDeliveryAction } from "@/lib/actions/settings";
import { AI_ENGINES, AI_MODELS, aiModelShortName, resolveAiModel } from "@/lib/aiModels";
import { deleteAiKeyAction, deleteResendKeyAction, saveAiKeyAction, saveKakaoKeysAction, saveResendKeyAction, sendTestEmailAction, sendTestKakaoAction, startKakaoConnectAction } from "@/lib/actions/notify";
import CopyText from "@/components/CopyText";
import { KAKAO_REDIRECT_URI } from "@/lib/kakaoOAuth";
import { aiProviderInfo, type AiProvider } from "@/lib/aiProviders";

type Delivery = {
  notifyNew: boolean;
  notifyPriceDrop: boolean;
  notifyPriceChange: boolean;
  notifyGone: boolean;
  deliverTelegram: boolean;
  deliverFile: boolean;
  fileFormat: "xlsx" | "csv";
};
export type ChannelInitial = { notifyKakao: boolean; notifyEmail: boolean; emailTo: string; aiSummary: boolean; aiProvider: AiProvider; aiModel?: string };
/** 🤖 AI 시세 요약(v1.22) — 키 값은 보내지 않고 등록 여부만 */
export type AiInfo = { hasGemini: boolean; hasOpenai: boolean; hasClaude: boolean; masks?: Partial<Record<AiProvider, string>> };
/** notice: 카카오에서 돌아온 결과(받는 방법 화면이 주소의 ?kakao=…를 서버에서 읽어 넘김) */
export type KakaoInfo = ({ ok: true; nickname: string | null } | { ok: false; message: string; connectUrl: string }) & { hasKey: boolean; notice?: { kind: "ok" | "err"; text: string } };
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
          <div className="ra-msg ra-ok ra-status-row">
            <span>✅ @{telegram.botUsername ?? "봇"} 에 연결돼 있어요{telegram.linkedAt ? ` (${new Date(telegram.linkedAt).toLocaleString("ko-KR")})` : ""}.</span>
            <button type="button" className="secondary" disabled={pending} onClick={disconnect}>연결 끊기</button>
          </div>
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
              <input id="botToken" name="botToken" required autoComplete="off" placeholder="숫자:영문 — 예 123456789:AAF… (@BotFather → API Token)" />
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

// 💬 카카오 연결(설정 화면) — 「카카오 자동화」에서 연결한 공용 카카오 계정을 그대로 쓴다(요약만, 파일은 못 보냄).
// 켜고 끄기는 「받는 방법」 화면(ReceiveCard)에서(2026-10-25 주인님 「받는 방법에는 실제 업무를 위한 항목만, 등록·연동은 한곳으로」)
function KakaoCard({ kakao }: { kakao: KakaoInfo }) {
  // 💬 카카오 바로 연결(2026-10-25 v1.17): 회원 본인 카카오 앱 키 저장 → 「카카오 연결하기」 → 카카오 동의 → /api/kakao/callback이 공용 연결 계정에 저장
  const router = useRouter();
  const test = useTest(sendTestKakaoAction);
  const [editKeys, setEditKeys] = useState(false);
  const [keyState, keyAction, savingKeys] = useActionState(async (prev: { error?: string; success?: string }, fd: FormData) => {
    const r = await saveKakaoKeysAction(prev, fd);
    if (r.success) { setEditKeys(false); router.refresh(); }
    return r;
  }, {});
  const [connecting, startConnect] = useTransition();
  const [connectMsg, setConnectMsg] = useState<Msg>(kakao.notice ?? null);
  // 카카오에서 돌아온 결과는 서버가 읽어 notice로 넘겼다 — 새로고침해도 다시 뜨지 않게 주소창의 ?kakao=…만 지운다
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("kakao") || q.has("kakao_error")) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }, []);
  const connect = () => startConnect(async () => {
    const r = await startKakaoConnectAction();
    if (r.url) window.location.href = r.url;
    else setConnectMsg({ kind: "err", text: r.error || "연결을 시작하지 못했어요." });
  });
  const showKeyForm = !kakao.hasKey || editKeys;

  return (
    <section className="card" id="kakao-card">
      <div className="ra-card-head">
        <h2 className="card-title">💬 카카오톡 연결</h2>
        <span className={`ra-status ${kakao.ok ? "on" : "off"}`}>{kakao.ok ? `✅ 연결됨${kakao.nickname ? ` (${kakao.nickname})` : ""}` : "⚪ 연결 전"}</span>
      </div>
      <div className="ra-caption-row">
        <p className="card-caption">카카오톡 「나와의 채팅」으로 <b>요약</b>을 보내 드립니다(새 매물·가격 변동 건수 + 결과 보기 버튼). 카톡으로는 파일을 보낼 수 없어서 엑셀은 텔레그램·이메일로 받아 주세요.<br />— 무료이며, <b>회원님 본인 카카오 앱</b>으로 연결합니다</p>
        <a className="secondary ra-link-btn" href="/guide#kakao">📖 연결 방법 따라 하기</a>
      </div>

      {kakao.ok && !editKeys ? (
        <>
          <div className="ra-toggle-row">
            <button type="button" className="secondary" disabled={test.pending} onClick={test.run}>{test.pending ? "보내는 중..." : "💬 시험 메시지 보내기"}</button>
            <button type="button" className="secondary" disabled={connecting} onClick={connect}>{connecting ? "여는 중..." : "🔁 다시 연결"}</button>
            <button type="button" className="secondary" onClick={() => setEditKeys(true)}>앱 키 바꾸기</button>
          </div>
          <div className="ra-hint">
            <strong>💡 카톡의 「결과 보기」가 다른 화면으로 열리는 경우</strong>
            <span>카카오 개발자 → 내 앱 → <b>앱 → 제품 링크 관리 → 「웹 도메인 수정」</b>에</span>
            <span><code className="ra-domain">https://realty-listing-alert.buylife.xyz</code> 를 추가해 주세요.</span>
          </div>
        </>
      ) : (
        <ol className="ra-addr-steps ra-kakao-steps">
          <li>
            <span>1</span>
            <div>
              <b>카카오 앱 키 저장</b>
              <small>카카오 개발자 → 내 앱 → <b>앱 → 플랫폼 키</b>의 <b>REST API 키</b>와, 그 카드를 눌러 나오는 화면 아래 <b>클라이언트 시크릿</b>(카카오 로그인 줄 「코드」)을 붙여 넣어요. {kakao.hasKey && !editKeys && "✅ 저장됨"}</small>
              {showKeyForm && (
                <form action={keyAction} className="ra-inline-form">
                  <div className="field"><label htmlFor="kakaoRestKey">🔑 REST API 키</label><input id="kakaoRestKey" name="kakaoRestKey" required autoComplete="off" placeholder="영문·숫자 32자 (앱 → 플랫폼 키 → REST API 키)" /></div>
                  <div className="field"><label htmlFor="kakaoSecret">🔒 클라이언트 시크릿</label><input id="kakaoSecret" name="kakaoSecret" autoComplete="off" placeholder="플랫폼 키 카드 → 클라이언트 시크릿 「코드」" /></div>
                  <button className="primary" type="submit" disabled={savingKeys}>{savingKeys ? "저장 중..." : "키 저장"}</button>
                </form>
              )}
              {keyState.error && <p className="ra-msg ra-err">{keyState.error}</p>}
              {keyState.success && <p className="ra-msg ra-ok">{keyState.success}</p>}
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <b>돌아올 주소 등록</b>
              <small>카카오 개발자 → 내 앱 → <b>앱 → 플랫폼 키 → Default Rest API Key 카드 클릭</b> → <b>「카카오 로그인 리다이렉트 URI」</b> 맨 아래 「+」에 아래 주소를 <b>그대로</b> 넣고 「저장」. 「제품 설정 → 카카오 로그인」에서 <b>사용 설정 ON</b>, 「동의항목」에서 <b>카카오톡 메시지 전송</b>도 켜 주세요.</small>
              <CopyText text={KAKAO_REDIRECT_URI} />
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <b>카카오 연결하기</b>
              <small>카카오 화면에서 「동의하고 계속하기」를 누르면 자동으로 돌아와요.</small>
              <div className="ra-row-actions">
                <button type="button" className="primary" disabled={!kakao.hasKey || connecting} onClick={connect}>{connecting ? "카카오 여는 중..." : "💬 카카오 연결하기"}</button>
                {editKeys && <button type="button" className="secondary" onClick={() => setEditKeys(false)}>취소</button>}
              </div>
              {!kakao.ok && <small className="ra-kakao-state">{kakao.message}</small>}
            </div>
          </li>
        </ol>
      )}
      <Message msg={connectMsg} />
      <Message msg={test.msg} />
    </section>
  );
}

// ✉️ 이메일 받기 — 회원 본인 Resend 키(공용 user_api_keys resend_api_key), 확장이 회원 PC에서 요약 + 엑셀 첨부로 보낸다
function EmailCard({ email, emailTo, onEmailTo, disabled }: { email: EmailInfo; emailTo: string; onEmailTo: (v: string) => void; disabled: boolean }) {
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
        <h2 className="card-title">✉️ 이메일(Resend) 연결</h2>
        <span className={`ra-status ${email.hasKey ? "on" : "off"}`}>{email.hasKey ? "✅ 키 등록됨" : "⚪ 키 등록 전"}</span>
      </div>
      <div className="ra-caption-row">
        <p className="card-caption">요약과 <b>엑셀 파일</b>을 메일로 보내 드립니다. 메일은 회원님 본인 <b>Resend</b>(무료 메일 발송 서비스) 계정으로 보냅니다.</p>
        {/* 2026-10-25 주인님 「우측에 resend 메일 회원가입 주소 링크를 버튼으로」 */}
        <a className="secondary ra-link-btn" href="https://resend.com/signup" target="_blank" rel="noopener noreferrer">✉️ Resend 가입하기 ↗</a>
      </div>
      {/* 이메일 받기 전에 알아 둘 것(2026-10-25 주인님 「이메일 설정하는 부분에 사용자가 숙지할 수 있도록 명시해놔」, 같은 날 「설명 너무 길어」 → 무료 한도·본인 메일만 2줄) */}
      <div className="ra-hint ra-email-notes">
        <strong>📌 이메일 받기 전에 꼭 알아 두세요</strong>
        <ul>
          <li><b>무료</b> — 하루 100통 · 한 달 3,000통까지 무료예요.</li>
          <li><b>받는 주소</b> — Resend에 가입한 본인 메일로만 받을 수 있어요.</li>
        </ul>
      </div>
      {!email.hasKey ? (
        <>
          <ol className="ra-addr-steps">
            <li><span>1</span><div><b>Resend 가입</b><small>구글 계정으로 바로 가입돼요. 가입한 메일이 받는 주소가 돼요.</small><a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer">✉️ resend.com 가입 ↗</a></div></li>
            <li><span>2</span><div><b>API 키 만들기</b><small>API Keys → Create API Key → 권한 <b>Sending access</b> → <code>re_</code>로 시작하는 키 복사</small><a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">🔑 API Keys 열기 ↗</a></div></li>
            <li><span>3</span><div><b>아래 칸에 붙여 넣고 저장</b><small>칸 클릭 → <kbd>Ctrl</kbd>+<kbd>V</kbd> → 「키 저장」</small></div></li>
          </ol>
          <form action={saveAction} className="ra-inline-form">
            <div className="field"><label htmlFor="resendKey">🔑 Resend API 키</label><input id="resendKey" name="resendKey" required autoComplete="off" placeholder="re_로 시작 (resend.com → API Keys)" /></div>
            <button className="primary" type="submit" disabled={saving}>{saving ? "저장 중..." : "키 저장"}</button>
          </form>
          {saveState.error && <p className="ra-msg ra-err">{saveState.error}</p>}
        </>
      ) : (
        <>
          {/* 켜기 칸 + 버튼을 한 줄로(2026-10-25 주인님 「보기좋게 버튼을 1열로」) — 카톡 카드와 같은 모양 */}
          <div className="ra-toggle-row">
            <button type="button" className="secondary" disabled={test.pending} onClick={test.run}>{test.pending ? "보내는 중..." : "✉️ 시험 메일 보내기"}</button>
            {/* 키 지우기는 이 화면(API키등록·플랫폼연동)에서만(2026-10-25 주인님 「키지우기는 아래 플랫폼 연동쪽에서 일괄 관리」) */}
            <button type="button" className="secondary" disabled={del} onClick={() => startDel(async () => { await deleteResendKeyAction(); router.refresh(); })}>키 지우기</button>
          </div>
          <div className="ra-inline-form">
            <div className="field">
              <label htmlFor="emailTo">📮 받는 메일 주소(Resend에 가입한 주소)</label>
              <input id="emailTo" type="email" value={to} placeholder="Resend에 가입한 메일(예: me@gmail.com)" onChange={(e) => setTo(e.target.value)} />
            </div>
            <button type="button" className="secondary" disabled={disabled || to.trim() === emailTo} onClick={() => onEmailTo(to.trim())}>주소 저장</button>
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

// 🤖 AI 시세 요약 엔진(설정 화면, 2026-10-25 주인님 「이런 배열로」 — 엔진마다 상자 하나)
// 윗줄: 엔진 이름·설명 … [요약에 사용] [🔑 API 키 발급/생성 ↗] (회원가입/콘솔 버튼은 2026-10-25 주인님 「굳이 이런 버튼 필요 없음」으로 뺌)
// 아랫줄: ○○ API Key [● sk-pro••••FDUA] 연동 완료 [모델 ▼] … [수정] [삭제]  — 「수정」을 누르면 키 칸·모델이 풀리고 [저장][취소].
// 키는 공용 user_api_keys라 다른 AIMaster 프로그램과 함께 쓴다 — 삭제하면 그쪽에서도 지워지므로 한 번 더 확인한다.
function AiEngineRow({ id, has, mask, selected, savedModel, disabled, onSelect }: { id: AiProvider; has: boolean; mask: string; selected: boolean; savedModel: string; disabled: boolean; onSelect: () => void }) {
  const router = useRouter();
  const engine = AI_ENGINES.find((e) => e.id === id)!;
  const info = aiProviderInfo(id);
  const [model, setModel] = useState(savedModel);
  const [saved, setSaved] = useState(savedModel);
  const [key, setKey] = useState("");
  const [editing, setEditing] = useState(!has);
  const [askDelete, setAskDelete] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    setMsg(null);
    if (key.trim()) {
      const fd = new FormData();
      fd.set("provider", id);
      fd.set("aiKey", key.trim());
      const k = await saveAiKeyAction({}, fd);
      if (k.error) { setMsg({ kind: "err", text: k.error }); return; }
    } else if (!has) { setMsg({ kind: "err", text: `${info.name} API 키를 넣어 주세요.` }); return; }
    if (model !== saved) {
      const r = await saveAiModelAction(id, model);
      if (r.error) { setMsg({ kind: "err", text: r.error }); return; }
      setSaved(model);
    }
    setKey(""); setEditing(false); router.refresh();
  });
  const cancel = () => { setModel(saved); setKey(""); setEditing(false); setMsg(null); };
  const remove = () => start(async () => {
    const r = await deleteAiKeyAction(id);
    if (r.error) { setMsg({ kind: "err", text: r.error }); return; }
    setAskDelete(false); setEditing(true); router.refresh();
  });
  return (
    <div className={`ra-aibox${selected ? " on" : ""}`}>
      <div className="ra-aibox-head">
        <span className="ra-aibox-title">{engine.icon} <b>{info.name}</b><small> · {engine.sub} — AI 시세 요약에 사용</small></span>
        <span className="ra-aibox-actions">
          <button type="button" className={`ra-use${selected ? " on" : ""}`} aria-pressed={selected} disabled={disabled} onClick={onSelect}>{selected ? "✔ 요약에 사용 중" : "이 엔진으로 요약"}</button>
          <a className="ra-btn-orange" href={info.keyUrl} target="_blank" rel="noopener noreferrer">🔑 API 키 발급/생성 ↗</a>
        </span>
      </div>
      <div className="ra-aibox-body">
        <b className="ra-aibox-label">{info.name} API Key</b>
        {editing ? (
          <input className="ra-aibox-input" type="password" aria-label={`${info.name} API 키`} value={key} autoComplete="off" onChange={(e) => setKey(e.target.value)} placeholder={has ? "새 키(바꿀 때만 — 비우면 기존 키 그대로)" : info.placeholder} />
        ) : (
          <>
            <span className="ra-keychip"><i />{mask}</span>
            <span className="ra-linked">연동 완료</span>
          </>
        )}
        <select className="ra-aibox-model" aria-label={`${engine.label} 모델`} value={model} disabled={!editing || busy} onChange={(e) => setModel(e.target.value)}>
          {AI_MODELS[id].map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <span className="ra-aibox-btns">
          {editing ? (
            <>
              <button type="button" className="ra-btn-save" disabled={busy} onClick={save}>{busy ? "저장 중..." : "저장"}</button>
              {has && <button type="button" className="ra-btn-edit" onClick={cancel}>취소</button>}
            </>
          ) : askDelete ? (
            <>
              <small className="ra-keyask">다른 AIMaster 프로그램에서도 지워져요</small>
              <button type="button" className="ra-btn-del" disabled={busy} onClick={remove}>삭제</button>
              <button type="button" className="ra-btn-edit" onClick={() => setAskDelete(false)}>취소</button>
            </>
          ) : (
            <>
              <button type="button" className="ra-btn-edit" onClick={() => setEditing(true)}>수정</button>
              <button type="button" className="ra-btn-del" onClick={() => setAskDelete(true)}>삭제</button>
            </>
          )}
        </span>
      </div>
      <Message msg={msg} />
    </div>
  );
}

export function AiEngineCard({ ai, initialProvider, models }: { ai: AiInfo; initialProvider: AiProvider; models: Record<string, string> }) {
  const router = useRouter();
  const has: Record<AiProvider, boolean> = { openai: ai.hasOpenai, claude: ai.hasClaude, gemini: ai.hasGemini };
  const [provider, setProvider] = useState<AiProvider>(initialProvider);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const pickEngine = (id: AiProvider) => {
    const before = provider;
    setProvider(id);
    start(async () => {
      const r = await saveChannelAction({ aiProvider: id });
      setMsg(r.error ? { kind: "err", text: r.error } : { kind: "ok", text: `${AI_ENGINES.find((e) => e.id === id)!.label} 엔진으로 바꿨어요.` });
      if (r.error) setProvider(before); else router.refresh();
    });
  };
  return (
    <section className="card ra-engine-card">
      <div className="ra-card-head">
        <h2 className="card-title">🤖 AI 시세 요약 엔진 선택 <small className="ra-engine-sub">GPT / Claude / Gemini · 선택</small></h2>
        <span className="ra-status on">요약에 적용</span>
      </div>
      <p className="card-caption">엔진마다 키와 모델을 저장하고, 「이 엔진으로 요약」으로 쓸 엔진을 고르세요. 저장한 키·모델은 「수정」으로 바꿔요. 다른 AIMaster 프로그램에 등록한 키가 있으면 그대로 쓰여요. 켜고 끄기는 「3 · 받는 방법」에서 해요.</p>
      {AI_ENGINES.map((e) => (
        <AiEngineRow key={e.id} id={e.id} has={has[e.id]} mask={ai.masks?.[e.id] ?? ""} selected={provider === e.id} savedModel={resolveAiModel(e.id, models[e.id])} disabled={pending} onSelect={() => pickEngine(e.id)} />
      ))}
      <Message msg={msg} />
    </section>
  );
}

// 💬 카톡 + ✉️ 이메일 연결 묶음 — 「API키등록·플랫폼연동」 화면 전용(등록·연동만)
/** emailHowTo·kakaoHowTo: 각 연결 카드 바로 위에 1줄씩 놓을 「📖 연동 방법」 상자(2026-10-25 주인님 「1줄씩 배치」) */
export function ChannelCards({ kakao, email, initial, emailHowTo, kakaoHowTo }: { kakao: KakaoInfo; email: EmailInfo; initial: ChannelInitial; emailHowTo?: React.ReactNode; kakaoHowTo?: React.ReactNode }) {
  const router = useRouter();
  const [emailTo, setEmailTo] = useState(initial.emailTo);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  function saveEmailTo(v: string) {
    const before = emailTo;
    setEmailTo(v);
    start(async () => {
      const r = await saveChannelAction({ emailTo: v });
      if (r.error) { setEmailTo(before); setMsg({ kind: "err", text: r.error }); }
      else { setMsg({ kind: "ok", text: "저장됐어요." }); router.refresh(); }
    });
  }
  return (
    <>
      <div id="email">{emailHowTo}<EmailCard email={email} emailTo={emailTo} disabled={pending} onEmailTo={saveEmailTo} /></div>
      <div id="kakao">{kakaoHowTo}<KakaoCard kakao={kakao} /></div>
      <Message msg={msg} />
    </>
  );
}

// 📬 받는 곳(받는 방법 화면) — 실제 업무용: 곳마다 연결 상태·켜기·시험만. 연결·키 등록은 「API키등록·플랫폼연동」으로 보낸다
// (2026-10-25 주인님 「받는 방법에는 실제 업무를 위한 항목만 주로 남겨놓고 … 등록,연동작업을 한곳으로 모아서」).
function ReceiveCard({ telegram, kakao, email, ai, initial }: { telegram: Telegram; kakao: KakaoInfo; email: EmailInfo; ai: AiInfo; initial: ChannelInitial }) {
  const router = useRouter();
  const [value, setValue] = useState<ChannelInitial>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const kakaoTest = useTest(sendTestKakaoAction);
  const emailTest = useTest(sendTestEmailAction);
  function save(next: Partial<ChannelInitial>) {
    const before = value;
    setValue({ ...value, ...next });
    start(async () => {
      const r = await saveChannelAction(next);
      if (r.error) { setValue(before); setMsg({ kind: "err", text: r.error }); }
      else { setMsg({ kind: "ok", text: "저장됐어요." }); router.refresh(); }
    });
  }
  const aiName = aiProviderInfo(value.aiProvider).name;
  const aiHas = value.aiProvider === "openai" ? ai.hasOpenai : value.aiProvider === "claude" ? ai.hasClaude : ai.hasGemini;
  const emailReady = email.hasKey && Boolean(value.emailTo);
  const goSetup = (hash: string) => <a className="ra-recv-go" href={`/settings#${hash}`}>연동하러 가기 →</a>;
  return (
    <section className="card">
      <div className="ra-card-head">
        <h2 className="card-title">📬 받는 곳</h2>
        <a className="secondary ra-link-btn" href="/settings">🔑 연결·키 관리</a>
      </div>
      <div className="ra-recv">
        <div className="ra-recv-row">
          <b>📨 텔레그램</b>
          <span className={`ra-status ${telegram ? "on" : "off"}`}>{telegram ? `✅ @${telegram.botUsername ?? "봇"}` : "⚪ 연결 전"}</span>
          <div className="ra-recv-ctl">{telegram ? <small>요약 + 엑셀 파일을 받아요</small> : goSetup("telegram")}</div>
        </div>
        <div className="ra-recv-row">
          <b>✉️ 이메일</b>
          <span className={`ra-status ${emailReady ? "on" : "off"}`}>{emailReady ? `✅ ${value.emailTo}` : email.hasKey ? "⚪ 받는 주소 없음" : "⚪ 연결 전"}</span>
          <div className="ra-recv-ctl">
            {emailReady ? (
              <>
                <label className="ra-chip oneline"><input type="checkbox" checked={value.notifyEmail} disabled={pending} onChange={(e) => save({ notifyEmail: e.target.checked })} /><span><strong>요약 + 엑셀 받기</strong></span></label>
                <button type="button" className="secondary" disabled={emailTest.pending} onClick={emailTest.run}>{emailTest.pending ? "보내는 중..." : "테스트 발송"}</button>
              </>
            ) : goSetup("email")}
          </div>
        </div>
        <div className="ra-recv-row">
          <b>💬 카카오톡</b>
          <span className={`ra-status ${kakao.ok ? "on" : "off"}`}>{kakao.ok ? "✅ 연결됨" : "⚪ 연결 전"}</span>
          <div className="ra-recv-ctl">
            {kakao.ok ? (
              <>
                <label className="ra-chip oneline"><input type="checkbox" checked={value.notifyKakao} disabled={pending} onChange={(e) => save({ notifyKakao: e.target.checked })} /><span><strong>요약 받기</strong></span></label>
                <button type="button" className="secondary" disabled={kakaoTest.pending} onClick={kakaoTest.run}>{kakaoTest.pending ? "보내는 중..." : "테스트 발송"}</button>
              </>
            ) : goSetup("kakao")}
          </div>
        </div>
        <div className="ra-recv-row">
          <b>🤖 AI 시세 요약</b>
          <span className={`ra-status ${aiHas ? "on" : "off"}`}>{aiHas ? `✅ ${AI_ENGINES.find((e) => e.id === value.aiProvider)!.label} · ${aiModelShortName(value.aiProvider, value.aiModel ?? resolveAiModel(value.aiProvider, ""))}` : `⚪ ${aiName} 키 없음`}</span>
          <div className="ra-recv-ctl">
            <label className="ra-chip oneline"><input type="checkbox" checked={value.aiSummary} disabled={pending || !aiHas} onChange={(e) => save({ aiSummary: e.target.checked })} /><span><strong>하루 1번 받기</strong></span></label>
            <a className="ra-recv-go" href="/settings#ai">{aiHas ? "엔진·모델 바꾸기 →" : "연동하러 가기 →"}</a>
          </div>
        </div>
      </div>
      <p className="card-caption">AI 요약은 이번 주 시세 흐름 한두 줄을 텔레그램·메일 맨 위와 수집 결과 화면에 붙여요(통계 숫자만 보내요).</p>
      <Message msg={kakaoTest.msg} />
      <Message msg={emailTest.msg} />
      <Message msg={msg} />
    </section>
  );
}

export default function DeliveryClient({ telegram, initial, kakao, email, ai, channel }: { telegram: Telegram; initial: Delivery; kakao: KakaoInfo; email: EmailInfo; ai: AiInfo; channel: ChannelInitial }) {
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
      {/* 「📎 무엇을 보낼까요?」 카드는 2026-10-25 주인님 지시로 뺐다(헷갈림) — 저장값 deliver_telegram·deliver_file·file_format은 기본값(켜짐·켜짐·엑셀)대로 그대로 쓴다 */}
      <ReceiveCard telegram={telegram} kakao={kakao} email={email} ai={ai} initial={channel} />
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
        <Message msg={msg} />
      </section>
    </>
  );
}
