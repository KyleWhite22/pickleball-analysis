import crypto from "node:crypto";

export const handler = async (event) => {
  const leagueId = event.pathParameters?.id || "league-1";
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "InvalidJSON" }) }; }

  // very light validation
  if (!Array.isArray(body.players) || body.players.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ error: "BadPlayers" }) };
  }
  if (!Array.isArray(body.scores) || body.scores.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "BadScores" }) };
  }

  const created = {
    id: crypto.randomUUID(),
    leagueId,
    date: body.date || new Date().toISOString().slice(0,10),
    players: body.players,
    scores: body.scores,
    idempotencyKey: body.idempotencyKey || null,
    createdAt: new Date().toISOString()
  };
  // No persistence (mock) — just echo the “created” match
  return { statusCode: 201, body: JSON.stringify(created) };
};