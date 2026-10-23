"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { GuideLinkButton } from "./GuideLinkButton";

type KeyInfo = { hasKey: boolean; maskedKey: string | null };
interface Field { provider: string; label: string; secret: boolean; placeholder: string }
interface Group {
  id: string;
  title: string;
  hint: string;
  signup: string;
  required: boolean;
  testTarget: "gemini" | "naver" | "ads";
  guideUrl: string | null;
  guideLabel: string;
  fields: Field[];
}

export interface GuideUrls { gemini: string | null; naver: string | null; ads: string | null }

function groups(g: GuideUrls): Group[] {
  return [
    {
      id: "gemini", title: "Google Gemini API 키 (필수)", required: true, testTarget: "gemini",
      hint: "AI 분석·전략·글 제안에 쓰입니다. 자동완성 목록만 볼 때는 없어도 됩니다.",
      signup: "https://aistudio.google.com/apikey", guideUrl: g.gemini, guideLabel: "Gemini API 키 발급 매뉴얼",
      fields: [{ provider: "gemini", label: "API 키", secret: true, placeholder: "AIza…로 시작하는 키" }],
    },
    {
      id: "naver", title: "네이버 검색 API (상위 블로그·뉴스·트렌드용)", required: false, testTarget: "naver",
      hint: "상위 블로그 분석·실시간 뉴스·카테고리 트렌드와 경쟁력의 문서 수·검색 추이에 쓰입니다. 무료이며 계정당 일일 한도가 있어 본인 키를 사용합니다.",
      signup: "https://console.ncloud.com/naver-api-hub", guideUrl: g.naver, guideLabel: "네이버 검색 API 키 발급 매뉴얼",
      fields: [
        { provider: "naver_client_id", label: "Client ID", secret: false, placeholder: "Client ID" },
        { provider: "naver_client_secret", label: "Client Secret", secret: true, placeholder: "Client Secret" },
      ],
    },
    {
      id: "ads", title: "네이버 검색광고 API (선택 · 실측 월간 검색수)", required: false, testTarget: "ads",
      hint: "등록하면 자동완성 목록과 경쟁력 분석에 실제 월간 검색수(PC·모바일)와 광고 경쟁도가 함께 표시됩니다.",
      signup: "https://searchad.naver.com", guideUrl: g.ads, guideLabel: "검색광고 API 키 발급 매뉴얼",
      fields: [
        { provider: "naver_ads_api_key", label: "ACCESS LICENSE", secret: true, placeholder: "ACCESS LICENSE" },
        { provider: "naver_ads_secret_key", label: "SECRET KEY", secret: true, placeholder: "SECRET KEY" },
        { provider: "naver_ads_customer_id", label: "CUSTOMER ID", secret: false, placeholder: "숫자 고객 ID" },
      ],
    },
  ];
}

function GroupCard({ group, keys, onChanged }: { group: Group; keys: Record<string, KeyInfo> | null; onChanged: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const registered = group.fields.filter((f) => keys?.[f.provider]?.hasKey).length;
  const allSet = registered === group.fields.length;
  const filled = group.fields.filter((f) => values[f.provider]?.trim());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      for (const f of filled) {
        const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: f.provider, apiKey: values[f.provider].trim() }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setMsg({ text: `${f.label}: ${data.error ?? "저장하지 못했습니다."}`, ok: false }); return; }
      }
      setValues({});
      setMsg({ text: "키를 등록했습니다. [연결 확인]으로 동작을 확인해 보세요.", ok: true });
      onChanged();
    } catch {
      setMsg({ text: "서버에 연결하지 못했습니다.", ok: false });
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/keys/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: group.testTarget }) });
      const data = await res.json().catch(() => ({}));
      setMsg({ text: data.message ?? data.error ?? "확인하지 못했습니다.", ok: res.ok && data.ok !== false });
    } catch {
      setMsg({ text: "서버에 연결하지 못했습니다.", ok: false });
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("이 항목의 등록된 키를 모두 삭제할까요?")) return;
    setBusy(true); setMsg(null);
    try {
      for (const f of group.fields) {
        if (!keys?.[f.provider]?.hasKey) continue;
        const res = await fetch(`/api/keys?provider=${f.provider}`, { method: "DELETE" });
        if (!res.ok) { setMsg({ text: "삭제하지 못했습니다.", ok: false }); return; }
      }
      setMsg({ text: "키를 삭제했습니다.", ok: true });
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <section className="card" data-group={group.id}>
      <h2><KeyRound size={16} style={{ verticalAlign: "-3px" }} /> {group.title}</h2>
      <p className="muted" style={{ marginTop: 6 }}>{group.hint} 발급: <a href={group.signup} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{group.signup.replace("https://", "")}</a></p>
      {keys === null ? <p className="muted" style={{ marginTop: 12 }}>확인 중…</p> : (
        <p className={`key-status ${allSet ? "" : "none"}`} style={{ marginTop: 12 }}>
          {allSet
            ? <>등록됨 · {group.fields.map((f) => <code key={f.provider} style={{ marginRight: 6 }}>{keys[f.provider]?.maskedKey}</code>)}</>
            : registered > 0 ? `일부만 등록됨 (${registered}/${group.fields.length}) — 나머지 칸도 입력해 주세요.` : "아직 등록된 키가 없습니다."}
        </p>
      )}
      <form onSubmit={save} className="stack" style={{ marginTop: 16 }}>
        {group.fields.map((f) => (
          <label key={f.provider}>{f.label}{keys?.[f.provider]?.hasKey ? " (새 값으로 바꾸려면 입력)" : ""}
            <input type={f.secret ? "password" : "text"} autoComplete="off" value={values[f.provider] ?? ""} placeholder={f.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [f.provider]: e.target.value }))} />
          </label>
        ))}
        <div className="actions">
          <button type="submit" className="primary" disabled={busy || filled.length === 0}>{allSet ? "키 바꾸기" : "키 등록"}</button>
          <button type="button" disabled={busy || registered === 0} onClick={test}>연결 확인</button>
          {registered > 0 && <button type="button" disabled={busy} onClick={remove}><Trash2 size={14} />키 삭제</button>}
        </div>
      </form>
      {msg && <p role="status" className={msg.ok ? "" : "error"} style={{ marginTop: 12 }}>{msg.text}</p>}
      {group.guideUrl && <div className="actions" style={{ marginTop: 12 }}><GuideLinkButton url={group.guideUrl} label={`${group.guideLabel} (팝업)`} /></div>}
    </section>
  );
}

export function KeyManager({ guides }: { guides: GuideUrls }) {
  const [keys, setKeys] = useState<Record<string, KeyInfo> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/keys", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setKeys(data.keys ?? {});
      else setError(data.error ?? "키 상태를 확인하지 못했습니다.");
    } catch {
      setError("서버에 연결하지 못했습니다.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="stack">
      <div className="notice">
        <strong><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> 본인 키로만 동작합니다</strong>
        <p>AI 분석과 네이버 조회는 회원 본인의 Gemini·네이버 API 키로 호출됩니다. 운영자나 다른 회원의 키로 대신 처리되지 않으며, 키는 서버에서만 사용되고 화면에는 일부만 표시됩니다.</p>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {groups(guides).map((g) => <GroupCard key={g.id} group={g} keys={keys} onChanged={load} />)}
      <section className="card">
        <h2>📖 연동 매뉴얼</h2>
        <p>키 발급 방법을 그림과 함께 단계별로 따라 할 수 있습니다.</p>
        <div className="actions" style={{ marginTop: 12 }}><a className="button" href="/guide">이 프로그램 사용 매뉴얼</a></div>
      </section>
    </div>
  );
}
