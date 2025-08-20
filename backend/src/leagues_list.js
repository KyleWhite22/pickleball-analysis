const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

/**
 * GET /leagues?ownerId=u_42
 * (dev fallback: if ownerId missing, defaults to "dev-user")
 */
exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const ownerId = (qs.ownerId || "dev-user").toString(); // dev-only fallback

    const cmd = new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",                 // owner → leagues
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `OWNER#${ownerId}` },
      },
      ScanIndexForward: false,           // newest first (by createdAt)
      Limit: 50,
    });

    const res = await ddb.send(cmd);
    const items = (res.Items || []).map(unmarshall)
      .map(x => ({
        leagueId: x.leagueId,
        name: x.name,
        ownerId: x.ownerId,
        inviteCode: x.inviteCode,
        createdAt: x.createdAt,
      }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ownerId, leagues: items }),
    };
  } catch (err) {
    console.error("leagues_list error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "internal_error" }),
    };
  }
};