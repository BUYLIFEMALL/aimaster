"use client";
import { useEffect, useState } from "react";
import { useStudio } from "@/components/studio/StudioContext";
import { api, toMsg, type Msg } from "@/components/ui/api";
import { Busy, Message } from "@/components/ui/Message";
import type { BgPhoto } from "@/lib/design";
import { toEnglishKeywords } from "@/lib/photoKeywords";

// L-3 무료 사진 배경 — 회원 본인 Pixabay·Pexels 키(다른 AIMaster 프로그램에서 등록한 키를 그대로 씀)로 검색해 영상 배경으로.
type Provider = BgPhoto["source"];
const NAMES: Record<Provider, string> = { pixabay: "Pixabay", pexels: "Pexels" };
const KEY_PAGE: Record<Provider, string> = { pixabay: "https://pixabay.com/api/docs/", pexels: "https://www.pexels.com/api/" };

export function PhotoPicker() {
  const s = useStudio(), d = s.design;
  const [registered, setRegistered] = useState<Record<Provider, boolean> | null>(null);
  const [provider, setProvider] = useState<Provider>("pixabay");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<BgPhoto[]>([]);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    api<{ registered: Record<Provider, boolean> }>("/api/photos").then((r) => {
      setRegistered(r.registered);
      if (!r.registered.pixabay && r.registered.pexels) setProvider("pexels");
    }).catch(() => setRegistered({ pixabay: false, pexels: false }));
  }, []);
  useEffect(() => { // 처음 검색어는 곡 제목을 영어 단어로(사전에 없으면 제목 그대로)
    if (!query && s.title) setQuery(toEnglishKeywords(s.title) || s.title);
  }, [s.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasKey = !!registered?.[provider];
  const search = async () => {
    setBusy("찾는 중…"); setMsg(null);
    try {
      const r = await api<{ photos: BgPhoto[] }>("/api/photos", { body: { action: "search", provider, query, aspect: d.aspect } });
      setPhotos(r.photos);
      if (!r.photos.length) setMsg({ text: "맞는 사진이 없습니다. 검색어를 바꿔 보세요(영어 단어가 결과가 많습니다)." });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  };
  const saveKey = async () => {
    setBusy("키를 확인하는 중…"); setMsg(null);
    try {
      await api("/api/photos", { body: { action: "save", provider, key } });
      setRegistered((r) => ({ pixabay: false, pexels: false, ...r, [provider]: true })); setKey("");
      setMsg({ text: `${NAMES[provider]} 키를 저장했습니다. 다른 AIMaster 프로그램에서도 그대로 씁니다.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  };

  return (
    <section className="card stack">
      <div className="panel-label">🖼️ 무료 사진 배경 <span className="muted">(내 {NAMES[provider]} 키 · 검색할 때만 사용)</span></div>
      {d.bgPhoto && (
        <div className="row" style={{ alignItems: "flex-start" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.bgPhoto.preview} alt="고른 배경 사진" style={{ width: 96, height: 60, objectFit: "cover", borderRadius: 8 }} />
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
            <small>사진: {d.bgPhoto.author || "작가 미상"} · <a href={d.bgPhoto.pageUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{NAMES[d.bgPhoto.source]}에서 보기</a></small>
            <small className="muted">영상 오른쪽 아래에 작가·출처가 작게 들어갑니다.</small>
            {s.photoNote && <small className={s.photoNote.endsWith("…") ? "muted" : "error"}>{s.photoNote}</small>}
            <div><button type="button" className="chip" onClick={() => s.setDesign({ bgPhoto: null })}>사진 빼기</button></div>
          </div>
        </div>
      )}
      <div className="chips">
        {(Object.keys(NAMES) as Provider[]).map((p) => (
          <button key={p} type="button" className={`chip ${provider === p ? "on" : ""}`} onClick={() => { setProvider(p); setPhotos([]); setMsg(null); }}>
            {NAMES[p]}{registered?.[p] ? " ✓" : ""}
          </button>
        ))}
      </div>
      {registered && !hasKey ? (
        <div className="stack" style={{ gap: 8 }}>
          <small>{NAMES[provider]} 본인 API 키가 없습니다. 무료로 받아 한 번만 붙여 넣으면 다른 AIMaster 프로그램에서도 같이 씁니다. <a href={KEY_PAGE[provider]} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{NAMES[provider]} 키 받기 →</a></small>
          <div className="row">
            <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={`${NAMES[provider]} API 키`} style={{ flex: 1, minWidth: 0 }} />
            <button type="button" className="button" disabled={!!busy || key.trim().length < 10} onClick={saveKey}>확인 후 저장</button>
          </div>
        </div>
      ) : registered && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) void search(); }} placeholder="예: rain window night" style={{ flex: 1, minWidth: 0 }} maxLength={100} />
            <button type="button" className="chip" title="한국어 제목·단어를 사진 검색용 영어로" onClick={() => { const en = toEnglishKeywords(query); if (en) setQuery(en); else setMsg({ text: "사전에 없는 말입니다. 영어 단어로 직접 적어 주세요." }); }}>🔤 영어로</button>
            <button type="button" className="button" disabled={!!busy || !query.trim()} onClick={search}>찾기</button>
          </div>
          <small className="muted">{d.aspect === "portrait" ? "세로" : "가로"} 영상에 맞는 사진을 12장 찾습니다. 영어 단어가 결과가 많습니다.</small>
        </div>
      )}
      <Busy on={!!busy} label={busy} />
      <Message msg={msg} />
      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${d.aspect === "portrait" ? 4 : 3}, minmax(0,1fr))`, gap: 6 }}>
          {photos.map((p) => (
            <button key={p.url} type="button" onClick={() => s.setDesign({ bgPhoto: p })} title={`사진: ${p.author}`}
              style={{ padding: 0, border: d.bgPhoto?.url === p.url ? "2px solid var(--brand)" : "1px solid var(--line)", borderRadius: 8, overflow: "hidden", aspectRatio: d.aspect === "portrait" ? "9 / 16" : "16 / 9", background: "var(--surface-2)", cursor: "pointer" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
