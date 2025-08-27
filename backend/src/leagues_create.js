// src/leagues_create.js
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { randomUUID } = require("crypto");

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
    const userId = userFromEvent(event);
    if (!userId) return json(401, { error: "unauthorized" });

    const body = event.body ? JSON.parse(event.body) : {};
    const name = (body.name || "").toString().trim();
    const visibility = body.visibility === "public" ? "public" : "private";
    if (!name) return json(400, { error: "name required" });

    const leagueId = randomUUID();
    const createdAt = new Date().toISOString();

    const item = {
      PK: `LEAGUE#${leagueId}`,
      SK: "META",
      leagueId,
      name,
      ownerId: userId,
      createdAt,
      visibility,
      // GSI1: list by owner
      GSI1PK: `OWNER#${userId}`,
      GSI1SK: createdAt,
      // GSI3: list public
      ...(visibility === "public"
        ? { GSI3PK: "VISIBILITY#PUBLIC", GSI3SK: createdAt }
        : {}),
    };

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall(item),
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    }));

    return json(201, {
      leagueId,
      name,
      ownerId: userId,
      createdAt,
      visibility,
    });
  } catch (err) {
    console.error("leagues_create error", err);
    if (err?.name === "ConditionalCheckFailedException") {
      return json(409, { error: "conflict" });
    }
    return json(500, { error: "internal_error" });
  }
};
