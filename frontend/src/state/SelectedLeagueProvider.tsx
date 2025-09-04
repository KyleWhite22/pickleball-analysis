import { createContext, useContext, useMemo, useState } from "react";

type Ctx = {
  selectedLeagueId: string | null;
  setSelectedLeagueId: (id: string | null) => void;
};

const SelectedLeagueContext = createContext<Ctx | undefined>(undefined);

export function SelectedLeagueProvider({ children }: { children: React.ReactNode }) {
  // Hydrate synchronously from localStorage or URL param (?league=)
  const initial = (() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("league");
    if (fromUrl) return fromUrl;
    return localStorage.getItem("selectedLeagueId");
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
