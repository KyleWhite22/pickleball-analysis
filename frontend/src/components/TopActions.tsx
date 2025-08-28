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

  // ✅ track newly-created public leagues locally to label correctly right away
  const [knownPublicIds, setKnownPublicIds] = useState<Set<string>>(() => new Set());

  const ownedIds = useMemo(
    () => new Set(yourLeagues.map((l) => l.leagueId)),
    [yourLeagues]
  );
  // server-provided public ids
  const publicIdsFromServer = useMemo(
    () => new Set(publicLeagues.map((l) => l.leagueId)),
    [publicLeagues]
  );
  // ✅ union set: server public + locally-known public
  const allPublicIds = useMemo(() => {
    const s = new Set(publicIdsFromServer);
    for (const id of knownPublicIds) s.add(id);
    return s;
  }, [publicIdsFromServer, knownPublicIds]);

  // Public list for chooser WITHOUT owned leagues (to avoid duplicates)
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-zinc-400">Viewing league</div>
          <div className="truncate text-xl font-semibold">
            {selected ? selected.name : "No league selected"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setChooseOpen(true)}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Choose league
          </button>

          <button
            onClick={async () => {
              if (!signedIn) { await signInWithRedirect(); return; }
              setCreateOpen(true);
            }}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Create league
          </button>

          <button
            onClick={() => setLogOpen(true)}
            disabled={!ownsSelected || !selectedLeagueId}
            className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-50"
          >
            Log a Match
          </button>
        </div>
      </div>

      {/* Modals */}
      <LeagueChooserModal
        open={chooseOpen}
        onClose={() => setChooseOpen(false)}
        yourLeagues={yourLeagues}
        publicLeagues={publicForChooser}
        selectedLeagueId={selectedLeagueId}
        onSelect={onSelectLeague}
        publicIds={allPublicIds} // ✅ use union set
      />

      <CreateLeagueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(league, visibility) => {
          // parent adds to "Your Leagues"
          onLeagueCreated?.(league);
          // mark as public immediately if created as public
          if (visibility === "public") {
            setKnownPublicIds(prev => new Set(prev).add(league.leagueId));
          }
          // select it
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