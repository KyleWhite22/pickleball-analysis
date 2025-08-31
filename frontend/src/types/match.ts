// src/types/match.ts
export type PlayerRef = { playerId: string; name: string };

export type TeamRef = {
  // exactly two players per team
  players: [PlayerRef, PlayerRef];
};

export type MatchInputDoubles = {
  leagueId: string;
  // exactly two teams
  teams: [TeamRef, TeamRef];
  score: { team1: number; team2: number };
  playedAt?: string;
  notes?: string;
};
