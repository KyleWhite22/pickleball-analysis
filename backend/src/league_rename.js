const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    const body = event.body ? JSON.parse(event.body) : {};
    const newName = (body.name || "").trim();
    const requesterId = (body.requesterId || "").toString(); // optional for simple auth check
    if (!newName) return json(400, { error: "name_required" });

    // (Optional) simple owner check: fetch league and compare ownerId
    if (requesterId) {
      const cur = await ddb.send(new GetItemCommand({
        TableName: TABLE,
        Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
        ProjectionExpression: "ownerId",
      }));
      if (!cur.Item) return json(404, { error: "not_found" });
      const { ownerId } = unmarshall(cur.Item);
      if (ownerId !== requesterId) return json(403, { error: "forbidden" });
    }

    const res = await ddb.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
      UpdateExpression: "SET #n = :name",
      ExpressionAttributeNames: { "#n": "name" },
      ExpressionAttributeValues: { ":name": { S: newName } },
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      ReturnValues: "ALL_NEW",
    }));

    const item = unmarshall(res.Attributes);
    return json(200, {
      leagueId: item.leagueId,
      name: item.name,
      ownerId: item.ownerId,
      inviteCode: item.inviteCode,
      createdAt: item.createdAt,
    });
  } catch (err) {
    console.error("league_rename error:", err);
    if (err?.name === "ConditionalCheckFailedException") {
      return json(404, { error: "not_found" });
    }
    return json(500, { error: "internal_error" });
  }
};