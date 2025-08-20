const {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  GetItemCommand,
  TransactWriteItemsCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

const asInt = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};

const rid = (len = 12) => Math.random().toString(36).slice(2).replace(/[^a-z0-9]/gi, "").slice(0, len);

function normName(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function getOrCreatePlayer(leagueId, nameRaw) {
  const nameNorm = normName(nameRaw);
  if (!nameNorm) throw new Error("empty_name");

  // 1) try to find existing by scanning PLAYER# items
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
    ExpressionAttributeValues: {
      ":pk":   { S: `LEAGUE#${leagueId}` },
      ":pref": { S: "PLAYER#" },
    },
    // we need SK + name + nameNorm to resolve id + compare
    ProjectionExpression: "SK,#nm,#nn",
    ExpressionAttributeNames: { "#nm": "name", "#nn": "nameNorm" },
    Limit: 500,
  }));

  // find by normalized name, then derive id from SK
  const maybe = (q.Items || []).map(unmarshall).find(p => p.nameNorm === nameNorm);
  if (maybe) {
    const playerId = (maybe.SK || "").split("#")[1]; // "PLAYER#<id>"
    return { playerId, name: maybe.name };
  }

  // 2) create new player
  const playerId = rid(10);
  const now = new Date().toISOString();
  const item = {
    PK: `LEAGUE#${leagueId}`,
    SK: `PLAYER#${playerId}`,
    playerId,             // keep it on the item too (nice to have)
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
    if (!leagueId) return json(400, { error: "leagueId missing in path" });

    const body = event.body ? JSON.parse(event.body) : {};
    const p1Name = (body.player1Name || "").toString();
    const p2Name = (body.player2Name || "").toString();
    const s1 = asInt(body.score1);
    const s2 = asInt(body.score2);
    const createdBy = (body.createdBy || "dev-user").toString();

    if (!p1Name || !p2Name || Number.isNaN(s1) || Number.isNaN(s2)) {
      return json(400, { error: "player1Name, player2Name, score1, score2 are required" });
    }
    if (normName(p1Name) === normName(p2Name)) {
      return json(400, { error: "players must be different" });
    }
    if (s1 < 0 || s2 < 0) return json(400, { error: "scores must be >= 0" });

    // (Optional) Require the submitter to be a member; comment this block out if you don't want that.
    // const membersRes = await ddb.send(new QueryCommand({
    //   TableName: TABLE,
    //   KeyConditionExpression: "PK = :pk AND begins_with(SK, :m)",
    //   ExpressionAttributeValues: {
    //     ":pk": { S: `LEAGUE#${leagueId}` },
    //     ":m":  { S: "MEMBER#" },
    //   },
    //   ProjectionExpression: "SK",
    // }));
    // const submitterIsMember = (membersRes.Items || [])
    //   .map(i => unmarshall(i).SK.split("#")[1])
    //   .includes(createdBy);
    // if (!submitterIsMember) return json(403, { error: "not_a_member" });

    // Upsert players by name
    const p1 = await getOrCreatePlayer(leagueId, p1Name);
    const p2 = await getOrCreatePlayer(leagueId, p2Name);

    // Build match
    const now = new Date().toISOString();
    const matchId = `${now}-${rid(6)}`;
    const winnerId = s1 === s2 ? null : (s1 > s2 ? p1.playerId : p2.playerId);

    const matchItem = {
      PK: `LEAGUE#${leagueId}`,
      SK: `MATCH#${now}#${matchId}`,
      matchId,
      leagueId,
      players: [
        { id: p1.playerId, name: p1.name, points: s1 },
        { id: p2.playerId, name: p2.name, points: s2 },
      ],
      winnerId,
      createdBy,
      createdAt: now,
    };

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall(matchItem),
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));

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