import {
  aws_apigateway,
  aws_iam,
  aws_lambda,
  RemovalPolicy,
} from "aws-cdk-lib";
import { PassthroughBehavior } from "aws-cdk-lib/aws-apigateway";
import {
  AttributeType,
  StreamViewType,
  TableV2,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { vtlSerializer } from "./util";
import path = require("path");

export class DatabaseStruct extends Construct {
  readonly dynamoDBTable: TableV2;
  constructor(
    scope: Construct,
    id: string,
    api: aws_apigateway.RestApi,
    authorizer: aws_apigateway.CognitoUserPoolsAuthorizer,
    customAuthorizer: aws_apigateway.RequestAuthorizer
  ) {
    super(scope, id);
    this.dynamoDBTable = new TableV2(this, "custom-authTable", {
      partitionKey: { name: "Username", type: AttributeType.STRING },
      sortKey: { name: "Title", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES,
    });

    const credentialsRole = new aws_iam.Role(this, "DatabaseCredentialsRole", {
      assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
      managedPolicies: [
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonDynamoDBFullAccess"
        ),
      ],
    });

    const note = api.root.addResource("notes");
    note.addMethod(
      "POST",
      new aws_apigateway.AwsIntegration({
        service: "dynamodb",
        action: "PutItem",
        options: {
          credentialsRole,
          requestTemplates: {
            "application/json": JSON.stringify({
              TableName: this.dynamoDBTable.tableName,
              Item: {
                Username: {
                  S: "$context.authorizer.claims['cognito:username']",
                },
                Title: { S: "$input.path('$.title')" },
                Content: { S: "$input.path('$.content')" },
                Email: { S: "$context.authorizer.claims.email" },
              },
            }),
          },
          passthroughBehavior: PassthroughBehavior.NEVER,
          integrationResponses: [
            {
              statusCode: "200",
            },
            {
              selectionPattern: "4\\d{2}",
              statusCode: "400",
            },
            {
              selectionPattern: "5\\d{2}",
              statusCode: "500",
            },
          ],
        },
      }),
      {
        authorizer,
        authorizationType: aws_apigateway.AuthorizationType.COGNITO,
      }
    );

    /**
     * Request to update permissions
     *
     * POST /notes/{title}/permissions
     * {
     *  permissions: [
     *  { username: "user1", actions: "CR" },
     *  { username: "user2", actions: "R" },
     *  { username: "user3", actions: "CRUD" }
     *  ]
     * }
     *
     */

    const permission = note.addResource("{title}").addResource("permissions");
    permission.addMethod(
      "POST",
      new aws_apigateway.AwsIntegration({
        service: "dynamodb",
        action: "UpdateItem",
        options: {
          credentialsRole,
          requestTemplates: {
            "application/json": vtlSerializer(
              {
                TableName: this.dynamoDBTable.tableName,
                Key: {
                  Username: {
                    S: "$context.authorizer.claims['cognito:username']",
                  },
                  Title: { S: "$input.params('title')" },
                },
                UpdateExpression:
                  "SET #perm = :permissions, UpdatedAt = :updatedAt",
                ExpressionAttributeValues: {
                  ":permissions": {
                    L: [
                      `
                    #foreach($permission in $input.path('$.permissions'))
                      {
                        "M": {
                          "Username": {"S": "$permission.username"},
                          "Actions": {"S": "$permission.actions"}
                        }
                      }
                        #if($foreach.hasNext),#end
                        #end
                    `,
                    ],
                  },
                  ":updatedAt": {
                    S: "$context.requestTime",
                  },
                },
                ExpressionAttributeNames: {
                  "#perm": "Permissions",
                },
              },
              ["L"]
            ),
          },
          passthroughBehavior: PassthroughBehavior.NEVER,
          integrationResponses: [
            {
              statusCode: "200",
            },
            {
              selectionPattern: "4\\d{2}",
              statusCode: "400",
            },
            {
              selectionPattern: "5\\d{2}",
              statusCode: "500",
            },
          ],
        },
      }),
      {
        authorizer,
        authorizationType: aws_apigateway.AuthorizationType.COGNITO,
      }
    );

    const sharedNote = api.root
      .addResource("shared-notes")
      .addResource("{username}")
      .addResource("{title}");

    sharedNote.addMethod(
      "GET",
      new aws_apigateway.AwsIntegration({
        service: "dynamodb",
        action: "GetItem",
        options: {
          credentialsRole,
          requestTemplates: {
            "application/json": JSON.stringify({
              TableName: this.dynamoDBTable.tableName,
              Key: {
                Username: { S: "$method.request.path.username" },
                Title: { S: "$method.request.path.title" },
              },
            }),
          },
          passthroughBehavior: PassthroughBehavior.NEVER,
          integrationResponses: [
            {
              statusCode: "200",
            },
            {
              selectionPattern: "4\\d{2}",
              statusCode: "400",
            },
            {
              selectionPattern: "5\\d{2}",
              statusCode: "500",
            },
          ],
        },
      }),
      {
        authorizer: customAuthorizer,
      }
    );
  }
}
