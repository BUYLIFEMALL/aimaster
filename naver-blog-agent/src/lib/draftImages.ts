export interface DraftImage { url?: string; type: "thumbnail" | "body"; caption: string; prompt: string }

export function draftImageList<T>(generated: T[], planned: T[], edited: boolean): T[] {
  return edited ? generated : planned;
}

export function mergeDraftImage<T extends DraftImage>(images: T[], image: T, plans: DraftImage[]): T[] {
  const next = images.filter(item => item.caption !== image.caption).concat(image);
  const rank = (item: DraftImage) => {
    const index = plans.findIndex(plan => plan.caption === item.caption);
    return index < 0 ? plans.length : index;
  };
  return next.sort((a, b) => Number(b.type === "thumbnail") - Number(a.type === "thumbnail") || rank(a) - rank(b));
}

export function bodyImageAt<T extends DraftImage>(images: T[], slot: number): T | undefined {
  return images.filter(image => image.type === "body" && image.url)[slot];
}

export function buildImagePlan(title: string, category: string, sections: { title: string }[], count = 2): DraftImage[] {
  const total = Math.min(5, Math.max(1, Math.trunc(Number(count) || 2)));
  const shots = ["a hands-on demonstration at a Korean home", "a detailed close-up of the relevant tools and materials", "a comparison scene with distinct items arranged side by side", "a wide practical scene showing the completed outcome"];
  return Array.from({ length: total }, (_, index) => {
    const section = sections[(index - 1) % Math.max(sections.length, 1)]?.title || category;
    return index === 0 ? {
      type: "thumbnail", caption: `${title} 대표 이미지`,
      prompt: `Blog cover photo about ${title}, Korean (East Asian) people if present, bright natural lighting, photorealistic, no text`,
    } : {
      type: "body", caption: `본문 ${index} · ${section}`,
      prompt: `Blog illustration photo about ${title}, topic: ${section}, ${shots[index - 1]}, Korean (East Asian) people if present, photorealistic, natural lighting, no text`,
    };
  });
}

// Only layout markers change; every body/source line survives unchanged.
export function placePlannedImages(article: string, plans: DraftImage[]): string {
  const lines=article.split(/\r?\n/).filter(line=>!/^\s*\[IMAGE INSERT\b[^\]]*\]\s*$/i.test(line));
  const body=plans.filter(plan=>plan.type==="body");
  const paragraphs=lines.map((line,index)=>({line,index})).filter(item=>item.line.trim() && !/^\s*\[SECTION\b/i.test(item.line));
  const insertions=new Map<number,string[]>();
  body.forEach((image,index)=>{
    const position=paragraphs[Math.min(paragraphs.length-1,Math.floor((index+1)*paragraphs.length/(body.length+1)))]?.index ?? lines.length;
    const marker=`[IMAGE INSERT - ${image.caption.replace(/\]/g,"")}]`;
    insertions.set(position,[...(insertions.get(position) || []),marker]);
  });
  return lines.flatMap((line,index)=>[...(insertions.get(index) || []),line]).concat(insertions.get(lines.length) || []).join("\n");
}

export function removeImageFromArticle(article: string, url: string): string {
  const same=(value:string)=>value.replace(/&amp;/g,"&")===url;
  return article.replace(/<img\b[^>]*>/gi,tag=>{
    const src=tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1];
    return src && same(src) ? "" : tag;
  }).replace(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g,(match,src)=>same(src)?"":match);
}
