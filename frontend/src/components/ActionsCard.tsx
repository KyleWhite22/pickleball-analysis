// src/components/ActionsCard.tsx
import { useState } from "react";
import LogMatchModal from "./LogMatchModal";
import { createMatch, deleteLastMatch, listPlayers } from "../lib/api";
import { usePlayers } from "../hooks/usePlayers";
import { useStandings } from "../hooks/useStandings"; // ← use hook directly

type Props = {
  leagueId: string | null;
  ownsSelected: boolean;
};

export default function ActionsCard({ leagueId, ownsSelected }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const { players, loading: loadingPlayers, setPlayers } = usePlayers(leagueId);
  const { refresh } = useStandings(leagueId); // ← get manual refresh

  async function handleSubmit(p1: string, p2: string, s1: number, s2: number) {
    if (!leagueId) return;
    try {
      setSubmitting(true);
      await createMatch(leagueId, { player1Name: p1, player2Name: p2, score1: s1, score2: s2 });
      // keep datalist fresh
      const pl = await listPlayers(leagueId);
      setPlayers(pl);
      // force standings reload
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUndo() {
    if (!leagueId) return;
    try {
      setUndoing(true);
      await deleteLastMatch(leagueId);
      const pl = await listPlayers(leagueId);
      setPlayers(pl);
      await refresh();
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)]">
      <h2 className="text-lg font-semibold">Actions</h2>
      <p className="mt-1 text-xs text-zinc-400">
        {ownsSelected ? "Log a new singles match for this league." : "Only the owner can log matches."}
      </p>
      <button
        onClick={() => setOpen(true)}
        disabled={!ownsSelected || !leagueId}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
      >
        Log a Match
      </button>

      <LogMatchModal
        open={open}
        onClose={() => setOpen(false)}
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
