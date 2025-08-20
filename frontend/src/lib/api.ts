const BASE = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, ""); // strip trailing slashes

// ---------- Types ----------
export type League = {
  leagueId: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
};

export type MatchPlayer = { id: string; name: string; points: number };
export type Match = {
  matchId: string;
  leagueId: string;
  players: [MatchPlayer, MatchPlayer];
  winnerId: string | null;
  createdBy: string;
  createdAt: string;
};

export type Standing = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  winPct: number;        // 0..1
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  streak: number;        // positive = W streak, negative = L streak
  games: number;
};

export type Player = { playerId: string; name: string };

// ---------- Helpers ----------
function buildHeaders(token?: string, contentType?: string): HeadersInit {
  const h: Record<string, string> = {};
  if (token) h.Authorization = token;
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Leagues ----------
/** GET /leagues?ownerId=... → { ownerId, leagues: League[] } */
export async function listLeagues(ownerId: string, token?: string): Promise<League[]> {
  const url = `${BASE}/leagues?ownerId=${encodeURIComponent(ownerId)}`;
  const res = await fetch(url, { headers: buildHeaders(token) });
  const data = await asJson<{ ownerId: string; leagues: League[] }>(res);
  return Array.isArray(data.leagues) ? data.leagues : [];
}

/** POST /leagues → League (returns leagueId, inviteCode, etc.) */
export async function createLeague(name: string, ownerId: string, token?: string): Promise<League> {
  const res = await fetch(`${BASE}/leagues`, {
    method: "POST",
    headers: buildHeaders(token, "application/json"),
    body: JSON.stringify({ name, ownerId }), // ownerId optional later when auth is wired
  });
  return asJson<League>(res);
}

/** POST /join/{code} → { joined: true, leagueId, userId } */
export async function joinByCode(code: string, userId: string, token?: string) {
  const res = await fetch(`${BASE}/join/${encodeURIComponent(code)}`, {
    method: "POST",
    headers: buildHeaders(token, "application/json"),
    body: JSON.stringify({ userId }),
  });
  return asJson<{ joined: boolean; leagueId: string; userId: string }>(res);
}

// ---------- Matches ----------
/** POST /leagues/{id}/matches with names */
export async function createMatch(
  leagueId: string,
  args: { player1Name: string; player2Name: string; score1: number; score2: number; createdBy?: string },
  token?: string
) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches`, {
    method: "POST",
    headers: buildHeaders(token, "application/json"),
    body: JSON.stringify(args),
  });
  return asJson<{ ok: true; matchId: string; leagueId: string; players: MatchPlayer[]; winnerId: string | null }>(res);
}

/** GET /leagues/{id}/matches → { leagueId, matches: Match[] } */
export async function listMatches(leagueId: string, token?: string): Promise<Match[]> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches`, {
    headers: buildHeaders(token),
  });
  const data = await asJson<{ leagueId: string; matches: Match[] }>(res);
  return Array.isArray(data.matches) ? data.matches : [];
}

// ---------- Standings ----------
/** GET /leagues/{id}/standings → { leagueId, standings: Standing[], totalMatches: number } */
export async function getStandings(leagueId: string, token?: string): Promise<Standing[]> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/standings`, {
    headers: buildHeaders(token),
  });
  const data = await asJson<{ leagueId: string; standings: Standing[]; totalMatches: number }>(res);
  return Array.isArray(data.standings) ? data.standings : [];
}

// ---------- (Optional) Metrics ----------
// You have a route stubbed (`GET /leagues/{id}/metrics`) but not implemented yet.
// Keep the call here if your UI uses it; otherwise remove or TODO it.
export async function getMetrics(leagueId: string, token?: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/metrics`, {
    headers: buildHeaders(token),
  });
  return asJson<any>(res);
}

export async function listPlayers(leagueId: string, token?: string): Promise<Player[]> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/players`, {
    headers: buildHeaders(token),
  });
  const data = await asJson<{ leagueId: string; players: Player[] }>(res);
  return Array.isArray(data.players) ? data.players : [];
}

export async function deleteLastMatch(leagueId: string, requesterId?: string, token?: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches/last`, {
    method: "DELETE",
    headers: buildHeaders(token, "application/json"),
    body: JSON.stringify({ requesterId }), // optional
  });
  return asJson<{ ok: boolean; deletedMatchId: string; leagueId: string }>(res);
}
export async function getLeague(id: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(id)}`, { headers: buildHeaders() });
  return asJson<{ leagueId: string; name: string; ownerId: string; inviteCode: string; createdAt: string }>(res);
}

export async function renameLeague(id: string, name: string, requesterId?: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: buildHeaders(undefined, "application/json"),
    body: JSON.stringify({ name, requesterId }),
  });
  return asJson<{ leagueId: string; name: string; ownerId: string; inviteCode: string; createdAt: string }>(res);
}

export async function rotateInvite(id: string, requesterId?: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(id)}/invite:rotate`, {
    method: "POST",
    headers: buildHeaders(undefined, "application/json"),
    body: JSON.stringify({ requesterId }),
  });
  return asJson<{ leagueId: string; inviteCode: string; rotatedAt: string }>(res);
}