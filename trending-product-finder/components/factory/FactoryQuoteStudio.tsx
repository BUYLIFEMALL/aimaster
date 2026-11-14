"use client";

// EC-W10 공장 견적 비교 화면 — 자료 넣기(파일·붙여 넣기) → 회원 Claude 키로 1번 분석 → 비교표·미확인·미답변·다음 질문, 기록(30일).
// 사진은 브라우저에서 줄여(긴 변 1568px JPEG) 보낸다. 원본 파일은 서버에 저장하지 않는다.
import { useMemo, useRef, useState } from "react";
import {
  cheapestFactory,
  EXCEL_HELP,
  fileKind,
  isExcel,
  marginCalcUrl,
  MAX_FILES,
  MAX_PASTED,
  MAX_TOTAL_BYTES,
  type QuoteReport,
} from "@/lib/factoryQuotes";
import { deleteFactoryProjectAction, type FactoryProject } from "@/lib/actions/factoryQuotes";

type Picked = { id: string; file: File; kind: "pdf" | "image" | "sheet" };

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

async function shrinkImage(file: File): Promise<File> {
  if (file.size < 500 * 1024 || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function FactoryQuoteStudio({ initialProjects, loadError, hasClaudeKey }: { initialProjects: FactoryProject[]; loadError: string; hasClaudeKey: boolean }) {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState<string>(initialProjects.find((p) => p.report)?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [pasted, setPasted] = useState("");
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [needsKey, setNeedsKey] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = picked.reduce((sum, p) => sum + p.file.size, 0);
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  async function addFiles(list: FileList | File[]) {
    setMessage("");
    const next = [...picked];
    for (const raw of Array.from(list)) {
      if (isExcel(raw.name)) {
        setMessage(`「${raw.name}」 — ${EXCEL_HELP}`);
        continue;
      }
      const kind = fileKind(raw.name, raw.type);
      if (!kind) {
        setMessage(`「${raw.name}」은 넣을 수 없는 형식입니다(PDF·JPG·PNG·WEBP·CSV·TXT).`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setMessage(`파일은 ${MAX_FILES}개까지입니다.`);
        break;
      }
      const file = kind === "image" ? await shrinkImage(raw) : raw;
      next.push({ id: `${Date.now()}-${Math.random()}`, file, kind });
    }
    setPicked(next);
  }

  function pickProject(id: string) {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    setName(p?.name ?? "");
    setPasted(p?.pasted_text ?? "");
  }

  async function analyze() {
    setMessage("");
    setNeedsKey(false);
    if (!name.trim()) return setMessage("상품 이름을 입력해 주세요.");
    if (!picked.length && !pasted.trim()) return setMessage("견적 파일을 넣거나 대화를 붙여 넣어 주세요.");
    if (total > MAX_TOTAL_BYTES) return setMessage("파일 합계가 4MB를 넘습니다. 파일을 나눠 두 번 분석해 주세요.");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("productName", name.trim());
      form.set("pastedText", pasted);
      form.set("note", note);
      if (projectId) form.set("projectId", projectId);
      const sheets: { name: string; text: string }[] = [];
      for (const p of picked) {
        if (p.kind === "sheet") sheets.push({ name: p.file.name, text: (await p.file.text()).slice(0, 20000) });
        else form.append("files", p.file);
      }
      form.set("sheets", JSON.stringify(sheets));
      const res = await fetch("/api/factory-quotes/analyze", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { report?: QuoteReport; error?: string; needsKey?: boolean; projectId?: string; createdAt?: string; saved?: boolean };
      if (!data.report) {
        setMessage(data.error ?? "분석하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        setNeedsKey(Boolean(data.needsKey));
        return;
      }
      const id = data.projectId ?? `local-${Date.now()}`;
      const fresh: FactoryProject = {
        id,
        name: name.trim(),
        pasted_text: pasted,
        files: picked.map((p) => ({ name: p.file.name, size: p.file.size })),
        updated_at: new Date().toISOString(),
        report: data.report,
        report_at: data.createdAt ?? new Date().toISOString(),
        model: null,
      };
      setProjects((prev) => [fresh, ...prev.filter((p) => p.id !== id)]);
      setSelectedId(id);
      setProjectId(id);
      setPicked([]);
      if (data.error) setMessage(data.error);
    } catch {
      setMessage("서버에 보내지 못했습니다. 인터넷 연결이나 파일 크기를 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("이 상품의 견적 비교 기록을 지울까요?")) return;
    const result = await deleteFactoryProjectAction(id);
    if (result.error) return setMessage(result.error);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId("");
    if (projectId === id) pickProject("");
  }

  return (
    <div className="space-y-6">
      <section className="mx-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-mx-text">📥 견적·대화 넣기</h2>
          <select value={projectId} onChange={(e) => pickProject(e.target.value)} className="input-sm w-auto" aria-label="이어서 분석할 상품">
            <option value="">새 상품</option>
            {projects.filter((p) => !p.id.startsWith("local-")).map((p) => (
              <option key={p.id} value={p.id}>이어서: {p.name}</option>
            ))}
          </select>
        </div>
        {!hasClaudeKey && (
          <p className="rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 p-3 text-xs text-mx-text">
            Claude API 키가 아직 없습니다. 분석은 내 Claude 키로 합니다 —{" "}
            <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noopener noreferrer" className="font-bold text-mx-link underline">메인 사이트 API 설정 ↗</a>에서 한 번 등록하면 모든 프로그램에서 함께 씁니다.
          </p>
        )}
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="상품 이름 (예: 접이식 캠핑의자)" className="input-sm w-full" />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center text-xs ${dragging ? "border-mx-primary bg-mx-primary/10" : "border-mx-border"} text-mx-muted`}
        >
          견적서 PDF · 위챗 대화 캡처(JPG·PNG) · CSV/TXT를 끌어다 놓거나 눌러서 고르세요 — 최대 {MAX_FILES}개, 합계 4MB(큰 사진은 자동으로 줄임)
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {picked.length > 0 && (
          <ul className="space-y-1 text-xs text-mx-text">
            {picked.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded bg-mx-raised px-2 py-1">
                <span className="min-w-0 truncate">{p.kind === "pdf" ? "📄" : p.kind === "image" ? "🖼" : "📊"} {p.file.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-mx-muted">
                  {kb(p.file.size)}
                  <button type="button" onClick={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))} className="text-[#fca5a5]">빼기</button>
                </span>
              </li>
            ))}
            <li className={`text-right text-[11px] ${total > MAX_TOTAL_BYTES ? "text-[#fca5a5]" : "text-mx-muted"}`}>합계 {kb(total)} / 4MB</li>
          </ul>
        )}

        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value.slice(0, MAX_PASTED))}
          rows={7}
          placeholder={"위챗·이메일 대화를 복사해 붙여 넣으세요(날짜가 있으면 그대로). 이어서 분석할 때는 새 대화를 아래에 덧붙이면 됩니다.\n예) 11/02 Wang (Dongguan): MOQ 500pcs, FOB $3.50, sample $30 ..."}
          className="input-sm w-full"
        />
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="더 알고 싶은 점(선택) — 예: 1,000개 주문 시 로고 인쇄 포함 단가 협상" className="input-sm w-full" />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-mx-muted">내 Claude 키로 1번 읽습니다. 자료 양에 따라 1번에 약 50~300원, 30초~1분 걸립니다. 원본 파일은 저장하지 않습니다.</p>
          <button type="button" onClick={analyze} disabled={busy} className="mx-btn-primary whitespace-nowrap px-5 py-2.5 text-sm font-bold disabled:opacity-50">
            {busy ? "AI가 읽는 중… (최대 1분)" : "🤖 AI로 비교표 만들기"}
          </button>
        </div>
        {message && (
          <p className="text-xs text-[#fca5a5]">
            {message}
            {needsKey && (
              <>
                {" "}
                <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noopener noreferrer" className="font-bold text-[#93c5fd] underline">API 설정 열기 ↗</a>
              </>
            )}
          </p>
        )}
      </section>

      {loadError && <p className="mx-card p-4 text-xs text-[#fca5a5]">⚠️ {loadError} 새로고침해 다시 시도해 주세요.</p>}

      {projects.length > 0 && (
        <section className="mx-card p-5">
          <h2 className="text-sm font-bold text-mx-text">🗂 내 견적 비교 기록 <span className="font-normal text-mx-muted">(30일 보관)</span></h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${selectedId === p.id ? "border-mx-primary bg-mx-primary/15 text-mx-text" : "border-mx-border text-mx-muted"}`}
                >
                  {p.name} <span className="text-[10px]">{when(p.report_at ?? p.updated_at)}</span>
                </button>
                {!p.id.startsWith("local-") && (
                  <button type="button" onClick={() => remove(p.id)} aria-label={`${p.name} 지우기`} className="text-[11px] text-mx-muted hover:text-[#fca5a5]">✕</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected?.report && <ReportView report={selected.report} productName={selected.name} at={selected.report_at} />}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* 직접 선택해 복사 */
        }
      }}
      className="shrink-0 rounded border border-mx-border px-2 py-0.5 text-[11px] font-bold text-mx-link"
    >
      {done ? "복사됨" : "복사"}
    </button>
  );
}

const money = (n: number | null, currency: string) => (n == null ? "—" : `${n.toLocaleString("ko-KR", { maximumFractionDigits: 4 })} ${currency}`);
const daysText = (n: number | null) => (n == null ? "—" : `${n}일`);

function ReportView({ report, productName, at }: { report: QuoteReport; productName: string; at: string | null }) {
  const best = useMemo(() => cheapestFactory(report.factories), [report.factories]);
  return (
    <section className="mx-card space-y-5 p-5">
      <div>
        <h2 className="text-sm font-bold text-mx-text">📊 {report.product_name || productName} — 공장 비교</h2>
        <p className="mt-1 text-[11px] text-mx-muted">AI가 자료에서 읽은 값입니다 · {when(at)} · 빈칸(—)은 자료에 없던 값입니다. 주문 전 공장에 꼭 다시 확인하세요.</p>
        {report.summary && <p className="mt-2 rounded-lg bg-mx-raised p-3 text-xs text-mx-text">💡 {report.summary}</p>}
      </div>

      {report.factories.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs text-mx-text">
            <thead>
              <tr className="border-b border-mx-border text-mx-muted">
                <th className="py-2 pr-2">공장</th>
                <th className="py-2 pr-2 text-right">단가</th>
                <th className="py-2 pr-2 text-right">MOQ</th>
                <th className="py-2 pr-2 text-right">샘플비·금형비</th>
                <th className="py-2 pr-2 text-right">샘플·양산 기간</th>
                <th className="py-2 pr-2">결제 조건</th>
                <th className="py-2">마진</th>
              </tr>
            </thead>
            <tbody>
              {report.factories.map((f, i) => {
                const href = marginCalcUrl(f, report.product_name || productName);
                return (
                  <tr key={`${f.factory_name}-${i}`} className="border-b border-mx-border/60 align-top">
                    <td className="py-2 pr-2">
                      <span className="font-semibold">{f.factory_name}</span>
                      {best === f.factory_name && <span className="ml-1 rounded bg-[#10b981]/20 px-1 text-[10px] text-[#86efac]">최저 단가</span>}
                      {f.contact_channel && <span className="block text-[11px] text-mx-muted">{f.contact_channel}</span>}
                      {f.notes && <span className="block text-[11px] text-mx-muted">{f.notes}</span>}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {money(f.unit_price, f.currency)}
                      {f.price_basis && <span className="block text-[11px] text-mx-muted">{f.price_basis}</span>}
                      {f.tiers.map((t) => (
                        <span key={t.min_qty} className="block text-[11px] text-mx-muted">{t.min_qty.toLocaleString()}개~ {money(t.price, f.currency)}</span>
                      ))}
                    </td>
                    <td className="py-2 pr-2 text-right">{f.moq == null ? "—" : `${f.moq.toLocaleString()}개`}</td>
                    <td className="py-2 pr-2 text-right">
                      {money(f.sample_fee, f.currency)}
                      <span className="block text-[11px] text-mx-muted">금형 {money(f.mould_fee, f.currency)}</span>
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {daysText(f.sample_lead_days)}
                      <span className="block text-[11px] text-mx-muted">양산 {daysText(f.production_lead_days)}</span>
                    </td>
                    <td className="py-2 pr-2">{f.payment_terms || "—"}</td>
                    <td className="py-2">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap font-bold text-mx-link">마진 계산 →</a>
                      ) : (
                        <span className="text-[11px] text-mx-muted">단가·통화 필요</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-mx-muted">공장 견적을 찾지 못했습니다. 견적서나 대화를 더 넣어 다시 분석해 주세요.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-mx-raised p-3">
          <p className="text-xs font-bold text-mx-text">❓ 아직 확인 안 된 점</p>
          {report.unconfirmed.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-mx-text">{report.unconfirmed.map((u) => <li key={u}>{u}</li>)}</ul>
          ) : (
            <p className="mt-2 text-xs text-mx-muted">없음</p>
          )}
        </div>
        <div className="rounded-lg bg-mx-raised p-3">
          <p className="text-xs font-bold text-mx-text">⏳ 물었는데 답을 못 받은 질문</p>
          {report.pending.length ? (
            <ul className="mt-2 space-y-1 text-xs text-mx-text">
              {report.pending.map((p, i) => (
                <li key={i}>
                  <span className="text-mx-muted">{[p.date, p.factory_name].filter(Boolean).join(" · ")}</span> {p.question}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-mx-muted">없음</p>
          )}
        </div>
      </div>

      {report.next_questions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-mx-text">💬 다음에 보낼 질문 (복사해서 위챗·이메일로)</p>
          <div className="mt-2 space-y-3">
            {report.next_questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-mx-border p-3 text-xs text-mx-text">
                {q.target_factory && <p className="mb-1 text-[11px] text-mx-muted">받는 곳: {q.target_factory}</p>}
                {[
                  ["🇰🇷", q.ko],
                  ["🇺🇸", q.en],
                  ["🇨🇳", q.zh],
                ]
                  .filter(([, t]) => t)
                  .map(([flag, t]) => (
                    <div key={flag} className="flex items-start justify-between gap-2 py-0.5">
                      <span>
                        {flag} {t}
                      </span>
                      <CopyButton text={t} />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
