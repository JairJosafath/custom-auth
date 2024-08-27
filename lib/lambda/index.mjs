import { CognitoJwtVerifier } from "aws-jwt-verify";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const userPoolId = process.env.USER_POOL_ID;
const clientId = process.env.USER_POOL_CLIENT_ID;
const client = new DynamoDBClient({});

/**
 *
 * @description This authorizer function handles all the custom authorizations for the API Gateway
 */
export async function handler(event) {
  const jwtVerifier = new CognitoJwtVerifier({
    userPoolId,
    clientId,
    tokenUse: "id",
  });

  console.log(JSON.stringify(event));
  const token = event.headers.Authorization;
  const resource = event.resource;
  const httpMethod = event.httpMethod;
  const path = event.path;
  const arn = event.methodArn;

  try {
    const claims = await jwtVerifier.verify(token);
    const username = claims["cognito:username"];
    const email = claims.email;
    const ownerUsername = path.split("/")[2];
    const title = path.split("/")[3];

    console.log({
      ownerUsername,
      title,
      username,
      email,
      arn,
    });

    const permissions = await getPermissions(ownerUsername, title);
    console.log(JSON.stringify(permissions));

    const permission = permissions.find(
      (perm) => perm.M.Username.S === username
    ).M.Actions.S;
    console.log("permission = " + JSON.stringify(permission));
    if (permission.includes("R"))
      return generatePolicy(username, "execute-api:Invoke", "Allow", arn, {
        username,
        email,
        ownerUsername,
        title,
        resource,
      });
    return generatePolicy(username, "execute-api:Invoke", "Deny", arn, {
      username,
      email,
      ownerUsername,
      title,
      resource,
    });
  } catch (error) {
    console.error(error);
  }
  return generatePolicy();
}

function generatePolicy(
  username = "",
  action = "",
  effect = "Deny",
  arn = "",
  context = {}
) {
  const policy = {
    principalId: username,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: action,
          Effect: effect,
          Resource: arn,
        },
      ],
    },
    context: {
      ...context,
      username,
      arn,
    },
  };

  console.log({ policy: JSON.stringify(policy) });
  return policy;
}

async function getPermissions(ownerUsername, title) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      Username: { S: ownerUsername },
      Title: { S: title },
    },
  };
  const command = new GetItemCommand(params);
  const data = await client.send(command);
  const Item = data.Item;
  return Item.Permissions.L;
}
