// src/matches_delete_last.js
const { DynamoDBClient, GetItemCommand, QueryCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

function userFromEvent(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  return claims.sub || claims["cognito:username"] || null;
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    const userId = userFromEvent(event);
    if (!userId) return json(401, { error: "unauthorized" });

    // owner check
    const metaRes = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "META" } },
      ProjectionExpression: "ownerId",
    }));
    if (!metaRes.Item) return json(404, { error: "not_found" });
    const meta = unmarshall(metaRes.Item);
    if (meta.ownerId !== userId) return json(403, { error: "forbidden" });

    // last match
    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :pref)",
      ExpressionAttributeValues: {
        ":pk": { S: `LEAGUE#${leagueId}` },
        ":pref": { S: "MATCH#" },
      },
      ScanIndexForward: false,
      Limit: 1,
    }));
    const item = (q.Items || [])[0];
    if (!item) return json(404, { error: "no_matches" });

    const key = { PK: { S: item.PK.S }, SK: { S: item.SK.S } };
    await ddb.send(new DeleteItemCommand({ TableName: TABLE, Key: key }));

    const m = unmarshall(item);
    return json(200, { ok: true, deletedMatchId: m.matchId, leagueId });
  } catch (err) {
    console.error("matches_delete_last error", err);
    return json(500, { error: "internal_error" });
  }
};
