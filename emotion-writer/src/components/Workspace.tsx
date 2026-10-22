"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  THEMES,
  SOURCES,
  RATIOS,
  STYLES,
  FONTS,
  TEXT_MODELS,
  IMAGE_MODELS,
  DEFAULT_DESIGN,
  type Provider,
  type Photo,
  type Design,
  type Ratio,
} from "@/lib/studio/config";
import { QuoteCanvas } from "./QuoteCanvas";
import { KeySettings } from "./KeySettings";
import {
  Sparkles,
  Settings,
  Search,
  Sliders,
  Maximize2,
  PenLine,
  ImageIcon,
  Palette,
} from "lucide-react";

type Draft = {
  topic: string;
  source: Provider | "";
  ratio: Ratio;
  lines: number;
  style: string;
  textModel: string;
  imageModel: string;
  quotes: string[];
  quote: string;
  design: Design;
};

const DEFAULT_PHOTO_QUERY = "nature";

const DEFAULT: Draft = {
  topic: THEMES[0].name,
  source: "",
  ratio: "9:16",
  lines: 5,
  style: "시",
  textModel: TEXT_MODELS[0].id,
  imageModel: IMAGE_MODELS[0].id,
  quotes: [],
  quote: "",
  design: DEFAULT_DESIGN,
};

function restoreDraft(raw: string | null): Draft | null {
  try {
    const d = JSON.parse(raw || "null");
    if (
      !d ||
      typeof d.topic !== "string" ||
      d.topic.length > 120 ||
      !["", "gemini", "pixabay", "pexels"].includes(d.source) ||
      !RATIOS.includes(d.ratio) ||
      ![5, 6, 7, 8].includes(d.lines) ||
      !STYLES.includes(d.style) ||
      !TEXT_MODELS.some((m) => m.id === d.textModel) ||
      !IMAGE_MODELS.some((m) => m.id === d.imageModel) ||
      typeof d.quote !== "string" ||
      d.quote.length > 700 ||
      !Array.isArray(d.quotes) ||
      d.quotes.length > 5 ||
      d.quotes.some((q: unknown) => typeof q !== "string" || q.length > 700)
    )
      return null;
    return { ...DEFAULT, ...d, design: DEFAULT_DESIGN };
  } catch {
    return null;
  }
}

