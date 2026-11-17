"use client";
// U3: 키 입력·저장·삭제 + 📖 연동 매뉴얼 상자(팝업). 서버: /api/keys
import { useEffect, useRef, useState } from "react";
import { rpc } from "@/lib/standaloneRpc";

type Provider = "anthropic" | "openai" | "gemini" | "cronjob_org_api_key" | "google_client_id" | "google_client_secret" | "bolta_api_key" | "bolta_webhook_secret" | "naver_client_id" | "naver_client_secret" | "kakao_rest_api_key" | "tavily" | "perplexity" | "serpapi";
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
  // 2026-11-15 AI 비서 웹 검색 키(공용 칸 — 다른 AIMaster 프로그램에서 등록했다면 이미 「등록됨」)
  { provider: "naver_client_id", name: "네이버 검색 Client ID", placeholder: "네이버 개발자센터 › 내 애플리케이션 › Client ID", desc: "네이버 개발자센터에서 애플리케이션을 만들 때 사용 API에 「검색」을 넣어야 합니다. 무료(하루 한도).", guideUrl: "https://developers.naver.com/apps/#/register" },
  { provider: "naver_client_secret", name: "네이버 검색 Client Secret", placeholder: "Client Secret", desc: "같은 애플리케이션의 Client Secret.", guideUrl: "https://developers.naver.com/apps/#/list" },
  { provider: "kakao_rest_api_key", name: "카카오 REST API 키 (다음 검색)", placeholder: "카카오 디벨로퍼스 › 내 애플리케이션 › 앱 키 › REST API 키", desc: "다음 웹문서 검색에 씁니다. 무료(하루 한도).", guideUrl: "https://developers.kakao.com/console/app" },
  { provider: "tavily", name: "Tavily API 키", placeholder: "tvly-…", desc: "AI용 검색(요약 포함). 무료 한도 뒤 사용량 과금.", guideUrl: "https://app.tavily.com/home" },
  { provider: "perplexity", name: "Perplexity API 키", placeholder: "pplx-…", desc: "검색 + 답 요약. 사용량 과금.", guideUrl: "https://www.perplexity.ai/settings/api" },
  { provider: "serpapi", name: "SerpAPI 키 (구글 검색 결과)", placeholder: "SerpAPI › Dashboard › API Key", desc: "구글 검색 결과를 그대로 가져옵니다. 무료 한도가 작습니다.", guideUrl: "https://serpapi.com/manage-api-key" },
];
// 2026-11-14 주인님 「그룹별 박스로 묶어줘」: 쓰는 곳별로 묶어 상자 하나씩
const GROUPS: { title: string; desc: string; providers: Provider[] }[] = [
  { title: "🤖 AI 비서", desc: "AI 질문·글쓰기·블록 자동 채우기·회의록 요약에 씁니다. 하나만 있어도 됩니다.", providers: ["anthropic", "openai", "gemini"] },
  { title: "⏰ 정시 자동화", desc: "「매일 9시」 같은 정시 자동화와 날짜 리마인더를 제시간에 돌립니다.", providers: ["cronjob_org_api_key"] },
  { title: "📅 구글 캘린더 연결", desc: "「📅 캘린더 연동 › 구글 계정 연결」에 씁니다. 두 칸을 함께 넣어 주세요.", providers: ["google_client_id", "google_client_secret"] },
  { title: "🧾 세금계산서 바로 발급 (볼타)", desc: "「영수증·세금계산서 › 볼타로 바로 발급」에 씁니다. 서명 키는 선택(발급 결과 자동 기록).", providers: ["bolta_api_key", "bolta_webhook_secret"] },
  { title: "🔎 AI 비서 웹 검색", desc: "AI 비서·에이전트가 웹 검색을 할 때 쓸 서비스와 그 키입니다. 키는 한 번 넣으면 다른 AIMaster 프로그램과 같이 씁니다.", providers: ["naver_client_id", "naver_client_secret", "kakao_rest_api_key", "tavily", "perplexity", "serpapi"] },
];
const GUIDE_URL = (id: string) => `https://www.buylife.xyz/guides/${id}`;
const openGuide = (it: { guideId?: string; guideUrl?: string }) => window.open(it.guideUrl ?? GUIDE_URL(it.guideId ?? ""), "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes");
const EMPTY: Record<Provider, string> = { anthropic: "", openai: "", gemini: "", cronjob_org_api_key: "", google_client_id: "", google_client_secret: "", bolta_api_key: "", bolta_webhook_secret: "", naver_client_id: "", naver_client_secret: "", kakao_rest_api_key: "", tavily: "", perplexity: "", serpapi: "" };

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
      {GROUPS.map((g) => {
        const items = ITEMS.filter((it) => g.providers.includes(it.provider));
        const done = items.filter((it) => keys?.[it.provider]).length;
        return (
      <section key={g.title} className="aww-key-group">
        <div className="aww-key-group-head">
          <h2>{g.title}</h2>
          <span className={`aww-key-group-count ${keys && done === items.length ? "on" : ""}`}>{keys === null ? "" : `등록 ${done}/${items.length}`}</span>
        </div>
        <p className="aww-key-group-desc">{g.desc}</p>
      <div className="aww-keys">
        {items.map((it) => (
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
        {g.providers.includes("anthropic") && <AiModelPrefs reloadTag={JSON.stringify(keys)} />}
        {g.providers.includes("naver_client_id") && <SearchToolPrefs reloadTag={JSON.stringify(keys)} />}
        {g.providers.includes("google_client_id") && <CalendarConnStatus reloadTag={JSON.stringify(keys)} />}{/* 2026-11-17 주인님 지시: 연결 상태 + 캘린더 연동 화면 열기 */}
      </div>
      </section>
        );
      })}

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
  const [usage, setUsage] = useState<{ key: string; label: string; used: number; limit: number }[]>([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    rpc<{ reminder: string[]; usage?: { key: string; label: string; used: number; limit: number }[] }>("awwNotifyPrefs", {})
      .then((r) => { setOn(r.reminder); setUsage(r.usage ?? []); })
      .catch(() => setOn([]));
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
    <section className="aww-key-group">
      <div className="aww-key-group-head"><h2>🔔 알림 받기</h2></div>
      <p className="aww-key-group-desc">일정 리마인더를 앱 알림과 함께 내 메일·카카오톡으로도 받습니다(선택).</p>
      <div className="aww-key-card">
        <div className="aww-key-head"><b>일정 리마인더</b></div>
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
      {usage.length > 0 && (
        <div className="aww-key-card">
          <div className="aww-key-head"><b>오늘 쓴 횟수</b></div>
          <p>자동화·버튼이 오늘(한국 시간) 쓴 양입니다. 하루 한도에 닿으면 그날은 보내지 않고 다음 날 0부터 다시 셉니다.</p>
          {usage.map((u) => (
            <div key={u.key} style={{ display: "flex", justifyContent: "space-between", margin: "4px 0", color: u.used >= u.limit ? "#c4554d" : undefined }}>
              <span>{u.label}</span>
              <b>{u.used.toLocaleString("ko-KR")} / {u.limit.toLocaleString("ko-KR")}{u.used >= u.limit ? " · 오늘 한도 도달" : ""}</b>
            </div>
          ))}
          <p style={{ fontSize: 12, opacity: 0.75 }}>💡 웹훅은 1분에 20번, 같은 내용의 알림은 1분 안에 한 번만 보냅니다. MCP 연결은 1분에 60번까지입니다.</p>
        </div>
      )}
    </section>
  );
}

// 2026-11-14 주인님 「플랫폼별 모델을 선택할 수 있게」 — 기준 naver-blog-agent 「기본 모델 설정」·free-music-studio AiModelsCard.
// 키가 없는 플랫폼은 「API 미등록」. 고른 모델은 AI 비서가 「자동」일 때 그 플랫폼에서 쓴다(채팅에서 직접 고르면 그것이 우선).
type ModelProvider = { id: string; name: string; registered: boolean; options: { id: string; label: string; recommended: boolean }[]; def: string; selected: string };
function AiModelPrefs({ reloadTag }: { reloadTag: string }) {
  const [list, setList] = useState<ModelProvider[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    rpc<{ providers: ModelProvider[] }>("awwAiModelPrefs", {})
      .then((r) => { setList(r.providers); setDraft(Object.fromEntries(r.providers.map((p) => [p.id, p.selected]))); })
      .catch(() => setList([]));
  }, [reloadTag]);
  const changed = !!list && list.some((p) => (draft[p.id] ?? "") !== p.selected);
  const save = async () => {
    setBusy(true);
    try {
      await rpc("awwSaveAiModelPrefs", { models: draft });
      setList((l) => l?.map((p) => ({ ...p, selected: draft[p.id] ?? "" })) ?? l);
      setMsg("저장했습니다. AI 비서가 「자동」일 때 이 모델을 씁니다.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="aww-key-card">
      <div className="aww-key-head"><b>플랫폼별 기본 모델</b></div>
      <p className="aww-key-desc">플랫폼마다 쓸 모델을 고릅니다. AI 비서가 「자동」일 때 이 모델을 쓰고, 채팅의 모델 목록에서 직접 고르면 그것이 우선입니다. 빠른 짧은 작업(제목 짓기 등)은 비용을 줄이려고 가벼운 모델을 그대로 씁니다.</p>
      {list === null && <p className="aww-key-desc">불러오는 중…</p>}
      {list?.map((p) => (
        <div key={p.id} className="aww-key-row" style={{ alignItems: "center", margin: "6px 0" }}>
          <span style={{ flex: "0 0 150px", fontSize: 13, fontWeight: 600 }}>{p.name}</span>
          {p.registered ? (
            <select
              value={draft[p.id] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
              aria-label={`${p.name} 기본 모델`}
              style={{ flex: "1 1 220px", minWidth: 0, height: 36, padding: "0 8px", borderRadius: 8, border: "1px solid var(--lp-border-primary, rgba(127,127,127,0.35))", background: "transparent", color: "inherit", font: "inherit" }}
            >
              <option value="">기본값 ({p.options.find((o) => o.id === p.def)?.label ?? (p.def || "자동")})</option>
              {p.options.filter((o) => o.recommended).length > 0 && (
                <optgroup label="추천">
                  {p.options.filter((o) => o.recommended).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </optgroup>
              )}
              {p.options.filter((o) => !o.recommended).length > 0 && (
                <optgroup label="다른 모델">
                  {p.options.filter((o) => !o.recommended).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </optgroup>
              )}
            </select>
          ) : (
            <span className="aww-key-state">API 미등록 — 위에서 키를 넣으면 고를 수 있습니다</span>
          )}
        </div>
      ))}
      {list && list.some((p) => p.registered) && (
        <div className="aww-key-row" style={{ marginTop: 8 }}>
          <button className="aww-btn primary small" disabled={busy || !changed} onClick={() => void save()}>{busy ? "저장 중…" : "모델 저장"}</button>
        </div>
      )}
      {msg && <p className="aww-key-msg">{msg}</p>}
    </div>
  );
}

// 2026-11-15 AI 비서 「🔎 웹 검색 도구」 고르기 — 키는 공용 저장소에 등록된 것 그대로(다른 프로그램에서 등록한 키 포함)
interface SearchOpt { id: string; label: string; note: string; ready: boolean }
function SearchToolPrefs({ reloadTag }: { reloadTag: string }) {
  const [opts, setOpts] = useState<SearchOpt[] | null>(null);
  const [sel, setSel] = useState("auto");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    rpc<{ selected: string; options: SearchOpt[] }>("awwSearchPrefs", {})
      .then((r) => { setOpts(r.options); setSel(r.selected); })
      .catch(() => setOpts([]));
  }, [reloadTag]);
  const save = async (id: string) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await rpc<{ selected: string }>("awwSaveSearchPrefs", { choice: id });
      setSel(r.selected);
      setMsg("저장했습니다. 다음 대화부터 이 검색을 씁니다.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!opts?.length) return null;
  return (
    <div className="aww-key-card aww-search-card">
      <div className="aww-key-head"><b>🔎 AI 비서 웹 검색 도구</b></div>
      <p className="aww-key-desc">AI 비서·에이전트가 「웹 검색」을 할 때 쓸 서비스를 고르세요. 모두 회원님 본인 키로 검색하고, 요금은 그 서비스가 회원님 계정에 청구합니다. 키가 없는 서비스를 고르면 내장 검색 → 등록된 다른 검색 순서로 대신합니다.</p>
      <div className="aww-search-opts" role="radiogroup" aria-label="웹 검색 도구">
        {opts.map((o) => (
          <label key={o.id} className={`aww-search-opt${sel === o.id ? " on" : ""}`}>
            <input type="radio" name="aww-search" checked={sel === o.id} disabled={busy} onChange={() => void save(o.id)} />
            <span>
              <b>{o.label}</b> <span className={o.ready ? "aww-search-ok" : "aww-search-no"}>{o.ready ? "✅ 사용 가능" : "키 없음"}</span>
              <small>{o.note}</small>
            </span>
          </label>
        ))}
      </div>
      <p className="aww-key-desc">각 서비스의 키는 위 칸에 넣으면 됩니다. 다른 AIMaster 프로그램에서 이미 넣었다면 「등록됨」으로 보이고 그대로 씁니다.</p>
      {msg && <p className="aww-key-msg">{msg}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- 📅 구글 캘린더 연결 상태
// 2026-11-17 WS-20261117-18 주인님 지시: 「📅 구글 캘린더 연결」 칸에 지금 연결 상태 + 「캘린더 연동 화면 열기」 버튼.
// 상태는 캘린더 연동 화면과 같은 기존 읽기 요청 calState(src/server/calendarSync.ts)만 쓴다. 키를 바꾸면(reloadTag) 다시 읽는다.
interface CalSummary {
  google: { hasApp: boolean; connected: boolean; needsReconnect: boolean; email: string | null };
  feed: { dbs: unknown[] } | null;
}

export function CalendarConnStatus({ reloadTag }: { reloadTag: string }) {
  const [st, setSt] = useState<CalSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const seq = useRef(0); // 마지막 요청만 반영(늦게 온 이전 응답·화면 해제 뒤 응답 무시)
  useEffect(() => {
    const my = ++seq.current;
    setFailed(false);
    rpc<CalSummary>("calState")
      .then((r) => { if (my === seq.current) setSt(r); })
      .catch(() => { if (my === seq.current) setFailed(true); });
  }, [reloadTag, retry]);
  useEffect(() => () => { seq.current++; }, []);

  const g = st?.google;
  const text = failed
    ? "⚠️ 연결 상태를 확인하지 못했습니다(연결이 끊겼다는 뜻은 아닙니다). 「다시 확인」을 누르거나 캘린더 연동 화면에서 확인해 주세요."
    : !st || !g
      ? "연결 상태 확인 중…"
      : !g.hasApp
        ? "⚪ 구글 앱 키를 먼저 넣어 주세요(위 두 칸)."
        : g.needsReconnect
          ? "⚠️ 구글 연결이 끊겼습니다. 캘린더 연동 화면에서 다시 연결해 주세요."
          : g.connected
            ? `✅ 구글 계정 연결됨${g.email ? ` · ${g.email}` : ""}`
            : "⚪ 아직 연결 안 됨 — 캘린더 연동 화면에서 「구글 연결」을 눌러 주세요.";
  return (
    <div className="aww-key-card aww-cal-status" role="status">
      <div className="aww-key-head">
        <b>지금 연결 상태</b>
        <a className="aww-btn small" href="/calendar-sync">📅 캘린더 연동 화면 열기</a>
      </div>
      <p className="aww-key-desc">{text}</p>
      {failed && <button type="button" className="aww-btn small" onClick={() => setRetry((n) => n + 1)}>🔄 다시 확인</button>}
      {st?.feed && <p className="aww-key-desc">🔗 간편 구독 켜짐(표 {st.feed.dbs.length}개)</p>}
    </div>
  );
}
