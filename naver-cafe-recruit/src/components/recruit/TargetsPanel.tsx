"use client";
// 초대할 사람: 「아는 사람」 아이디를 붙여 넣어 모으고, 목록을 보고 빼고 싶은 사람만 제외한 뒤 「이 목록 승인」 한 번.
// 승인한 사람만 회원 PC 확장이 하루 상한·동작 시간대 안에서 초대한다. 이 화면은 네이버에 아무것도 보내지 않는다.
import { useEffect, useRef, useState } from "react";
import { recruit, type Target } from "./call";
import { parseNaverIds } from "@/lib/recruitApi";

const STATE: Record<Target["state"], string> = { draft: "검토 전", reviewed: "✅ 승인", skipped: "제외" };
const SOURCE: Record<Target["source_mode"], string> = { known: "👋 아는 사람", extract: "🔎 카페 활동 회원" };

export function TargetsPanel() {
  const [rows, setRows] = useState<Target[] | null>(null), [text, setText] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = async () => { try { setRows((await recruit<{ targets: Target[] }>("targets_list")).targets); } catch (e) { setMsg(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."); } };
  useEffect(() => { void load(); }, []);
  async function act(run: () => Promise<string>) {
    if (lock.current) return; lock.current = true; setBusy(true); setMsg("처리 중…");
    try { setMsg(await run()); await load(); } catch (e) { setMsg(e instanceof Error ? e.message : "결과를 확인하지 못했습니다."); }
    finally { lock.current = false; setBusy(false); }
  }
  const parsed = parseNaverIds(text);
  const add = () => act(async () => {
    if (!parsed.ids.length) throw new Error("네이버 아이디를 한 줄에 하나씩(또는 쉼표로) 넣어 주세요.");
    const r = await recruit<{ added: number; skipped: number }>("targets_add", { source_mode: "known", rows: parsed.ids.map(naver_id => ({ naver_id })) });
    setText(""); return `${r.added}명을 넣었습니다.${r.skipped ? ` 이미 있거나 형식이 맞지 않는 ${r.skipped}명은 건너뛰었습니다.` : ""}`;
  });
  const drafts = rows?.filter(r => r.state === "draft").length ?? 0;
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  return <div className="space-y-4">
    <section className={card}>
      <h2 className="text-lg font-bold text-slate-900">👋 아는 사람 넣기</h2>
      <p className="mt-1 text-sm text-slate-600">서로이웃·지인의 네이버 아이디(또는 블로그 주소)를 붙여 넣으세요. 한 번에 200명까지, 같은 사람은 한 번만 들어갑니다.</p>
      <textarea className="mt-3 h-28 w-full rounded-xl border p-3 text-sm" value={text} onChange={e => setText(e.target.value)} placeholder={"friend01\nhttps://blog.naver.com/friend02"} />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <button disabled={busy || !parsed.ids.length} onClick={() => void add()} className="rounded-xl bg-[#03c75a] px-4 py-2 font-bold text-white disabled:opacity-50">목록에 넣기({parsed.ids.length}명)</button>
        {parsed.invalid.length > 0 && <span className="text-amber-700">형식이 맞지 않아 뺄 것: {parsed.invalid.slice(0, 5).join(", ")}{parsed.invalid.length > 5 ? " …" : ""}</span>}
      </div>
      <p className="mt-3 text-xs text-slate-500">🔎 「카페 활동 회원」 방식은 회원 PC 확장이 내 로그인 브라우저에서 모아 이 목록에 넣습니다(설정에서 켠 경우).</p>
    </section>
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">초대할 사람 목록 {rows ? `(${rows.length}명)` : ""}</h2>
        <button disabled={busy || drafts === 0} onClick={() => void act(async () => `${(await recruit<{ reviewed: number }>("targets_review_all")).reviewed}명을 승인했습니다. 확장이 하루 상한·시간대 안에서 초대합니다.`)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">✅ 이 목록 승인({drafts}명)</button>
      </div>
      <p className="mt-1 text-xs text-slate-500">빼고 싶은 사람만 「제외」를 누른 뒤 승인하세요. 모은 명단은 30일 뒤 자동으로 지워집니다(필요하면 「보낸 결과」에서 엑셀로 내려받기).</p>
      {rows === null ? <p className="mt-3 text-sm text-slate-500">불러오는 중…</p> : rows.length === 0 ? <p className="mt-3 text-sm text-slate-500">아직 모은 사람이 없습니다.</p> :
        <ul className="mt-3 divide-y text-sm">{rows.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span><b>{r.naver_id}</b>{r.nickname ? ` · ${r.nickname}` : ""} <span className="text-slate-500">{SOURCE[r.source_mode]}{r.board_name ? ` · ${r.board_name}` : ""}</span></span>
          <span className="flex items-center gap-2"><span className="text-slate-600">{STATE[r.state]}</span>
            {r.state !== "skipped" && <button disabled={busy} onClick={() => void act(async () => { await recruit("target_skip", { id: r.id }); return `${r.naver_id}을(를) 제외했습니다.`; })} className="rounded-lg border px-2 py-1 text-xs">제외</button>}
            {r.state === "skipped" && <button disabled={busy} onClick={() => void act(async () => { await recruit("target_review", { id: r.id }); return `${r.naver_id}을(를) 다시 승인했습니다.`; })} className="rounded-lg border px-2 py-1 text-xs">다시 승인</button>}
          </span></li>)}</ul>}
    </section>
    {msg && <p role="status" className="text-sm text-slate-700">{msg}</p>}
  </div>;
}
