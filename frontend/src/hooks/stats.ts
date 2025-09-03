// src/hooks/stats.ts  (or src/utils/stats.ts)
import type { MatchDTO } from "../lib/api"; // <-- adjust the relative path if needed

export type PartnerStats = {
  partnerId: string;
  partnerName: string;
  games: number;
  wins: number;
};

export type BestPartner = {
  partnerId: string;
  partnerName: string;
  games: number;
  wins: number;
  winPct: number; // 0..1
};

export type BestPartnersMap = Record<string, BestPartner | null>;

/**
 * Compute each player's best partner (highest win%) from a list of matches.
 * Assumes doubles (2 players per team) but safely guards if data is odd.
 */
export function computeBestPartners(matches: MatchDTO[]): BestPartnersMap {
  const map: Record<string, Record<string, PartnerStats>> = {};

  for (const match of matches) {
    match.teams.forEach((team, teamIdx) => {
      const won = match.winnerTeam === teamIdx;
      const players = team?.players ?? [];

      // We expect 2 players, but guard just in case
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const partner = players[1 - i];

        if (!player || !partner) continue; // skip if malformed

        if (!map[player.id]) map[player.id] = {};
        if (!map[player.id][partner.id]) {
          map[player.id][partner.id] = {
            partnerId: partner.id,
            partnerName: partner.name,
            games: 0,
            wins: 0,
          };
        }

        const entry = map[player.id][partner.id];
        entry.games += 1;
        if (won) entry.wins += 1;
      }
    });
  }

  // choose best partner (highest win%) per player
  const best: BestPartnersMap = {};

  for (const playerId in map) {
    let bestEntry: PartnerStats | null = null;

    for (const partnerId in map[playerId]) {
      const entry = map[playerId][partnerId];
      const pct = entry.games > 0 ? entry.wins / entry.games : 0;

      if (
        !bestEntry ||
        pct > (bestEntry.games > 0 ? bestEntry.wins / bestEntry.games : 0)
      ) {
        bestEntry = entry;
      }
    }

    best[playerId] = bestEntry
      ? {
          partnerId: bestEntry.partnerId,
          partnerName: bestEntry.partnerName,
          games: bestEntry.games,
          wins: bestEntry.wins,
          winPct: bestEntry.games > 0 ? bestEntry.wins / bestEntry.games : 0,
        }
      : null;
  }

  return best;
}
