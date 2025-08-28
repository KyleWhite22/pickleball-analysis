import { useEffect, useRef, useState } from "react";
import type { Player } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;

  // ownership + actions
  ownsSelected: boolean;
  onSubmit: (p1: string, p2: string, s1: number, s2: number) => Promise<void>;
  onUndo?: () => Promise<void>;

  // data for helpers
  players: Player[];
  loadingPlayers: boolean;

  // ui state
  submitting?: boolean;
  undoing?: boolean;
};

export default function LogMatchModal({
  open,
  onClose,
  ownsSelected,
  onSubmit,
  onUndo,
  players,
  loadingPlayers,
  submitting,
  undoing,
}: Props) {
  const [a1, setA1] = useState("");
  const [b1, setB1] = useState("");
  const [sa, setSa] = useState<number | "">("");
  const [sb, setSb] = useState<number | "">("");

  // close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // focus first input when opened
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (open) setTimeout(() => firstInputRef.current?.focus(), 0);
  }, [open]);

  // datalist for quick pick
  const datalistId = "league-players";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownsSelected) return;
    const p1 = a1.trim();
    const p2 = b1.trim();
    if (!p1 || !p2) return;
    await onSubmit(p1, p2, Number(sa || 0), Number(sb || 0));
    // keep names for quick consecutive entry, clear scores
    setSa("");
    setSb("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Log Match (Singles)</h3>
              {!ownsSelected && (
                <p className="mt-1 text-xs text-zinc-400">
                  Viewing a public league — only the owner can log matches.
                </p>
              )}
              {loadingPlayers && (
                <p className="mt-1 text-xs text-zinc-400">Loading players…</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-zinc-300 hover:bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* datalist */}
          <datalist id={datalistId}>
            {players.map((p) => (
              <option key={p.playerId} value={p.name} />
            ))}
          </datalist>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                ref={firstInputRef}
                list={datalistId}
                value={a1}
                onChange={(e) => setA1(e.target.value)}
                placeholder="Player A"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
              <input
                list={datalistId}
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                placeholder="Player B"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
            </div>

            <div className="flex gap-3">
              <input
                type="number"
                value={sa}
                onChange={(e) =>
                  setSa(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Score A"
                className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
              <input
                type="number"
                value={sb}
                onChange={(e) =>
                  setSb(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Score B"
                className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={!ownsSelected || submitting}
                className="inline-flex items-center justify-center rounded-lg bg-skyish px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Submit Match"}
              </button>

              {onUndo && (
                <button
                  type="button"
                  disabled={!ownsSelected || undoing}
                  onClick={onUndo}
                  className="inline-flex items-center justify-center rounded-lg bg-rose-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                >
                  {undoing ? "Undoing…" : "Undo last match"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
