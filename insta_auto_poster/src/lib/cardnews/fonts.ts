"use client";

// 글꼴은 프로그램에 함께 들어 있는 무료 공개 글꼴(OFL)을 쓴다. 외부 주소에서 받지 않으므로 PNG로 저장할 때 글꼴이 빠지지 않는다.
// CSS의 unicode-range 조각을 쓰기 때문에, 그릴 글자로 미리 load()를 해서 필요한 조각을 받아 둔다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource/nanum-myeongjo/400.css";
import "@fontsource/nanum-myeongjo/700.css";
import "@fontsource/nanum-myeongjo/800.css";
import "@fontsource/nanum-pen-script/400.css";
import "@fontsource/black-han-sans/400.css";

import { fontFamily } from "./render";
import type { CardContent, CardStyle } from "./types";

/** 이 카드에 쓰이는 글자 조각의 글꼴을 모두 받아 둔다(이미 받았으면 바로 끝난다). */
export async function ensureCardFonts(style: CardStyle, page: CardContent): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const family = fontFamily(style.font);
  const jobs: Promise<unknown>[] = [];
  if (page.headline) jobs.push(document.fonts.load(`${style.headline.weight} ${style.headline.size}px ${family}`, page.headline));
  if (page.sub) jobs.push(document.fonts.load(`${style.sub.weight} ${style.sub.size}px ${family}`, page.sub));
  // 데이터형 카드(v1.17)는 굵기 500~900을 쓰므로 항목·숫자 글자 조각도 받아 둔다
  if (page.layout && page.layout !== "background") {
    const extra = [...(page.points ?? []).flatMap((p) => [p.title, p.desc]), page.number?.value ?? "", page.number?.label ?? "", "0123456789VS"].join(" ");
    for (const w of [500, 600, 800, 900]) jobs.push(document.fonts.load(`${w} 40px ${family}`, `${page.headline} ${page.sub} ${extra}`));
  }
  await Promise.all(jobs).catch(() => undefined);
}
