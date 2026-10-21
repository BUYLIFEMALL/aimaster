"use client";
import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { listSaved, removeLocal, type SavedResult } from "@/lib/remake/history";
import { resultUrl, saveResult } from "@/lib/remake/clientImages";
export function History({ userId }: { userId: string }) {
  const [items, setItems] = useState<SavedResult[]>([]), [error, setError] = useState(""); const [loading, setLoading] = useState(true), [busy, setBusy] = useState("");
  useEffect(() => { let active = true; listSaved(userId).then(x => { if (active) setItems(x); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [userId]);
  async function action(item: SavedResult, remove = false) {
    if (busy) return; if (remove && !confirm("보관한 이 사진을 삭제할까요?")) return; setBusy(item.id); setError("");
    try { if (remove) { await removeLocal(userId, item.id); setItems(p => p.filter(q => q.id !== item.id)); } else await saveResult(item.result, "jpeg"); } catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); } finally { setBusy(""); }
  }
  return <><div className="page-heading"><p className="eyebrow">MY REMAKES</p><h1>내 보관함</h1><p>직접 보관한 완성 사진을 이 브라우저에서 다시 볼 수 있습니다. 최근 20개를 유지하며 오래된 작품부터 정리합니다.</p></div><div className="notice">회원 계정마다 보관함이 분리됩니다. 다른 기기에서는 보이지 않으며, 브라우저 데이터를 지우면 사라집니다. 필요한 사진은 파일로 저장해 주세요.</div>{error && <p className="notice error-box" role="alert">{error}</p>}{loading ? <p className="notice" role="status">보관함을 열고 있습니다…</p> : !items.length ? <div className="card empty-history"><h2>보관한 사진이 없습니다</h2><p>사진을 완성한 뒤 [내 보관함에 저장]을 눌러 주세요.</p><a className="button primary" href="https://banana-canvas.buylife.xyz/studio#card-restore">바나나 캔버스에서 사진 복원하기</a></div> : <div className="history-grid">{items.map(item => <article className="card history-card" key={item.id}><img src={resultUrl(item.result)} alt={item.title}/><h2>{item.title}</h2><p className="muted">{new Date(item.result.createdAt).toLocaleString("ko-KR")} · {item.result.width} × {item.result.height}px</p><div className="actions"><button disabled={!!busy} onClick={() => void action(item)}><Download size={15}/>JPEG 저장</button><button disabled={!!busy} onClick={() => void action(item, true)} aria-label={`${item.title} 삭제`}><Trash2 size={15}/>삭제</button></div></article>)}</div>}</>;
}
