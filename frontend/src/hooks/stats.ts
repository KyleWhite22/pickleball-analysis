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
// --- Grading helpers ---------------------------------------------------------

export type GradeLetter = "S" | "A" | "B" | "C" | "D" | "F";

/** Map percentile (0..100) to letter grade. */
export function gradeFromPercentile(p: number): GradeLetter {
  if (p >= 90) return "S";
  if (p >= 75) return "A";
  if (p >= 60) return "B";
  if (p >= 40) return "C";
  if (p >= 20) return "D";
  return "F";
}

/** Safe z-score (if stdev=0, return 0). */
function z(x: number, mean: number, sd: number) {
  return sd > 0 ? (x - mean) / sd : 0;
}

export type StandLike = {
  playerId: string;
  winPct: number;     // 0..1
  pointsFor: number;
  pointsAgainst: number;
  wins: number;
  losses: number;
};

export type EloMap = Record<string, number>;

/**
 * Compute a composite score per player (z-scored components):
 *   - Win% (weight 0.6)
 *   - Point Diff per Game (weight 0.25)
 *   - Elo (weight 0.15) - optional
 *
 * Returns { playerId: compositeScore }
 */
export function computeCompositeScores(
  standings: StandLike[],
  elo: EloMap = {}
): Record<string, number> {
  const n = standings.length;
  if (!n) return {};

  const games = (s: StandLike) => s.wins + s.losses || 1;
  const diffPerGame = (s: StandLike) => (s.pointsFor - s.pointsAgainst) / games(s);

  const winPcts = standings.map(s => s.winPct);
  const diffs   = standings.map(s => diffPerGame(s));
  const elosArr = standings.map(s => (elo[s.playerId] ?? 1000));

  const mean = (arr: number[]) => arr.reduce((a,b)=>a+b,0) / arr.length;
  const sd   = (arr: number[], m: number) => Math.sqrt(arr.reduce((a,b)=>a + (b-m)*(b-m),0) / arr.length);

  const mWP = mean(winPcts), sWP = sd(winPcts, mWP);
  const mDF = mean(diffs),   sDF = sd(diffs,   mDF);
  const mE  = mean(elosArr), sE  = sd(elosArr, mE);

  const weights = { wp: 0.60, df: 0.25, e: 0.15 };

  const out: Record<string, number> = {};
  for (const s of standings) {
    const zWP = z(s.winPct, mWP, sWP);
    const zDF = z(diffPerGame(s), mDF, sDF);
    const zE  = z(elo[s.playerId] ?? 1000, mE, sE);
    out[s.playerId] = weights.wp * zWP + weights.df * zDF + weights.e * zE;
  }
  return out;
}

/**
 * Turn composite scores into percentile → letter grade.
 * Returns { playerId: { percentile: 0..100, grade: "S"|"A"|... } }
 */
