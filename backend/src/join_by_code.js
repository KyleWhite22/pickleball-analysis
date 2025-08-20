const { DynamoDBClient, QueryCommand, TransactWriteItemsCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const code = (event.pathParameters?.code || "").toUpperCase().trim();
    if (!code) return json(400, { error: "invite code required" });

    const body = event.body ? JSON.parse(event.body) : {};
    const userId = (body.userId || "dev-user").toString().trim();
    if (!userId) return json(400, { error: "userId required" });

    // 1) Resolve invite code -> league via GSI2
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": { S: `INVITE#${code}` } },
      Limit: 1,
    }));

    if (!res.Items || res.Items.length === 0) {
      return json(404, { error: "invalid_invite_code" });
    }

    const meta = unmarshall(res.Items[0]); // METADATA item
    const leagueId = meta.leagueId;

    // 2) Write membership + mirror (idempotent via conditions)
    const now = new Date().toISOString();

    const memberItem = {
      PK: `LEAGUE#${leagueId}`,
      SK: `MEMBER#${userId}`,
      userId,
      leagueId,
      joinedAt: now,
    };

    const mirrorItem = {
      PK: `USER#${userId}`,
      SK: `LEAGUE#${leagueId}`,
      userId,
      leagueId,
      joinedAt: now,
    };

    await ddb.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE,
            Item: marshall(memberItem),
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
        {
          Put: {
            TableName: TABLE,
            Item: marshall(mirrorItem),
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
    }));

    return json(200, { joined: true, leagueId, userId });
  } catch (err) {
    console.error("join_by_code error:", err);
    if (err?.name === "TransactionCanceledException") {
      return json(409, { error: "already_member" });
    }
    return json(500, { error: "internal_error" });
  }
};