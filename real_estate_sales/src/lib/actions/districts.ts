"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SEOUL_DISTRICTS } from "@/lib/publicdata/districts";

// 로그인 여부뿐 아니라 이 프로그램(real-estate-sales) 구독/이용 권한까지 확인한다.
// 페이지 레이아웃의 requireProgramAccess() 가드는 Server Action을 직접 호출하는
// 경로(폼 우회)까지는 막아주지 않으므로, 쓰기 액션 각각에서 다시 확인해야 한다.
export async function toggleDistrictAction(formData: FormData) {
  const user = await requireProgramAccess();
  const sggCd = String(formData.get("sggCd"));
  const nextActive = formData.get("nextActive") === "true";

  const district = SEOUL_DISTRICTS.find((d) => d.sgg_cd === sggCd);
  if (!district) return;

  const supabase = await createClient();

  if (nextActive) {
    await supabase.from("real_estate_watch_districts").upsert(
      {
        user_id: user.id,
        sgg_cd: district.sgg_cd,
        sgg_nm: district.sgg_nm,
        is_active: true,
      },
      { onConflict: "user_id,sgg_cd" },
    );
  } else {
    await supabase
      .from("real_estate_watch_districts")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("sgg_cd", district.sgg_cd);
  }

  revalidatePath("/districts");
}
