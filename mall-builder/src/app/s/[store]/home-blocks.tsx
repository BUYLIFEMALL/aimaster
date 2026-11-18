"use client";

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import {
  BLOCK_DEFS, SHOWCASE_SOURCE_LABEL, TITLE_FONTS, titleFontHref, videoEmbed,
  type BannerSettings, type Block, type GallerySettings, type HtmlSettings, type NoticeSettings, type ShowcaseSettings, type SliderSettings,
  type BlockStyle, type TopbarSettings, type VideoSettings,
} from "@/lib/blocks";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 첫 화면 블록 그리기
// 유저 첫 화면과 운영사 편집기 미리보기가 같이 쓴다. 숨긴 블록은 그리지 않는다.

function MaybeLink({ href, className, style, children }: { href: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  if (!href) return <div className={className} style={style}>{children}</div>;
  const external = href.startsWith("https://");
  return (
    <a href={href} className={className} style={style} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** 휴대폰용 그림이 있으면 폭 767px 이하(globals.css 휴대폰 기준과 같음)에서 그 그림을 쓴다 */
function BannerImage({ image, mobile, className, style }: { image: string; mobile: string; className: string; style?: CSSProperties }) {
  return (
    <picture>
      {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className={className} style={style} />
    </picture>
  );
}

/** n개를 sec초마다 돌린다(0이면 멈춤) */
function useRotate(n: number, sec: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (n < 2 || sec <= 0) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), sec * 1000);
    return () => clearInterval(t);
  }, [n, sec]);
  return [n ? i % n : 0, setI] as const;
}

function Topbar({ s }: { s: TopbarSettings }) {
  const [i] = useRotate(s.items.length, s.rotate_sec);
  const it = s.items[i];
  if (!it) return null;
  return (
    <MaybeLink href={it.link} className="block px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xs" style={{ backgroundColor: it.bg }}>
      {it.text}
    </MaybeLink>
  );
}

