"use client";

import { useEffect, useState, useTransition } from "react";
import { AiModelSelect, useAiModel } from "@/components/AiModelSelect";
import { confirmInquiryAction, draftReplyAction, listInquiriesAction, sendReplyAction } from "@/lib/actions/inquiries";
import { loadPrefsAction, savePrefsAction } from "@/lib/actions/prefs";
import { checkReply, type InquiryRow } from "@/lib/coupang/inquiry";
import { upsertNamed, type ReplyTemplate } from "@/lib/coupang/prefs";

const KEY_PAGE = "/connect";
const smallBtn = "rounded border px-2.5 py-1 text-[12px] font-bold disabled:opacity-50";
const keyOf = (r: InquiryRow) => `${r.kind}:${r.id}`;
const whenText = (at: string) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ko-KR");
};

const BULK_DRAFT_MAX = 20;

function InquiryCard({ row, onDone, templates, onSaveTemplate, draftTick, index }: { row: InquiryRow; onDone: (message: string) => void; templates: ReplyTemplate[]; onSaveTemplate: (t: ReplyTemplate) => void; draftTick: number; index: number }) {
  const [templateTitle, setTemplateTitle] = useState("");
  const [facts, setFacts] = useState("");
  const [model, setModel] = useAiModel();
  const [text, setText] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const problem = text.trim() ? checkReply(text) : "";
  // 여러 건 초안: 아직 비어 있는 카드만, 차례로 조금씩 띄워 부른다. 보내기는 카드마다 회원이 누른다
  useEffect(() => {
    if (!draftTick || text.trim() || index >= BULK_DRAFT_MAX) return;
    const timer = setTimeout(() => draft(), index * 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftTick]);
  const hasBlank = /\[[^\]]+\]/.test(text);

  const draft = () =>
    start(async () => {
      setError("");
      setNeedKey(false);
      setAsking(false);
      const r = await draftReplyAction({ question: row.question, itemName: row.itemName, sellerFacts: facts, model });
      if (!r.ok) {
        setNeedKey(!!r.needKey);
        return setError(r.error);
      }
      setText(r.reply);
      setNeeds(r.needsCheck);
    });
  const send = () =>
    start(async () => {
      setError("");
      const r = await sendReplyAction({ kind: row.kind, id: row.id, parentAnswerId: row.parentAnswerId, content: text });
      if (!r.ok) {
        setAsking(false);
        return setError(r.error);
      }
      onDone("답변을 쿠팡에 등록했습니다.");
    });
  const confirm = () =>
    start(async () => {
      setError("");
      const r = await confirmInquiryAction(row.id);
      if (!r.ok) {
        setAsking(false);
        return setError(r.error);
      }
      onDone("확인 처리했습니다.");
    });

  return (
    <li className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className={`rounded-full px-2 py-0.5 font-bold ${row.needsConfirm ? "bg-slate-100 text-slate-700" : row.kind === "center" ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"}`}>
          {row.needsConfirm ? "고객센터 미확인" : row.kind === "center" ? "고객센터 미답변" : "상품 문의"}
        </span>
        <span>{whenText(row.at)}</span>
        {row.sellerProductId && <span>상품번호 {row.sellerProductId}</span>}
        {row.itemName && <span className="font-bold text-slate-700">{row.itemName}</span>}
      </div>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-900">{row.question || "(내용 없음)"}</p>

      {row.needsConfirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-slate-600">쿠팡이 상담을 마친 건이라 답변은 필요 없습니다.</span>
          <button type="button" disabled={pending} onClick={() => (asking ? confirm() : setAsking(true))} className={`${smallBtn} border-blue-300 bg-white text-blue-800`}>
            {pending ? "처리 중…" : asking ? "네, 확인 처리" : "확인 처리"}
          </button>
        </div>
      ) : (
        <>
          <AiModelSelect model={model} onChange={setModel} />
          <label className="block text-[12px] font-bold text-slate-700">
            초안에 쓸 사실(선택)
            <input value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="예: 11월 5일 입고 예정, 출고는 평일 오후 2시 마감" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] font-normal focus:border-blue-500 focus:outline-none" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={pending} onClick={draft} className={`${smallBtn} border-blue-300 bg-white text-blue-800`}>
              {pending && !asking ? "만드는 중…" : text ? "✨ 초안 다시 만들기" : "✨ AI 답변 초안"}
            </button>
            <span className="text-[11px] text-slate-500">고른 AI의 회원 본인 키로 1회 호출합니다. 쿠팡 호출은 없습니다.</span>
          </div>
          {templates.length > 0 && (
            <select aria-label="답변 템플릿" value="" onChange={(e) => { const t = templates.find((x) => x.title === e.target.value); if (t) { setText(t.text); setAsking(false); } }} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px]">
              <option value="">📋 자주 쓰는 답변 넣기</option>
              {templates.map((t) => <option key={t.title} value={t.title}>{t.title}</option>)}
            </select>
          )}
          <textarea
            aria-label="답변 내용"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setAsking(false);
            }}
            rows={5}
            placeholder="답변을 직접 쓰거나 AI 초안을 고쳐 주세요."
            className="block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] leading-relaxed focus:border-blue-500 focus:outline-none"
          />
          {text.trim() && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <input aria-label="템플릿 이름" placeholder="템플릿 이름" maxLength={40} value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} className="w-36 rounded border border-slate-300 bg-white px-2 py-1" />
              <button type="button" disabled={!templateTitle.trim()} onClick={() => { onSaveTemplate({ title: templateTitle.trim(), text }); setTemplateTitle(""); }} className={`${smallBtn} border-slate-300 bg-white text-slate-700`}>이 답변을 템플릿으로 저장</button>
            </div>
          )}
          {needs.length > 0 && <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-[12px] text-amber-900">⚠ 보내기 전에 확인할 것: {needs.join(", ")}</p>}
          {hasBlank && <p className="text-[12px] font-bold text-rose-800">대괄호 [ ] 부분을 실제 내용으로 바꿔야 보낼 수 있습니다.</p>}
          {problem && <p className="text-[12px] text-rose-800">{problem}</p>}
          {text.trim() && !problem && !hasBlank && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={pending} onClick={() => (asking ? send() : setAsking(true))} className={`${smallBtn} border-blue-600 bg-blue-700 text-white`}>
                {pending && asking ? "보내는 중…" : asking ? "네, 쿠팡에 답변 등록" : "답변 보내기"}
              </button>
              {asking && (
                <>
                  <span className="text-[12px] font-bold text-amber-800">⚠ 고객에게 바로 보이며 등록 뒤에는 고칠 수 없을 수 있습니다.</span>
                  <button type="button" disabled={pending} onClick={() => setAsking(false)} className={`${smallBtn} border-slate-300 bg-white text-slate-700`}>취소</button>
                </>
              )}
            </div>
          )}
        </>
      )}
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] text-rose-900">
          ❌ {error}
          {needKey && (
            <a href={KEY_PAGE} target="_blank" rel="noopener noreferrer" className="ml-1 font-bold underline">키 등록하러 가기 ↗</a>
          )}
        </p>
      )}
    </li>
  );
}

