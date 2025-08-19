import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
const ddb = new DynamoDBClient({});

export const handler = async () => {
  try {
    // ❌ Do NOT require event.requestContext.authorizer here for public route

    // Example: compute standings by scanning matches (replace with your real query/aggregation)
    const resp = await ddb.send(new ScanCommand({ TableName: process.env.TABLE_NAME }));
    const items = resp.Items ?? [];

    // ...aggregate into standings...
    const standings = []; // TODO: fill with your logic

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(standings),
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ message: "Server error" }) };
  }
};