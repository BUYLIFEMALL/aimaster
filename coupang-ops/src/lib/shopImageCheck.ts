import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOP_IMAGE_BUCKET, type ShopImage } from "@/lib/shop";
import { extraRejectReason, judgeMain, type ImageInfo } from "@/lib/coupang/imageRules";

async function readInfo(path: string): Promise<ImageInfo | null> {
  const { data, error } = await createAdminClient().storage.from(SHOP_IMAGE_BUCKET).download(path);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  try {
    const m = await sharp(buf).metadata();
    return { format: m.format ?? "unknown", width: m.width ?? 0, height: m.height ?? 0, bytes: buf.length };
  } catch {
    return null;
  }
}

/** 대표·추가 이미지를 실제로 읽어 쿠팡 규격과 비교한다. 경로는 getShopProduct가 회원 본인 폴더로 걸러 준 것만 받는다. */
export async function checkShopImages(main: ShopImage | null, extras: ShopImage[]) {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (main) {
    const info = await readInfo(main.path);
    if (!info) problems.push("대표 이미지를 읽지 못했습니다. 잠시 뒤 다시 검사해 주세요.");
    else {
      const j = judgeMain(info);
      if (!j.ok) problems.push(j.problem);
      else if (j.upscale) warnings.push(`대표 이미지가 ${info.width}×${info.height}로 쿠팡 최소 규격(500×500)보다 작아 1000×1000으로 확대해 보냅니다. 원본은 바뀌지 않습니다.`);
    }
  }
  const infos = await Promise.all(extras.map((e) => readInfo(e.path)));
  const usableExtras = extras.filter((_, i) => {
    const info = infos[i];
    const reason = info ? extraRejectReason(info) : "읽지 못함";
    if (reason) warnings.push(`추가 이미지 ${i + 1}번은 쿠팡 규격에 맞지 않아 빼고 보냅니다(${reason}).`);
    return !reason;
  });
  return { problems, warnings, usableExtras };
}
