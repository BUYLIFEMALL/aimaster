"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SEOUL_DISTRICTS } from "@/lib/publicdata/districts";

export async function toggleDistrictAction(formData: FormData) {
  const user = await requireUser();
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
