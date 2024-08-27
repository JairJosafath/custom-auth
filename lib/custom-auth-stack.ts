import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AuthStruct } from "./auth.struct";
import { DatabaseStruct } from "./database.struct";
import path = require("path");

export class CustomAuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const api = new cdk.aws_apigateway.RestApi(this, "CustomAuthApi", {
      deployOptions: {
        loggingLevel: cdk.aws_apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultMethodOptions: {
        methodResponses: [
          {
            statusCode: "200",
          },
          {
            statusCode: "400",
          },
          {
            statusCode: "500",
          },
        ],
      },
    });
    const auth = new AuthStruct(this, "CustomAuth", api);
    const authorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(
      this,
      "CustomAuthAuthorizer",
      {
        cognitoUserPools: [auth.userPool],
      }
    );
    const fn = new cdk.aws_lambda.Function(this, "CustomAuthorizerFunction", {
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      handler: "index.handler",
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      environment: {
        USER_POOL_ID: auth.userPool.userPoolId,
        USER_POOL_CLIENT_ID: auth.userPoolClient.userPoolClientId,
      },
    });
    const customAuthorizer = new cdk.aws_apigateway.RequestAuthorizer(
      this,
      "CustomAuthorizer",
      {
        handler: fn,
        identitySources: ["method.request.header.Authorization"],
        // resultsCacheTtl: cdk.Duration.minutes(55),
      }
    );
    const database = new DatabaseStruct(
      this,
      "Database",
      api,
      authorizer,
      customAuthorizer
    );
    fn.addEnvironment("DYNAMODB_TABLE", database.dynamoDBTable.tableName);
    fn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["dynamodb:*"],
        resources: [database.dynamoDBTable.tableArn],
      })
    );
  }
}
