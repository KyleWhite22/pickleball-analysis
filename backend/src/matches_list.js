// src/matches_list.js
const {
  DynamoDBClient, GetItemCommand, QueryCommand
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
    "Vary": "Authorization",
  },
  body: JSON.stringify(body),
});

function canView(meta, userId) {
  return meta?.visibility === "public" || (userId && userId === meta?.ownerId);
}

function encodeCursor(key) {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64");
}
function decodeCursor(c) {
  try { return JSON.parse(Buffer.from(c, "base64").toString("utf8")); }
  catch { return undefined; }
}

// normalize any match shape (doubles preferred; legacy singles supported)
function toDTO(m) {
  const createdAt = m.createdAt || new Date().toISOString();
  // doubles (preferred)
  if (Array.isArray(m.teams) && m.score) {
    return {
      matchId: m.matchId,
      createdAt,
      teams: [
        { players: (m.teams[0]?.players || []).map(p => ({ id: p.id || p.playerId, name: p.name })) },
        { players: (m.teams[1]?.players || []).map(p => ({ id: p.id || p.playerId, name: p.name })) },
      ],
      score: { team1: Number(m.score.team1) || 0, team2: Number(m.score.team2) || 0 },
      winnerTeam: Number.isInteger(m.winnerTeam) ? m.winnerTeam : (
        (Number(m.score.team1) || 0) === (Number(m.score.team2) || 0) ? null :
        (Number(m.score.team1) || 0) > (Number(m.score.team2) || 0) ? 0 : 1
      ),
    };
  }
  // legacy singles → adapt to doubles-ish DTO
  if (Array.isArray(m.players) && m.players.length === 2) {
    const a = m.players[0], b = m.players[1];
    const s1 = Number(a.points) || 0, s2 = Number(b.points) || 0;
    return {
      matchId: m.matchId,
      createdAt,
      teams: [
        { players: [{ id: a.id || a.playerId, name: a.name || "" }, { id: "__NA1__", name: "(n/a)" }] },
        { players: [{ id: b.id || b.playerId, name: b.name || "" }, { id: "__NA2__", name: "(n/a)" }] },
      ],
      score: { team1: s1, team2: s2 },
      winnerTeam: s1 === s2 ? null : (s1 > s2 ? 0 : 1),
    };
  }
  // unknown → minimal
  return { matchId: m.matchId, createdAt, teams: [], score: { team1: 0, team2: 0 }, winnerTeam: null };
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    // view authorization
    const metaRes = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
      ProjectionExpression: "ownerId, visibility",
    }));
    if (!metaRes.Item) return json(404, { error: "not_found" });
    const meta = unmarshall(metaRes.Item);

    const userId = await getOptionalUserId(event);
    if (!canView(meta, userId)) return json(403, { error: "forbidden" });

    // pagination inputs
    const qs = event.queryStringParameters || {};
    const limit = Math.min(Math.max(parseInt(qs.limit || "25", 10), 1), 200);
    const cursor = qs.cursor ? decodeCursor(qs.cursor) : undefined;

    // newest first
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":pref": { S: "MATCH#" },
      },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor,
    }));

    const matches = (q.Items || []).map(unmarshall).map(toDTO);
    const nextCursor = q.LastEvaluatedKey ? encodeCursor(q.LastEvaluatedKey) : null;

    return json(200, { leagueId, matches, nextCursor });
  } catch (err) {
    console.error("matches_list error", err);
    return json(500, { error: "internal_error" });
  }
};
