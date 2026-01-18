// src/player_photo_upload.handler.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");
const multipart = require("lambda-multipart-parser"); // parse file uploads

const s3 = new S3Client({});
const ddb = new DynamoDBClient({});
const BUCKET = "pickleball-player-photos"; // replace with your actual S3 bucket

exports.handler = async (event) => {
  try {
    const { files, fields } = await multipart.parse(event);

    if (!files || !files[0]) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file uploaded" }) };
    }

    const file = files[0];
    const playerId = event.pathParameters && event.pathParameters.id;
    if (!playerId) return { statusCode: 400, body: JSON.stringify({ error: "Missing player ID" }) };

    const key = `players/${playerId}/${uuidv4()}-${file.filename}`;

    // Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.content,
        ContentType: file.contentType,
      })
    );

    const photoUrl = `https://${BUCKET}.s3.amazonaws.com/${key}`;

    // Update DynamoDB player record
    await ddb.send(
      new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: { PK: { S: `PLAYER#${playerId}` }, SK: { S: `PROFILE` } },
        UpdateExpression: "SET photoUrl = :url",
        ExpressionAttributeValues: { ":url": { S: photoUrl } },
      })
    );

    return { statusCode: 200, body: JSON.stringify({ photoUrl }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Upload failed" }) };
  }
};
