// src/hooks/stats.ts  (or src/utils/stats.ts)
import type { MatchDTO } from "../lib/api";

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

export type EloOptions = {
  k?: number;       // sensitivity (typical 16–40)
  init?: number;    // starting rating
};

const DEFAULT_ELO = { k: 24, init: 1000 };

function expectedScore(rA: number, rB: number) {
  // classic Elo expectation
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

/**
 * Computes per-player Elo ratings from a list of DOUBLES matches.
 * - Team rating = average of its two players' current ratings.
 * - Win = 1, Loss = 0, Tie/unknown winnerTeam = 0.5 each.
 * - Matches processed oldest → newest (by createdAt).
 */
export function computeElo(
  matches: MatchDTO[],
  opts: EloOptions = {}
): Record<string, number> {
  const { k, init } = { ...DEFAULT_ELO, ...opts };
  const rating: Record<string, number> = {};

  // sort by time so rating evolves correctly
  const sorted = [...matches].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const m of sorted) {
    const [t1, t2] = m.teams;

    // players (guard against malformed data)
    const p1a = t1?.players?.[0]?.id, p1b = t1?.players?.[1]?.id;
    const p2a = t2?.players?.[0]?.id, p2b = t2?.players?.[1]?.id;
    if (!p1a || !p1b || !p2a || !p2b) continue;

    // ensure initial ratings
    for (const pid of [p1a, p1b, p2a, p2b]) {
      if (rating[pid] == null) rating[pid] = init;
    }

    // team ratings = average of current player ratings
    const rT1 = (rating[p1a] + rating[p1b]) / 2;
    const rT2 = (rating[p2a] + rating[p2b]) / 2;

    const exp1 = expectedScore(rT1, rT2);
    const exp2 = 1 - exp1;

    // outcome
    let s1 = 0.5, s2 = 0.5; // default tie/unknown
    if (m.winnerTeam === 0) { s1 = 1; s2 = 0; }
    if (m.winnerTeam === 1) { s1 = 0; s2 = 1; }

    // team deltas
    const d1 = k * (s1 - exp1);
    const d2 = k * (s2 - exp2);

    // split the team delta equally to both players
    rating[p1a] += d1 / 2;
    rating[p1b] += d1 / 2;
    rating[p2a] += d2 / 2;
    rating[p2b] += d2 / 2;
  }

  return rating;
}
