"use client";

// 2026-10-20 병합 D: AI 유튜브 썸네일 프로의 SEO 전략 화면을 이 앱 디자인으로 옮긴 것.
// AI 호출은 서버(/api/seo/strategy)에서 회원 본인 Gemini 키로 한다 — 키를 브라우저로 받지 않는다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { takeRefHandoff } from "@/lib/refHandoff";
import { Copy, Check, Sparkles, FileUp, ImagePlus } from "lucide-react";

interface SeoStrategy {
  strategy: string;
  title: string;
  description: string;
  tags: string;
  studioTags: string;
  pinnedComment: string;
  visualStrategy: string;
}
interface SeoResult {
  strategies: SeoStrategy[];
  comprehensive: { description: string; tags: string; keywords: string; pinnedComment: string };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  return (
    <div className="seo-row">
      <div className="seo-row-head">
        <small>{label}</small>
        <button type="button" onClick={copy} aria-label={`${label} 복사`}>
          {done ? <Check size={13} /> : <Copy size={13} />}
          {done ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="seo-value">{value}</p>
    </div>
  );
}

export function SeoStudio() {
  const router = useRouter();
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");
  const [handoffFrom, setHandoffFrom] = useState("");

  // v1.10 다른 프로그램(AI 쇼츠 원스톱)이 넘긴 대본 → 대본 칸, 주소의 # 부분은 바로 지움(로그인을 거친 경우 보관분)
  useEffect(() => {
    const { text, from } = takeRefHandoff(window.location.hash);
    if (!text) return;
    setScript(text.slice(0, 30_000));
    setHandoffFrom(from);
    setHandoffNote(`「${from || "다른 프로그램"}」에서 넘긴 대본을 넣었습니다. 고칠 곳이 있으면 고친 뒤 「SEO 전략 3가지 만들기」를 눌러 주세요.`);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("txt 또는 md 파일만 불러올 수 있습니다.");
      return;
    }
    setScript((await file.text()).slice(0, 30_000));
  }

  async function run() {
    setError("");
    setNeedKey(false);
    setLoading(true);
    try {
      const res = await fetch("/api/seo/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNeedKey(!!data.needKey);
        throw new Error(data.error || "SEO 전략을 만들지 못했습니다.");
      }
      setResult(data.result);
      setTruncated(!!data.truncated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SEO 전략을 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  /** 고른 전략의 제목·연출안을 주제로 새 썸네일 프로젝트를 만들고 그 화면으로 이동 */
  async function makeThumbnail(i: number) {
    if (!result) return;
    const s = result.strategies[i];
    setCreating(i);
    setError("");
    try {
      const topic = `${s.title}\n\n[썸네일 연출안] ${s.visualStrategy}`.slice(0, 600);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // v1.12 대본(장면 제목 포함)을 참고 문서로, 고른 전략을 출처 표시로 함께 저장 — 프로젝트를 다시 열어도 그대로
        body: JSON.stringify({
          name: s.title.slice(0, 60),
          inputs: {
            topic,
            origin: `SEO 전략 ${String.fromCharCode(65 + i)} · ${s.strategy}`,
            doc: { name: handoffFrom ? `${handoffFrom} 대본` : "SEO 전략 대본", text: script, truncated: false },
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.project?.id) throw new Error(data.error || "프로젝트를 만들지 못했습니다.");
      router.push(`/project/${data.project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "프로젝트를 만들지 못했습니다.");
      setCreating(null);
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        {handoffNote && <p className="notice" role="status">📥 {handoffNote}</p>}
        <label htmlFor="seo-script">영상 대본 · 기획안 · 아이디어</label>
        <textarea
          id="seo-script"
          rows={8}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="예: 직장인이 퇴근 후 30분으로 월 50만 원 부수입을 만든 과정 — 처음 실패한 방법, 바꾼 습관, 지금 쓰는 도구 3가지"
        />
        <div className="actions">
          <label className="button" htmlFor="seo-file">
            <FileUp size={14} /> txt·md 파일 불러오기
          </label>
          <input id="seo-file" type="file" accept=".txt,.md" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
          <small>{script.length.toLocaleString()} / 30,000자</small>
          <button type="button" className="primary" onClick={run} disabled={loading || script.trim().length < 10}>
            <Sparkles size={14} /> {loading ? "전략 만드는 중…" : "SEO 전략 3가지 만들기"}
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error} {needKey && <a href="/settings" style={{ textDecoration: "underline" }}>키 등록하러 가기</a>}
          </p>
        )}
        <p className="notice">회원님 본인 Gemini API 키로 서버에서 만들며, 요금은 본인 Google 계정에 청구됩니다. 결과는 저장되지 않으니 필요한 문구는 복사해 두세요.</p>
      </section>

      {result && (
        <>
          {truncated && <p className="notice">대본이 길어 앞부분 30,000자만 분석했습니다.</p>}
          <div className="seo-grid">
            {result.strategies.map((s, i) => (
              <section key={i} className="card stack">
                <div>
                  <p className="eyebrow">전략 {String.fromCharCode(65 + i)} · {s.strategy}</p>
                  <h2 style={{ marginTop: 4 }}>{s.title}</h2>
                </div>
                <CopyRow label="영상 제목" value={s.title} />
                <CopyRow label="SEO 설명" value={s.description} />
                <CopyRow label="해시태그" value={s.tags} />
                <CopyRow label="스튜디오 태그(500자)" value={s.studioTags} />
                <CopyRow label="고정 댓글" value={s.pinnedComment} />
                <CopyRow label="썸네일 연출안" value={s.visualStrategy} />
                <button type="button" className="primary" onClick={() => makeThumbnail(i)} disabled={creating !== null}>
                  <ImagePlus size={14} /> {creating === i ? "프로젝트 만드는 중…" : "이 전략으로 썸네일 만들기"}
                </button>
              </section>
            ))}
          </div>
          <section className="card stack">
            <h2>종합 메타데이터 (세 전략 공통)</h2>
            <CopyRow label="공통 설명" value={result.comprehensive.description} />
            <CopyRow label="공통 해시태그" value={result.comprehensive.tags} />
            <CopyRow label="핵심 키워드" value={result.comprehensive.keywords} />
            <CopyRow label="고정 댓글 보완 전략" value={result.comprehensive.pinnedComment} />
          </section>
        </>
      )}
    </div>
  );
}
