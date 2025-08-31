// src/lambda/matches_create.js
const {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { randomUUID } = require("crypto");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME || process.env.TABLE;

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
  let r = await ddb.send(
    new GetItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
      ProjectionExpression: "ownerId, visibility",
    })
  );
  if (r.Item) return unmarshall(r.Item);
  // Legacy fallback
  r = await ddb.send(
    new GetItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
      ProjectionExpression: "ownerId, visibility",
    })
  );
  return r.Item ? unmarshall(r.Item) : null;
}

async function getOrCreatePlayer(leagueId, nameRaw) {
  const nameNorm = norm(nameRaw);
  if (!nameNorm) throw new Error("empty_name");

  // Lookup existing by normalized name within the league
  const q = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":pref": { S: "PLAYER#" },
      },
      ProjectionExpression: "SK,#nm,#nn",
      ExpressionAttributeNames: { "#nm": "name", "#nn": "nameNorm" },
      Limit: 500,
    })
  );
  const maybe = (q.Items || [])
    .map(unmarshall)
    .find((p) => p.nameNorm === nameNorm);
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
  await ddb.send(
    new PutItemCommand({
      TableName: TABLE,
      Item: marshall(item),
      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );
  return { playerId, name: item.name };
}

function validateDoublesBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Body must be JSON." };
  }
  const teams = body.teams;
  const score = body.score;
  if (!Array.isArray(teams) || teams.length !== 2) {
    return { ok: false, message: "Exactly 2 teams are required." };
  }
  for (let i = 0; i < 2; i++) {
    if (!teams[i] || !Array.isArray(teams[i].players) || teams[i].players.length !== 2) {
      return { ok: false, message: "Each team must have exactly 2 players." };
    }
    for (let j = 0; j < 2; j++) {
      const nm = (teams[i].players[j]?.name || "").toString().trim();
      if (!nm) return { ok: false, message: "Each player must have a name." };
    }
  }
  if (!score || score.team1 == null || score.team2 == null) {
    return { ok: false, message: "score.team1 and score.team2 are required." };
  }
  const s1 = asInt(score.team1);
  const s2 = asInt(score.team2);
  if (Number.isNaN(s1) || Number.isNaN(s2) || s1 < 0 || s2 < 0) {
    return { ok: false, message: "Scores must be non-negative integers." };
  }
  // Uniqueness of players across the match
  const names = [
    norm(teams[0].players[0].name),
    norm(teams[0].players[1].name),
    norm(teams[1].players[0].name),
    norm(teams[1].players[1].name),
  ];
  if (new Set(names).size !== 4) {
    return { ok: false, message: "Players must be unique across both teams." };
  }
  return { ok: true, scores: { s1, s2 } };
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    const userId = userFromAuthorizer(event);
    const table = TABLE;

    if (!table)
      return json(500, {
        error: "internal_error",
        name: "EnvError",
        message: "TABLE_NAME missing",
      });
    if (!leagueId) return json(400, { error: "leagueId_missing" });
    if (!userId) return json(401, { error: "unauthorized" });

    const meta = await loadMeta(leagueId);
    if (!meta) return json(404, { error: "not_found" });
    if (userId !== meta.ownerId) return json(403, { error: "forbidden" });

    // Parse & validate body (doubles-only)
    const body = event.body ? JSON.parse(event.body) : {};
    const v = validateDoublesBody(body);
    if (!v.ok) return json(400, { error: "bad_request", message: v.message });

    const { s1, s2 } = v.scores;

    // Resolve / upsert players by name
    const namesByTeam = [
      [body.teams[0].players[0].name, body.teams[0].players[1].name],
      [body.teams[1].players[0].name, body.teams[1].players[1].name],
    ];
    const flatNames = [
      namesByTeam[0][0],
      namesByTeam[0][1],
      namesByTeam[1][0],
      namesByTeam[1][1],
    ];

    const resolved = await Promise.all(
      flatNames.map((nm) => getOrCreatePlayer(leagueId, nm))
    );
    // Rebuild per-team structure with ids
    const team0 = [
      { id: resolved[0].playerId, name: resolved[0].name },
      { id: resolved[1].playerId, name: resolved[1].name },
    ];
    const team1 = [
      { id: resolved[2].playerId, name: resolved[2].name },
      { id: resolved[3].playerId, name: resolved[3].name },
    ];

    const ts = Date.now();
    const matchId = randomUUID();
    const sk = `MATCH#${String(ts).padStart(13, "0")}#${matchId}`;

    const winnerTeam =
      s1 === s2 ? null : s1 > s2 ? 0 : 1;
    const winnerIds =
      winnerTeam === null
        ? []
        : winnerTeam === 0
        ? [team0[0].id, team0[1].id]
        : [team1[0].id, team1[1].id];

    // Flattened participants (helps standings aggregation)
    const participants = [
      { id: team0[0].id, name: team0[0].name, team: 0, points: s1 },
      { id: team0[1].id, name: team0[1].name, team: 0, points: s1 },
      { id: team1[0].id, name: team1[0].name, team: 1, points: s2 },
      { id: team1[1].id, name: team1[1].name, team: 1, points: s2 },
    ];

    const item = {
      PK: `LEAGUE#${leagueId}`,
      SK: sk,
      matchId,
      leagueId,
      // New shape (doubles)
      teams: [
        { players: team0 }, // [{id,name},{id,name}]
        { players: team1 },
      ],
      score: { team1: s1, team2: s2 },
      winnerTeam,          // 0 | 1 | null
      winnerIds,           // [id,id] or []
      // Keep a flat view for convenience
      participants,        // length 4
      // (Optional legacy field; no single winnerId when doubles)
      winnerId: null,
      createdBy: userId,
      createdAt: new Date(ts).toISOString(),
    };

    await ddb.send(
      new PutItemCommand({
        TableName: table,
        Item: marshall(item),
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );

    return json(201, {
      ok: true,
      matchId,
      leagueId,
      winnerTeam,
      winnerIds,
    });
  } catch (err) {
    console.error("matches_create error:", err);
    return json(500, {
      error: "internal_error",
      name: err?.name || null,
      message: err?.message || null,
    });
  }
};