/** 플랜 묶음 2 문의 모아 보기 — 버튼을 눌렀을 때만 읽는다(쿠팡 3회). 문의 내용은 저장하지 않는다 */
export function InquiryBoard({ keysSaved, autoLoad = false }: { keysSaved: boolean; autoLoad?: boolean }) {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [draftTick, setDraftTick] = useState(0);
  const [askBulk, setAskBulk] = useState(false);
  useEffect(() => {
    loadPrefsAction().then((p) => setTemplates(p.replyTemplates)).catch(() => {});
    if (autoLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveTemplate = async (t: ReplyTemplate) => {
    const list = upsertNamed(templates, t, (x) => x.title);
    setTemplates(list);
    const r = await savePrefsAction({ replyTemplates: list });
    setNote(r.ok ? `✅ 템플릿 「${t.title}」을 저장했습니다.` : `❌ ${r.error}`);
  };
  const [rows, setRows] = useState<InquiryRow[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [range, setRange] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      setError("");
      setNote("");
      const r = await listInquiriesAction();
      if (!r.ok) return setError(r.error);
      setRows(r.rows);
      setFailed(r.failed);
      setRange(`${r.from} ~ ${r.to}`);
    });
  const finish = (row: InquiryRow, message: string) => {
    setRows((old) => (old ?? []).filter((r) => keyOf(r) !== keyOf(row)));
    setNote(`✅ ${message}`);
  };

  return (
    <section className="slw-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">최근 7일의 미답변 상품 문의와 고객센터 미답변·미확인 건을 불러옵니다(각 첫 쪽).</p>
        <button type="button" disabled={!keysSaved || pending} onClick={load} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
          {pending ? "불러오는 중…" : rows ? "다시 불러오기" : "문의 불러오기"}
        </button>
      </div>
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {note && <p className="rounded-lg bg-teal-50 px-3 py-2 text-[13px] text-teal-900">{note}</p>}
      {failed.map((f) => <p key={f} className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900">⚠ 일부를 읽지 못했습니다 — {f}</p>)}
      {rows && (
        <p className="text-[12px] font-bold text-slate-800">
          처리할 문의 {rows.length}건 <span className="font-normal text-slate-500">· 기간 {range} · 고객센터 미답변은 24시간이 지나면 쿠팡이 처리해 여기서 답할 수 없습니다.</span>
        </p>
      )}
      {rows?.length === 0 && failed.length === 0 && <p className="rounded-lg bg-teal-50 px-3 py-2 text-[13px] text-teal-900">✅ 처리할 문의가 없습니다.</p>}
      {!!rows?.length && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <button type="button" disabled={pending} onClick={() => setAskBulk(true)} className={`${smallBtn} border-blue-300 bg-white text-blue-800`}>✨ 빈 문의 초안 한 번에 만들기(최대 ${BULK_DRAFT_MAX}건)</button>
          {askBulk && (
            <>
              <span className="font-bold text-amber-800">문의마다 AI를 1번씩 부르며 요금은 내 키에 청구됩니다. 보내기는 건마다 직접 누르셔야 합니다.</span>
              <button type="button" onClick={() => { setDraftTick((n) => n + 1); setAskBulk(false); }} className={`${smallBtn} border-blue-600 bg-blue-700 text-white`}>네, 만들기</button>
              <button type="button" onClick={() => setAskBulk(false)} className={`${smallBtn} border-slate-300 bg-white text-slate-700`}>취소</button>
            </>
          )}
        </div>
      )}
      <ul className="space-y-3">
        {rows?.map((r, i) => <InquiryCard key={keyOf(r)} row={r} onDone={(m) => finish(r, m)} templates={templates} onSaveTemplate={saveTemplate} draftTick={draftTick} index={i} />)}
      </ul>
    </section>
  );
}
