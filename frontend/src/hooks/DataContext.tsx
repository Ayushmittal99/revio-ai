import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, errorMessage } from "../lib/api";
import type { Health, Summary } from "../types";

interface Ctx {
  summary: Summary | null; loading: boolean; error: string | null; refresh: () => Promise<void>;
  health: Health | null; healthError: string | null; refreshHealth: () => Promise<void>;
}
const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setSummary(await api.summary()); } catch (e) { setSummary(null); setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  const refreshHealth = useCallback(async () => {
    try { setHealth(await api.health()); setHealthError(null); } catch (e) { setHealth(null); setHealthError(errorMessage(e)); }
  }, []);

  useEffect(() => { refresh(); refreshHealth(); const t = setInterval(refreshHealth, 30000); return () => clearInterval(t); }, [refresh, refreshHealth]);
  return <DataCtx.Provider value={{ summary, loading, error, refresh, health, healthError, refreshHealth }}>{children}</DataCtx.Provider>;
}

export function useData() {
  const v = useContext(DataCtx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}
