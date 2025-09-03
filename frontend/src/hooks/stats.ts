// src/hooks/stats.ts
import type { MatchDTO } from "../lib/api";

/* ---------------------------- Best Partners (per player) ---------------------------- */

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
        if (!player || !partner) continue;

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
      const bestPct = bestEntry ? (bestEntry.games > 0 ? bestEntry.wins / bestEntry.games : 0) : -1;
      if (!bestEntry || pct > bestPct) bestEntry = entry;
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

/* ------------------------------------- Elo ------------------------------------- */

export type EloOptions = {
  k?: number;       // sensitivity (typical 16–40)
  init?: number;    // starting rating
};

const DEFAULT_ELO = { k: 24, init: 1000 };

function expectedScore(rA: number, rB: number) {
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

  const sorted = [...matches].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const m of sorted) {
    const [t1, t2] = m.teams;
    const p1a = t1?.players?.[0]?.id, p1b = t1?.players?.[1]?.id;
    const p2a = t2?.players?.[0]?.id, p2b = t2?.players?.[1]?.id;
    if (!p1a || !p1b || !p2a || !p2b) continue;

    for (const pid of [p1a, p1b, p2a, p2b]) {
      if (rating[pid] == null) rating[pid] = init;
    }

    const rT1 = (rating[p1a] + rating[p1b]) / 2;
    const rT2 = (rating[p2a] + rating[p2b]) / 2;

    const exp1 = expectedScore(rT1, rT2);
    const exp2 = 1 - exp1;

    let s1 = 0.5, s2 = 0.5;
    if (m.winnerTeam === 0) { s1 = 1; s2 = 0; }
    if (m.winnerTeam === 1) { s1 = 0; s2 = 1; }

    const d1 = k * (s1 - exp1);
    const d2 = k * (s2 - exp2);

    rating[p1a] += d1 / 2;
    rating[p1b] += d1 / 2;
    rating[p2a] += d2 / 2;
    rating[p2b] += d2 / 2;
  }

  return rating;
}

/* ------------------------------ Grading helpers ------------------------------ */

export type GradeLetter = "S" | "A" | "B" | "C" | "D" | "F";

export function gradeFromPercentile(p: number): GradeLetter {
  if (p >= 90) return "S";
  if (p >= 75) return "A";
  if (p >= 60) return "B";
  if (p >= 40) return "C";
  if (p >= 20) return "D";
  return "F";
}

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

export function computeGrades(
  composite: Record<string, number>
): Record<string, { percentile: number; grade: GradeLetter }> {
  const entries = Object.entries(composite);
  if (!entries.length) return {};

  const sorted = [...entries].sort((a,b) => a[1] - b[1]); // low → high
  const out: Record<string, { percentile: number; grade: GradeLetter }> = {};

  sorted.forEach(([pid], i) => {
    const pct = (i / (sorted.length - 1 || 1)) * 100;
    const grade = gradeFromPercentile(pct);
    out[pid] = { percentile: Math.round(pct), grade };
  });

  return out;
}

/* -------------------------------- Superlatives -------------------------------- */

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
  kingOfTheCourt?: { playerId: string; name: string; matchesAtFirst: number };

  // NEW
  highestDynamicDuo?: {
    aId: string; aName: string;
    bId: string; bName: string;
    wins: number;
    games: number;
    winPct: number; // 0..1
  };
};

