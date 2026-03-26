import dotenv from "dotenv";
dotenv.config();

import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testConnection() {
  try {
    const data = await client.send(new ListTablesCommand({}));
    console.log("✅ DynamoDB connected");
    console.log("Tables:", data.TableNames);
  } catch (error) {
    console.error("❌ DynamoDB error:", error);
  }
}

testConnection();