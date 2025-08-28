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

type Props = {
  yourLeagues: League[];
  publicLeagues: League[];
  selectedLeagueId: string | null;
  onSelectLeague: (id: string) => void;
  ownsSelected: boolean;
  onChanged?: () => void;
  onLeagueCreated?: (league: League) => void; // parent (Home) will add it to yourLeagues immediately
};

export default function TopActions({
  yourLeagues,
  publicLeagues,
  selectedLeagueId,
  onSelectLeague,
  ownsSelected,
  onChanged,
  onLeagueCreated,
}: Props) {
  const { signedIn } = useAuthEmail();

  const [chooseOpen, setChooseOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Track newly-created public leagues locally so labels are correct immediately
  const [knownPublicIds, setKnownPublicIds] = useState<Set<string>>(() => new Set());

  const ownedIds = useMemo(
    () => new Set(yourLeagues.map((l) => l.leagueId)),
    [yourLeagues]
  );
  const publicIdsFromServer = useMemo(
    () => new Set(publicLeagues.map((l) => l.leagueId)),
    [publicLeagues]
  );
  const allPublicIds = useMemo(() => {
    const s = new Set(publicIdsFromServer);
    for (const id of knownPublicIds) s.add(id);
    return s;
  }, [publicIdsFromServer, knownPublicIds]);

  // Public list for chooser WITHOUT your own leagues (no duplicates)
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

  const { players, loading: loadingPlayers, setPlayers } = usePlayers(selectedLeagueId);

  async function handleSubmit(p1: string, p2: string, s1: number, s2: number) {
    if (!selectedLeagueId) return;
    try {
      setSubmitting(true);
      await createMatch(selectedLeagueId, { player1Name: p1, player2Name: p2, score1: s1, score2: s2 });
      const pl = await listPlayers(selectedLeagueId);
      setPlayers(pl);
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUndo() {
    if (!selectedLeagueId) return;
    try {
      setUndoing(true);
      await deleteLastMatch(selectedLeagueId);
      const pl = await listPlayers(selectedLeagueId);
      setPlayers(pl);
      onChanged?.();
    } finally {
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

        {/* Action group */}
        <div className="w-full md:w-auto">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* Grouped neutral buttons with subtle divider */}
            <div className="flex rounded-lg border border-white/10">
              <button
                onClick={() => setChooseOpen(true)}
                className="min-w-[9rem] bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                Choose league
              </button>

              {/* stronger vertical divider */}
              <div className="my-0 w-px bg-white/50" />

              <button
                onClick={async () => {
                  if (!signedIn) { await signInWithRedirect(); return; }
                  setCreateOpen(true);
                }}
                className="min-w-[9rem] bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                Create league
              </button>
            </div>

            {/* Only show Log Match if user owns the selected league */}
            {ownsSelected && selectedLeagueId && (
              <button
                onClick={() => setLogOpen(true)}
                className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-black hover:brightness-95"
              >
                Log a Match
              </button>
            )}
          </div>
        </div>
      </div>

      {/* faint divider under top actions */}
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
        onCreated={(league, visibility) => {
          onLeagueCreated?.(league);
          if (visibility === "public") {
            setKnownPublicIds(prev => new Set(prev).add(league.leagueId));
          }
          onSelectLeague(league.leagueId);
        }}
      />

      <LogMatchModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        ownsSelected={ownsSelected}
        onSubmit={handleSubmit}
        onUndo={ownsSelected ? handleUndo : undefined}
        players={players}
        loadingPlayers={loadingPlayers}
        submitting={submitting}
        undoing={undoing}
      />
    </div>
  );
}
