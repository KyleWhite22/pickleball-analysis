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
  {/* --- Bold White Line Pickleball Court --- */}
  <div className="mx-auto w-full max-w-xl">
    <div className="relative aspect-[20/9] rounded bg-black/0 border-4 border-white overflow-hidden">
      {/* Net (center line) */}
      <div className="absolute left-0 right-67 top-1/2 -translate-y-1/2 border-t-4 border-white" />
      <div className="absolute left-67 right-0 top-1/2 -translate-y-1/2 border-t-4 border-white" />

      {/* Kitchen lines (left/right of net) */}
      <div className="absolute left-[42%] top-0 bottom-0 border-r-4 border-white" />
      <div className="absolute left-[58%] top-0 bottom-0 border-l-4 border-white" />
      <div className="absolute left-[50%] top-0 bottom-0 border-l-4 border-white" />


      {/* Team A (left side) */}
      <div className="absolute left-4 right-[58%] top-4 bottom-4 flex flex-col gap-3">
        <input
          ref={firstInputRef}
          list={datalistId}
          value={a1}
          onChange={(e) => setA1(e.target.value)}
          placeholder="Team A — P1"
          className="flex-1 rounded bg-black/50 px-2 py-1 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
        />
        <input
          list={datalistId}
          value={a2}
          onChange={(e) => setA2(e.target.value)}
          placeholder="Team A — P2"
          className="flex-1 rounded bg-black/50 px-2 py-1 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
        />
      </div>

      {/* Team B (right side) */}
      <div className="absolute left-[58%] right-4 top-4 bottom-4 flex flex-col gap-3">
        <input
          list={datalistId}
          value={b1}
          onChange={(e) => setB1(e.target.value)}
          placeholder="Team B — P1"
          className="flex-1 rounded bg-black/50 px-2 py-1 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
        />
        <input
          list={datalistId}
          value={b2}
          onChange={(e) => setB2(e.target.value)}
          placeholder="Team B — P2"
          className="flex-1 rounded bg-black/50 px-2 py-1 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
        />
      </div>
    </div>

   
    {/* SCORE — below the court */}
    <div className="mt-3 flex justify-center items-center gap-2 bg-black/70 px-3 py-2 rounded">
      <input
        type="number"
        inputMode="numeric"
        value={sa}
        onChange={(e) => setSa(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="A"
        aria-label="Score A"
        className="w-12 rounded bg-black/90 text-center text-sm text-white outline-none focus:ring-2 focus:ring-mint/40"
      />
      <span className="text-white font-bold">–</span>
      <input
        type="number"
        inputMode="numeric"
        value={sb}
        onChange={(e) => setSb(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="B"
        aria-label="Score B"
        className="w-12 rounded bg-black/90 text-center text-sm text-white outline-none focus:ring-2 focus:ring-mint/40"
      />
    </div>
  </div>


  {/* Buttons below court */}
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