function Slider({ s }: { s: SliderSettings }) {
  const [i, setI] = useRotate(s.slides.length, s.autoplay_sec);
  const n = s.slides.length;
  if (!n) return null;
  return (
    <div className="relative mx-4 sm:mx-6 overflow-hidden rounded-2xl bg-slate-100 shadow-xs" style={{ height: `min(${s.height}px, 58vw)` }}>
      {s.slides.map((sl, j) => (
        <MaybeLink key={j} href={sl.link} className={`absolute inset-0 transition-opacity duration-500 ${j === i ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <BannerImage image={sl.image} mobile={sl.mobile_image} className="h-full w-full object-cover" />
        </MaybeLink>
      ))}
      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 그림"
            onClick={() => setI((i - 1 + n) % n)}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs transition hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="다음 그림"
            onClick={() => setI((i + 1) % n)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-xs transition hover:bg-white"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {s.slides.map((_, j) => (
              <button
                key={j}
                type="button"
                aria-label={`${j + 1}번째 그림`}
                onClick={() => setI(j)}
                className={`h-2 rounded-full transition-all ${j === i ? "w-6 bg-blue-600" : "w-2 bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Banner({ s }: { s: BannerSettings }) {
  // 스킨(I14·E9): 꽉 찬 띠 = 여백·모서리 없이 본문 폭 가득 / 글 얹은 배너 = 그림 위 왼쪽에 큰 글·작은 글·단추
  if (s.skin === "full") {
    return (
      <MaybeLink href={s.link} className="block" data-banner-skin="full">
        <BannerImage image={s.image} mobile={s.mobile_image} className="block w-full" />
      </MaybeLink>
    );
  }
  if (s.skin === "overlay") {
    return (
      <div className="px-4 sm:px-6" data-banner-skin="overlay">
        <MaybeLink href={s.link} className="group relative mx-auto block overflow-hidden rounded-2xl shadow-xs" style={{ maxWidth: s.max_width }}>
          <BannerImage image={s.image} mobile={s.mobile_image} className="block min-h-48 w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-gradient-to-r from-black/65 via-black/30 to-transparent p-6 sm:p-10">
            <p className="max-w-lg text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl" data-edit-field="headline">{s.headline}</p>
            {s.sub && <p className="max-w-md text-sm text-white/85 sm:text-base" data-edit-field="sub">{s.sub}</p>}
            {s.button_label && <span className="mt-2 inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm">{s.button_label}</span>}
          </div>
        </MaybeLink>
      </div>
    );
  }
  return (
    <div className="px-4 sm:px-6">
      <MaybeLink href={s.link} className="mx-auto block">
        <BannerImage image={s.image} mobile={s.mobile_image} className="mx-auto w-full rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md" style={{ maxWidth: s.max_width }} />
      </MaybeLink>
    </div>
  );
}

/** 편집기 미리보기용 — 서버 데이터가 필요한 블록(쇼윈도·공지·탭·타임세일·후기·카테고리)의 자리 표시 */
function Placeholder({ b }: { b: Block }) {
  const text =
    b.type === "showcase"
      ? (() => { const s = b.settings as ShowcaseSettings; return `${s.title || "상품 쇼윈도"} — ${SHOWCASE_SOURCE_LABEL[s.source]} ${s.limit}개, ${s.columns}열`; })()
      : b.type === "notice"
        ? `${(b.settings as NoticeSettings).title} — 최근 공지 ${(b.settings as NoticeSettings).count}개`
        : `${BLOCK_DEFS[b.type].label}${"title" in (b.settings as object) && (b.settings as { title: string }).title ? ` — ${(b.settings as { title: string }).title}` : ""}`;
  return (
    <div className="mx-4 sm:mx-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500 shadow-xs">
      <p className="font-semibold text-slate-700">{text}</p>
      <p className="mt-1 text-xs text-slate-400">실제 상품·공지는 유저 화면에서 보입니다.</p>
    </div>
  );
}

/** D28 동영상 — 주소는 videoEmbed가 유튜브(쿠키 없는 주소)·비메오만 만든다 */
function Video({ s }: { s: VideoSettings }) {
  const src = videoEmbed(s.url);
  if (!src) return null;
  return (
    <div className="px-4 sm:px-6">
      {s.title && <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900">{s.title}</h2>}
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs" style={{ aspectRatio: "16 / 9" }}>
        <iframe src={src} title={s.title || "동영상"} className="absolute inset-0 h-full w-full" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    </div>
  );
}

/** D28 사진 갤러리(인스타 스타일 격자) */
function Gallery({ s }: { s: GallerySettings }) {
  return (
    <div className="px-4 sm:px-6">
      {s.title && <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900">{s.title}</h2>}
      <div className="mall-gallery grid gap-2.5" style={{ ["--cols" as string]: s.columns } as CSSProperties}>
        {s.items.map((it, i) => (
          <MaybeLink key={i} href={it.link} className="group block aspect-square overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          </MaybeLink>
        ))}
      </div>
    </div>
  );
}

/** D28 탭 상품 — 서버가 탭마다 만든 상품 격자를 받아 누르면 바꿔 보인다 */
/** 가로 탭 키(B2B-20261119-HOMETABS) — →/← 순환, Home/End 처음·끝. 그 밖의 키·빈 목록은 null(기본 동작 그대로) */
export function tabKeyIndex(key: string, i: number, n: number): number | null {
  if (n < 1) return null;
  if (key === "ArrowRight") return (i + 1) % n;
  if (key === "ArrowLeft") return (i - 1 + n) % n;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  return null;
}

export function TabsView({ title, labels, panels, skin }: { title: string; labels: string[]; panels: ReactNode[]; skin?: "line" }) {
  const [i, setI] = useState(0);
  // 블록마다 다른 id(한 화면에 탭 블록이 여럿이어도 안 겹침)
  const uid = useId();
  // 편집기에서 탭을 줄이면 고른 번호가 범위 밖일 수 있다 → 마지막 탭(빈 패널·선택 없음 방지)
  const sel = labels.length ? Math.min(i, labels.length - 1) : 0;
  const tabId = (j: number) => `${uid}-tab-${j}`;
  const panelId = `${uid}-panel`;
  return (
    <div className="px-4 sm:px-6" data-tabs>
      {title && <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900" data-edit-field="title">{title}</h2>}
      {/* 탭 줄은 Tab 한 번(고른 탭만 tabIndex 0), ←/→·Home/End로 고르고 초점도 옮긴다(WAI-ARIA 탭, 자동 선택) */}
      <div
        className={skin === "line" ? "mb-5 flex gap-6 overflow-x-auto border-b border-slate-200 scrollbar-none" : "mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none"}
        role="tablist"
        aria-label={title || undefined}
        data-tabs-skin={skin ?? "pill"}
        onKeyDown={(e) => {
          const next = tabKeyIndex(e.key, sel, labels.length);
          if (next === null) return;
          e.preventDefault();
          setI(next);
          e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
        }}
      >
        {labels.map((l, j) => (
          <button
            key={j}
            type="button"
            role="tab"
            id={tabId(j)}
            aria-selected={sel === j}
            aria-controls={panelId}
            tabIndex={sel === j ? 0 : -1}
            onClick={() => setI(j)}
            className={
              skin === "line"
                ? `-mb-px whitespace-nowrap border-b-2 px-1 pb-2.5 text-sm font-semibold transition-colors ${sel === j ? "border-slate-900 text-slate-900" : "border-transparent text-slate-600 hover:text-slate-800"}`
                : `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    sel === j ? "bg-slate-900 text-white shadow-xs" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`
            }
          >
            {l}
          </button>
        ))}
      </div>
      {/* 패널은 지금처럼 고른 것 하나만 그린다(숨은 패널 없음 = 추가 조회·부하·초점 없음) */}
      {labels.length > 0 && (
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(sel)} tabIndex={0}>
          {panels[sel]}
        </div>
      )}
    </div>
  );
}

/** D28 타임세일 남은 시간 — 끝나면 「종료」(서버는 다음 화면부터 블록을 숨김) */
export function Countdown({ endsAt }: { endsAt: string }) {
  const end = Date.parse(endsAt);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return <span className="font-mono">--:--:--</span>;
  const left = Math.max(0, Math.floor((end - now) / 1000));
  if (!left) return <span>종료</span>;
  const d = Math.floor(left / 86400);
  const hms = [Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return <span className="font-mono" data-countdown>{d > 0 ? `${d}일 ` : ""}{hms}</span>;
}

/** 블록 하나(겉모양 포함) — 유저 화면과 디자인 편집기(Puck 미리보기)가 같이 쓴다 */
export function BlockView({ b, slot }: { b: Block; slot?: ReactNode }) {
  const f = blockFrame(b.style);
  const fontHref = titleFontHref(b.style?.title_font);
  const body = (
    <>
      {b.type === "topbar" && <Topbar s={b.settings as TopbarSettings} />}
      {b.type === "slider" && <Slider s={b.settings as SliderSettings} />}
      {b.type === "banner" && <Banner s={b.settings as BannerSettings} />}
      {b.type === "html" && <div className="mall-html px-4 sm:px-6" dangerouslySetInnerHTML={{ __html: (b.settings as HtmlSettings).html }} />}
      {b.type === "video" && <Video s={b.settings as VideoSettings} />}
      {b.type === "gallery" && <Gallery s={b.settings as GallerySettings} />}
      {SLOT_TYPES.has(b.type) && slot}
    </>
  );
  return (
    <section id={`blk-${b.id}`} data-block={b.type} data-title-align={b.style?.title_align} data-text-align={b.style?.text_align} data-title-size={b.style?.title_size} data-title-color={b.style?.title_color ? "" : undefined} data-title-font={b.style?.title_font} className={`scroll-mt-24 ${f.className}`.trim()} style={f.style}>
      {/* E10 제목 글꼴 — 쓴 블록이 있을 때만 그 글꼴 CSS를 머리로 올려 한 번만 받는다(React 19 precedence가 같은 주소를 합침) */}
      {fontHref && <link rel="stylesheet" href={fontHref} precedence="mall-font" />}
      {f.full ? <div className="mx-auto max-w-6xl">{body}</div> : body}
    </section>
  );
}

const SLOT_TYPES = new Set(["showcase", "notice", "tabs", "timesale", "reviews", "category_icons", "hero"]);

/** 블록 공통 겉모양(D2-4) → section 속성. 화면 가득이면 본문 상자(max-w-6xl) 밖으로 배경을 넓히고 안쪽은 본문 폭 그대로 */
export function blockFrame(style: BlockStyle | undefined): { className: string; style?: CSSProperties; full: boolean } {
  if (!style) return { className: "", full: false };
  const cls = [style.hide_pc ? "md:hidden" : "", style.hide_mobile ? "max-md:hidden" : ""].filter(Boolean).join(" ");
  const css: CSSProperties = {};
  if (style.pad_top) css.paddingTop = style.pad_top;
  if (style.pad_bottom) css.paddingBottom = style.pad_bottom;
  // 화면 가득: section 폭은 본문 상자 그대로 두고 배경만 좌우 바깥(100vmax)까지 칠한다.
  // 예전 100vw 방식은 세로 스크롤바 폭까지 넓어져 가로 넘침·정렬 7px 어긋남이 생겼다(FRONT-20261116-08).
  // border-image 바깥 칠은 그리기 전용이라 스크롤 폭에 안 들어가고 그림자·포커스 링도 자르지 않는다.
  // fill이 가운데도 칠하므로 backgroundColor는 겹쳐 칠하지 않는다(반투명 색 이중 칠 방지).
  if (style.bg_color) {
    if (style.width === "full") css.borderImage = `conic-gradient(${style.bg_color} 0 0) fill 0 / / 0 100vmax`;
    else css.backgroundColor = style.bg_color;
  }
  if (style.title_color) (css as Record<string, string>)["--blk-title-color"] = style.title_color; // I8 제목 색(globals.css)
  if (style.title_font && TITLE_FONTS[style.title_font]) (css as Record<string, string>)["--blk-title-font"] = TITLE_FONTS[style.title_font].stack; // E10 제목 글꼴(globals.css)
  return { className: cls, style: Object.keys(css).length ? css : undefined, full: style.width === "full" };
}

// html은 readDoc/validateDoc에서 위험 태그를 지운 값만 들어온다(src/lib/sanitize.ts)
export function HomeBlocks({ blocks, slots }: { blocks: Block[]; slots?: Record<string, ReactNode> }) {
  const shown = blocks.filter((b) => b.visible);
  if (!shown.length) return null;
  return (
    <div className="space-y-8">
      {shown.map((b) => (
        <BlockView key={b.id} b={b} slot={SLOT_TYPES.has(b.type) ? (slots ? slots[b.id] : <Placeholder b={b} />) : null} />
      ))}
    </div>
  );
}
