import type { League } from "../lib/api";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  yourLeagues: League[];
  publicLeagues: League[];         // already filtered for duplicates (see TopActions)
  selectedLeagueId: string | null;
  onSelect: (leagueId: string) => void;
  publicIds: Set<string>;
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

  function handleChoose(id: string) {
    onSelect(id);
    onClose();
  }

  function Item({ league }: { league: League }) {
    const isSelected = selectedLeagueId === league.leagueId;
    const isPublic = publicIds.has(league.leagueId);

    return (
      <li>
        <div
          role="button"
          tabIndex={0}
          aria-selected={isSelected}
          onClick={() => handleChoose(league.leagueId)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleChoose(league.leagueId);
            }
          }}
          className={[
            "flex flex-col rounded-lg border px-3 py-2",
            "cursor-pointer select-none outline-none transition",
            "border-white/10 bg-black/30 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-mint/40",
            isSelected ? "ring-2 ring-mint/40" : "",
          ].join(" ")}
        >
          <div className="truncate font-medium">{league.name}</div>
          <div className="text-xs text-zinc-400">
            {isPublic ? "Public" : "Private"}
          </div>
        </div>
      </li>
    );
  }

  function List({ title, leagues }: { title: string; leagues: League[] }) {
    return (
      <div>
        <h4 className="mb-2 text-sm font-semibold text-zinc-300">{title}</h4>
        {leagues.length === 0 ? (
          <p className="text-xs text-zinc-500">No leagues.</p>
        ) : (
          <ul className="grid gap-2">
            {leagues.map((l) => (
              <Item key={l.leagueId} league={l} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      {/* Centering layer */}
      <div className="absolute inset-0 z-[110] grid place-items-center p-4 pointer-events-none">
        {/* Panel */}
        <div
          className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
          role="dialog"
          aria-modal="true"
          aria-label="Choose League"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-start justify-between">
            <h3 className="text-lg font-semibold">Choose League to View</h3>
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