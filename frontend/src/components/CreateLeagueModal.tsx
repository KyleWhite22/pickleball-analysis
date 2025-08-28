// src/components/CreateLeagueModal.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { signInWithRedirect } from "aws-amplify/auth";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { createLeague as apiCreateLeague, type League } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (league: League) => void;
};

export default function CreateLeagueModal({ open, onClose, onCreated }: Props) {
  const { signedIn } = useAuthEmail();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) return;
    if (!signedIn) {
      await signInWithRedirect();
      return;
    }
    try {
      setCreating(true);
      const created = await apiCreateLeague(name.trim(), visibility);
      setName("");
      onCreated(created);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Could not create league. Are you signed in?");
    } finally {
      setCreating(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 z-[110] grid place-items-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Create League"
        >
          <div className="mb-3 flex items-start justify-between">
            <h3 className="text-lg font-semibold">Create a League</h3>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-zinc-300 hover:bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {!signedIn && (
            <p className="mb-3 text-xs text-zinc-400">
              You’re browsing as a guest — sign in to create a league.
            </p>
          )}

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">League name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            <div className="pt-1">
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
              >
                {creating ? "Creating…" : signedIn ? "Create League" : "Sign in to create"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
