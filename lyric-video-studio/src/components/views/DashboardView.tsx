"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/ui/Hero";
import { useConfirm } from "@/components/ui/Confirm";
import { api, timeAgo, toMsg, type Msg } from "@/components/ui/api";
import { Message } from "@/components/ui/Message";
import { STEPS } from "@/components/layout/Sidebar";
import { useStudio, type SavedItem } from "@/components/studio/StudioContext";

export function DashboardView() {
  const { open, reset, dirty } = useStudio();
  const router = useRouter();
  const ask = useConfirm();
  const [items, setItems] = useState<SavedItem[] | null>(null), [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { api<{ items: SavedItem[] }>("/api/items?kind=project").then((r) => setItems(r.items.slice(0, 4))).catch((e) => { setItems([]); setMsg(toMsg(e)); }); }, []);
  const startNew = async () => { if (dirty && !(await ask("저장하지 않은 작업이 있습니다. 새로 시작할까요?", { ok: "새로 시작" }))) return; reset(); router.push("/source"); };
  return (
    <div className="stack">
      <Hero eyebrow="AI 가사영상 자동화" title="음악과 가사로 가사가 흐르는 영상을 만듭니다" emoji="🎤"
        desc="음악 파일과 가사만 있으면 시간을 맞추고, 디자인을 골라, 유튜브용 가로 영상이나 쇼츠용 세로 영상 MP4를 브라우저에서 바로 만듭니다. 설치가 필요 없고 파일은 서버로 올라가지 않습니다."
        meta={["⏱️ 한 곡 약 10~15분", "🖥️ 크롬·엣지 권장", "🔑 API 키 필요 없음"]}>
        <button type="button" className="button solid" onClick={() => void startNew()}>＋ 새 가사 영상 만들기</button>
        <Link className="button" href="/guide">📖 사용 매뉴얼</Link>
      </Hero>
      <section className="card">
        <h2>만드는 순서</h2>
        <div className="diagram">
          {STEPS.map((s, i) => (
            <Link key={s.href} className="node" href={s.href}>
              <div className="emoji">{s.emoji}</div><strong>{i + 1}. {s.name}</strong><small style={{ display: "block" }}>{s.detail}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ margin: 0 }}>최근 작업</h2><Link className="link-button" href="/library">전체 보기 →</Link></div>
        <Message msg={msg} />
        {items === null ? <p className="muted">불러오는 중…</p> : items.length === 0 ? (
          <div className="empty-state"><div className="emoji">🎶</div><p>아직 저장한 가사 영상이 없습니다. 첫 곡을 만들어 보세요.</p></div>
        ) : (
          <div className="list">
            {items.map((it) => (
              <button key={it.id} type="button" className="list-item" onClick={async () => { if (dirty && !(await ask("저장하지 않은 작업이 있습니다. 이 작업을 열까요?", { ok: "열기" }))) return; open(it); router.push("/source"); }}>
                <span><strong>{it.title}</strong><small>{it.data.artist || "아티스트 없음"} · 가사 {it.data.lines?.length ?? 0}줄 · {it.data.design?.aspect === "portrait" ? "세로" : "가로"}</small></span>
                <small>{timeAgo(it.updated_at)}</small>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className="avatar-tip"><div className="avatar">💡</div><div><strong>Suno로 만든 곡이라면</strong><p className="muted" style={{ fontSize: 12 }}>다음 업데이트에서 음악(SUNO) 자동화의 곡을 바로 불러와 가사 시간까지 자동으로 맞추는 기능을 추가할 예정입니다. 지금은 가사를 붙여넣고 「가사 싱크」에서 탭으로 맞춰 주세요.</p></div></div>
    </div>
  );
}
