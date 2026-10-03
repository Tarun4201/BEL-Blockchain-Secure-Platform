"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Persona } from "@/lib/types";

export type ViewMode = "simple" | "technical";

interface AppCtx {
  persona: Persona;
  chainLive: boolean;
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  xrayTxId: string | null;
  openXRay: (txId: string) => void;
  closeXRay: () => void;
  evaluatorOpen: boolean;
  setEvaluatorOpen: (v: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ persona, chainLive, children }: { persona: Persona; chainLive: boolean; children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>(() =>
    typeof window !== "undefined" && localStorage.getItem("tg-mode") === "technical" ? "technical" : "simple"
  );
  const [xrayTxId, setX] = useState<string | null>(null);
  const [evaluatorOpen, setEvaluatorOpen] = useState(false);

  const setMode = useCallback((m: ViewMode) => {
    setModeState(m);
    localStorage.setItem("tg-mode", m);
  }, []);

  return (
    <Ctx.Provider
      value={{
        persona, chainLive, mode, setMode, xrayTxId,
        openXRay: setX, closeXRay: () => setX(null), evaluatorOpen, setEvaluatorOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
}
