"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  BLOCK_DEFS, SHOWCASE_SOURCE_LABEL, videoEmbed,
  type BannerSettings, type Block, type GallerySettings, type HtmlSettings, type NoticeSettings, type ShowcaseSettings, type SliderSettings,
  type TopbarSettings, type VideoSettings,
} from "@/lib/blocks";

// 첫 화면 블록 그리기 — 손님 첫 화면과 운영자 편집기 미리보기가 같이 쓴다. 숨긴 블록은 그리지 않는다.
// 새 블록 종류를 추가하면 src/lib/blocks.ts(등록표)·block-editor.tsx(편집 칸)와 함께 여기에도 넣는다.

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
    <MaybeLink href={it.link} className="block px-4 py-2 text-center text-sm text-white" style={{ backgroundColor: it.bg }}>
      {it.text}
    </MaybeLink>
  );
}

function Slider({ s }: { s: SliderSettings }) {
  const [i, setI] = useRotate(s.slides.length, s.autoplay_sec);
  const n = s.slides.length;
  if (!n) return null;
  return (
    <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: `min(${s.height}px, 62vw)` }}>
      {s.slides.map((sl, j) => (
        <MaybeLink key={j} href={sl.link} className={`absolute inset-0 transition-opacity duration-500 ${j === i ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <BannerImage image={sl.image} mobile={sl.mobile_image} className="h-full w-full object-cover" />
        </MaybeLink>
      ))}
      {n > 1 && (
        <>
          <button type="button" aria-label="이전 그림" onClick={() => setI((i - 1 + n) % n)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1 text-lg">‹</button>
          <button type="button" aria-label="다음 그림" onClick={() => setI((i + 1) % n)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1 text-lg">›</button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {s.slides.map((_, j) => (
              <button key={j} type="button" aria-label={`${j + 1}번째 그림`} onClick={() => setI(j)} className={`h-2 w-2 rounded-full ${j === i ? "bg-white" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Banner({ s }: { s: BannerSettings }) {
  return (
    <div className="px-4">
      <MaybeLink href={s.link} className="mx-auto block">
        <BannerImage image={s.image} mobile={s.mobile_image} className="mx-auto w-full rounded" style={{ maxWidth: s.max_width }} />
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
    <div className="mx-4 rounded border border-dashed px-4 py-6 text-center text-sm text-gray-500">
      {text}
      <p className="mt-1 text-xs">실제 상품·공지는 손님 화면에서 보입니다.</p>
    </div>
  );
}

/** D28 동영상 — 주소는 videoEmbed가 유튜브(쿠키 없는 주소)·비메오만 만든다 */
function Video({ s }: { s: VideoSettings }) {
  const src = videoEmbed(s.url);
  if (!src) return null;
  return (
    <div className="px-4">
      {s.title && <h2 className="mb-3 text-lg font-semibold">{s.title}</h2>}
      <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded" style={{ aspectRatio: "16 / 9" }}>
        <iframe src={src} title={s.title || "동영상"} className="absolute inset-0 h-full w-full" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    </div>
  );
}

/** D28 사진 갤러리(인스타 스타일 격자) */
function Gallery({ s }: { s: GallerySettings }) {
  return (
    <div className="px-4">
      {s.title && <h2 className="mb-3 text-lg font-semibold">{s.title}</h2>}
      <div className="mall-gallery grid gap-1.5" style={{ ["--cols" as string]: s.columns } as CSSProperties}>
        {s.items.map((it, i) => (
          <MaybeLink key={i} href={it.link} className="block aspect-square overflow-hidden rounded bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
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
    <div className="px-4" data-tabs>
      {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b" role="tablist">
        {labels.map((l, j) => (
          <button key={j} type="button" role="tab" aria-selected={i === j} onClick={() => setI(j)} className={`whitespace-nowrap px-4 py-2 text-sm ${i === j ? "border-b-2 border-gray-900 font-semibold" : "text-gray-500"}`}>
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

const SLOT_TYPES = new Set(["showcase", "notice", "tabs", "timesale", "reviews", "category_icons"]);

// html은 readDoc/validateDoc에서 위험 태그를 지운 값만 들어온다(src/lib/sanitize.ts)
export function HomeBlocks({ blocks, slots }: { blocks: Block[]; slots?: Record<string, ReactNode> }) {
  const shown = blocks.filter((b) => b.visible);
  if (!shown.length) return null;
  return (
    <div className="space-y-6">
      {shown.map((b) => (
        <section key={b.id} data-block={b.type}>
          {b.type === "topbar" && <Topbar s={b.settings as TopbarSettings} />}
          {b.type === "slider" && <Slider s={b.settings as SliderSettings} />}
          {b.type === "banner" && <Banner s={b.settings as BannerSettings} />}
          {b.type === "html" && <div className="mall-html px-4" dangerouslySetInnerHTML={{ __html: (b.settings as HtmlSettings).html }} />}
          {b.type === "video" && <Video s={b.settings as VideoSettings} />}
          {b.type === "gallery" && <Gallery s={b.settings as GallerySettings} />}
          {SLOT_TYPES.has(b.type) && (slots ? slots[b.id] : <Placeholder b={b} />)}
        </section>
      ))}
    </div>
  );
}
