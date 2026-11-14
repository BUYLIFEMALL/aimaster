"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  BLOCK_DEFS, SHOWCASE_SOURCE_LABEL, videoEmbed,
  type BannerSettings, type Block, type GallerySettings, type HtmlSettings, type NoticeSettings, type ShowcaseSettings, type SliderSettings,
  type BlockStyle, type TopbarSettings, type VideoSettings,
} from "@/lib/blocks";

// 1안 106. 네오 모던 B2B 커머스 & 셀렉트 큐레이션 스튜디오 스타일 첫 화면 블록 그리기
// 손님 첫 화면과 운영자 편집기 미리보기가 같이 쓴다. 숨긴 블록은 그리지 않는다.

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
      <p className="mt-1 text-xs text-slate-400">실제 상품·공지는 손님 화면에서 보입니다.</p>
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
export function TabsView({ title, labels, panels }: { title: string; labels: string[]; panels: ReactNode[] }) {
  const [i, setI] = useState(0);
  return (
    <div className="px-4 sm:px-6" data-tabs>
      {title && <h2 className="mb-4 text-xl font-black tracking-tight text-slate-900">{title}</h2>}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist">
        {labels.map((l, j) => (
          <button
            key={j}
            type="button"
            role="tab"
            aria-selected={i === j}
            onClick={() => setI(j)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              i === j
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {panels[i]}
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

/** 블록 하나(겉모양 포함) — 손님 화면과 디자인 편집기(Puck 미리보기)가 같이 쓴다 */
export function BlockView({ b, slot }: { b: Block; slot?: ReactNode }) {
  const f = blockFrame(b.style);
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
    <section data-block={b.type} data-title-align={b.style?.title_align} className={f.className || undefined} style={f.style}>
      {f.full ? <div className="mx-auto max-w-6xl">{body}</div> : body}
    </section>
  );
}

const SLOT_TYPES = new Set(["showcase", "notice", "tabs", "timesale", "reviews", "category_icons"]);

/** 블록 공통 겉모양(D2-4) → section 속성. 화면 가득이면 본문 상자(max-w-6xl) 밖으로 배경을 넓히고 안쪽은 본문 폭 그대로 */
export function blockFrame(style: BlockStyle | undefined): { className: string; style?: CSSProperties; full: boolean } {
  if (!style) return { className: "", full: false };
  const cls = [style.hide_pc ? "md:hidden" : "", style.hide_mobile ? "max-md:hidden" : ""].filter(Boolean).join(" ");
  const css: CSSProperties = {};
  if (style.pad_top) css.paddingTop = style.pad_top;
  if (style.pad_bottom) css.paddingBottom = style.pad_bottom;
  if (style.bg_color) css.backgroundColor = style.bg_color;
  if (style.width === "full") {
    css.width = "100vw";
    css.marginLeft = "calc(50% - 50vw)";
  }
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