export function computeGrades(
  composite: Record<string, number>
): Record<string, { percentile: number; grade: GradeLetter }> {
  const entries = Object.entries(composite);
  if (!entries.length) return {};

  const sorted = [...entries].sort((a,b) => a[1] - b[1]); // low → high
  const out: Record<string, { percentile: number; grade: GradeLetter }> = {};

  sorted.forEach(([pid], i) => {
    const pct = (i / (sorted.length - 1 || 1)) * 100; // 0..100
    const grade = gradeFromPercentile(pct);
    out[pid] = { percentile: Math.round(pct), grade };
  });

  return out;
}
export type Superlatives = {
  mostClutch?: { playerId: string; name: string; avgWinMargin: number };
  mostHeatedRivalry?: {
    aId: string; aName: string;
    bId: string; bName: string;
    winsA: number; winsB: number; total: number;
  };
  longestWinStreak?: { playerId: string; name: string; streak: number };
  upsetKing?: { playerId: string; name: string; upsets: number };
  dominator?: { playerId: string; name: string; avgMargin: number };
  ironman?: { playerId: string; name: string; matches: number };
  partnerHopper?: { playerId: string; name: string; partners: number };
  mostConsistent?: { playerId: string; name: string; stdDev: number };

  // NEW: who has been #1 most often across snapshots
  kingOfTheCourt?: { playerId: string; name: string; matchesAtFirst: number };
};
export function computeSuperlatives(matches: MatchDTO[]): Superlatives {
  // guard + chronological
  const ms = [...matches].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
  if (!ms.length) return {};

  // id->name map
  const nameOf: Record<string,string> = {};
  for (const m of ms) {
    for (const t of m.teams) for (const p of (t.players||[])) nameOf[p.id] = p.name || p.id;
  }

  // per-player aggregates
  type Agg = {
    wins: number;
    losses: number;
    winMargins: number[];          // only winning margins
    pointDiffs: number[];          // all matches (+/-)
    matches: number;
    partners: Set<string>;
    curStreak: number;
    bestStreak: number;
    upsets: number;                // wins vs higher elo team (>=100)
    elo?: number;                  // current running elo
  };
  const agg: Record<string, Agg> = {};
  const ensure = (id: string) => (agg[id] ??= {
    wins:0, losses:0, winMargins:[], pointDiffs:[], matches:0, partners:new Set(), curStreak:0, bestStreak:0, upsets:0, elo:1000
  });

  // KOTC: counts of how many snapshots at #1 for each player
  const firstCounts: Record<string, number> = {};
  const countTiesAsFirst = true; // give credit to all co-leaders

  // same ordering as your leaderboard default
  const compareRows = (a: { wins:number; winPct:number; pointDiff:number; name:string }, b: typeof a) =>
    b.wins - a.wins ||
    b.winPct - a.winPct ||
    b.pointDiff - a.pointDiff ||
    a.name.localeCompare(b.name);

  // simple Elo (same as in your file): team rating = avg of players
  const K = 24;
  const exp = (ra:number, rb:number) => 1/(1+Math.pow(10,(rb-ra)/400));

  // head-to-head pair tracker (sorted key: id1|id2)
  type H2H = { a: string; b: string; winsA: number; winsB: number; total: number };
  const h2h: Record<string,H2H> = {};

  for (const m of ms) {
    const [t1,t2] = m.teams;
    const A = t1?.players?.map(p=>p.id) ?? [];
    const B = t2?.players?.map(p=>p.id) ?? [];
    if (A.length!==2 || B.length!==2) continue;

    // init players
    A.concat(B).forEach(ensure);

    // partners sets
    ensure(A[0]).partners.add(A[1]); ensure(A[1]).partners.add(A[0]);
    ensure(B[0]).partners.add(B[1]); ensure(B[1]).partners.add(B[0]);

    // score / margin from team1 POV
    const s1 = m.score.team1|0, s2 = m.score.team2|0;

    // running Elo before update (for upset detection)
    const rA = (ensure(A[0]).elo! + ensure(A[1]).elo!) / 2;
    const rB = (ensure(B[0]).elo! + ensure(B[1]).elo!) / 2;

    // result
    let sTeam1 = 0.5, sTeam2 = 0.5;
    if (m.winnerTeam === 0) { sTeam1 = 1; sTeam2 = 0; }
    if (m.winnerTeam === 1) { sTeam1 = 0; sTeam2 = 1; }

    // update aggregates (wins/losses, margins, streaks, pointDiffs, upset)
    const applyResult = (ids: string[], won: boolean, pdiff: number, oppTeamAvgElo: number, myTeamAvgElo: number) => {
      for (const id of ids) {
        const a = ensure(id);
        a.matches++;
        a.pointDiffs.push(pdiff);
        if (won) {
          a.wins++;
          a.winMargins.push(Math.abs(pdiff));
          a.curStreak = Math.max(1, a.curStreak+1);
          a.bestStreak = Math.max(a.bestStreak, a.curStreak);
          if (oppTeamAvgElo - myTeamAvgElo >= 100) a.upsets++;
        } else {
          a.losses++;
          a.curStreak = 0;
        }
      }
    };

    applyResult(A, sTeam1 === 1, s1 - s2, rB, rA);
    applyResult(B, sTeam2 === 1, s2 - s1, rA, rB);

    // head-to-head: award wins to individuals vs each opponent pair
    const credit = (winners: string[], losers: string[], wTeam: 0|1|2) => {
      for (const a of winners) for (const b of losers) {
        const [id1,id2] = [a,b].sort();
        const key = `${id1}|${id2}`;
        if (!h2h[key]) h2h[key] = { a: id1, b: id2, winsA: 0, winsB: 0, total: 0 };
        if (wTeam === 1) {
          if (a === id1) h2h[key].winsA++; else h2h[key].winsB++;
        } else if (wTeam === 2) {
          if (a === id1) h2h[key].winsA++; else h2h[key].winsB++;
        }
        h2h[key].total++;
      }
    };
    if (sTeam1 === 1) credit(A,B,1); else if (sTeam2 === 1) credit(B,A,2); else credit(A,B,1);

    // Elo update
    const e1 = exp(rA, rB);
    const e2 = 1 - e1;
    const d1 = K * (sTeam1 - e1);
    const d2 = K * (sTeam2 - e2);
    agg[A[0]].elo! += d1/2; agg[A[1]].elo! += d1/2;
    agg[B[0]].elo! += d2/2; agg[B[1]].elo! += d2/2;

    // KOTC: snapshot table after this match and credit leaders
    const table = Object.entries(agg).map(([id, a]) => {
      const games = a.wins + a.losses || 1;
      return {
        id,
        name: nameOf[id] || id,
        wins: a.wins,
        winPct: a.wins / games,
        pointDiff: a.pointDiffs.reduce((s,x)=>s+x,0), // PF-PA summed each match
      };
    }).sort(compareRows);

    if (table.length) {
      const first = table[0];
      if (countTiesAsFirst) {
        const leaders = table.filter(r => compareRows(r, first) === 0);
        leaders.forEach(r => { firstCounts[r.id] = (firstCounts[r.id] ?? 0) + 1; });
      } else {
        firstCounts[first.id] = (firstCounts[first.id] ?? 0) + 1;
      }
    }
  }

  // helpers
  const avg = (xs:number[]) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
  const stdev = (xs:number[]) => {
    if (xs.length < 2) return Infinity;
    const m = avg(xs);
    const v = avg(xs.map(x => (x-m)*(x-m)));
    return Math.sqrt(v);
  };

  // compute winners
  let mostClutch, dominator, ironman, partnerHopper, mostConsistent, longestWinStreak, upsetKing;

  for (const id in agg) {
    const a = agg[id];
    const nm = nameOf[id] || id;

    if (a.winMargins.length) {
      const m = avg(a.winMargins);
      if (!mostClutch || m < mostClutch.avgWinMargin) {
        mostClutch = { playerId:id, name:nm, avgWinMargin:m };
      }
      if (!dominator || m > dominator.avgMargin) {
        dominator = { playerId:id, name:nm, avgMargin:m };
      }
    }

    if (!ironman || a.matches > ironman.matches) {
      ironman = { playerId:id, name:nm, matches:a.matches };
    }

    if (!partnerHopper || a.partners.size > partnerHopper.partners) {
      partnerHopper = { playerId:id, name:nm, partners:a.partners.size };
    }

    const sd = stdev(a.pointDiffs);
    if (!mostConsistent || sd < mostConsistent.stdDev) {
      mostConsistent = { playerId:id, name:nm, stdDev:sd };
    }

    if (!longestWinStreak || a.bestStreak > longestWinStreak.streak) {
      longestWinStreak = { playerId:id, name:nm, streak:a.bestStreak };
    }

    if (!upsetKing || a.upsets > upsetKing.upsets) {
      upsetKing = { playerId:id, name:nm, upsets:a.upsets };
    }
  }

  // Heated rivalry: closest record among pairs with decent volume
  let mostHeatedRivalry: Superlatives["mostHeatedRivalry"];
  for (const key in h2h) {
    const r = h2h[key];
    if (r.total < 6) continue;
    const diff = Math.abs(r.winsA - r.winsB);
    const closeness = diff / r.total; // lower is better
    if (
      !mostHeatedRivalry ||
      closeness < Math.abs(mostHeatedRivalry.winsA - mostHeatedRivalry.winsB) / mostHeatedRivalry.total ||
      (closeness === Math.abs(mostHeatedRivalry.winsA - mostHeatedRivalry.winsB) / mostHeatedRivalry.total && r.total > mostHeatedRivalry.total)
    ) {
      mostHeatedRivalry = {
        aId: r.a, aName: nameOf[r.a] || r.a,
        bId: r.b, bName: nameOf[r.b] || r.b,
        winsA: r.winsA, winsB: r.winsB, total: r.total
      };
    }
  }

  // KOTC: choose the king (break ties by final table)
  let kingOfTheCourt: Superlatives["kingOfTheCourt"];
  const fcEntries = Object.entries(firstCounts);
  if (fcEntries.length) {
    const max = Math.max(...fcEntries.map(([_, c]) => c));
    const tiedIds = fcEntries.filter(([_, c]) => c === max).map(([id]) => id);

    if (tiedIds.length === 1) {
      const id = tiedIds[0];
      kingOfTheCourt = { playerId: id, name: nameOf[id] || id, matchesAtFirst: firstCounts[id] };
    } else {
      // build final table to break ties deterministically
      const finalRows = Object.keys(agg).map(id => {
        const a = agg[id];
        const games = a.wins + a.losses || 1;
        return {
          id,
          name: nameOf[id] || id,
          wins: a.wins,
          winPct: a.wins / games,
          pointDiff: a.pointDiffs.reduce((s,x)=>s+x,0),
        };
      }).sort(compareRows);

      const winner = finalRows.find(r => tiedIds.includes(r.id))!;
      kingOfTheCourt = { playerId: winner.id, name: winner.name, matchesAtFirst: firstCounts[winner.id] };
    }
  }

  return {
    mostClutch,
    mostHeatedRivalry,
    longestWinStreak,
    upsetKing,
    dominator,
    ironman,
    partnerHopper,
    mostConsistent,
    kingOfTheCourt, // <-- included with the rest
  };
}
