"use client";
import { useState } from "react";
import type { Settings, Workspace } from "@/lib/types";
import { IMAGE_MODELS, TEXT_MODELS } from "@/lib/types";
import type { RunAction } from "./Workbench";
export function SettingsView({ settings, keys, call, busy }: { settings: Settings; keys: Workspace["keys"]; call: RunAction; busy: boolean }) {
  const [s, set] = useState(settings), [provider, setProvider] = useState("gemini"), [key, setKey] = useState(""), [token, setToken] = useState(""), [error, setError] = useState("");
  async function extension(action: string) { setError(""); try { const r = await fetch("/api/extension", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); const value = await r.json(); if (!r.ok) throw new Error(value.error); setToken(value.token || ""); } catch (e) { setError((e as Error).message); } }
  return <><div className="notice">모든 AI 호출은 로그인한 회원 본인의 키로만 실행합니다. 키 저장만으로 유료 진단 호출을 보내지 않습니다.</div><div className="grid"><div className="card stack"><h2>본인 API 키 등록</h2><div className="row">{["gemini", "openai"].map(p => <span className="pill" key={p}>{p === "gemini" ? "Gemini" : "OpenAI"}: {keys[p]?.hasKey ? `등록됨 ${keys[p].maskedKey}` : "미등록"}</span>)}</div><label className="field">키 제공사<select value={provider} onChange={e => setProvider(e.target.value)}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></label><label className="field">본인 API 키<input type="password" autoComplete="off" value={key} maxLength={500} onChange={e => setKey(e.target.value)} placeholder="발급받은 본인 키 전체를 입력하세요"/></label><button className="primary" disabled={busy || !key.trim()} onClick={async () => { if (await call("key", { provider, apiKey: key })) setKey(""); }}>본인 키 저장</button><p className="hint">키는 AIMaster의 회원별 키 저장소에서 관리됩니다. 다른 프로그램에 등록한 본인 키도 사용할 수 있습니다.</p><div className="row"><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Gemini 키 발급 ↗</a><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI 키 발급 ↗</a></div></div><div className="card stack"><h2>AI 작업 설정</h2><label className="field">텍스트 제공사<select value={s.provider} onChange={e => { const p = e.target.value as Settings["provider"]; set({ ...s, provider: p, model: TEXT_MODELS[p][0] }); }}><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></label><label className="field">글 작성·검토 모델<select value={s.model} onChange={e => set({ ...s, model: e.target.value })}>{TEXT_MODELS[s.provider].map(m => <option key={m}>{m}</option>)}</select></label><label className="field">Gemini 이미지 모델<select value={s.imageModel} onChange={e => set({ ...s, imageModel: e.target.value })}>{IMAGE_MODELS.map(m => <option key={m}>{m}</option>)}</select></label><label className="check"><input type="checkbox" checked={s.search} onChange={e => set({ ...s, search: e.target.checked })}/>글·제목 작성에 웹 검색 근거 사용</label><p className="hint">Gemini 검색은 근거 조사와 원고 구성을 나누어 같은 본인 모델·키로 두 번 호출합니다. 검색은 제공사 모델·결제 권한에 따라 추가 비용이 발생할 수 있습니다. 검색 실패 시 알리지 않고 끄거나 다른 키로 대체하지 않습니다.</p><button className="primary" disabled={busy} onClick={() => call("settings", { settings: s })}>AI 설정 저장</button></div></div><div className="card stack"><h2>Chrome 확장 연결</h2><p>아래 연결 코드는 7일 동안 이 프로그램의 본인 원고를 읽는 용도로만 사용됩니다. 다른 사람에게 전달하지 마세요.</p><div className="row"><a className="button" href="/downloads/blog-content-maker-extension-latest.zip">최신 확장 ZIP 다운로드 ↓</a><button disabled={busy} onClick={() => extension("issue")}>연결 코드 발급</button><button disabled={busy} onClick={() => extension("revoke")}>모든 확장 연결 해제</button></div>{token && <label className="field">발급된 연결 코드 (이번 화면에서만 표시)<input value={token} readOnly type="password" autoComplete="off"/><button onClick={() => navigator.clipboard.writeText(token).catch(() => setError("클립보드 권한을 확인해 주세요."))}>연결 코드 복사</button></label>}{error && <p role="alert" className="error">{error}</p>}<p className="hint">업데이트: ZIP 재다운로드 → 기존 폴더에 덮어쓰기 → chrome://extensions에서 새로고침. 기존 확장은 자동으로 바뀌지 않습니다.</p></div><div className="card"><h2>📖 연동 매뉴얼</h2><GuideView compact/></div></>;
}
export function GuideView({ compact = false }: { compact?: boolean }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = (idx: number) => setOpenFaq(openFaq === idx ? null : idx);

  const faqs = [
    {
      q: "글 작성 시 Gemini와 OpenAI 중 어떤 것을 추천하나요?",
      a: "둘 다 본인의 API 키로 동작하며, 자연스러운 문장 구조와 검색 연동이 필요할 때는 Google Gemini(gemini-2.5-flash / gemini-3.5-flash), 정밀한 논리 구조가 필요할 때는 OpenAI(gpt-4o / gpt-4o-mini)를 선택하실 수 있습니다."
    },
    {
      q: "본문 이미지 생성은 어떤 모델로 동작하나요?",
      a: "본문 이미지 및 제품 합성, 첫·끝 장면 이미지는 Google Gemini의 정식 이미지 생성 모델(gemini-nano-banana-2.1 / gemini-3-pro-image)을 사용하여 생성됩니다. 별도의 Gemini 키 등록이 필요합니다."
    },
    {
      q: "네이버 블로그에 자동으로 바로 발행되나요?",
      a: "아닙니다! 전용 크롬 확장은 완성된 원고와 이미지를 네이버 스마트에디터 ONE 편집기 창에 안전하게 채워넣는 역할만 수행합니다. 내용 검토와 최종 [발행] 버튼 클릭은 회원님이 직접 진행하십니다."
    },
    {
      q: "작성하던 원고는 얼마나 오래 보관되나요?",
      a: "모든 프로젝트와 원고, 생성 이미지는 회원별 격리 저장소에 안전하게 보관되며 생성일로부터 30일간 유지됩니다. 중요한 원고는 [HTML 복사] 또는 [ZIP 다운로드]로 영구 백업해 두시는 것을 권장합니다."
    },
    {
      q: "점검 항목(반복 단어, FAQ, 이미지 개수)의 충족률이 중요한가요?",
      a: "점검 항목은 가독성과 체류 시간을 높이기 위한 보조 가이드라인이며 네이버의 공식 알고리즘 점수가 아닙니다. 본인의 실제 경험과 진솔한 후기가 담길 때 가장 좋은 블로그 글이 됩니다."
    }
  ];

  if (compact) {
    return (
      <div className="stack compact">
        <p>글감·제목 → 원고 작성 → 직접 수정·저장 → 점검과 다듬기 → 이미지 생성 → 네이버 입력 순서로 진행합니다.</p>
        <p className="hint">상세한 단계별 가이드와 FAQ는 왼쪽 사이드바 [📖 연동 & 사용 매뉴얼] 메뉴에서 확인하실 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "28px" }}>
      {/* 에디토리얼 상단 히어로 배너 */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #0284c7 100%)",
        borderRadius: "16px",
        padding: "28px 32px",
        color: "#ffffff",
        boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.25)"
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", marginBottom: "12px" }}>
          <span>FLOW WIZARD EDITORIAL GUIDE</span>
          <span>•</span>
          <span style={{ color: "#93c5fd" }}>v1.10 단계별 블로그 콘텐츠 에디션</span>
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 8px", color: "#ffffff", letterSpacing: "-0.5px" }}>
          AI 블로그 콘텐츠 제작 종합 비주얼 매뉴얼
        </h2>
        <p style={{ fontSize: "13px", color: "#bfdbfe", margin: "0 0 16px", maxWidth: "680px", lineHeight: "1.6" }}>
          글감 발굴부터 5가지 맞춤 글 작성, 정밀 문장 점검, AI 본문 이미지 제작, 크롬 확장을 통한 네이버 스마트에디터 원클릭 전송까지 블로그 성공 파이프라인을 완성하세요.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", color: "#e0f2fe" }}>#5단계플로우위저드</span>
          <span style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", color: "#e0f2fe" }}>#네이버스마트에디터연동</span>
          <span style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", color: "#e0f2fe" }}>#검색근거웹검색</span>
          <span style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", color: "#e0f2fe" }}>#30일안전보관</span>
        </div>
      </div>

      {/* 5단계 플로우 위저드 파이프라인 */}
      <div className="card stack">
        <h3 style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
          <span style={{ color: "#2563eb" }}>⚡</span>
          5단계 핵심 블로그 제작 파이프라인 (Workflow)
        </h3>
        <div className="grid" style={{ gap: "16px" }}>
          <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "700" }}>1</span>
              <strong style={{ fontSize: "13px" }}>글감·제목 찾기 (Ideas)</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, paddingLeft: "32px", lineHeight: "1.5" }}>
              핵심 주제를 입력하면 독자의 클릭을 부르는 10가지 매력적인 제목과 핵심 키워드를 AI가 제안합니다.
            </p>
          </div>

          <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "700" }}>2</span>
              <strong style={{ fontSize: "13px" }}>원고 만들기 (Write)</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, paddingLeft: "32px", lineHeight: "1.5" }}>
              정보성, 후기형, 비교형 등 5가지 작성 모드로 서론·본론·결론이 정돈된 완성형 초안을 빠르게 집필합니다.
            </p>
          </div>

          <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "700" }}>3</span>
              <strong style={{ fontSize: "13px" }}>글 점검·다듬기 (Review)</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, paddingLeft: "32px", lineHeight: "1.5" }}>
              제목 일치율, 반복 어휘, 문단 길이, FAQ 포함 여부를 실시간 감사(Audit)하고 버전별 이력을 비교합니다.
            </p>
          </div>

          <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "700" }}>4</span>
              <strong style={{ fontSize: "13px" }}>이미지·장면 준비 (Images)</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, paddingLeft: "32px", lineHeight: "1.5" }}>
              본문 소주제별 설명 이미지와 제품 합성 이미지를 Gemini 최신 이미지 모델로 실시간 생성해 배치합니다.
            </p>
          </div>

          <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#10b981", color: "#fff", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: "700" }}>5</span>
              <strong style={{ fontSize: "13px" }}>네이버로 옮기기 (Export)</strong>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, paddingLeft: "32px", lineHeight: "1.5" }}>
              전용 크롬 확장 프로그램을 통해 네이버 스마트에디터 ONE에 글과 이미지를 한 번에 자동 입력하거나, HTML/Markdown으로 클립보드 복사합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 네이버 스마트에디터 ONE 확장 연동 가이드 */}
      <div className="card stack">
        <h3 style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#10b981" }}>🧩</span>
          네이버 스마트에디터 ONE 전용 확장 프로그램 연동법
        </h3>
        <ol style={{ paddingLeft: "20px", fontSize: "13px", lineHeight: "1.8", color: "#334155" }}>
          <li>
            왼쪽 사이드바의 <strong>[API키등록·플랫폼연동]</strong> 화면에서 <strong>[최신 확장 ZIP 다운로드 ↓]</strong>를 눌러 압축을 풉니다.
          </li>
          <li>
            크롬 브라우저에서 <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>chrome://extensions</code> 주소로 이동한 뒤, 우측 상단 <strong>개발자 모드</strong>를 켭니다.
          </li>
          <li>
            <strong>[압축해제된 확장 프로그램을 로드합니다]</strong>를 누르고, 압축 해제된 폴더를 선택합니다.
          </li>
          <li>
            설정 화면에서 <strong>[연결 코드 발급]</strong>을 눌러 발급된 코드를 복사한 뒤, 크롬 확장 팝업창에 입력하여 본인 계정을 연결합니다.
          </li>
          <li>
            네이버 블로그의 글쓰기 탭을 열고 확장 프로그램 팝업에서 작성한 프로젝트를 선택한 뒤 <strong>[네이버 편집기로 전송]</strong>을 누르면 본문과 이미지가 자동 입력됩니다.
          </li>
        </ol>
      </div>

      {/* 자주 묻는 질문 FAQ 아코디언 */}
      <div className="card stack">
        <h3 style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#2563eb" }}>❓</span>
          자주 묻는 질문 (FAQ)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: openFaq === idx ? "#eff6ff" : "#ffffff",
                  border: "none",
                  textAlign: "left",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0f172a",
                  cursor: "pointer"
                }}
              >
                <span>Q. {faq.q}</span>
                <span style={{ color: "#64748b", fontSize: "11px" }}>{openFaq === idx ? "▲ 접기" : "▼ 펼치기"}</span>
              </button>
              {openFaq === idx && (
                <div style={{ padding: "14px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: "12px", color: "#334155", lineHeight: "1.7" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
