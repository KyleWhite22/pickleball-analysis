import type { League } from "../lib/api";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  yourLeagues: League[];
  publicLeagues: League[];           // already filtered for duplicates (see TopActions)
  selectedLeagueId: string | null;
  onSelect: (leagueId: string) => void;
  publicIds: Set<string>;            // 👈 NEW: set of all public league IDs (including ones you own)
};

export default function LeagueChooserModal({
  open,
  onClose,
  yourLeagues,
  publicLeagues,
  selectedLeagueId,
  onSelect,
  publicIds,
}: Props) {
  if (!open) return null;

  function List({ title, leagues }: { title: string; leagues: League[] }) {
    return (
      <div>
        <h4 className="mb-2 text-sm font-semibold text-zinc-300">{title}</h4>
        <ul className="grid gap-2">
          {leagues.length === 0 && (
            <li className="text-xs text-zinc-500">No leagues.</li>
          )}
          {leagues.map((l) => {
            const isPublic = publicIds.has(l.leagueId); // 👈 visibility derived from publicIds
            return (
              <li
                key={l.leagueId}
                className={[
                  "flex items-center justify-between rounded-lg border px-3 py-2",
                  "border-white/10 bg-black/30",
                  selectedLeagueId === l.leagueId ? "ring-2 ring-mint/40" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.name}</div>
                  <div className="text-xs text-zinc-400">
                    {isPublic ? "Public" : "Private"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelect(l.leagueId);
                    onClose();
                  }}
                  className="ml-3 rounded-md bg-mint px-3 py-1.5 text-sm font-semibold text-black hover:brightness-95"
                >
                  Choose
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (!open) return null;

return createPortal(
  <div className="fixed inset-0 z-[9999]">
    {/* Backdrop UNDER the dialog; gets clicks to close */}
    <div
      className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    />

    {/* Centering layer ABOVE backdrop; never eats clicks */}
    <div className="absolute inset-0 z-[110] grid place-items-center p-4 pointer-events-none">
      {/* Panel gets the clicks */}
      <div
        className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
        role="dialog"
        aria-modal="true"
        aria-label="Choose League"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold">Choose League</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-300 hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <List title="Your Leagues" leagues={yourLeagues} />
          <List title="Public Leagues" leagues={publicLeagues} />
        </div>
      </div>
    </div>
  </div>,
  document.body
);
}
