import * as cdk from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import {
  Code,
  FilterCriteria,
  FilterRule,
  Runtime,
  StartingPosition,
} from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

export class AwsExamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fileBucket = new Bucket(this, "FileUploadBucket", {
      lifecycleRules: [{ expiration: cdk.Duration.minutes(30) }],
    });

    const fileTable = new Table(this, "FileMetadata", {
      partitionKey: { name: "fileId", type: AttributeType.STRING },
      sortKey: { name: "fileExtension", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });

    const notifyTopic = new Topic(this, "FileUploadNotifications");

    new Subscription(this, "ErrorSubscription", {
      topic: notifyTopic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: "hristo.zhelev@yahoo.com",
    });

    const fileProcessingFunction = new NodejsFunction(
      this,
      "fileProcessingFunction",
      {
        runtime: Runtime.NODEJS_20_X,
        handler: "handler",
        entry: `${__dirname}/../src/processFunction.ts`,
        environment: {
          BUCKET: fileBucket.bucketName,
          TABLE: fileTable.tableName,
          SNS_TOPIC: notifyTopic.topicArn,
        },
      }
    );

    const cleanupFunction = new NodejsFunction(this, "cleanupFunction", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: `${__dirname}/../src/cleanupFunction.ts`,
      // memorySize: 128,
      environment: {
        TABLE: fileTable.tableName,
        SNS_TOPIC: notifyTopic.topicArn,
      },
    });

    cleanupFunction.addEventSource(
      new DynamoEventSource(fileTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 5,
        filters: [
          FilterCriteria.filter({
            eventName: FilterRule.isEqual("REMOVE"),
          }),
        ],
      })
    );

    fileBucket.grantReadWrite(fileProcessingFunction);
    fileTable.grantReadWriteData(fileProcessingFunction);
    notifyTopic.grantPublish(fileProcessingFunction);

    new cdk.CfnOutput(this, "Stack", {
      value: "Result: ",
    });
  }
}
