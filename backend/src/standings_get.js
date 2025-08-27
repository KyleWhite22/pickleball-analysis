// src/standings_get.js
const { DynamoDBClient, GetItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
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

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    // meta
    const metaRes = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
      ProjectionExpression: "ownerId, visibility",
    }));
    if (!metaRes.Item) return json(404, { error: "not_found" });
    const meta = unmarshall(metaRes.Item);

    const userId = await getOptionalUserId(event);
    if (!canView(meta, userId)) return json(403, { error: "forbidden" });

    // standings (assuming precomputed under SK prefix STANDING#)
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":pref": { S: "STANDING#" },
      },
      Limit: 500,
    }));

    const standings = (q.Items || []).map(unmarshall).map(s => ({
      playerId: s.playerId,
      name: s.name,
      wins: s.wins,
      losses: s.losses,
      winPct: s.winPct,
      pointsFor: s.pointsFor,
      pointsAgainst: s.pointsAgainst,
      pointDiff: s.pointDiff,
      streak: s.streak,
      games: s.games,
      rating: s.rating, // if present
    }));

    return json(200, { leagueId, standings });
  } catch (err) {
    console.error("standings_get error", err);
    return json(500, { error: "internal_error" });
  }
};
