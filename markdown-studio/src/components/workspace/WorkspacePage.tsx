"use client";
import { Suspense, lazy, useState } from "react";
import {
  Download,
  FilePlus2,
  History,
  Save,
  FolderOpen,
  Sparkles,
  ArrowRight,
  FileText,
  ChevronRight,
  PenTool,
  Pin,
  PinOff,
  Search,
  Tag,
} from "lucide-react";
import { type DocumentRevision, type PinColor, PIN_COLORS, PIN_COLOR_LABELS, nextPinColor, safeFilename } from "@/lib/documents/model";
import { DOCUMENT_TEMPLATES } from "@/lib/documents/templates";
import { DocumentExplorer } from "./DocumentExplorer";
import { HotkeysButton } from "../editor/HotkeysModal";
import { readingLabel } from "@/lib/documents/readingTime";
import { templatePreviewLines } from "@/lib/documents/templatePreview";
import { PreviewPanel } from "./PreviewPanel";
import { ImportCard } from "./ImportCard";
import { BackupCard } from "./BackupCard";
import { DriveCard } from "./DriveCard";
import { ExportPanel } from "./ExportPanel";
import { downloadText, useWorkspace } from "./WorkspaceProvider";

const EditorPane = lazy(() => import("../editor/EditorPane").then(m => ({ default: m.EditorPane })));

export type WorkspaceSection = "dashboard" | "prepare" | "editor" | "export" | "library";

const TITLES = {
  dashboard: ["문서 작업을 한 곳에서", "새 문서를 준비하고, 편집한 내용을 이 기기에 보관하세요."],
  prepare: ["1. 문서 준비", "빈 문서·템플릿으로 시작하거나 파일을 가져옵니다."],
  editor: ["2. 편집·미리보기", "왼쪽에는 마크다운 원문, 오른쪽에는 완성된 서식이 표시됩니다."],
  export: ["3. 변환·내보내기", "문서를 HTML·PDF·Word·마크다운으로 내보냅니다."],
  library: ["4. 문서 보관함", "문서와 폴더를 정리하고 수정 이력을 복원합니다."],
};

