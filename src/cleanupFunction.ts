import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});
const dynamoDBClient = new DynamoDBClient({});

export const handler = async (event: any) => {
  const tableName = process.env.TABLE_NAME;
  const topicArn = process.env.TOPIC_ARN;

  await snsClient.send(
    new PublishCommand({
      TopicArn: topicArn,
      Message: `An file deleteded!`,
    })
  );

  console.log(event);
};
