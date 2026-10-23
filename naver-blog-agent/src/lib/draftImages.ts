export interface DraftImage { url?: string; type: "thumbnail" | "body"; caption: string; prompt: string;
  id?: string; storagePath?: string; createdAt?: string; expiresAt?: string; originalUrl?: string }

export function generatedDraftImages<T extends DraftImage>(images: T[]): (T & { url: string })[] {
  return images.filter((image): image is T & { url: string } => typeof image.url === "string" && Boolean(image.url));
}

export function pendingDraftImages<T extends DraftImage>(images: T[]): T[] {
  return images.filter(image => !image.url && !image.storagePath);
}

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

// 병합 A-5(BLOG → 에이전트): 본문 이미지 위치를 소제목 단위로 옮긴다. 확장(article-plan.js)이 소제목 안의 이미지를 소제목 바로 아래로 모아 발행하므로
// 문단 단위가 아니라 소제목 단위로 옮겨야 실제 발행 위치가 바뀐다. 표시 줄만 옮기고 본문 줄은 그대로 둔다.
const IMAGE_MARKER=/^\s*\[IMAGE INSERT\b[^\]]*\]\s*$/i;
const SECTION_MARKER=/^\s*\[SECTION\s*-/i;

export function countImageMarkers(article: string): number {
  return article.split(/\r?\n/).filter(line=>IMAGE_MARKER.test(line)).length;
}

/** slot번째 이미지 표시를 바로 위/아래 소제목 묶음으로 옮긴다. 옮길 수 없으면 null. from→to는 표시 순서 변화(본문 이미지 목록도 같이 옮긴다). */
export function moveImageMarker(article: string, slot: number, direction: "up" | "down"): { content: string; from: number; to: number } | null {
  const nl=article.includes("\r\n")?"\r\n":"\n";
  const lines=article.split(/\r?\n/);
  const markers=lines.map((line,index)=>IMAGE_MARKER.test(line)?index:-1).filter(index=>index>=0);
  const at=markers[slot];
  if(at===undefined)return null;
  const headers=lines.map((line,index)=>SECTION_MARKER.test(line)?index:-1).filter(index=>index>=0);
  // 묶음 0 = 첫 소제목 앞(도입부), 묶음 k = k번째 소제목.
  const group=headers.filter(index=>index<at).length;
  const target=direction==="up"?group-1:group+1;
  if(target<0 || target>headers.length)return null;
  const marker=lines[at];
  const rest=lines.filter((_,index)=>index!==at);
  const restHeaders=rest.map((line,index)=>SECTION_MARKER.test(line)?index:-1).filter(index=>index>=0);
  let insertAt:number;
  if(target===0)insertAt=restHeaders[0]; // 도입부 끝(첫 소제목 바로 앞)
  else {
    insertAt=restHeaders[target-1]+1; // 소제목 바로 아래
    // 위로 올라온 이미지는 그 소제목 맨 위에 이미 있는 이미지들 뒤에 둔다(읽는 순서 유지).
    if(direction==="up")while(insertAt<rest.length && IMAGE_MARKER.test(rest[insertAt]))insertAt++;
  }
  rest.splice(insertAt,0,marker);
  const to=rest.slice(0,insertAt).filter(line=>IMAGE_MARKER.test(line)).length;
  return { content: rest.join(nl), from: slot, to };
}

/** 생성된 본문 이미지(url 있는 body)만 from→to로 옮긴다. 대표 이미지·아직 안 만든 계획은 자리를 그대로 둔다. */
export function reorderBodyImages<T extends DraftImage>(images: T[], from: number, to: number): T[] {
  const positions=images.map((image,index)=>image.type==="body" && image.url?index:-1).filter(index=>index>=0);
  if(from===to || from<0 || to<0 || from>=positions.length || to>=positions.length)return images;
  const body=positions.map(index=>images[index]);
  const [moved]=body.splice(from,1);
  body.splice(to,0,moved);
  const next=images.slice();
  positions.forEach((index,order)=>{next[index]=body[order];});
  return next;
}
