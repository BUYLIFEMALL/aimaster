"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { BannerSettings, Block, SliderSettings, TopbarSettings } from "@/lib/blocks";

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sl.image} alt="" className="h-full w-full object-cover" />
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image} alt="" className="mx-auto w-full rounded" style={{ maxWidth: s.max_width }} />
      </MaybeLink>
    </div>
  );
}

export function HomeBlocks({ blocks }: { blocks: Block[] }) {
  const shown = blocks.filter((b) => b.visible);
  if (!shown.length) return null;
  return (
    <div className="space-y-6">
      {shown.map((b) => (
        <section key={b.id} data-block={b.type}>
          {b.type === "topbar" && <Topbar s={b.settings as TopbarSettings} />}
          {b.type === "slider" && <Slider s={b.settings as SliderSettings} />}
          {b.type === "banner" && <Banner s={b.settings as BannerSettings} />}
        </section>
      ))}
    </div>
  );
}
