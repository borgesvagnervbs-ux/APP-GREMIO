import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSources, type Source } from "./data";

type Ctx = { sources: Source[]; byId: Record<string, Source>; error: string | null; retry: () => void };
const SourcesContext = createContext<Ctx>({ sources: [], byId: {}, error: null, retry: () => {} });

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    getSources().then((s) => { setSources(s); setError(null); }, (e) => setError((e as Error).message));
  }, [n]);
  const byId = Object.fromEntries(sources.map((s) => [s.id, s]));
  return <SourcesContext.Provider value={{ sources, byId, error, retry: () => setN((x) => x + 1) }}>{children}</SourcesContext.Provider>;
}

export const useSources = () => useContext(SourcesContext);