export function WorkspacePage({ section }: { section: WorkspaceSection }) {
  const store = useWorkspace();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");
  const [parentId, setParentId] = useState("");
  const [tab, setTab] = useState("edit");
  const [history, setHistory] = useState<DocumentRevision[]>([]);
  const [historyFor, setHistoryFor] = useState("");
  const [pending, setPending] = useState(false);
  const [docQuery, setDocQuery] = useState("");
  const pinnedIds = store.preferences.pinnedIds ?? [];
  // 꼬리표는 저장(로그인 확인 포함 약 1~2초)을 기다리지 않고 화면에 바로 반영 — 빠르게 여러 번 눌러도 한 칸씩 바뀐다
  const [colorDraft, setColorDraft] = useState<Record<string, PinColor> | null>(null);
  const pinColors = colorDraft ?? store.preferences.pinColors ?? {};

  const active = store.nodes.find(n => n.id === store.draft?.id && !n.deletedAt);
  const liveDocs = store.nodes.filter(n => n.kind === "document" && !n.deletedAt);
  // v1.15: 꼬리표 색으로 걸러 보기 — 지금 쓰고 있는 색만 버튼으로 보이고, 쓰지 않게 된 색은 자동으로 "전체"
  const [tagFilter, setTagFilter] = useState<PinColor | null>(null); // (liveDocs 아래에 둬야 함)
  const colorOf = (id: string) => (pinnedIds.includes(id) ? pinColors[id] : undefined);
  const usedColors = PIN_COLORS.filter(c => liveDocs.some(n => colorOf(n.id) === c));
  const activeTag = tagFilter && usedColors.includes(tagFilter) ? tagFilter : null;
  const trash = store.nodes.filter(
    n => n.deletedAt && !store.nodes.some(p => p.id === n.parentId && p.deletedAt && p.trashBatchId === n.trashBatchId)
  );

  async function action(work: () => Promise<unknown>) {
    setPending(true);
    try {
      await work();
    } catch (e) {
      store.reportError(e);
    } finally {
      setPending(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      await store.save();
      const node = await store.run(repo =>
        repo.create(
          "document",
          name,
          parentId || null,
          DOCUMENT_TEMPLATES.find(t => t.id === template)?.markdown || ""
        )
      );
      await store.select(node.id);
      window.location.assign("/editor");
    });
  }

  function download() {
    if (active && store.draft) {
      downloadText(safeFilename(active.name).replace(/\.md$/i, "") + ".md", store.draft.markdown);
    }
  }

  async function openHistory() {
    if (!active) return;
    await action(async () => {
      await store.save();
      setHistory(await store.run(repo => repo.history(active.id)));
      setHistoryFor(active.id);
    });
  }

  const title = TITLES[section];

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">MARKDOWN STUDIO</p>
        <h1>{title[0]}</h1>
        <p>{title[1]}</p>
      </div>

      {/* DASHBOARD SECTION */}
      {section === "dashboard" && (
        <>
          {/* 포커스 스튜디오 메인 히어로 배너 */}
          <div className="studio-hero">
            <div className="studio-hero-content">
              <div className="studio-hero-badge">
                <Sparkles size={13} />
                <span>Focus Studio 템플릿</span>
              </div>
              <h2>전문가를 위한 몰입형 마크다운 스튜디오</h2>
              <p>
                아이디어를 방해 없이 기록하고, 실시간 듀얼 분할 뷰와 다채로운 서식으로 완벽한 문서를 완성하세요.
                로컬 브라우저 안전 보관과 HTML·PDF·Word 내보내기까지 올인원으로 지원합니다.
              </p>
              <div className="studio-hero-actions">
                <a className="hero-btn-primary" href="/prepare">
                  <FilePlus2 size={16} />
                  새 문서 시작하기
                </a>
                <a className="hero-btn-secondary" href="/editor">
                  <PenTool size={16} />
                  에디터 열기
                </a>
                <a className="hero-btn-secondary" href="/library">
                  <FolderOpen size={16} />
                  보관함 둘러보기
                </a>
              </div>
            </div>
          </div>

          {/* 핵심 지표 통계 그리드 */}
          <div className="studio-stat-grid">
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper indigo">
                <FileText size={20} />
              </div>
              <div>
                <strong>{liveDocs.length}개</strong>
                <span>보관된 마크다운 문서</span>
              </div>
            </div>
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper emerald">
                <FolderOpen size={20} />
              </div>
              <div>
                <strong>{store.nodes.filter(n => n.kind === "folder" && !n.deletedAt).length}개</strong>
                <span>생성된 카테고리 폴더</span>
              </div>
            </div>
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper amber">
                <History size={20} />
              </div>
              <div>
                <strong>최대 30회</strong>
                <span>실시간 버전 자동 복원</span>
              </div>
            </div>
          </div>

          {/* 최근 수정한 문서 그리드 카드 */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 750, color: "var(--text-1)" }}>최근 작업한 문서</h2>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  클릭하면 듀얼 분할 에디터로 즉시 열려 편집을 이어갈 수 있습니다.
                </p>
              </div>
              {liveDocs.length > 0 && (
                <a
                  href="/library"
                  style={{
                    fontSize: "12px",
                    color: "var(--brand-text)",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    textDecoration: "none",
                  }}
                >
                  보관함 전체보기 <ChevronRight size={14} />
                </a>
              )}
            </div>

            {/* 2026-10-17 v1.12: 문서 이름 검색 + 📌 고정(고정한 문서를 맨 앞에) */}
            {liveDocs.length > 0 && (
              <label className="doc-search">
                <Search size={14} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="문서 이름 검색"
                  placeholder="문서 이름으로 찾기"
                  value={docQuery}
                  onChange={e => setDocQuery(e.target.value)}
                />
              </label>
            )}
            {usedColors.length > 0 && (
              <div className="tag-filter" role="group" aria-label="꼬리표 색으로 걸러 보기">
                <button type="button" aria-pressed={!activeTag} onClick={() => setTagFilter(null)}>전체</button>
                {usedColors.map(c => (
                  <button key={c} type="button" aria-pressed={activeTag === c} onClick={() => setTagFilter(activeTag === c ? null : c)}>
                    <span className={`tag-dot tag-${c}`} aria-hidden="true" />
                    {PIN_COLOR_LABELS[c]} {liveDocs.filter(n => colorOf(n.id) === c).length}
                  </button>
                ))}
              </div>
            )}
            {liveDocs.length > 0 && docQuery.trim() && !liveDocs.some(n => n.name.toLowerCase().includes(docQuery.trim().toLowerCase())) && (
              <p className="muted" style={{ margin: "8px 0" }}>&quot;{docQuery.trim()}&quot;이(가) 들어간 문서가 없습니다.</p>
            )}
            {liveDocs.length > 0 ? (
              <div className="recent-docs-grid">
                {liveDocs
                  .filter(n => !docQuery.trim() || n.name.toLowerCase().includes(docQuery.trim().toLowerCase()))
                  .filter(n => !activeTag || colorOf(n.id) === activeTag)
                  .sort((a, b) => Number(pinnedIds.includes(b.id)) - Number(pinnedIds.includes(a.id)) || b.updatedAt.localeCompare(a.updatedAt))
                  .slice(0, docQuery.trim() || activeTag ? 12 : 6)
                  .map(n => {
                    const pinned = pinnedIds.includes(n.id);
                    const color = pinned ? pinColors[n.id] : undefined;
                    const snippet = n.markdown
                      ? n.markdown.replace(/[#*`~>\[\]\(\)\-_\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 75)
                      : "내용이 비어 있는 문서입니다.";
                    return (
                      <div
                        className={`doc-card-modern${color ? ` pin-${color}` : ""}`}
                        key={n.id}
                        onClick={() =>
                          action(async () => {
                            await store.select(n.id);
                            window.location.assign("/editor");
                          })
                        }
                      >
                        <div className="doc-card-top">
                          <span className="doc-card-title">{pinned && "📌 "}{n.name}</span>
                          <span className="doc-card-badge">수정 {n.revision}회</span>
                          {/* 2026-10-17 v1.14: 고정한 문서에만 색깔 꼬리표 — 누를 때마다 다음 색, 보라 다음은 없음 */}
                          {pinned && (
                            <button
                              type="button"
                              className={`doc-tag${color ? ` tag-${color}` : ""}`}
                              aria-label={`${n.name} 색깔 꼬리표: ${color ? PIN_COLOR_LABELS[color] : "없음"} (눌러서 바꾸기)`}
                              title={`색깔 꼬리표: ${color ? PIN_COLOR_LABELS[color] : "없음"} — 누를 때마다 바뀝니다`}
                              onClick={e => {
                                e.stopPropagation();
                                const nextColor = nextPinColor(color);
                                const next = { ...pinColors };
                                if (nextColor) next[n.id] = nextColor; else delete next[n.id];
                                setColorDraft(next);
                                void action(() => store.setPreferences({ pinColors: next }).catch(err => { setColorDraft(null); throw err; }));
                              }}
                            >
                              <Tag size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className={`doc-pin ${pinned ? "on" : ""}`}
                            aria-pressed={pinned}
                            aria-label={pinned ? `${n.name} 고정 해제` : `${n.name} 맨 앞에 고정`}
                            title={pinned ? "고정 해제" : "맨 앞에 고정"}
                            onClick={e => {
                              e.stopPropagation();
                              const next = pinned ? pinnedIds.filter(id => id !== n.id) : [...pinnedIds, n.id];
                              void action(() => store.setPreferences({ pinnedIds: next }));
                            }}
                          >
                            {pinned ? <PinOff size={13} /> : <Pin size={13} />}
                          </button>
                        </div>
                        <p className="doc-card-preview">{snippet}</p>
                        <div className="doc-card-footer">
                          <span>
                            {new Date(n.updatedAt).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span style={{ color: "var(--brand-text)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                            편집하기 <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-state-card">
                <div className="empty-state-icon">
                  <Sparkles size={28} />
                </div>
                <h3>아직 작성된 문서가 없습니다</h3>
                <p>다양한 마크다운 템플릿(보고서, 회의록, 블로그 등)을 사용해 첫 번째 문서를 지금 바로 시작해보세요.</p>
                <a className="button primary" href="/prepare">
                  새 문서 준비하기
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {/* PREPARE SECTION */}
      {section === "prepare" && (
        <div className="prepare-grid">
          <form className="card stack" onSubmit={create}>
            <h2>새 문서 만들기</h2>
            <label>
              문서 이름
              <input
                aria-label="문서 이름"
                value={name}
                placeholder="예: 2026-기획서.md"
                maxLength={120}
                onChange={e => setName(e.target.value)}
                required
              />
            </label>
            <label>
              저장 폴더
              <select aria-label="저장 폴더" value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">최상위 폴더</option>
                {store.nodes
                  .filter(n => n.kind === "folder" && !n.deletedAt)
                  .map(n => (
                    <option value={n.id} key={n.id}>
                      {n.name}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset>
              <legend>시작할 마크다운 템플릿</legend>
              <div className="template-grid">
                {DOCUMENT_TEMPLATES.map(t => (
                  <label className={`template-card ${template === t.id ? "chosen" : ""}`} key={t.id}>
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={template === t.id}
                      onChange={() => setTemplate(t.id)}
                    />
                    <span className="template-mini" aria-hidden="true">
                      {templatePreviewLines(t.markdown).map((l, i) => (
                        <span key={i} className={`mini-line mini-${l.kind}` + (l.kind === "h" ? ` lv${l.level}` : "")}>{l.text}</span>
                      ))}
                      {!t.markdown.trim() && <span className="mini-line mini-text">빈 문서</span>}
                    </span>
                    <strong>{t.name}</strong>
                    <small>{t.description}</small>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="button primary" disabled={pending}>
              문서 생성 및 에디터로 이동
            </button>
          </form>
          <div className="stack">
            <ImportCard />
            <div className="card">
              <h2>문서 보관 및 관리 팁</h2>
              <p>
                생성된 문서는 브라우저에 즉시 안전 보관되며, 폴더를 통해 체계적으로 정리할 수 있습니다.
                실수로 삭제한 문서는 보관함 내 [휴지통]에서 언제든지 원래 자리로 복원 가능합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR SECTION */}
      {section === "editor" && (
        <div className={`editor-layout ${store.preferences.explorerOpen ? "" : "without-explorer"}`}>
          {store.preferences.explorerOpen && <DocumentExplorer compact />}
          <section className="card editor-panel">
            <div className="panel-heading">
              <div>
                <h2>{active?.name || "문서를 선택하세요"}</h2>
                <small className="muted">
                  {active
                    ? `${readingLabel(store.draft?.markdown ?? "")} · ${store.draft?.markdown.length.toLocaleString() || 0}자 · 수정 ${active.revision}회`
                    : "탐색기에서 문서를 열거나 새 문서를 만드세요."}
                </small>
              </div>
              <div className="actions">
                <HotkeysButton />
                <button onClick={() => action(() => store.setPreferences({ explorerOpen: !store.preferences.explorerOpen }))}>
                  탐색기 {store.preferences.explorerOpen ? "접기" : "열기"}
                </button>
                <button disabled={!active || pending} onClick={() => action(store.save)}>
                  <Save size={14} />
                  저장
                </button>
                <button className="download" disabled={!active} onClick={download}>
                  <Download size={14} />
                  원문 저장
                </button>
              </div>
            </div>
            {active && store.draft ? (
              <>
                <div className="editor-tabs" role="tablist" aria-label="문서 보기">
                  <button role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>
                    원문 편집
                  </button>
                  <button role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
                    미리보기
                  </button>
                </div>
                <div className="split-controls">
                  <label>
                    편집 영역 너비
                    <input
                      type="range"
                      min="25"
                      max="75"
                      value={store.preferences.editorPercent}
                      aria-label="편집 영역 너비"
                      onChange={e => {
                        const value = Number(e.target.value);
                        void action(() => store.setPreferences({ editorPercent: value }));
                      }}
                    />
                  </label>
                </div>
                <div
                  className={`editor-split show-${tab}`}
                  style={{ gridTemplateColumns: `${store.preferences.editorPercent}% minmax(0, 1fr)` }}
                >
                  <div className="source-pane">
                    <span className="pane-label">마크다운 원문</span>
                    <Suspense fallback={<p className="muted editor-loading">편집기를 불러오는 중…</p>}>
                      <EditorPane
                        docKey={store.draft.id}
                        value={store.draft.markdown}
                        onChange={store.edit}
                        onSave={() => {
                          void action(store.save);
                        }}
                      />
                    </Suspense>
                  </div>
                  <div className="preview-pane">
                    <span className="pane-label">미리보기</span>
                    <PreviewPanel markdown={store.draft.markdown} />
                  </div>
                </div>
                <p className="muted editor-note">
                  이 기기에 자동 저장합니다. 서식 도구와 단축키(Ctrl+B 굵게, Ctrl+I 기울임, Ctrl+K 링크, Ctrl+S 저장,
                  Ctrl+Z 실행 취소, Ctrl+F 찾기)를 사용할 수 있습니다. 전체 단축키는 [단축키] 버튼이나 ? 키로 볼 수 있습니다.
                </p>
              </>
            ) : (
              <div className="empty">
                <p>새 문서를 작성할 준비가 되었나요?</p>
                <a className="button primary" href="/prepare">
                  문서 준비하기
                </a>
              </div>
            )}
          </section>
        </div>
      )}

      {/* EXPORT SECTION */}
      {section === "export" && <ExportPanel />}

      {/* LIBRARY SECTION */}
      {section === "library" && (
        <div className="library-grid">
          <DocumentExplorer />
          <div className="stack">
            <section className="card">
              <div className="panel-heading">
                <h2>수정 이력</h2>
                <button disabled={!active || pending} onClick={openHistory}>
                  현재 문서 이력 보기
                </button>
              </div>
              <p className="muted">{active ? active.name : "먼저 왼쪽에서 문서를 선택하세요."} · 최근 30개 이력을 보관합니다.</p>
              {historyFor === active?.id &&
                history.map(r => (
                  <div key={r.key} className="history-row">
                    <div>
                      <strong>수정 {r.revision}회</strong>
                      <small>
                        {new Date(r.savedAt).toLocaleString("ko-KR")} · {r.markdown.length}자
                      </small>
                    </div>
                    <button
                      disabled={pending}
                      onClick={() =>
                        action(async () => {
                          if (!active || !window.confirm("이 버전의 본문을 복원할까요? 현재 저장된 내용도 이력으로 남습니다."))
                            return;
                          await store.save();
                          const latest = (await store.run(repo => repo.list())).find(n => n.id === active.id)!;
                          await store.run(repo => repo.restoreRevision(latest.id, latest.revision, r.revision));
                          await store.reloadDraft();
                          setHistory([]);
                        })
                      }
                    >
                      이 본문 복원
                    </button>
                  </div>
                ))}
            </section>
            <section className="card">
              <h2>휴지통</h2>
              <p className="muted">영구 삭제하지 않습니다. 폴더 복원 시 함께 옮긴 하위 항목도 복원됩니다.</p>
              {trash.map(n => (
                <div className="history-row" key={n.id}>
                  <div>
                    <strong>{n.name}</strong>
                    <small>{n.kind === "folder" ? "폴더" : "문서"}</small>
                  </div>
                  <button
                    disabled={pending}
                    onClick={() =>
                      action(async () => {
                        await store.save();
                        await store.run(repo => repo.restore(n.id, n.revision));
                      })
                    }
                  >
                    복원
                  </button>
                </div>
              ))}
              {!trash.length && <p className="empty">휴지통이 비어 있습니다.</p>}
            </section>
            <BackupCard />
            <DriveCard />
          </div>
        </div>
      )}
    </>
  );
}
