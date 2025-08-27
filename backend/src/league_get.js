// src/league_get.js
const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
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

    const { Item } = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
      ProjectionExpression: "leagueId, #n, ownerId, createdAt, visibility",
      ExpressionAttributeNames: { "#n": "name" },
    }));
    if (!Item) return json(404, { error: "not_found" });

    const meta = unmarshall(Item);
    const userId = await getOptionalUserId(event); // may be null
    if (!canView(meta, userId)) return json(403, { error: "forbidden" });

    const isOwner = userId && userId === meta.ownerId;
    return json(200, {
      leagueId: meta.leagueId,
      name: meta.name,
      createdAt: meta.createdAt,
      visibility: meta.visibility,
      ownerId: isOwner ? meta.ownerId : undefined, // hide from non-owners
    });
  } catch (err) {
    console.error("league_get error", err);
    return json(500, { error: "internal_error" });
  }
};
