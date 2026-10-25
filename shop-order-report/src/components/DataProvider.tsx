"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { OrderLine } from "@/lib/orders/parse";
import type { FieldId, MarketId } from "@/lib/orders/markets";
import { DEFAULT_SETTINGS, type ReportSettings } from "@/lib/report/aggregate";
import { idbGet, idbSet } from "@/lib/browser/store";

export type Mappings = Partial<Record<MarketId, Partial<Record<FieldId, string>>>>;

export interface AppSettings extends ReportSettings {
  /** 마켓별로 회원이 맞춘 열 대응(다음 파일에 다시 씀) */
  mappings: Mappings;
}

const DEFAULT_APP: AppSettings = { ...DEFAULT_SETTINGS, mappings: {} };

interface Ctx {
  ready: boolean;
  saved: boolean;
  lines: OrderLine[];
  settings: AppSettings;
  setLines: (lines: OrderLine[]) => void;
  setSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [lines, setLinesState] = useState<OrderLine[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_APP);

  useEffect(() => {
    void (async () => {
      const [l, s] = await Promise.all([idbGet<OrderLine[]>("orders"), idbGet<AppSettings>("settings")]);
      if (l) setLinesState(l);
      if (s) setSettingsState({ ...DEFAULT_APP, ...s, products: s.products ?? {}, marketFeePct: s.marketFeePct ?? {}, mappings: s.mappings ?? {} });
      setReady(true);
    })();
  }, []);

  const setLines = useCallback((next: OrderLine[]) => {
    setLinesState(next);
    void idbSet("orders", next).then(setSaved);
  }, []);

  const setSettings = useCallback((s: AppSettings | ((p: AppSettings) => AppSettings)) => {
    setSettingsState((prev) => {
      const next = typeof s === "function" ? s(prev) : s;
      void idbSet("settings", next).then(setSaved);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ready, saved, lines, settings, setLines, setSettings }), [ready, saved, lines, settings, setLines, setSettings]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("DataProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}

export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
