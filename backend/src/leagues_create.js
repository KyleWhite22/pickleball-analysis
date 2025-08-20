const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

const ddb = new DynamoDBClient();
const TABLE = process.env.TABLE_NAME;

function randId(len = 12) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[(Math.random() * alphabet.length) | 0];
  return out;
}

function inviteCode(len = 5) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // avoid O/0 and I/1
  let code = '';
  for (let i = 0; i < len; i++) code += chars[(Math.random() * chars.length) | 0];
  return code;
}

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const name = (body.name || "").trim();
    if (!name) return json(400, { error: "name is required" });

    // dev: allow ownerId in body; later, read from JWT
    const ownerId = (body.ownerId || "dev-user").toString();

    const now = new Date().toISOString();
    const leagueId = randId(10);
    const code = inviteCode(5);

    const item = {
      PK: `LEAGUE#${leagueId}`,
      SK: "METADATA",
      leagueId,
      name,
      ownerId,
      inviteCode: code,
      createdAt: now,
      GSI1PK: `OWNER#${ownerId}`,
      GSI1SK: now,
      GSI2PK: `INVITE#${code}`,
      GSI2SK: `LEAGUE#${leagueId}`,
    };

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall(item),
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));

    return json(201, { leagueId, name, ownerId, inviteCode: code, createdAt: now });
  } catch (err) {
    console.error("createLeague error:", err);
    if (err?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "league already exists, try again" });
    }
    return json(500, { error: "internal_error" });
  }
};