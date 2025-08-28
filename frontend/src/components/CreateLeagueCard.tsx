import { useState } from "react";
import { signInWithRedirect } from "aws-amplify/auth";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { createLeague as apiCreateLeague, type League } from "../lib/api";

type Props = {
  onCreated?: (league: League) => void; // e.g., setSelectedLeagueId(league.leagueId)
};

export default function CreateLeagueCard({ onCreated }: Props) {
  const { signedIn } = useAuthEmail();

  const [newLeagueName, setNewLeagueName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [creating, setCreating] = useState(false);

  async function onCreateLeague() {
    if (!newLeagueName.trim()) return;
    if (!signedIn) {
      await signInWithRedirect();
      return;
    }
    try {
      setCreating(true);
      const created = await apiCreateLeague(newLeagueName.trim(), visibility);
      setNewLeagueName("");
      onCreated?.(created);
    } catch (e) {
      console.error(e);
      alert("Could not create league. Are you signed in?");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)] grid gap-3">
      <h2 className="text-lg font-semibold">Create a League</h2>
      {!signedIn && (
        <p className="text-xs text-zinc-400">
          You’re browsing as a guest — sign in to create a league.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">League name</label>
          <input
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            placeholder="e.g., Campus Doubles Ladder"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "public" | "private")}
            className="w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint/40"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        <button
          disabled={creating || !newLeagueName.trim()}
          onClick={onCreateLeague}
          className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
        >
          {creating ? "Creating…" : signedIn ? "Create League" : "Sign in to create"}
        </button>
      </div>
    </div>
  );
}
