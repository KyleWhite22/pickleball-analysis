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
  return true;
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

    // players
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":pref": { S: "PLAYER#" },
      },
      ProjectionExpression: "playerId, #n",
      ExpressionAttributeNames: { "#n": "name" },
      Limit: 500,
    }));

    const players = (q.Items || []).map(unmarshall).map(p => ({
      playerId: p.playerId,
      name: p.name,
    }));

    return json(200, { leagueId, players });
  } catch (err) {
    console.error("players_list error", err);
    return json(500, { error: "internal_error" });
  }
};
