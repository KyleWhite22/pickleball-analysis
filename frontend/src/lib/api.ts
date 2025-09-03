// src/lib/api.ts
import { getIdToken } from "./auth";
import type { MatchInputDoubles } from "../types/match";

// Base URL (ensure VITE_API_URL has no trailing slash)
const BASE = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

// ---------- Types ----------
export type League = {
  leagueId: string;
  name: string;
  ownerId?: string;
  createdAt?: string;
  visibility?: "public" | "private";
};

export type MatchPlayer = { id: string; name: string; points: number };

export type Match = {
  matchId: string;
  leagueId: string;
  players: MatchPlayer[]; // supports singles or doubles
  winnerId: string | null;
  createdBy: string;
  createdAt: string;
};

export type Standing = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  winPct: number; // 0..1
  pointsFor: number;
  pointsAgainst: number;
  pointDiff?: number;
  streak: number; // + = W streak, - = L streak
  games?: number;
};

export type Player = { playerId: string; name: string };

const nocache = () => `ts=${Date.now()}`;
const GET_INIT: RequestInit = { cache: "no-store" };

// ---------- Helpers ----------
async function buildHeaders(contentType?: string): Promise<HeadersInit> {
  const h: Record<string, string> = {};
  const tok = await getIdToken();
  if (tok) h.Authorization = `Bearer ${tok}`;
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch { }
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// tolerant helper: the endpoint might return an array directly or {key: array}
function unwrapArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as any)[key])) {
    return (data as any)[key] as T[];
  }
  return [];
}

// ---------- Leagues ----------
export async function listLeagues(): Promise<League[]> {
  const res = await fetch(`${BASE}/leagues?${nocache()}`, { headers: await buildHeaders(), ...GET_INIT });
  if (res.status === 401) return [];
  return asJson<League[]>(res);
}


export async function createLeague(
  name: string,
  visibility: "public" | "private" = "private"
): Promise<League> {
  const res = await fetch(`${BASE}/leagues`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name, visibility }),
  });
  return asJson<League>(res);
}

export async function getLeague(leagueId: string): Promise<League> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}?${nocache()}`, {
    headers: await buildHeaders(),
    ...GET_INIT,
  });
  return asJson<League>(res);
}

export async function renameLeague(id: string, name: string) {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name }),
  });
  return asJson<League>(res);
}

export async function listPublicLeagues(limit = 50): Promise<League[]> {
  const res = await fetch(`${BASE}/leagues/public?limit=${limit}&${nocache()}`, {
    headers: await buildHeaders(),
    ...GET_INIT,
  });
  const data = await asJson<unknown>(res);
  return unwrapArray<League>(data, "leagues");
}

// ---------- Matches ----------
export type MatchDTO = {
  matchId: string;
  createdAt: string;
  teams: [
    { players: { id: string; name: string }[] },
    { players: { id: string; name: string }[] }
  ];
  score: { team1: number; team2: number };
  winnerTeam: 0 | 1 | null;
};
export type LeagueMetrics = {
  leagueId: string;
  summary?: { matchCount: number };
  recentMatches: MatchDTO[];
  updatedAt: string;
};

export async function getLeagueMetrics(leagueId: string): Promise<LeagueMetrics> {
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/metrics?${nocache()}`;
  const res = await fetch(url, { headers: await buildHeaders(), ...GET_INIT });
  return asJson<LeagueMetrics>(res);
}
export async function listMatches(
  leagueId: string,
  opts?: { limit?: number; cursor?: string }
): Promise<{ matches: MatchDTO[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  const res = await fetch(
    `${BASE}/leagues/${encodeURIComponent(leagueId)}/matches?${params.toString()}&${nocache()}`,
    { headers: await buildHeaders(), ...GET_INIT }
  );
  const data = await asJson<{ leagueId: string; matches: MatchDTO[]; nextCursor: string | null }>(res);
  return { matches: data.matches, nextCursor: data.nextCursor };
}
// IMPORTANT: now expects DOUBLES payload
export async function createMatch(leagueId: string, input: MatchInputDoubles): Promise<{ ok: boolean; matchId?: string }> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/matches`, {
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify(input),
  });
  return asJson<{ ok: boolean; matchId?: string }>(res);
}

export async function deleteLastMatch(leagueId: string) {
  const res = await fetch(
    `${BASE}/leagues/${encodeURIComponent(leagueId)}/matches/last`,
    {
      method: "DELETE",
      headers: await buildHeaders(),
    }
  );
  return asJson<{ ok: boolean; deletedMatchId: string; leagueId: string }>(res);
}

// ---------- Standings & Players ----------
export async function getStandings(leagueId: string): Promise<Standing[]> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/standings?${nocache()}`, {
    headers: await buildHeaders(),
    ...GET_INIT,
  });
  const data = await asJson<unknown>(res);
  return unwrapArray<Standing>(data, "standings");
}

export async function listPlayers(leagueId: string): Promise<Player[]> {
  const res = await fetch(`${BASE}/leagues/${encodeURIComponent(leagueId)}/players?${nocache()}`, {
    headers: await buildHeaders(),
    ...GET_INIT,
  });
  const data = await asJson<unknown>(res);
  return unwrapArray<Player>(data, "players");
}