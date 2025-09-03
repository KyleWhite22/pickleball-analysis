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

            {/* --- Bold White Line Pickleball Court (mobile-crisp) --- */}
            <div className="mx-auto w-full max-w-xl">
              {/* Court: outer container keeps your rounded border */}
<div className="relative aspect-[20/9] rounded bg-black/0 border-4 border-zinc-400 overflow-hidden">
                {/* 1) LINES: span the full court */}

                {/* 1) LINES: kitchens + segmented horizontal line at mid-court */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
      /* vertical kitchen @42% */
      linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.6)),
      /* vertical kitchen @58% */
      linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.6)),
      /* horizontal service line LEFT (0% → 42%) */
      linear-gradient(to right, rgba(255,255,255,0.6), rgba(255,255,255,0.6)),
      /* horizontal service line RIGHT (58% → 100%) */
      linear-gradient(to right, rgba(255,255,255,0.6), rgba(255,255,255,0.6)),
      /* vertical dotted net @50% */
      repeating-linear-gradient(
        to bottom,
        rgba(255,255,255,0.6) 0 6px,
        transparent 6px 12px
      )
    `,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `
      4px 100%,   /* kitchen 42% full height */
      4px 100%,   /* kitchen 58% full height */
      42% 4px,    /* service line left */
      42% 4px,    /* service line right */
      4px 100%    /* dotted net full height */
    `,
                    backgroundPosition: `
      42% 0,      /* kitchen left */
      58% 0,      /* kitchen right */
      left 50%,   /* service line left at 50% y */
      right 50%,  /* service line right at 50% y */
      50% 0       /* dotted net centered vertically */
    `,
                    transform: 'translateZ(0)',
                  }}
                />

                {/* 2) INPUTS OVERLAY: padded, so lines still run edge-to-edge */}
                <div className="absolute inset-0 p-4">
                  {/* Left–Top (Team A — P1): 0%→42% x, 0%→50% y */}
                  <div className="absolute flex items-center justify-center"
                    style={{ left: '0%', right: '58%', top: '0%', bottom: '50%' }}>
                    <input
                      ref={firstInputRef}
                      list={datalistId}
                      value={a1}
                      onChange={(e) => setA1(e.target.value)}
                      placeholder="Team A — P1"
                      className="w-11/12 max-w-[14rem] rounded bg-black/50 px-3 py-1.5 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
                    />
                  </div>

                  {/* Left–Bottom (Team A — P2): 0%→42% x, 50%→100% y */}
                  <div className="absolute flex items-center justify-center"
                    style={{ left: '0%', right: '58%', top: '50%', bottom: '0%' }}>
                    <input
                      list={datalistId}
                      value={a2}
                      onChange={(e) => setA2(e.target.value)}
                      placeholder="Team A — P2"
                      className="w-11/12 max-w-[14rem] rounded bg-black/50 px-3 py-1.5 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
                    />
                  </div>

                  {/* Right–Top (Team B — P1): 58%→100% x, 0%→50% y */}
                  <div className="absolute flex items-center justify-center"
                    style={{ left: '58%', right: '0%', top: '0%', bottom: '50%' }}>
                    <input
                      list={datalistId}
                      value={b1}
                      onChange={(e) => setB1(e.target.value)}
                      placeholder="Team B — P1"
                      className="w-11/12 max-w-[14rem] rounded bg-black/50 px-3 py-1.5 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
                    />
                  </div>

                  {/* Right–Bottom (Team B — P2): 58%→100% x, 50%→100% y */}
                  <div className="absolute flex items-center justify-center"
                    style={{ left: '58%', right: '0%', top: '50%', bottom: '0%' }}>
                    <input
                      list={datalistId}
                      value={b2}
                      onChange={(e) => setB2(e.target.value)}
                      placeholder="Team B — P2"
                      className="w-11/12 max-w-[14rem] rounded bg-black/50 px-3 py-1.5 text-sm text-center text-white outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-mint/40"
                    />
                  </div>
                </div>
              </div>


              {/* SCORE — below the court (white boxes) */}
             
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
