// src/metrics_get.js
const {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getOptionalUserId } = require("./auth_optional");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    Vary: "Authorization",
  },
  body: JSON.stringify(body),
});

function canView(meta, userId) {
return true;
}

// --- normalize to MatchDTO (exactly what your UI expects) -------------
function toDTO(m) {
  const createdAt = m.createdAt || new Date().toISOString();

  // NEW doubles (participants[] with team)
  if (Array.isArray(m.participants) && m.participants.length >= 2 && m.score) {
    const team0 = m.participants
      .filter((p) => p.team === 0)
      .map((p) => ({ id: p.id || p.playerId, name: p.name || "" }));
    const team1 = m.participants
      .filter((p) => p.team === 1)
      .map((p) => ({ id: p.id || p.playerId, name: p.name || "" }));
    const s1 = Number(m.score.team1) || 0;
    const s2 = Number(m.score.team2) || 0;
    const winnerTeam = s1 === s2 ? null : s1 > s2 ? 0 : 1;
    return {
      matchId: m.matchId,
      createdAt,
      teams: [{ players: team0 }, { players: team1 }],
      score: { team1: s1, team2: s2 },
      winnerTeam,
    };
  }

  // legacy doubles (teams[])
  if (Array.isArray(m.teams) && m.score) {
    const s1 = Number(m.score.team1) || 0;
    const s2 = Number(m.score.team2) || 0;
    const winnerTeam =
      Number.isInteger(m.winnerTeam) ? m.winnerTeam : s1 === s2 ? null : s1 > s2 ? 0 : 1;
    return {
      matchId: m.matchId,
      createdAt,
      teams: [
        { players: (m.teams[0]?.players || []).map((p) => ({ id: p.id || p.playerId, name: p.name || "" })) },
        { players: (m.teams[1]?.players || []).map((p) => ({ id: p.id || p.playerId, name: p.name || "" })) },
      ],
      score: { team1: s1, team2: s2 },
      winnerTeam,
    };
  }

  // legacy singles (players[2] with points)
  if (Array.isArray(m.players) && m.players.length === 2) {
    const a = m.players[0];
    const b = m.players[1];
    const s1 = Number(a.points) || 0;
    const s2 = Number(b.points) || 0;
    return {
      matchId: m.matchId,
      createdAt,
      teams: [
        { players: [{ id: a.id || a.playerId, name: a.name || "" }, { id: "__NA1__", name: "(n/a)" }] },
        { players: [{ id: b.id || b.playerId, name: b.name || "" }, { id: "__NA2__", name: "(n/a)" }] },
      ],
      score: { team1: s1, team2: s2 },
      winnerTeam: s1 === s2 ? null : s1 > s2 ? 0 : 1,
    };
  }

  return {
    matchId: m.matchId,
    createdAt,
    teams: [],
    score: { team1: 0, team2: 0 },
    winnerTeam: null,
  };
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });
    if (!TABLE) return json(500, { error: "internal_error", message: "TABLE_NAME missing" });

    // AuthZ (mirror standings behavior)
    const metaRes = await ddb.send(
      new GetItemCommand({
        TableName: TABLE,
        Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
        ProjectionExpression: "ownerId, visibility",
      })
    );
    if (!metaRes.Item) return json(404, { error: "not_found" });
    const meta = unmarshall(metaRes.Item);
    const userId = await getOptionalUserId(event);
    if (!canView(meta, userId)) return json(403, { error: "forbidden" });

    // Pull ALL matches (chronological)
    const matches = [];
    let ExclusiveStartKey;
    do {
      const r = await ddb.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
          ExpressionAttributeValues: {
            ":pk": { S: `LEAGUE#${leagueId}` },
            ":pref": { S: "MATCH#" },
          },
          ExclusiveStartKey,
          ScanIndexForward: true, // oldest → newest
        })
      );
      for (const it of r.Items || []) matches.push(unmarshall(it));
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    // Build summary/leaders like before (optional)
    const matchCount = matches.length;

    // Provide a recent window for UI (newest first)
    const recentDTO = matches
      .map(toDTO)          // normalize
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest first
      .slice(0, 100);      // give the UI plenty to work with

    return json(200, {
      leagueId,
      summary: { matchCount },
      recentMatches: recentDTO,  // 🔴 what Superlatives & LastGame will use
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("metrics_get error", err);
    return json(500, { error: "internal_error", message: err?.message || null });
  }
};
