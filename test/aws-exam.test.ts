import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as AwsExam from "../lib/aws-exam-stack";
import "jest-cdk-snapshot";

test("Stack is changed", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AwsExam.AwsExamStack(app, "TestStack");
  // THEN
  expect(stack).toMatchCdkSnapshot();
});
