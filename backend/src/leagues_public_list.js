const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
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
    const qs = event.queryStringParameters || {};
    const limit = Math.min(Math.max(parseInt(qs.limit || "50", 10), 1), 200);

    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk",
      ExpressionAttributeValues: { ":pk": { S: "VISIBILITY#PUBLIC" } },
      ScanIndexForward: false, // newest first
      Limit: limit,
    }));

    const leagues = (res.Items || []).map(unmarshall).map(it => ({
      leagueId: it.leagueId,
      name: it.name,
      ownerId: it.ownerId,
      inviteCode: it.inviteCode,
      createdAt: it.createdAt,
      visibility: it.visibility,
    }));

    return json(200, { leagues, count: leagues.length });
  } catch (err) {
    console.error("leagues_public_list error:", err);
    return json(500, { error: "internal_error" });
  }
};