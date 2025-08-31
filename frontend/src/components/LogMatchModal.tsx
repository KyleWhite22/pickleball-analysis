// src/components/LogMatchModal.tsx
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Player } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  ownsSelected: boolean;
  players: Player[];
  loadingPlayers: boolean;
  submitting: boolean;
  undoing: boolean;
  onSubmit: (
    a1: string,
    a2: string,
    b1: string,
    b2: string,
    s1: number,
    s2: number
  ) => Promise<void> | void;
  onUndo?: () => Promise<void> | void;
};

export default function LogMatchModal({
  open,
  onClose,
  ownsSelected,
  players,
  loadingPlayers,
  submitting,
  undoing,
  onSubmit,
  onUndo,
}: Props) {
  const datalistId = useId();
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [sa, setSa] = useState<number | "">("");
  const [sb, setSb] = useState<number | "">("");

  useEffect(() => {
    if (open) {
      setA1(""); setA2(""); setB1(""); setB2(""); setSa(""); setSb("");
      // focus first input next tick
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const names = [a1.trim(), a2.trim(), b1.trim(), b2.trim()].filter(Boolean);
  const unique = new Set(names);
  const valid =
    ownsSelected &&
    names.length === 4 &&
    unique.size === 4 &&
    sa !== "" &&
    sb !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    await onSubmit(a1.trim(), a2.trim(), b1.trim(), b2.trim(), Number(sa), Number(sb));
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      {/* Dialog container */}
      <div className="absolute inset-0 z-[110] grid place-items-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
          role="dialog"
          aria-modal="true"
          aria-label="Log Match (Doubles)"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Log Match (Doubles)</h3>
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

          {/* Datalist used by all four inputs */}
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
                placeholder="Team A — Player 1"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
              <input
                list={datalistId}
                value={a2}
                onChange={(e) => setA2(e.target.value)}
                placeholder="Team A — Player 2"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                list={datalistId}
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                placeholder="Team B — Player 1"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
              <input
                list={datalistId}
                value={b2}
                onChange={(e) => setB2(e.target.value)}
                placeholder="Team B — Player 2"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
            </div>

            <div className="flex gap-3">
              <input
                type="number"
                value={sa}
                onChange={(e) => setSa(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Score A"
                className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
              <input
                type="number"
                value={sb}
                onChange={(e) => setSb(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Score B"
                className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-mint/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={!valid || submitting}
                className="inline-flex items-center justify-center rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Submit Match"}
              </button>

              {onUndo && (
                <button
                  type="button"
                  disabled={undoing}
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
    </div>,
    document.body
  );
}
