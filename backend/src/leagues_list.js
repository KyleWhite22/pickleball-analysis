const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getUserId } = require("./_auth");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

/**
 * GET /leagues
 * Auth: JWT required (authorizer: jwtAuth)
 * Lists leagues owned by the caller (via GSI1 OWNER#<userId>)
 */
exports.handler = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "unauthorized" }),
      };
    }

    const cmd = new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1", // owner → leagues
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `OWNER#${userId}` },
      },
      ScanIndexForward: false, // newest first (by createdAt)
      Limit: 50,
    });

    const res = await ddb.send(cmd);
    const items = (res.Items || []).map(unmarshall).map(x => ({
      leagueId: x.leagueId,
      name: x.name,
      ownerId: x.ownerId,
      inviteCode: x.inviteCode,
      createdAt: x.createdAt,
      visibility: x.visibility,
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ownerId: userId, leagues: items }),
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
