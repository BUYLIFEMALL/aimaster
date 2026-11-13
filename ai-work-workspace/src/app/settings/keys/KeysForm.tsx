"use client";
// U3: 키 입력·저장·삭제 + 📖 연동 매뉴얼 상자(팝업). 서버: /api/keys
import { useEffect, useState } from "react";
import { rpc } from "@/lib/standaloneRpc";

type Provider = "anthropic" | "openai" | "gemini" | "cronjob_org_api_key" | "google_client_id" | "google_client_secret" | "bolta_api_key" | "bolta_webhook_secret";
const ITEMS: { provider: Provider; name: string; placeholder: string; desc: string; guideId?: string; guideUrl?: string }[] = [
  { provider: "anthropic", name: "Claude (Anthropic)", placeholder: "sk-ant-…", desc: "AI 비서 기본 엔진(Claude Sonnet). 빠른 작업은 Haiku를 씁니다.", guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a" },
  { provider: "openai", name: "OpenAI (GPT)", placeholder: "sk-…", desc: "Claude 키가 없을 때 「자동」이 쓰는 엔진입니다.", guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a" },
  { provider: "gemini", name: "Google Gemini", placeholder: "AIza… 또는 AQ.…", desc: "사용료가 가장 저렴한 Gemini Flash-Lite가 기본이고, 채팅 모델 목록에서 Flash·Pro를 직접 고를 수 있습니다. 무료 등급 키도 한도 안에서 쓸 수 있습니다.", guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4" },
  // U11(2026-11-10): 정시 자동화(매시간·매일 9시)·리마인더용. 공용 칸이라 다른 AIMaster 예약 프로그램에서 등록했다면 이미 「등록됨」
  { provider: "cronjob_org_api_key", name: "cron-job.org (정시 자동화)", placeholder: "cron-job.org Settings › API Keys에서 복사", desc: "「매시간·매일 9시」 같은 정시 자동화와 날짜 리마인더를 정해진 시각에 돌립니다(무료). 정시 자동화를 켜면 1분 확인 작업이 자동으로 켜지고, 남은 작업이 없으면 자동으로 꺼집니다. 키에 IP 제한은 걸지 마세요.", guideUrl: "https://console.cron-job.org/settings" },
  // 2026-11-11 캘린더 연동 ② 구글 계정 연결 — 회원 본인 구글 OAuth 앱(유튜브·구글 블로그 자동화와 같은 공용 칸)
  { provider: "google_client_id", name: "구글 앱 Client ID (캘린더 연결)", placeholder: "…apps.googleusercontent.com", desc: "「📅 캘린더 연동 › 구글 계정 연결」에 씁니다. 구글 클라우드 › API 및 서비스 › 사용자 인증 정보의 OAuth 클라이언트 ID. 유튜브·구글 블로그 자동화에서 이미 등록했다면 「등록됨」으로 보입니다. 이 앱에서 Google Calendar API를 켜고, 「테스트 중」이면 연결이 7일마다 끊기니 「앱 게시」(프로덕션)를 해 주세요.", guideUrl: "https://www.buylife.xyz/guides/523e7401-7393-44f5-ba45-dd437e10fa2d" },
  { provider: "google_client_secret", name: "구글 앱 Client Secret (캘린더 연결)", placeholder: "GOCSPX-…", desc: "위 OAuth 클라이언트의 「클라이언트 보안 비밀」.", guideUrl: "https://www.buylife.xyz/guides/523e7401-7393-44f5-ba45-dd437e10fa2d" },
  { provider: "bolta_api_key", name: "볼타 API 키 (세금계산서 바로 발급)", placeholder: "test_… 또는 live_…", desc: "「영수증·세금계산서 › 볼타로 바로 발급」에 씁니다. 볼타 개발자센터에서 본인 사업자로 가입한 뒤 연동을 만들면 테스트 키(test_)와 실제 키(live_)를 바로 받습니다. 처음엔 test_ 키로 시험하고, 실제 발급할 때 live_ 키로 바꿔 주세요. 실제 발급 요금은 볼타가 회원님 포인트에서 차감합니다.", guideUrl: "https://docs.bolta.io" },
  { provider: "bolta_webhook_secret", name: "볼타 웹훅 서명 키 (선택 · 발급 결과 자동 기록)", placeholder: "whsec_…", desc: "넣으면 「발급 결과 확인」을 다시 누르지 않아도 발급 결과·실패 사유가 문서에 자동으로 기록됩니다. 순서: 「영수증·세금계산서 › 볼타로 바로 발급」에서 웹훅 주소 만들기 → 볼타 개발자센터 › 연동 › 웹훅에 그 주소 등록 → 거기서 보이는 서명 키(whsec_)를 여기에 붙여 넣기. 테스트와 실제는 서명 키가 다르니 API 키를 live_로 바꿀 때 이 키도 함께 바꿔 주세요.", guideUrl: "https://docs.bolta.io/docs/api-introduction/webhook-events.md" },
];
const GUIDE_URL = (id: string) => `https://www.buylife.xyz/guides/${id}`;
const openGuide = (it: { guideId?: string; guideUrl?: string }) => window.open(it.guideUrl ?? GUIDE_URL(it.guideId ?? ""), "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes");
const EMPTY: Record<Provider, string> = { anthropic: "", openai: "", gemini: "", cronjob_org_api_key: "", google_client_id: "", google_client_secret: "", bolta_api_key: "", bolta_webhook_secret: "" };

export function KeysForm() {
  const [keys, setKeys] = useState<Record<Provider, string | null> | null>(null);
  const [inputs, setInputs] = useState<Record<Provider, string>>(EMPTY);
  const [msg, setMsg] = useState<Record<Provider, string>>(EMPTY);
  const [busy, setBusy] = useState<Provider | null>(null);

  const load = async () => {
    const r = await fetch("/api/keys", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setKeys(j.keys);
  };
  useEffect(() => { void load(); }, []);

  const save = async (provider: Provider) => {
    setBusy(provider);
    const r = await fetch("/api/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, apiKey: inputs[provider] }) });
    const j = await r.json().catch(() => ({}));
    setMsg((m) => ({ ...m, [provider]: r.ok ? (j.notice ?? "저장했습니다.") : j.message ?? "저장하지 못했습니다." }));
    if (r.ok) { setInputs((v) => ({ ...v, [provider]: "" })); await load(); }
    setBusy(null);
  };
  const remove = async (provider: Provider) => {
    if (!window.confirm("이 키를 지울까요? 다른 AIMaster 프로그램에서도 이 키를 쓰지 않게 됩니다.")) return;
    setBusy(provider);
    const r = await fetch(`/api/keys?provider=${provider}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setMsg((m) => ({ ...m, [provider]: r.ok ? "지웠습니다." : j.message ?? "지우지 못했습니다." }));
    if (r.ok) await load();
    setBusy(null);
  };

  return (
    <>
      <section className="aww-keys">
        {ITEMS.map((it) => (
          <div key={it.provider} className="aww-key-card">
            <div className="aww-key-head">
              <b>{it.name}</b>
              <span className={`aww-key-state ${keys?.[it.provider] ? "on" : ""}`}>{keys === null ? "확인 중…" : keys[it.provider] ? `등록됨 · ${keys[it.provider]}` : "등록 안 됨"}</span>
            </div>
            <p className="aww-key-desc">{it.desc}</p>
            <div className="aww-key-row">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={it.placeholder}
                value={inputs[it.provider]}
                onChange={(e) => setInputs((v) => ({ ...v, [it.provider]: e.target.value }))}
                aria-label={`${it.name} API 키`}
              />
              <button className="aww-btn primary small" disabled={busy !== null || !inputs[it.provider].trim()} onClick={() => void save(it.provider)}>
                {keys?.[it.provider] ? "바꾸기" : "저장"}
              </button>
              {keys?.[it.provider] && (
                <button className="aww-btn small" disabled={busy !== null} onClick={() => void remove(it.provider)}>
                  지우기
                </button>
              )}
            </div>
            {msg[it.provider] && <p className="aww-key-msg">{msg[it.provider]}</p>}
          </div>
        ))}
      </section>

      <NotifyPrefs />

      <section className="aww-key-guides">
        <h2>📖 연동 매뉴얼</h2>
        <p>키를 처음 받는다면 아래 매뉴얼을 팝업으로 열어 그대로 따라 하세요.</p>
        <div className="aww-key-guide-buttons">
          {ITEMS.map((it) => (
            <button key={it.provider} className="aww-btn small" onClick={() => openGuide(it)}>
              {it.name} API 키 발급받기 ↗
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

// 2026-11-13: 일정 리마인더를 내 메일·카카오톡으로도 받기(기본 꺼짐). 연결은 다른 프로그램에서 등록한 것을 그대로 쓴다.
function NotifyPrefs() {
  const [on, setOn] = useState<string[] | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    rpc<{ reminder: string[] }>("awwNotifyPrefs", {}).then((r) => setOn(r.reminder)).catch(() => setOn([]));
  }, []);
  const toggle = async (k: "email" | "kakao") => {
    const next = (on ?? []).includes(k) ? (on ?? []).filter((x) => x !== k) : [...(on ?? []), k];
    try {
      const r = await rpc<{ reminder: string[] }>("awwSaveNotifyPrefs", { reminder: next });
      setOn(r.reminder);
      setMsg("저장했습니다.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <section className="aww-keys">
      <div className="aww-key-card">
        <div className="aww-key-head"><b>🔔 알림 받기 — 일정 리마인더</b></div>
        <p>표의 날짜에 걸어 둔 리마인더가 울릴 때 앱 알림과 함께 아래로도 보냅니다. 받는 사람은 나 한 명이고, 채널마다 하루 100건까지입니다.</p>
        {(["email", "kakao"] as const).map((k) => (
          <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 0" }}>
            <input type="checkbox" disabled={on === null} checked={(on ?? []).includes(k)} onChange={() => void toggle(k)} />
            {k === "email" ? "내 메일로도 받기" : "내 카카오톡(나에게 보내기)으로도 받기"}
          </label>
        ))}
        <p style={{ fontSize: 12, opacity: 0.75 }}>💡 메일은 「예약(취소)방지 리마인드 자동화」 등에서 등록한 내 메일 계정으로, 카카오톡은 「부동산 실시간 매물 알림」 등에서 연결한 내 카카오로 보냅니다. 연결이 없으면 보내지 않고 앱 알림으로 이유를 알려 드립니다. 자동화의 「알림 보내기」는 자동화마다 따로 켭니다.</p>
        {msg && <p className="aww-key-msg">{msg}</p>}
      </div>
    </section>
  );
}
