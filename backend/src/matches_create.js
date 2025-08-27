const {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { randomUUID } = require("crypto");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME || process.env.TABLE; // fallback just in case

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

function userFromAuthorizer(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  return claims.sub || claims["cognito:username"] || null;
}

const asInt = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};
const rid = (len = 12) =>
  Math.random().toString(36).slice(2).replace(/[^a-z0-9]/gi, "").slice(0, len);
const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

async function loadMeta(leagueId) {
  // Try META first (current)
  let r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
    ProjectionExpression: "ownerId, visibility",
  }));
  if (r.Item) return unmarshall(r.Item);
  // Legacy fallback
  r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
    ProjectionExpression: "ownerId, visibility",
  }));
  return r.Item ? unmarshall(r.Item) : null;
}

async function getOrCreatePlayer(leagueId, nameRaw) {
  const nameNorm = norm(nameRaw);
  if (!nameNorm) throw new Error("empty_name");

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
  const maybe = (q.Items || []).map(unmarshall).find((p) => p.nameNorm === nameNorm);
  if (maybe) {
    const playerId = (maybe.SK || "").split("#")[1];
    return { playerId, name: maybe.name };
  }

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
  await ddb.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item),
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  }));
  return { playerId, name: item.name };
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    const userId = userFromAuthorizer(event);
    const table = TABLE;
    console.log("createMatch dbg", { leagueId, userId, table });

    if (!table) return json(500, { error: "internal_error", name: "EnvError", message: "TABLE_NAME missing" });
    if (!leagueId) return json(400, { error: "leagueId_missing" });
    if (!userId) return json(401, { error: "unauthorized" });

    const body = event.body ? JSON.parse(event.body) : {};
    const p1 = (body.player1Name || "").toString();
    const p2 = (body.player2Name || "").toString();
    const s1 = asInt(body.score1);
    const s2 = asInt(body.score2);
    if (!p1 || !p2 || Number.isNaN(s1) || Number.isNaN(s2)) {
      return json(400, { error: "bad_request", message: "player1Name, player2Name, score1, score2 required" });
    }
    if (norm(p1) === norm(p2)) return json(400, { error: "players_must_differ" });

    const meta = await loadMeta(leagueId);
    console.log("meta", meta);
    if (!meta) return json(404, { error: "not_found" });
    if (userId !== meta.ownerId) return json(403, { error: "forbidden" });

    // Upsert players
    const P1 = await getOrCreatePlayer(leagueId, p1);
    const P2 = await getOrCreatePlayer(leagueId, p2);

    // Create match
    const ts = Date.now();
    const matchId = randomUUID();
    const sk = `MATCH#${String(ts).padStart(13, "0")}#${matchId}`;
    const winnerId = s1 === s2 ? null : s1 > s2 ? P1.playerId : P2.playerId;

    const item = {
      PK: `LEAGUE#${leagueId}`,
      SK: sk,
      matchId,
      leagueId,
      players: [
        { id: P1.playerId, name: P1.name, points: s1 },
        { id: P2.playerId, name: P2.name, points: s2 },
      ],
      winnerId,
      createdBy: userId,
      createdAt: new Date(ts).toISOString(),
    };

    await ddb.send(new PutItemCommand({
      TableName: table,
      Item: marshall(item),
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));

    return json(201, { ok: true, matchId, leagueId, players: item.players, winnerId });
  } catch (err) {
    console.error("matches_create error:", err);
    // TEMP: bubble details so you can see it in the browser
    return json(500, { error: "internal_error", name: err?.name || null, message: err?.message || null });
  }
};
