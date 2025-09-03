// src/components/TopActions.tsx
import { useMemo, useState } from "react";
import type { League } from "../lib/api";
import { createMatch, deleteLastMatch, listPlayers } from "../lib/api";
import { signInWithRedirect } from "aws-amplify/auth";
import LeagueChooserModal from "./LeagueChooserModal";
import LogMatchModal from "./LogMatchModal";
import CreateLeagueModal from "./CreateLeagueModal";
import { usePlayers } from "../hooks/usePlayers";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { useMetrics } from "./metrics/MetricsProvider";
import type { MatchInputDoubles } from "../types/match";

type Props = {
  yourLeagues: League[];
  publicLeagues: League[];
  selectedLeagueId: string | null;
  onSelectLeague: (id: string) => void;
  ownsSelected: boolean;
  onLeagueCreated?: (league: League) => void;
  onRefreshLeagues?: () => Promise<void>;
};

export default function TopActions({
  yourLeagues,
  publicLeagues,
  selectedLeagueId,
  onSelectLeague,
  ownsSelected,
  onRefreshLeagues,
  onLeagueCreated,
}: Props) {
  const { signedIn } = useAuthEmail();
  const { refresh: refreshMetrics } = useMetrics();

  const [chooseOpen, setChooseOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Track newly-created public leagues locally so labels are correct immediately
  const [knownPublicIds] = useState<Set<string>>(() => new Set());

  const ownedIds = useMemo(
    () => new Set(yourLeagues.map((l) => l.leagueId)),
    [yourLeagues]
  );

  // Server-reported public IDs
  const publicIdsFromServer = useMemo(
    () => new Set(publicLeagues.map((l) => l.leagueId)),
    [publicLeagues]
  );

  // Union set of all public IDs (server + locally-created)
  const allPublicIds = useMemo(() => {
    const s = new Set(publicIdsFromServer);
    for (const id of knownPublicIds) s.add(id);
    return s;
  }, [publicIdsFromServer, knownPublicIds]);

  // Public list for chooser WITHOUT your own leagues (avoid duplicates)
  const publicForChooser = useMemo(
    () => publicLeagues.filter((l) => !ownedIds.has(l.leagueId)),
    [publicLeagues, ownedIds]
  );

  const selected = useMemo(
    () =>
      selectedLeagueId
        ? [...yourLeagues, ...publicLeagues].find((l) => l.leagueId === selectedLeagueId) || null
        : null,
    [selectedLeagueId, yourLeagues, publicLeagues]
  );

  const isSelectedPublic = selected ? allPublicIds.has(selected.leagueId) : false;

  // Players for datalist in LogMatch modal
  const { players, loading: loadingPlayers, setPlayers } = usePlayers(selectedLeagueId);

  // ---- Doubles submit: (a1, a2) vs (b1, b2) with scores s1, s2 ----
  async function handleSubmit(
    a1: string,
    a2: string,
    b1: string,
    b2: string,
    s1: number,
    s2: number
  ) {
    if (!selectedLeagueId) return;
    setSubmitting(true);
    try {
      const payload: MatchInputDoubles = {
        leagueId: selectedLeagueId,
        teams: [
          { players: [{ playerId: "", name: a1 }, { playerId: "", name: a2 }] },
          { players: [{ playerId: "", name: b1 }, { playerId: "", name: b2 }] },
        ],
        score: { team1: s1, team2: s2 },
      };

      // create the match (owner-only)
      await createMatch(selectedLeagueId, payload as any);

      // refresh datalist — but DO NOT block on errors (e.g., 403 on private/public visibility)
      try {
        const pl = await listPlayers(selectedLeagueId);
        setPlayers(pl);
      } catch (e) {
        // swallow — datalist can refresh next time, and we still refresh metrics below
        console.warn("listPlayers failed after submit (non-blocking):", e);
      }
    } finally {
      // ALWAYS refresh tiles so UI updates even if listPlayers fails
      await refreshMetrics();
      setSubmitting(false);
    }
  }

  async function handleUndo() {
    if (!selectedLeagueId) return;
    setUndoing(true);
    try {
      await deleteLastMatch(selectedLeagueId);

      // refresh datalist — non-blocking
      try {
        const pl = await listPlayers(selectedLeagueId);
        setPlayers(pl);
      } catch (e) {
        console.warn("listPlayers failed after undo (non-blocking):", e);
      }
    } finally {
      await refreshMetrics(); // ALWAYS refresh tiles
      setUndoing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)]">
      {/* Header: Selected league + badges */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-xs text-zinc-400">Viewing league</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <div className="truncate text-xl font-semibold md:text-2xl">
              {selected ? selected.name : "No league selected"}
            </div>

            {selected && (
              <span
                className={[
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  isSelectedPublic
                    ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
                    : "bg-zinc-400/15 text-zinc-300 ring-1 ring-white/15",
                ].join(" ")}
                title={isSelectedPublic ? "Public league" : "Private league"}
              >
                {isSelectedPublic ? "Public" : "Private"}
              </span>
            )}

            {selected && ownsSelected && (
              <span
                className="inline-flex items-center rounded-full bg-blue-400/15 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-400/30"
                title="You own this league"
              >
                Owner
              </span>
            )}
          </div>
        </div>
<div className="w-full md:w-auto">
  <div className="flex w-full flex-row flex-wrap gap-2 items-stretch justify-end">
    {/* Grouped neutral buttons */}
    <div className="flex w-full sm:w-auto flex-row overflow-hidden rounded-lg border border-white/10">
      <button
        onClick={() => setChooseOpen(true)}
        className="flex-1 min-w-[9rem] bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
      >
        Select league
      </button>

      {/* vertical divider */}
      <div className="w-px bg-white/50" />

      <button
        onClick={async () => {
          if (!signedIn) {
            await signInWithRedirect();
            return;
          }
          setCreateOpen(true);
        }}
        className="flex-1 min-w-[9rem] bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
      >
        Create league
      </button>
    </div>

    {/* Log Match spans width if wrapped */}
    {ownsSelected && selectedLeagueId && (
      <button
        onClick={() => setLogOpen(true)}
        className="w-full sm:w-auto rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-black hover:brightness-95"
      >
        Log a Match
      </button>
    )}
  </div>
</div>

        {/* Actions */}
      
      </div>

      {/* divider */}
      <div className="mt-4 h-px w-full bg-white/10" />

      {/* Modals */}
      <LeagueChooserModal
        open={chooseOpen}
        onClose={() => setChooseOpen(false)}
        yourLeagues={yourLeagues}
        publicLeagues={publicForChooser}
        selectedLeagueId={selectedLeagueId}
        onSelect={onSelectLeague}
        publicIds={allPublicIds}
      />

      <CreateLeagueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(league) => {
          // 1) Optimistic local updates (instant UI)
          onLeagueCreated?.(league);                 // add to yourLeagues immediately
          onSelectLeague(league.leagueId);           // switch UI to it
          localStorage.setItem("leagueId", league.leagueId);
          setCreateOpen(false);
          void onRefreshLeagues?.();
          void refreshMetrics();
        }}
      />

      <LogMatchModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        ownsSelected={ownsSelected}
        onSubmit={handleSubmit} // (a1,a2,b1,b2,s1,s2)
        onUndo={ownsSelected ? handleUndo : undefined}
        players={players}
        loadingPlayers={loadingPlayers}
        submitting={submitting}
        undoing={undoing}
      />
    </div>
  );
}
