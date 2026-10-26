"use client";
import { useState } from "react";
import type { Asset, Brief, Draft, Project, Revision } from "@/lib/types";
import { articleHtml, fingerprint } from "@/lib/content";
import type { RunAction } from "./Workbench";
import { Sources } from "./WriteViews";
export function ReviewView({ draft: d, setDraft, assets, brief, dirty, call, busy, revisions }: { draft: Draft | null; setDraft: (d: Draft) => void; assets: Asset[]; brief: Brief; dirty: boolean; call: RunAction; busy: boolean; revisions: Revision[]; currentId: string }) {
  const [facts, setFacts] = useState(false), [experience, setExperience] = useState(false), [older, setOlder] = useState("");
  if (!d) return <div className="card empty">원고 만들기에서 먼저 글을 작성해 주세요.</div>;
  const audit = d.audit, fresh = audit?.fingerprint === fingerprint(d, assets);
  const past = revisions.find(r => r.id === older);
  return <><div className="grid preview-grid"><div className="card stack"><div className="row spread"><h2>원고 편집</h2><span className="pill">{dirty ? "저장하지 않은 수정" : "저장됨"}</span></div><label className="field">제목<input value={d.title} maxLength={200} onChange={e => setDraft({ ...d, title: e.target.value })}/></label><label className="field">본문 (마크다운)<textarea className="editor-area" value={d.body} maxLength={60000} onChange={e => setDraft({ ...d, body: e.target.value })}/></label><label className="field">태그 (쉼표로 구분)<input value={d.tags.join(", ")} onChange={e => setDraft({ ...d, tags: e.target.value.split(",").map(t => t.trim().replace(/^#/, "")) })}/></label><div className="row"><button className="primary" disabled={busy || !dirty} onClick={() => call("save", { title: d.title, body: d.body, tags: d.tags })}>수정본 저장</button><span className="hint">이전 원고는 수정 이력에 남습니다.</span></div></div><div className="card"><h2>미리보기</h2><div className="article preview" dangerouslySetInnerHTML={{ __html: articleHtml(d, assets) }}/></div></div>
    <div className="card"><div className="row spread"><div><h2>발행 전 원고 점검</h2><p className="muted compact">내부 기준의 충족률이며 네이버 공식 점수·실제 검색 순위가 아닙니다.</p></div>{audit && <div className="stat">{audit.score}<small style={{ fontSize: 14 }}>%</small></div>}</div>{dirty && <div className="notice warning">수정한 원고를 먼저 저장한 뒤 점검해 주세요.</div>}{audit && !fresh && <div className="notice warning">원고 또는 이미지가 바뀌었습니다. 아래 결과는 이전 내용의 점검이므로 다시 점검해 주세요.</div>}<div className="stack"><label className="check"><input type="checkbox" checked={facts} onChange={e => setFacts(e.target.checked)}/>가격·수치·날짜·정책과 인용한 출처를 직접 확인했습니다.</label><label className="check"><input type="checkbox" checked={experience} onChange={e => setExperience(e.target.checked)}/>실제로 경험하지 않은 내용을 본인 후기처럼 쓰지 않았는지 확인했습니다.</label><div className="row"><button className="primary" disabled={busy || dirty} onClick={() => call("audit", { facts, experience })}>현재 원고 점검하기</button><button disabled={busy || dirty} onClick={() => call("review")}>AI 검토 의견 받기</button></div></div>{audit?.items.map(item => <div className="audit-item" key={item.id}><span className={`badge ${item.status}`}>{item.status === "pass" ? "충족" : item.status === "warn" ? "보완" : "직접 확인"}</span><div><strong>{item.label}</strong><p>{item.detail}</p><span className="pill">{item.source === "rule" ? "코드 기준" : "회원 확인"}</span></div></div>)}{audit && <p className="hint">{new Date(audit.checkedAt).toLocaleString("ko-KR")} 점검 · 분량 목표 {brief.targetLength}자는 작성 목표이며 순위 보장 기준이 아닙니다.</p>}</div>
    {!!d.aiReview?.length && <div className="card"><h2>AI 검토 의견</h2><ul>{d.aiReview.map((text, i) => <li key={i}>{text}</li>)}</ul><p className="hint">AI의 검토 의견도 직접 확인해 주세요.</p></div>}
    {audit && <div className="card"><h2>핵심 단어 빈도 · 상위 20개</h2><p className="hint">공백으로 나눈 문자열 빈도입니다. 형태소 분석이나 검색량이 아닙니다.</p>{audit.words.map(w => <span className="word-chip" key={w.word}>{w.word}<strong>{w.count}</strong></span>)}</div>}
    <div className="card"><Sources sources={d.sources} suggestions={(d as Draft & { searchSuggestions?: string }).searchSuggestions}/>{!d.sources.length && <p className="muted">확인된 검색 출처가 없습니다. 최신 정보와 사실 근거를 직접 확인해 주세요.</p>}<p className="compact">구성·수정 이유: {d.changeSummary}</p></div>
    <div className="row"><button disabled={busy || dirty} onClick={() => call("social")}>현재 원고로 SNS 공유 문구 만들기</button><span className="hint">수정 전 문구를 그대로 쓰지 않도록 현재 원고를 기준으로 생성합니다.</span></div>
    {!!d.social.length && <div className="grid three">{d.social.map(s => <div className="card" key={s.platform}><h3>{s.platform} 공유 문구</h3><p style={{ whiteSpace: "pre-wrap" }}>{s.content}</p><button onClick={() => navigator.clipboard.writeText(s.content).catch(() => alert("클립보드 권한을 확인해 주세요."))}>문구 복사</button></div>)}</div>}
    <div className="card"><h2>수정 이력</h2><label className="field">이전 원고 비교<select value={older} onChange={e => setOlder(e.target.value)}><option value="">이전 수정본 선택</option>{revisions.map(r => <option key={r.id} value={r.id}>수정본 {r.version} · {new Date(r.created_at).toLocaleString("ko-KR")}</option>)}</select></label>{past && <details open><summary>{past.data.title}</summary><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{past.data.body}</pre></details>}</div>
  </>;
}
export function ExportView({ project, draft, html, dirty, auditFresh, onError }: { project: Project | null; draft: Draft | null; assets: Asset[]; html: string; dirty: boolean; auditFresh: boolean; onError: (s: string) => void }) {
  const [copied, setCopied] = useState("");
  const [postMode, setPostMode] = useState<"draft" | "publish" | "reserve">("draft");
  if (!project || !draft) return <div className="card empty">먼저 원고를 작성해 주세요.</div>;
  async function copy(rich: boolean) { try { if (rich) await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([`${draft!.title}\n\n${draft!.body}`], { type: "text/plain" }) })]); else await navigator.clipboard.writeText(`${draft!.title}\n\n${draft!.body}\n\n${draft!.tags.map(t => "#" + t).join(" ")}`); setCopied(rich ? "서식과 내용을 복사했습니다." : "텍스트를 복사했습니다."); } catch { onError("클립보드 권한을 확인해 주세요. 파일 다운로드로도 가져갈 수 있습니다."); } }
  return <><div className="notice warning">최종 발행은 네이버에서 직접 진행합니다. {auditFresh ? "현재 내용의 점검 결과가 있습니다. 보완·확인 항목을 검토하세요." : "현재 내용에 맞는 점검이 없습니다. 글 점검 단계에서 다시 확인해 주세요."}</div><div className="card"><h2>완성 원고 가져가기</h2><p className="muted">서식 유지 복사와 파일 다운로드를 선택하세요. 이미지까지 오래 보관하려면 이미지 포함 ZIP을 내려받으세요.</p><div className="row"><button className="primary" disabled={dirty} onClick={() => copy(true)}>서식 유지 복사</button><button disabled={dirty} onClick={() => copy(false)}>텍스트만 복사</button>{["md", "html", "zip"].map(format => <a className="button" key={format} href={`/api/export?project=${project.id}&format=${format}`}>{format === "zip" ? "이미지 포함 ZIP" : format.toUpperCase()} 다운로드 ↓</a>)}</div>{copied && <p className="success" role="status">{copied}</p>}</div><div className="card" style={{ border: "2px solid #03c75a", background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <h2 style={{ color: "#00873a", margin: "0 0 4px 0" }}>🚀 네이버 스마트에디터 ONE 자동 입력</h2>
          <p className="muted" style={{ margin: 0, fontSize: "13px" }}>크롬 확장이 제목·본문·이미지를 네이버 글쓰기 화면에 사람처럼 자동 타이핑합니다.</p>
        </div>
        <span style={{ fontSize: "11px", fontWeight: "800", background: "#edfbf3", color: "#03c75a", padding: "4px 10px", borderRadius: "8px", border: "1px solid #26d670" }}>스마트에디터 ONE 연동</span>
      </div>

      <div style={{ margin: "16px 0" }}>
        <strong style={{ fontSize: "13px", color: "#0f172a" }}>포스팅 방식 선택 (회원 필수 선택)</strong>
        <div className="posting-mode-grid">
          <div 
            className={`posting-mode-card ${postMode === "draft" ? "selected" : ""}`}
            onClick={() => setPostMode("draft")}
          >
            <h4>📝 발행 전까지</h4>
            <p>스마트에디터에 입력만 완료하고 회원이 최종 검토 후 발행</p>
          </div>
          <div 
            className={`posting-mode-card ${postMode === "publish" ? "selected" : ""}`}
            onClick={() => setPostMode("publish")}
          >
            <h4>⚡ 즉시 포스팅</h4>
            <p>자동 입력 후 즉시 발행 버튼 클릭 및 등록 URL 자동 수집</p>
          </div>
          <div 
            className={`posting-mode-card ${postMode === "reserve" ? "selected" : ""}`}
            onClick={() => setPostMode("reserve")}
          >
            <h4>⏰ 예약 포스팅</h4>
            <p>지정한 날짜 및 시간에 맞춰 네이버 블로그에 자동 예약 등록</p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
        <a 
          className="btn-3d-naver" 
          href="https://blog.naver.com/GoBlogWrite.naver" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ flex: 1, padding: "14px", fontSize: "14px", textAlign: "center" }}
          onClick={() => {
            void copy(true);
            alert(`[선택 모드: ${postMode === "draft" ? "발행 전까지" : postMode === "publish" ? "즉시 포스팅" : "예약 포스팅"}]\n서식과 본문을 클립보드에 준비했습니다. 네이버 글쓰기 창에서 확장의 '가져오기'를 누르면 스마트에디터 ONE으로 자동 입력됩니다.`);
          }}
        >
          🚀 네이버 스마트에디터 ONE 열기 & 자동 전송
        </a>
      </div>

      <details style={{ marginTop: "16px" }}>
        <summary style={{ fontSize: "12px", color: "#64748b" }}>확장 프로그램 설치 및 5단계 연동 방법 안내 ▾</summary>
        <ol style={{ fontSize: "12px", color: "#64748b", marginTop: "10px", lineHeight: "1.7" }}>
          <li>사이드바의 <a href="/downloads/blog-content-maker-extension-latest.zip" style={{ color: "#03c75a", fontWeight: "700" }}>확장 프로그램 받기</a>를 눌러 압축을 풉니다.</li>
          <li><code>chrome://extensions</code>에서 개발자 모드를 켜고 ‘압축해제된 확장 프로그램을 로드합니다’를 선택합니다.</li>
          <li><a href="/settings" style={{ color: "#03c75a", fontWeight: "700" }}>API키등록·플랫폼연동</a>에서 연결 코드를 발급해 확장에 입력합니다.</li>
          <li>네이버에 본인 계정으로 로그인하고 빈 글쓰기 화면을 엽니다.</li>
          <li>확장에서 본인 원고를 선택·확인한 뒤 입력을 시작합니다.</li>
        </ol>
      </details>
    </div><div className="card"><h2>최종 미리보기</h2><div className="article preview" dangerouslySetInnerHTML={{ __html: html }}/></div></>;
}
