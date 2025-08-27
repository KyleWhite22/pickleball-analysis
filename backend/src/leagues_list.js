// src/leagues_list.js
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { getUserId } = require("./_auth");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

/**
 * GET /leagues
 * Auth: JWT required (authorizer: jwtAuth)
 * Returns ONLY the leagues owned by the caller.
 * Response: League[]   ← (array, not wrapped)
 */
exports.handler = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return json(401, { error: "unauthorized" });

    // query GSI1 = OWNER#<userId> → leagues
    const cmd = new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `OWNER#${userId}` },
      },
      // newest first by createdAt (we stored createdAt in GSI1SK)
      ScanIndexForward: false,
      Limit: 50,
    });

    const res = await ddb.send(cmd);
    const leagues = (res.Items || []).map((it) => {
      const x = unmarshall(it);
      return {
        leagueId: x.leagueId,
        name: x.name,
        ownerId: x.ownerId,
        inviteCode: x.inviteCode,
        createdAt: x.createdAt,
        visibility: x.visibility, // 'public' | 'private'
      };
    });

    // NOTE: frontend expects an array (not { ownerId, leagues })
    return json(200, leagues);
  } catch (err) {
    console.error("leagues_list error:", err);
    return json(500, { error: "internal_error" });
  }
};

