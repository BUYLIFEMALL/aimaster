"use client";

import { LangSwitcher, useLang } from "@/components/tool/LangProvider";

export function TopBar() {
  const { t } = useLang();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-neutral-500">{t.tagline}</p>
      <LangSwitcher />
    </div>
  );
}
