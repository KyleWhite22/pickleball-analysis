const {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { randomUUID } = require("crypto");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

const userFromEvent = (event) => {
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
const userId = claims.sub || claims['cognito:username'];
if (userId !== meta.ownerId) return json(403, { error: 'forbidden' });
};

const asInt = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};

const rid = (len = 12) =>
  Math.random().toString(36).slice(2).replace(/[^a-z0-9]/gi, "").slice(0, len);

function normName(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function loadLeagueMeta(leagueId) {
  const baseKey = { PK: { S: `LEAGUE#${leagueId}` } };

  // Try canonical key first
  let r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { ...baseKey, SK: { S: "META" } },
    ProjectionExpression: "ownerId, visibility",
  }));
  if (r.Item) return unmarshall(r.Item);

  // TEMP fallback for any old data (optional):
  r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { ...baseKey, SK: { S: "META" } },
    ProjectionExpression: "ownerId, visibility",
  }));
  return r.Item ? unmarshall(r.Item) : null;
}

async function getOrCreatePlayer(leagueId, nameRaw) {
  const nameNorm = normName(nameRaw);
  if (!nameNorm) throw new Error("empty_name");

  // Look for an existing normalized name
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
    ExpressionAttributeValues: {
      ":pk": { S: `LEAGUE#${leagueId}` },
      ":pref": { S: "PLAYER#" },
    },
    ProjectionExpression: "SK,#nm,#nn",
    ExpressionAttributeNames: { "#nm": "name", "#nn": "nameNorm" },
    Limit: 500,
  }));
  const maybe = (q.Items || []).map(unmarshall).find(p => p.nameNorm === nameNorm);
  if (maybe) {
    const playerId = (maybe.SK || "").split("#")[1];
    return { playerId, name: maybe.name };
  }

  // Create new
  const playerId = rid(10);
  const now = new Date().toISOString();
  const item = {
    PK: `LEAGUE#${leagueId}`,
    SK: `PLAYER#${playerId}`,
    playerId,
    name: nameRaw.trim(),
    nameNorm,
    createdAt: now,
  };

  try {
    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall(item),
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));
    return { playerId, name: item.name };
  } catch (e) {
    // If a concurrent request inserted the same player, re-query and return that one
    if (e?.name === "ConditionalCheckFailedException") {
      const q2 = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
        ExpressionAttributeValues: {
          ":pk": { S: `LEAGUE#${leagueId}` },
          ":pref": { S: "PLAYER#" },
        },
        ProjectionExpression: "SK,#nm,#nn",
        ExpressionAttributeNames: { "#nm": "name", "#nn": "nameNorm" },
        Limit: 500,
      }));
      const again = (q2.Items || []).map(unmarshall).find(p => p.nameNorm === nameNorm);
      if (again) {
        const playerId2 = (again.SK || "").split("#")[1];
        return { playerId: playerId2, name: again.name };
      }
    }
    console.error("getOrCreatePlayer failed", { leagueId, nameRaw, err: e });
    throw e;
  }
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId missing in path" });

    // requester from JWT (API Gateway JWT authorizer must be enabled)
    const userId = userFromEvent(event);
    if (!userId) return json(401, { error: "unauthorized" });

    const body = event.body ? JSON.parse(event.body) : {};
    const p1Name = (body.player1Name || "").toString();
    const p2Name = (body.player2Name || "").toString();
    const s1 = asInt(body.score1);
    const s2 = asInt(body.score2);

    if (!p1Name || !p2Name || Number.isNaN(s1) || Number.isNaN(s2)) {
      return json(400, {
        error: "player1Name, player2Name, score1, score2 are required",
      });
    }
    if (normName(p1Name) === normName(p2Name)) {
      return json(400, { error: "players must be different" });
    }
    if (s1 < 0 || s2 < 0) return json(400, { error: "scores must be >= 0" });

    // owner-only write (regardless of public/private)
    const meta = await loadLeagueMeta(leagueId);
    if (!meta) return json(404, { error: "not_found" });
    if (userId !== meta.ownerId) return json(403, { error: "forbidden" });

    // Upsert players by name
    const p1 = await getOrCreatePlayer(leagueId, p1Name);
    const p2 = await getOrCreatePlayer(leagueId, p2Name);

    // Build match with collision-proof SK
    const ts = Date.now();
    const matchId = randomUUID();
    const sk = `MATCH#${String(ts).padStart(13, "0")}#${matchId}`;
    const winnerId = s1 === s2 ? null : s1 > s2 ? p1.playerId : p2.playerId;

    const matchItem = {
      PK: `LEAGUE#${leagueId}`,
      SK: sk,
      matchId,
      leagueId,
      players: [
        { id: p1.playerId, name: p1.name, points: s1 },
        { id: p2.playerId, name: p2.name, points: s2 },
      ],
      winnerId,
      createdBy: userId, // from token, not client
      createdAt: new Date(ts).toISOString(),
    };

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: marshall(matchItem),
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );

    return json(201, {
      ok: true,
      matchId,
      leagueId,
      players: matchItem.players,
      winnerId,
    });
  } catch (err) {
    console.error("matches_create error:", err);
    if (err?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "duplicate_match" });
    }
    if (err?.message === "empty_name") {
      return json(400, { error: "player name required" });
    }
    return json(500, { error: "internal_error" });
  }
};