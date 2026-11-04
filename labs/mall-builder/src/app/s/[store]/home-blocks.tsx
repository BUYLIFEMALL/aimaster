"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  SHOWCASE_SOURCE_LABEL,
  type BannerSettings, type Block, type HtmlSettings, type NoticeSettings, type ShowcaseSettings, type SliderSettings, type TopbarSettings,
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

/** 편집기 미리보기용 — 서버 데이터가 필요한 블록(쇼윈도·공지)의 자리 표시 */
function Placeholder({ b }: { b: Block }) {
  const text =
    b.type === "showcase"
      ? (() => { const s = b.settings as ShowcaseSettings; return `${s.title || "상품 쇼윈도"} — ${SHOWCASE_SOURCE_LABEL[s.source]} ${s.limit}개, ${s.columns}열`; })()
      : `${(b.settings as NoticeSettings).title} — 최근 공지 ${(b.settings as NoticeSettings).count}개`;
  return (
    <div className="mx-4 rounded border border-dashed px-4 py-6 text-center text-sm text-gray-500">
      {text}
      <p className="mt-1 text-xs">실제 상품·공지는 손님 화면에서 보입니다.</p>
    </div>
  );
}

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
          {(b.type === "showcase" || b.type === "notice") && (slots ? slots[b.id] : <Placeholder b={b} />)}
        </section>
      ))}
    </div>
  );
}
