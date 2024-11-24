import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { v4 } from "uuid";

const snsClient = new SNSClient({});
const dynamoDBClient = new DynamoDBClient({});
const VALID_EXTENSIONS = ["pdf", "jpg", "png"];
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: any) => {
  const tableName = process.env.TABLE_NAME;
  const topicArn = process.env.TOPIC_ARN;

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);

    const fileExtension = key.split(".").pop()?.toLowerCase();
    const fileSize = record.s3.object.size;

    if (!VALID_EXTENSIONS.includes(fileExtension || "")) {
      await sendErrorNotification(topicArn, key);
      return;
    }

    const uploadDate = new Date().toISOString();
    const fileId = key; // Use the key as an identifier

    // Store metadata in DynamoDB
    await dynamoDBClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          fileId: {
            S: v4(),
          },
          fileSize: {
            S: fileSize,
          },
          fileExtension: {
            N: fileExtension,
          },
          uploadDate: {
            S: uploadDate,
          },
        },
      })
    );

    // Send email notification about the upload
    await sendEmailNotification(
      topicArn,
      fileId,
      fileSize,
      fileExtension,
      uploadDate
    );
  }
};

const sendEmailNotification = async (
  topicArn: any,
  fileId: string,
  fileSize: number,
  fileExtension: string,
  uploadDate: string
) => {
  await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: `File ID: ${fileId}\nFile Size: ${fileSize}\nFile Extension: ${fileExtension}\nUpload Date: ${uploadDate}`,
    })
  );
  console.log("Notification sent!");
};

const sendErrorNotification = async (topicArn: any, key: string) => {
  await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: `An invalid file type was uploaded: ${key}`,
    })
  );
  console.log("Notification sent!");
};
