const {
  DynamoDBClient,
  UpdateItemCommand,
  QueryCommand,
  GetItemCommand
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

function newInvite(len = 5) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoiding O/0 I/1
  let out = "";
  for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

async function inviteExists(code) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "GSI2",
    KeyConditionExpression: "GSI2PK = :pk",
    ExpressionAttributeValues: { ":pk": { S: `INVITE#${code}` } },
    Limit: 1,
  }));
  return q.Items && q.Items.length > 0;
}

exports.handler = async (event) => {
  try {
    const leagueId = event.pathParameters?.id;
    if (!leagueId) return json(400, { error: "leagueId required" });

    const body = event.body ? JSON.parse(event.body) : {};
    const requesterId = (body.requesterId || "").toString(); // optional

    // (Optional) owner check
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

    // generate a unique invite code (check GSI2)
    let code = newInvite();
    for (let i = 0; i < 5; i++) {        // try a few times; probability of collision is tiny
      if (!(await inviteExists(code))) break;
      code = newInvite();
    }

    // Update league METADATA item including GSI2 mirrors
    const now = new Date().toISOString();
    const res = await ddb.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { PK: { S: `LEAGUE#${leagueId}` }, SK: { S: "METADATA" } },
      UpdateExpression: "SET inviteCode = :c, GSI2PK = :g2pk, GSI2SK = :g2sk",
      ExpressionAttributeValues: {
        ":c":    { S: code },
        ":g2pk": { S: `INVITE#${code}` },
        ":g2sk": { S: `LEAGUE#${leagueId}` },
      },
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      ReturnValues: "ALL_NEW",
    }));

    const item = unmarshall(res.Attributes);
    return json(200, { leagueId: item.leagueId, inviteCode: item.inviteCode, rotatedAt: now });
  } catch (err) {
    console.error("league_invite_rotate error:", err);
    if (err?.name === "ConditionalCheckFailedException") {
      return json(404, { error: "not_found" });
    }
    return json(500, { error: "internal_error" });
  }
};