export function computeSuperlatives(matches: MatchDTO[]): Superlatives {
  // guard + chronological
  const ms = [...matches].sort(
    (a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()
  );
  if (!ms.length) return {};

  // id->name
  const nameOf: Record<string,string> = {};
  for (const m of ms) {
    for (const t of m.teams) for (const p of (t.players||[])) {
      nameOf[p.id] = p.name || p.id;
    }
  }

  // per-player aggregates
  type Agg = {
    wins: number;
    losses: number;
    winMargins: number[];
    pointDiffs: number[];
    matches: number;
    partners: Set<string>;
    curStreak: number;
    bestStreak: number;
    upsets: number;
    elo: number;
  };
  const agg: Record<string, Agg> = {};
  const ensure = (id: string) => (agg[id] ??= {
    wins:0, losses:0, winMargins:[], pointDiffs:[], matches:0,
    partners:new Set(), curStreak:0, bestStreak:0, upsets:0, elo:1000
  });

  // KOTC
  const firstCounts: Record<string, number> = {};
  const countTiesAsFirst = true;

  // sort helper used for KOTC snapshots
  const compareRows = (
    a: { wins:number; winPct:number; pointDiff:number; name:string },
    b: { wins:number; winPct:number; pointDiff:number; name:string }
  ) =>
    b.wins - a.wins ||
    b.winPct - a.winPct ||
    b.pointDiff - a.pointDiff ||
    a.name.localeCompare(b.name);

  // Elo helpers
  const K = 24;
  const exp = (ra:number, rb:number) => 1/(1+Math.pow(10,(rb-ra)/400));

  // H2H (closest rivalry)
  type H2H = { a: string; b: string; winsA: number; winsB: number; total: number };
  const h2h: Record<string,H2H> = {};
  const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

  // Dynamic duo (same-team)
  type Duo = { a: string; b: string; wins: number; games: number };
  const duos: Record<string, Duo> = {};
  const duoKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const isNA = (id?: string) => !!id && id.startsWith("__NA");

  for (const m of ms) {
    const [t1,t2] = m.teams;
    const A = t1?.players?.map(p=>p.id) ?? [];
    const B = t2?.players?.map(p=>p.id) ?? [];
    if (A.length!==2 || B.length!==2) continue;

    // init players
    A.concat(B).forEach(ensure);

    // partners
    ensure(A[0]).partners.add(A[1]); ensure(A[1]).partners.add(A[0]);
    ensure(B[0]).partners.add(B[1]); ensure(B[1]).partners.add(B[0]);

    // scores, outcomes
    const s1 = (m.score.team1|0), s2 = (m.score.team2|0);
    const rA = (ensure(A[0]).elo + ensure(A[1]).elo) / 2;
    const rB = (ensure(B[0]).elo + ensure(B[1]).elo) / 2;
    const t1Won = m.winnerTeam === 0;
    const t2Won = m.winnerTeam === 1;

    // per-player accumulate
    const applyResult = (ids: string[], won: boolean, pdiff: number, oppTeamAvgElo: number, myTeamAvgElo: number) => {
      for (const id of ids) {
        const a = ensure(id);
        a.matches++;
        a.pointDiffs.push(pdiff);
        if (won) {
          a.wins++;
          a.winMargins.push(Math.abs(pdiff));
          a.curStreak = Math.max(1, a.curStreak + 1);
          a.bestStreak = Math.max(a.bestStreak, a.curStreak);
          if (oppTeamAvgElo - myTeamAvgElo >= 100) a.upsets++;
        } else {
          a.losses++;
          a.curStreak = 0;
        }
      }
    };

    applyResult(A, t1Won, s1 - s2, rB, rA);
    applyResult(B, t2Won, s2 - s1, rA, rB);

    // H2H (individual vs individual across teams)
    const credit = (winners: string[], losers: string[], winnerTeam: 1 | 2) => {
      for (const a of winners) for (const b of losers) {
        const key = pairKey(a, b);
        if (!h2h[key]) {
          const [id1, id2] = a < b ? [a, b] : [b, a];
          h2h[key] = { a: id1, b: id2, winsA: 0, winsB: 0, total: 0 };
        }
        const rec = h2h[key];
        if (winnerTeam === 1) {
          if (a === rec.a) rec.winsA++; else rec.winsB++;
        } else {
          if (a === rec.a) rec.winsA++; else rec.winsB++;
        }
        rec.total++;
      }
    };
    if (t1Won) credit(A, B, 1);
    else if (t2Won) credit(B, A, 2);
    else credit(A, B, 1); // tie → arbitrary

    // Dynamic Duo (same-team)
    const addDuo = (ids: string[], won: boolean) => {
      const [x, y] = ids;
      if (!x || !y || isNA(x) || isNA(y)) return;
      const key = duoKey(x, y);
      if (!duos[key]) {
        const [a, b] = x < y ? [x, y] : [y, x];
        duos[key] = { a, b, wins: 0, games: 0 };
      }
      duos[key].games += 1;
      if (won) duos[key].wins += 1;
    };
    addDuo(A, t1Won);
    addDuo(B, t2Won);

    // Elo update
    const e1 = exp(rA, rB), e2 = 1 - e1;
    const d1 = K * ((t1Won ? 1 : t2Won ? 0 : 0.5) - e1);
    const d2 = K * ((t2Won ? 1 : t1Won ? 0 : 0.5) - e2);
    agg[A[0]].elo += d1/2; agg[A[1]].elo += d1/2;
    agg[B[0]].elo += d2/2; agg[B[1]].elo += d2/2;

    // KOTC snapshot (after this match)
    const table = Object.entries(agg).map(([id, a]) => {
      const games = a.wins + a.losses || 1;
      return {
        id,
        name: nameOf[id] || id,
        wins: a.wins,
        winPct: a.wins / games,
        pointDiff: a.pointDiffs.reduce((s,x)=>s+x,0),
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

  // compute per-player winners
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
    const closeness = Math.abs(r.winsA - r.winsB) / r.total; // lower is better
    const current = mostHeatedRivalry
      ? Math.abs(mostHeatedRivalry.winsA - mostHeatedRivalry.winsB) / mostHeatedRivalry.total
      : Infinity;
    if (!mostHeatedRivalry || closeness < current || (closeness === current && r.total > mostHeatedRivalry.total)) {
      mostHeatedRivalry = {
        aId: r.a, aName: nameOf[r.a] || r.a,
        bId: r.b, bName: nameOf[r.b] || r.b,
        winsA: r.winsA, winsB: r.winsB, total: r.total
      };
    }
  }

  // KOTC winner
  let kingOfTheCourt: Superlatives["kingOfTheCourt"];
  const fcEntries = Object.entries(firstCounts);
  if (fcEntries.length) {
    const max = Math.max(...fcEntries.map(([, c]) => c));
    const tiedIds = fcEntries.filter(([, c]) => c === max).map(([id]) => id);

    if (tiedIds.length === 1) {
      const id = tiedIds[0];
      kingOfTheCourt = { playerId: id, name: nameOf[id] || id, matchesAtFirst: firstCounts[id] };
    } else {
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

  // Highest Dynamic Duo
  let highestDynamicDuo: Superlatives["highestDynamicDuo"];
  for (const key in duos) {
    const d = duos[key];
    const winPct = d.games > 0 ? d.wins / d.games : 0;
    const candidate = {
      aId: d.a, aName: nameOf[d.a] || d.a,
      bId: d.b, bName: nameOf[d.b] || d.b,
      wins: d.wins,
      games: d.games,
      winPct,
    };
    if (
      !highestDynamicDuo ||
      candidate.wins > highestDynamicDuo.wins ||
      (candidate.wins === highestDynamicDuo.wins && candidate.winPct > highestDynamicDuo.winPct) ||
      (candidate.wins === highestDynamicDuo.wins && candidate.winPct === highestDynamicDuo.winPct && candidate.games > highestDynamicDuo.games)
    ) {
      highestDynamicDuo = candidate;
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
    kingOfTheCourt,
    highestDynamicDuo,
  };
}
