// src/lib/api.ts
import { getIdToken } from "./auth";
import type { MatchInputDoubles } from "../types/match";
import { fetchJSON } from "./fetchJSON";

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

// ---------- Helpers ----------
async function buildHeaders(contentType?: string): Promise<HeadersInit> {
  const h: Record<string, string> = { accept: "application/json" };
  const tok = await getIdToken();
  if (tok) h.Authorization = `Bearer ${tok}`;
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

// tolerant helper: the endpoint might return an array directly or {key: array}
function unwrapArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as any)[key])) {
    return (data as any)[key] as T[];
  }
  return [];
}

// Common fetch options (retry + no-store). We pass through AbortSignals per call.
const COMMON_GET = { attempts: 3, baseDelayMs: 300 } as const;

// ---------- Leagues ----------
export async function listLeagues(signal?: AbortSignal): Promise<League[]> {
  const url = `${BASE}/leagues?${nocache()}`;
  try {
    return await fetchJSON<League[]>(url, {
      signal,
      ...COMMON_GET,
      // Keep browsers from caching
      cache: "no-store",
      headers: await buildHeaders(),
    });
  } catch (e: any) {
    // If unauthenticated endpoints can return 401, mirror your old behavior:
    if (e?.message?.startsWith?.("HTTP 401")) return [];
    throw e;
  }
}

export async function createLeague(
  name: string,
  visibility: "public" | "private" = "private",
  signal?: AbortSignal
): Promise<League> {
  const url = `${BASE}/leagues`;
  return fetchJSON<League>(url, {
    signal,
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name, visibility }),
    attempts: 3,
    baseDelayMs: 300,
  });
}

export async function getLeague(leagueId: string, signal?: AbortSignal): Promise<League> {
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}?${nocache()}`;
  return fetchJSON<League>(url, {
    signal,
    ...COMMON_GET,
    cache: "no-store",
    headers: await buildHeaders(),
  });
}

export async function renameLeague(id: string, name: string, signal?: AbortSignal) {
  const url = `${BASE}/leagues/${encodeURIComponent(id)}`;
  return fetchJSON<League>(url, {
    signal,
    method: "PATCH",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify({ name }),
    attempts: 3,
    baseDelayMs: 300,
  });
}

export async function listPublicLeagues(limit = 50, signal?: AbortSignal): Promise<League[]> {
  const url = `${BASE}/leagues/public?limit=${limit}&${nocache()}`;
  const data = await fetchJSON<unknown>(url, {
    signal,
    ...COMMON_GET,
    cache: "no-store",
    headers: await buildHeaders(),
  });
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

export async function getLeagueMetrics(leagueId: string, signal?: AbortSignal): Promise<LeagueMetrics> {
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/metrics?${nocache()}`;
  return fetchJSON<LeagueMetrics>(url, {
    signal,
    ...COMMON_GET,
    cache: "no-store",
    headers: await buildHeaders(),
  });
}

export async function listMatches(
  leagueId: string,
  opts?: { limit?: number; cursor?: string },
  signal?: AbortSignal
): Promise<{ matches: MatchDTO[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/matches?${params.toString()}&${nocache()}`;

  const data = await fetchJSON<{ leagueId: string; matches: MatchDTO[]; nextCursor: string | null }>(url, {
    signal,
    ...COMMON_GET,
    cache: "no-store",
    headers: await buildHeaders(),
  });

  return { matches: data.matches, nextCursor: data.nextCursor };
}

// IMPORTANT: now expects DOUBLES payload
export async function createMatch(
  leagueId: string,
  input: MatchInputDoubles,
  signal?: AbortSignal
): Promise<{ ok: boolean; matchId?: string }> {
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/matches`;
  return fetchJSON<{ ok: boolean; matchId?: string }>(url, {
    signal,
    method: "POST",
    headers: await buildHeaders("application/json"),
    body: JSON.stringify(input),
    attempts: 3,
    baseDelayMs: 300,
  });
}

export async function deleteLastMatch(leagueId: string, signal?: AbortSignal) {
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/matches/last`;
  return fetchJSON<{ ok: boolean; deletedMatchId: string; leagueId: string }>(url, {
    signal,
    method: "DELETE",
    headers: await buildHeaders(),
    attempts: 3,
    baseDelayMs: 300,
  });
}

// ---------- Standings & Players ----------
export async function getStandings(leagueId: string, signal?: AbortSignal): Promise<Standing[]> {
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/standings?${nocache()}`;
  const data = await fetchJSON<unknown>(url, {
    signal,
    ...COMMON_GET,
    cache: "no-store",
    headers: await buildHeaders(),
  });
  return unwrapArray<Standing>(data, "standings");
}

export async function listPlayers(leagueId: string, signal?: AbortSignal): Promise<Player[]> {
  const url = `${BASE}/leagues/${encodeURIComponent(leagueId)}/players?${nocache()}`;
  const data = await fetchJSON<unknown>(url, {
    signal,
    ...COMMON_GET,
    cache: "no-store",
    headers: await buildHeaders(),
  });
  return unwrapArray<Player>(data, "players");
}