function Step({
  number,
  title,
  icon: Icon,
  children,
}: {
  number: number;
  title: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <section id={`step-${number}`} className="card">
      <h2>
        <span className="step-num">{number}</span>
        {Icon && <Icon size={18} className="text-rose-600" />}
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

export function Workspace({
  userId,
  initialKeys,
}: {
  userId: string;
  initialKeys: Record<Provider, boolean>;
}) {
  const [draft, setDraft] = useState<Draft>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const [custom, setCustom] = useState("");
  const [keys, setKeys] = useState(initialKeys);
  const [modal, setModal] = useState<Provider | null>(null);
  const [image, setImage] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  // v1.23: 기본값은 안내 문구로만 보여 줌(덧붙여 써서 「naturenature」처럼 0장이 되는 일 방지) — 비우고 검색하면 nature
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const request = useRef<AbortController | null>(null);
  const generation = useRef({ value: 0 });
  const closeButton = useRef<HTMLButtonElement>(null);
  const storageKey = `emotion-writer:v1:${userId}`;

  useEffect(() => {
    const generationState = generation.current;
    try {
      const restored = restoreDraft(localStorage.getItem(storageKey));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (restored) setDraft(restored);
    } catch {
      /* Storage may be unavailable; work remains possible in this tab. */
    }
    setHydrated(true);
    return () => {
      generationState.value++;
      request.current?.abort();
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...draft, design: undefined }),
      );
    } catch {
      /* Do not interrupt editing if the browser blocks local storage. */
    }
  }, [draft, storageKey, hydrated]);

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key !== "Tab") return;
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"] button:not(:disabled),[role="dialog"] input:not(:disabled),[role="dialog"] a[href]',
        ),
      );
      const first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal]);

  function change(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  }

  function cancel() {
    generation.current.value++;
    request.current?.abort();
    request.current = null;
    setBusy("");
    setNotice("요청을 취소했습니다. 기존 문구와 배경은 유지됩니다.");
  }

  async function run<T>(
    path: string,
    body: unknown,
    label: string,
    receive: (data: T) => void,
  ) {
    if (request.current) return;
    const id = ++generation.current.value;
    const controller = new AbortController();
    request.current = controller;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(125_000),
        ]),
      });
      const data = await res.json().catch(() => {
        throw new Error(
          "서버 응답을 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
        );
      });
      if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
      if (id === generation.current.value) receive(data);
    } catch (e) {
      if (id === generation.current.value && !controller.signal.aborted)
        setError(
          e instanceof Error && e.name === "TimeoutError"
            ? "응답 시간이 초과되었습니다. 다시 시도해 주세요."
            : e instanceof Error
              ? e.message
              : "요청에 실패했습니다.",
        );
    } finally {
      if (id === generation.current.value) {
        request.current = null;
        setBusy("");
      }
    }
  }

  function makeCopy() {
    if (!keys.gemini) {
      setModal("gemini");
      return;
    }
    run<{ quotes: string[] }>(
      "/api/copy",
      {
        topic: draft.topic,
        style: draft.style,
        lines: draft.lines,
        model: draft.textModel,
      },
      "글귀 5개를 만들고 있습니다…",
      (d) => {
        change({ quotes: d.quotes });
        setNotice("후보를 선택하거나 직접 문구를 수정해 주세요.");
      },
    );
  }

  function makeBackground() {
    if (!keys.gemini) {
      setModal("gemini");
      return;
    }
    run<{ image: string }>(
      "/api/image",
      {
        topic: draft.topic,
        quote: draft.quote,
        ratio: draft.ratio,
        model: draft.imageModel,
      },
      "배경 이미지를 만들고 있습니다…",
      (d) => {
        setImage(d.image);
        setPhoto(null);
      },
    );
  }

  function search() {
    if (!draft.source || draft.source === "gemini") return;
    if (!keys[draft.source]) {
      setModal(draft.source);
      return;
    }
    run<{ photos: Photo[] }>(
      "/api/photos",
      { provider: draft.source, query: query.trim() || DEFAULT_PHOTO_QUERY, ratio: draft.ratio },
      "사진을 찾고 있습니다…",
      (d) => {
        setPhotos(d.photos);
        if (!d.photos.length)
          setNotice(
            "검색 결과가 없습니다. 영어 검색어로 바꿔 다시 검색해 보세요.",
          );
      },
    );
  }

  function selectPhoto(p: Photo) {
    run<{ image: string }>(
      "/api/photos",
      { action: "download", url: p.url },
      "선택한 사진을 준비하고 있습니다…",
      (d) => {
        setImage(d.image);
        setPhoto(p);
      },
    );
  }

  const disabled = Boolean(busy);
  const next = !draft.source
    ? "2단계에서 이미지 방식을 선택해 주세요."
    : !draft.quote.trim()
      ? "5단계에서 글귀를 만들거나 직접 입력해 주세요."
      : !image
        ? draft.source === "gemini"
          ? "배경 생성 버튼을 눌러 주세요."
          : "사진을 검색하고 원하는 배경을 선택해 주세요."
        : "문구와 디자인을 확인한 뒤 이미지로 저장하세요.";

  return (
    <>
      <header className="page-heading">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-[11px] font-bold mb-1.5 shadow-2xs">
          <Sparkles className="w-3 h-3 text-rose-500" />
          <span>감성 글귀 & 배경 카드 제작</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          감성 글귀 이미지
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          마음을 울리는 한 문장과 아름다운 배경으로 감성 카드를 제작하세요
        </p>
      </header>

      <div className="workspace-grid">
        <div className="controls">
          <Step
            number={1}
            title="주제 선택 (명언·위로·안부)"
            icon={Sparkles}
          >
            <div className="choice-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-choice ${draft.topic === t.name ? "selected" : ""}`}
                  disabled={disabled}
                  aria-pressed={draft.topic === t.name}
                  onClick={() => {
                    change({ topic: t.name });
                    setCustom("");
                  }}
                >
                  <span>{t.emoji}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <small>{t.description}</small>
                  </div>
                </button>
              ))}
            </div>
            <form
              className="custom-topic"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim() && !disabled)
                  change({ topic: custom.trim() });
              }}
            >
              <label htmlFor="custom-topic">
                원하는 다른 주제가 있다면 여기에 직접 입력해 보세요:
              </label>
              <div className="input-row">
                <input
                  id="custom-topic"
                  value={custom}
                  maxLength={120}
                  placeholder="✍️ 아침 인사, 위로와 격려, 성공 명언"
                  disabled={disabled}
                  onChange={(e) => setCustom(e.target.value)}
                />
                <button className="primary" disabled={disabled || !custom.trim()}>
                  적용
                </button>
              </div>
            </form>
            {!THEMES.some((t) => t.name === draft.topic) && (
              <p className="status-note">
                <span className="font-bold">선택된 맞춤 주제:</span> {draft.topic}
              </p>
            )}
          </Step>

          <Step
            number={2}
            title="이미지 생성 방식 (AI·무료 사진)"
            icon={ImageIcon}
          >
            <div className="choice-grid">
              {SOURCES.map((s) => (
                <div className="source-wrap" key={s.id}>
                  <button
                    className={`source-choice ${draft.source === s.id ? "selected" : ""}`}
                    disabled={disabled}
                    aria-pressed={draft.source === s.id}
                    onClick={() => {
                      change({ source: s.id });
                      setPhotos([]);
                    }}
                  >
                    <span>{s.emoji}</span>
                    <strong>{s.name}</strong>
                    <small className={keys[s.id] ? "connected" : "muted"}>
                      {keys[s.id] ? "✓ 본인 키 등록됨" : "본인 API 키 필요"}
                    </small>
                  </button>
                  <button
                    className="key-gear flex items-center gap-1"
                    aria-label={`${s.id} API 키 설정`}
                    disabled={disabled}
                    onClick={() => setModal(s.id)}
                    title="API 키 설정"
                  >
                    <Settings size={12} />
                    <span>설정</span>
                  </button>
                </div>
              ))}
            </div>
            <p className="muted">
              💡 무료 사진 방식의 AI 글귀 생성에도 Gemini 키가 필요합니다. 직접
              입력한 문구는 AI 글귀 호출 없이 사용할 수 있습니다.
            </p>
          </Step>

          {draft.source && (
            <>
              <Step
                number={3}
                title="이미지 비율 (9:16·1:1·3:4)"
                icon={Maximize2}
              >
                <div className="choice-grid">
                  {RATIOS.map((r) => (
                    <button
                      key={r}
                      disabled={disabled}
                      className={draft.ratio === r ? "selected" : ""}
                      aria-pressed={draft.ratio === r}
                      onClick={() => change({ ratio: r })}
                    >
                      {r === "1:1"
                        ? "🔲 피드 (1:1)"
                        : r === "9:16"
                          ? "📱 세로 (9:16)"
                          : "📄 카드 (3:4)"}
                    </button>
                  ))}
                </div>
                <p className="muted">
                  비율을 바꾸면 기존 배경은 새 비율에 맞춰 가운데를 잘라 표시합니다.
                </p>
              </Step>

              <Step
                number={4}
                title="문구 줄 수 (5~8줄)"
                icon={Sliders}
              >
                <div className="four-grid">
                  {[5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      disabled={disabled}
                      className={draft.lines === n ? "selected" : ""}
                      aria-pressed={draft.lines === n}
                      onClick={() => change({ lines: n })}
                    >
                      <strong>{n}</strong>줄
                    </button>
                  ))}
                </div>
                <p className="muted">
                  다음 글귀 생성에 적용됩니다. 문구는 선택한 줄 수 이내로 요청합니다.
                </p>
              </Step>

              <Step
                number={5}
                title="글귀 스타일 및 AI 생성"
                icon={PenLine}
              >
                <div className="choice-grid">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      disabled={disabled}
                      className={draft.style === s ? "selected" : ""}
                      aria-pressed={draft.style === s}
                      onClick={() => change({ style: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <label>
                  글귀 생성 AI 모델
                  <select
                    value={draft.textModel}
                    disabled={disabled}
                    onChange={(e) => change({ textModel: e.target.value })}
                  >
                    {TEXT_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary full"
                  disabled={disabled}
                  onClick={makeCopy}
                >
                  ✨ 글귀 5개 생성
                </button>
                <p className="muted">
                  이 버튼을 누를 때 본인 Gemini API를 호출합니다. 설정을 바꿔도
                  기존 문구와 배경은 유지됩니다.
                </p>
                {draft.quotes.length > 0 && (
                  <div className="quotes">
                    <h3>💡 마음에 드는 문구를 선택하세요</h3>
                    {draft.quotes.map((q, i) => (
                      <button
                        key={i}
                        disabled={disabled}
                        className={`quote-option ${q === draft.quote ? "selected" : ""}`}
                        aria-pressed={q === draft.quote}
                        onClick={() => change({ quote: q })}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <label>
                  직접 입력 · 최종 문구 수정
                  <textarea
                    value={draft.quote}
                    maxLength={700}
                    rows={6}
                    disabled={disabled}
                    placeholder="직접 문구를 입력하거나 생성한 글귀를 선택해 수정하세요."
                    onChange={(e) => change({ quote: e.target.value })}
                  />
                </label>
                <p className="muted">
                  {draft.quote.length}/700자 · 이 창의 문구가 이미지에 표시됩니다.
                </p>
              </Step>

              <section className="card">
                <h2>
                  <span className="step-num">★</span>
                  <ImageIcon size={18} className="text-rose-600" />
                  <span>배경 이미지 준비</span>
                </h2>
                {draft.source === "gemini" ? (
                  <>
                    <label>
                      이미지 생성 모델
                      <select
                        value={draft.imageModel}
                        disabled={disabled}
                        onChange={(e) => change({ imageModel: e.target.value })}
                      >
                        {IMAGE_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="primary full flex items-center justify-center gap-2"
                      disabled={disabled || !draft.quote.trim()}
                      onClick={makeBackground}
                    >
                      <Sparkles size={16} />
                      <span>{image ? "배경 다시 생성" : "배경 생성"}</span>
                    </button>
                    <p className="muted">
                      문구는 그대로 두고 배경 1장만 생성합니다. 생성 비용은 본인
                      Google 계정에 적용됩니다.
                    </p>
                  </>
                ) : (
                  <>
                    <form
                      className="input-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        search();
                      }}
                    >
                      <input
                        aria-label="사진 검색어"
                        value={query}
                        maxLength={100}
                        disabled={disabled}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="예: nature, sunrise, flowers (비워 두면 nature)"
                      />
                      <button className="primary flex items-center gap-1.5" disabled={disabled}>
                        <Search size={14} />
                        <span>사진 검색</span>
                      </button>
                    </form>
                    <p className="muted">
                      영어 검색어를 사용하면 더 많은 사진을 찾을 수 있습니다.
                    </p>
                    <div className="photo-grid">
                      {photos.map((p) => (
                        <button
                          key={p.id}
                          disabled={disabled}
                          onClick={() => selectPhoto(p)}
                          aria-label={`${p.author}의 사진 선택`}
                          className={
                            photo?.id === p.id && photo.source === p.source
                              ? "selected"
                              : ""
                          }
                        >
                          <Image
                            src={p.preview}
                            alt={`${p.author}의 배경 사진`}
                            width={360}
                            height={240}
                            unoptimized
                            loading="lazy"
                          />
                          <small>{p.author}</small>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}

          <p className="muted">
            문구와 기본 선택값은 이 브라우저에 회원별로 임시 저장됩니다.
            새로고침하거나 설정 화면으로 이동하면 사진·디자인은 다시 설정해 주세요.
          </p>
        </div>

        <div className="result-column">
          <Step
            number={6}
            title="감성 이미지 미리보기 & 저장"
            icon={Palette}
          >
            <p className="next-action" role="status">
              {next}
            </p>
            {busy && (
              <div className="status-note" role="status">
                <span className="spinner" /> {busy}
                <button onClick={cancel}>취소</button>
              </div>
            )}
            {error && (
              <p role="alert" className="error">
                {error} 설정을 확인한 뒤 해당 버튼으로 다시 시도해 주세요.
              </p>
            )}
            {notice && (
              <p role="status" className="status-note">
                {notice}
              </p>
            )}
            <QuoteCanvas
              image={image}
              quote={draft.quote}
              ratio={draft.ratio}
              design={draft.design}
              busy={disabled}
            />
            {photo && (
              <p className="attribution">
                사진: {photo.author} ·{" "}
                <a
                  href={photo.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {photo.source === "pexels" ? "Pexels" : "Pixabay"} 원본 보기 ↗
                </a>
              </p>
            )}
            {image && (
              <div className="design-panel">
                <h3 className="flex items-center gap-2">
                  <Palette size={16} className="text-rose-600" />
                  <span>글자와 배치 다듬기</span>
                </h3>
                <div className="design-grid">
                  <label>
                    글꼴
                    <select
                      value={draft.design.font}
                      disabled={disabled}
                      onChange={(e) =>
                        change({
                          design: { ...draft.design, font: e.target.value },
                        })
                      }
                    >
                      {FONTS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    문구 위치
                    <select
                      value={draft.design.position}
                      disabled={disabled}
                      onChange={(e) =>
                        change({
                          design: {
                            ...draft.design,
                            position: e.target.value as Design["position"],
                          },
                        })
                      }
                    >
                      <option value="top">상단</option>
                      <option value="center">가운데</option>
                      <option value="bottom">하단</option>
                    </select>
                  </label>
                  <label>
                    글자 색
                    <input
                      type="color"
                      value={draft.design.color}
                      disabled={disabled}
                      onChange={(e) =>
                        change({
                          design: { ...draft.design, color: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    글자 크기 ({draft.design.size})
                    <input
                      type="range"
                      min={24}
                      max={90}
                      value={draft.design.size}
                      disabled={disabled}
                      onChange={(e) =>
                        change({
                          design: {
                            ...draft.design,
                            size: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    배경 어둡기 ({draft.design.overlay}%)
                    <input
                      type="range"
                      min={0}
                      max={75}
                      value={draft.design.overlay}
                      disabled={disabled}
                      onChange={(e) =>
                        change({
                          design: {
                            ...draft.design,
                            overlay: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    서명 (선택)
                    <input
                      maxLength={40}
                      value={draft.design.signature}
                      disabled={disabled}
                      onChange={(e) =>
                        change({
                          design: {
                            ...draft.design,
                            signature: e.target.value,
                          },
                        })
                      }
                      placeholder="예: 오늘의 한 줄"
                    />
                  </label>
                </div>
                <p className="muted">
                  긴 문구는 이미지 안에 들어가도록 글자 크기를 자동 조정합니다.
                </p>
              </div>
            )}
          </Step>
        </div>
      </div>

      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${modal} API 키 설정`}
            className="modal"
          >
            <button
              className="modal-close"
              ref={closeButton}
              aria-label="키 설정 닫기"
              onClick={() => setModal(null)}
            >
              ✕
            </button>
            <KeySettings
              provider={modal}
              registered={keys[modal]}
              onSaved={setKeys}
            />
            <p className="muted">
              키를 저장하면 이 화면의 등록 상태도 갱신됩니다.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
