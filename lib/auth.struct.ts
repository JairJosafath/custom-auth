import {
  aws_apigateway,
  aws_cognito,
  aws_iam,
  RemovalPolicy,
} from "aws-cdk-lib";
import { PassthroughBehavior } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class AuthStruct extends Construct {
  readonly userPool: aws_cognito.UserPool;
  readonly userPoolClient: aws_cognito.UserPoolClient;
  constructor(scope: Construct, id: string, api: aws_apigateway.RestApi) {
    super(scope, id);
    this.userPool = new aws_cognito.UserPool(this, "CustomAuthUserPool", {
      removalPolicy: RemovalPolicy.DESTROY,
      userPoolName: "custom-auth-user-pool",
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireDigits: false,
        requireSymbols: false,
        requireUppercase: false,
      },
    });

    this.userPoolClient = this.userPool.addClient("CustomAuthUserPoolClient", {
      userPoolClientName: "custom-auth-user-pool-client",
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    const credentialsRole = new aws_iam.Role(
      this,
      "CustomAuthCredentialsRole",
      {
        assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
        managedPolicies: [
          aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonCognitoPowerUser"
          ),
        ],
      }
    );

    api.root.addResource("signup").addMethod(
      "POST",
      new aws_apigateway.AwsIntegration({
        service: "cognito-idp",
        action: "SignUp",
        integrationHttpMethod: "POST",
        options: {
          credentialsRole,
          requestTemplates: {
            "application/json": JSON.stringify({
              ClientId: this.userPoolClient.userPoolClientId,
              Username: "$input.path('$.username')",
              Password: "$input.path('$.password')",
              UserAttributes: [
                {
                  Name: "email",
                  Value: "$input.path('$.email')",
                },
              ],
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
      })
    );

    api.root.addResource("signin").addMethod(
      "POST",
      new aws_apigateway.AwsIntegration({
        service: "cognito-idp",
        action: "InitiateAuth",
        integrationHttpMethod: "POST",
        options: {
          credentialsRole,
          requestTemplates: {
            "application/json": JSON.stringify({
              AuthFlow: "USER_PASSWORD_AUTH",
              ClientId: this.userPoolClient.userPoolClientId,
              AuthParameters: {
                USERNAME: "$input.path('$.username')",
                PASSWORD: "$input.path('$.password')",
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
      })
    );
  }
}
