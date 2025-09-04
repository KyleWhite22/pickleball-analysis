import { createContext, useContext, useMemo, useState } from "react";

const DEFAULT_PUBLIC_ID =
  (import.meta.env.VITE_DEFAULT_PUBLIC_LEAGUE_ID as string | undefined) || null;

type Ctx = {
  selectedLeagueId: string | null;
  setSelectedLeagueId: (id: string | null) => void;
};

const SelectedLeagueContext = createContext<Ctx | undefined>(undefined);

export function SelectedLeagueProvider({ children }: { children: React.ReactNode }) {
  // Hydrate synchronously from URL or localStorage; then fall back to default public league
  const initial = (() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("league");
    if (fromUrl) return fromUrl;

    const fromStorage = localStorage.getItem("selectedLeagueId");
    if (fromStorage) return fromStorage;

    // Fallback: default public league (first visit, no storage)
    return DEFAULT_PUBLIC_ID || null;
  })();

  const [selectedLeagueId, setSelectedLeagueIdState] = useState<string | null>(initial);

  const setSelectedLeagueId = (id: string | null) => {
    setSelectedLeagueIdState(id);
    if (id) localStorage.setItem("selectedLeagueId", id);
    else localStorage.removeItem("selectedLeagueId");
  };

  const value = useMemo(() => ({ selectedLeagueId, setSelectedLeagueId }), [selectedLeagueId]);
  return <SelectedLeagueContext.Provider value={value}>{children}</SelectedLeagueContext.Provider>;
}

export function useSelectedLeague() {
  const ctx = useContext(SelectedLeagueContext);
  if (!ctx) throw new Error("useSelectedLeague must be used within SelectedLeagueProvider");
  return ctx;
}
