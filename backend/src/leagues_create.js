const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

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

const userFromEvent = (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  return claims.sub || claims["cognito:username"] || null;
};

function randId(len = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  while (out.length < len) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

function inviteCode(len = 5) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // avoid O/0, I/1
  let out = "";
  for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

exports.handler = async (event) => {
  try {
    const ownerId = userFromEvent(event);
    if (!ownerId) return json(401, { error: "unauthorized" });

    const body = event.body ? JSON.parse(event.body) : {};
    const name = (body.name || "").trim();
    if (!name) return json(400, { error: "name is required" });

    const visibilityRaw = (body.visibility || "private").toString().toLowerCase();
    const visibility = visibilityRaw === "public" ? "public" : "private";

    const now = new Date().toISOString();
    const leagueId = randId(10);
    const code = inviteCode(5);

    const item = {
      PK: `LEAGUE#${leagueId}`,
      SK: "METADATA",
      leagueId,
      name,
      ownerId,                 // from JWT
      inviteCode: code,
      createdAt: now,
      visibility,
      // owner → league list
      GSI1PK: `OWNER#${ownerId}`,
      GSI1SK: now,
      // invite → league lookup
      GSI2PK: `INVITE#${code}`,
      GSI2SK: `LEAGUE#${leagueId}`,
    };

    if (visibility === "public") {
      // public browse
      item.GSI3PK = "VISIBILITY#PUBLIC";
      item.GSI3SK = now;
    }

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: marshall(item),
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );

    return json(201, {
      leagueId,
      name,
      ownerId,
      inviteCode: code,
      createdAt: now,
      visibility,
    });
  } catch (err) {
    console.error("leagues_create error:", err);
    if (err?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "exists" });
    }
    return json(500, { error: "internal_error" });
  }
};
