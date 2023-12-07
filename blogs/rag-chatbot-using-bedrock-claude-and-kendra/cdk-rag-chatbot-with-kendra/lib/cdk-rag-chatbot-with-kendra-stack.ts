import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as logs from "aws-cdk-lib/aws-logs"
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as kendra from 'aws-cdk-lib/aws-kendra';

const region = process.env.CDK_DEFAULT_REGION;
const debug = false;
const stage = 'dev';
const s3_prefix = 'docs';
const model_id = "anthropic.claude-v2:1";
const projectName = `rag-chatbot-with-kendra`;

const bucketName = `storage-for-${projectName}-${region}`;
const bedrock_region = "us-west-2";  // "us-east-1" "us-west-2" 
const kendra_region = "ap-northeast-1";

const rag_type = 'kendra';  // faiss, opensearch, kendra
const rag_method = 'RetrievalPrompt' // RetrievalPrompt, RetrievalQA, ConversationalRetrievalChain

const enableReference = 'true';
const debugMessageMode = 'false'; // if true, debug messages will be delivered to the client.
const numberOfRelevantDocs = '8';

export class CdkRagChatbotWithKendraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // s3 
    const s3Bucket = new s3.Bucket(this, `storage-${projectName}`, {
      // bucketName: bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'],
        },
      ],
    });
    if (debug) {
      new cdk.CfnOutput(this, 'bucketName', {
        value: s3Bucket.bucketName,
        description: 'The nmae of bucket',
      });
      new cdk.CfnOutput(this, 's3Arn', {
        value: s3Bucket.bucketArn,
        description: 'The arn of s3',
      });
      new cdk.CfnOutput(this, 's3Path', {
        value: 's3://' + s3Bucket.bucketName,
        description: 'The path of s3',
      });
    }

    // copy web application files into s3 bucket
    //new s3Deploy.BucketDeployment(this, `upload-HTML-for-${projectName}`, {
    //  sources: [s3Deploy.Source.asset("../html/")],
    //  destinationBucket: s3Bucket,
    //});    
    new s3Deploy.BucketDeployment(this, `upload-contents-for-${projectName}`, {
      sources: [
        s3Deploy.Source.asset("../contents/faq/")
      ],
      destinationBucket: s3Bucket,
      destinationKeyPrefix: 'faq/' 
    });   
    
    new cdk.CfnOutput(this, 'HtmlUpdateCommend', {
      value: 'aws s3 cp ../html/ ' + 's3://' + s3Bucket.bucketName + '/ --recursive',
      description: 'copy commend for web pages',
    });

    // cloudfront
    const distribution = new cloudFront.Distribution(this, `cloudfront-for-${projectName}`, {
      defaultBehavior: {
        origin: new origins.S3Origin(s3Bucket),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      priceClass: cloudFront.PriceClass.PRICE_CLASS_200,
    });
    new cdk.CfnOutput(this, `distributionDomainName-for-${projectName}`, {
      value: distribution.domainName,
      description: 'The domain name of the Distribution',
    });

    // DynamoDB for call log
    const callLogTableName = `db-call-log-for-${projectName}`;
    const callLogDataTable = new dynamodb.Table(this, `db-call-log-for-${projectName}`, {
      tableName: callLogTableName,
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'request_time', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const callLogIndexName = `index-type-for-${projectName}`;
    callLogDataTable.addGlobalSecondaryIndex({ // GSI
      indexName: callLogIndexName,
      partitionKey: { name: 'request_id', type: dynamodb.AttributeType.STRING },
    });

    // Lambda - chat (websocket)
    const roleLambdaWebsocket = new iam.Role(this, `role-lambda-chat-ws-for-${projectName}`, {
      roleName: `role-lambda-chat-ws-for-${projectName}-${region}`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("bedrock.amazonaws.com"),
        new iam.ServicePrincipal("kendra.amazonaws.com")
      )
    });
    roleLambdaWebsocket.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    });
    const BedrockPolicy = new iam.PolicyStatement({  // policy statement for sagemaker
      resources: ['*'],
      actions: ['bedrock:*'],
    });
    roleLambdaWebsocket.attachInlinePolicy( // add bedrock policy
      new iam.Policy(this, `bedrock-policy-lambda-chat-ws-for-${projectName}`, {
        statements: [BedrockPolicy],
      }),
    );
    const apiInvokePolicy = new iam.PolicyStatement({
      // resources: ['arn:aws:execute-api:*:*:*'],
      resources: ['*'],
      actions: [
        'execute-api:Invoke',
        'execute-api:ManageConnections'
      ],
    });
    roleLambdaWebsocket.attachInlinePolicy(
      new iam.Policy(this, `api-invoke-policy-for-${projectName}`, {
        statements: [apiInvokePolicy],
      }),
    );

    // Kendra  
    let kendraIndex = "";
    const roleKendra = new iam.Role(this, `role-kendra-for-${projectName}`, {
      roleName: `role-kendra-for-${projectName}-${region}`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("kendra.amazonaws.com")
      )
    });
    const cfnIndex = new kendra.CfnIndex(this, 'MyCfnIndex', {
      edition: 'DEVELOPER_EDITION',  // ENTERPRISE_EDITION, 
      name: `reg-kendra-${projectName}`,
      roleArn: roleKendra.roleArn,
    });
    new cdk.CfnOutput(this, `index-of-kendra-for-${projectName}`, {
      value: cfnIndex.attrId,
      description: 'The index of kendra',
    });

    const accountId = process.env.CDK_DEFAULT_ACCOUNT;
    const kendraResourceArn = `arn:aws:kendra:${kendra_region}:${accountId}:index/${cfnIndex.attrId}`
    if (debug) {
      new cdk.CfnOutput(this, `resource-arn-of-kendra-for-${projectName}`, {
        value: kendraResourceArn,
        description: 'The arn of resource',
      });
    }

    const kendraPolicy = new iam.PolicyStatement({
      resources: [kendraResourceArn],
      actions: ['kendra:*'],
    });
    roleKendra.attachInlinePolicy( // add kendra policy
      new iam.Policy(this, `kendra-inline-policy-for-${projectName}`, {
        statements: [kendraPolicy],
      }),
    );

    roleLambdaWebsocket.attachInlinePolicy(
      new iam.Policy(this, `lambda-inline-policy-for-kendra-in-${projectName}`, {
        statements: [kendraPolicy],
      }),
    );

    const passRoleResourceArn = roleLambdaWebsocket.roleArn;
    const passRolePolicy = new iam.PolicyStatement({
      resources: [passRoleResourceArn],
      actions: ['iam:PassRole'],
    });

    roleLambdaWebsocket.attachInlinePolicy( // add pass role policy
      new iam.Policy(this, `pass-role-of-kendra-for-${projectName}`, {
        statements: [passRolePolicy],
      }),
    );

    // api role
    const role = new iam.Role(this, `api-role-for-${projectName}`, {
      roleName: `api-role-for-${projectName}-${region}`,
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
    });
    role.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        'lambda:InvokeFunction',
        'cloudwatch:*'
      ]
    }));
    role.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaExecute',
    });

    kendraIndex = cfnIndex.attrId;

    // API Gateway
    const api = new apiGateway.RestApi(this, `api-chatbot-for-${projectName}`, {
      description: 'API Gateway for chatbot',
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      binaryMediaTypes: ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.ms-powerpoint', 'application/vnd.ms-excel', 'application/msword'],
      deployOptions: {
        stageName: stage,

        // logging for debug
        // loggingLevel: apiGateway.MethodLoggingLevel.INFO, 
        // dataTraceEnabled: true,
      },
    });

    new cdk.CfnOutput(this, `WebUrl-for-${projectName}`, {
      value: 'https://' + distribution.domainName + '/index.html',
      description: 'The web url of request for chat',
    });    

    // Lambda - Upload
    const lambdaUpload = new lambda.Function(this, `lambda-upload-for-${projectName}`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: `lambda-upload-for-${projectName}`,
      code: lambda.Code.fromAsset("../lambda-upload"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucketName: s3Bucket.bucketName,
        s3_prefix: s3_prefix
      }
    });
    s3Bucket.grantReadWrite(lambdaUpload);

    // POST method - upload
    const resourceName = "upload";
    const upload = api.root.addResource(resourceName);
    upload.addMethod('POST', new apiGateway.LambdaIntegration(lambdaUpload, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: false,
    }), {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          },
        }
      ]
    });
    if (debug) {
      new cdk.CfnOutput(this, `ApiGatewayUrl-for-${projectName}`, {
        value: api.url + 'upload',
        description: 'The url of API Gateway',
      });
    }

    // cloudfront setting  
    distribution.addBehavior("/upload", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda - queryResult
    const lambdaQueryResult = new lambda.Function(this, `lambda-query-for-${projectName}`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: `lambda-query-for-${projectName}`,
      code: lambda.Code.fromAsset("../lambda-query"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(60),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: callLogTableName,
        indexName: callLogIndexName
      }
    });
    callLogDataTable.grantReadWriteData(lambdaQueryResult); // permission for dynamo

    // POST method - query
    const query = api.root.addResource("query");
    query.addMethod('POST', new apiGateway.LambdaIntegration(lambdaQueryResult, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: false,
    }), {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          },
        }
      ]
    });

    // cloudfront setting for api gateway    
    distribution.addBehavior("/query", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda - getHistory
    const lambdaGetHistory = new lambda.Function(this, `lambda-gethistory-for-${projectName}`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: `lambda-gethistory-for-${projectName}`,
      code: lambda.Code.fromAsset("../lambda-gethistory"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(60),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: callLogTableName
      }
    });
    callLogDataTable.grantReadWriteData(lambdaGetHistory); // permission for dynamo

    // POST method - history
    const history = api.root.addResource("history");
    history.addMethod('POST', new apiGateway.LambdaIntegration(lambdaGetHistory, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: false,
    }), {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          },
        }
      ]
    });

    // cloudfront setting for api gateway    
    distribution.addBehavior("/history", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda - deleteItems
    const lambdaDeleteItems = new lambda.Function(this, `lambda-deleteItems-for-${projectName}`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: `lambda-deleteItems-for-${projectName}`,
      code: lambda.Code.fromAsset("../lambda-delete-items"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(60),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: callLogTableName
      }
    });
    callLogDataTable.grantReadWriteData(lambdaDeleteItems); // permission for dynamo

    // POST method - delete items
    const deleteItem = api.root.addResource("delete");
    deleteItem.addMethod('POST', new apiGateway.LambdaIntegration(lambdaDeleteItems, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: false,
    }), {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          },
        }
      ]
    });

    // cloudfront setting for api gateway    
    distribution.addBehavior("/delete", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // stream api gateway
    // API Gateway
    const websocketapi = new apigatewayv2.CfnApi(this, `ws-api-for-${projectName}`, {
      description: 'API Gateway for chatbot using websocket',
      apiKeySelectionExpression: "$request.header.x-api-key",
      name: 'api-' + projectName,
      protocolType: "WEBSOCKET", // WEBSOCKET or HTTP
      routeSelectionExpression: "$request.body.action",
    });
    websocketapi.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY); // DESTROY, RETAIN

    const wss_url = `wss://${websocketapi.attrApiId}.execute-api.${region}.amazonaws.com/${stage}`;
    new cdk.CfnOutput(this, 'web-socket-url', {
      value: wss_url,
      description: 'The URL of Web Socket',
    });

    const connection_url = `https://${websocketapi.attrApiId}.execute-api.${region}.amazonaws.com/${stage}`;
    if (debug) {
      new cdk.CfnOutput(this, 'api-identifier', {
        value: websocketapi.attrApiId,
        description: 'The API identifier.',
      });

      new cdk.CfnOutput(this, 'connection-url', {
        value: connection_url,
        description: 'The URL of connection',
      });
    }

    // lambda-chat using websocket    
    const lambdaChatWebsocket = new lambda.DockerImageFunction(this, `lambda-chat-ws-for-${projectName}`, {
      description: 'lambda for chat using websocket',
      functionName: `lambda-chat-ws-for-${projectName}`,
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../lambda-chat-ws')),
      timeout: cdk.Duration.seconds(300),
      memorySize: 8192,
      role: roleLambdaWebsocket,
      environment: {
        bedrock_region: bedrock_region,
        kendra_region: kendra_region,
        model_id: model_id,
        s3_bucket: s3Bucket.bucketName,
        s3_prefix: s3_prefix,
        callLogTableName: callLogTableName,
        connection_url: connection_url,
        rag_type: rag_type,
        enableReference: enableReference,
        path: 'https://' + distribution.domainName + '/docs/',
        kendraIndex: kendraIndex,
        roleArn: roleLambdaWebsocket.roleArn,
        debugMessageMode: debugMessageMode,
        rag_method: rag_method,
        numberOfRelevantDocs: numberOfRelevantDocs
      }
    });
    lambdaChatWebsocket.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    s3Bucket.grantRead(lambdaChatWebsocket); // permission for s3
    callLogDataTable.grantReadWriteData(lambdaChatWebsocket); // permission for dynamo 

    if (debug) {
      new cdk.CfnOutput(this, 'function-chat-ws-arn', {
        value: lambdaChatWebsocket.functionArn,
        description: 'The arn of lambda webchat.',
      });
    }

    const integrationUri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaChatWebsocket.functionArn}/invocations`;
    const cfnIntegration = new apigatewayv2.CfnIntegration(this, `api-integration-for-${projectName}`, {
      apiId: websocketapi.attrApiId,
      integrationType: 'AWS_PROXY',
      credentialsArn: role.roleArn,
      connectionType: 'INTERNET',
      description: 'Integration for connect',
      integrationUri: integrationUri,
    });

    new apigatewayv2.CfnRoute(this, `api-route-for-${projectName}-connect`, {
      apiId: websocketapi.attrApiId,
      routeKey: "$connect",
      apiKeyRequired: false,
      authorizationType: "NONE",
      operationName: 'connect',
      target: `integrations/${cfnIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, `api-route-for-${projectName}-disconnect`, {
      apiId: websocketapi.attrApiId,
      routeKey: "$disconnect",
      apiKeyRequired: false,
      authorizationType: "NONE",
      operationName: 'disconnect',
      target: `integrations/${cfnIntegration.ref}`,
    });

    new apigatewayv2.CfnRoute(this, `api-route-for-${projectName}-default`, {
      apiId: websocketapi.attrApiId,
      routeKey: "$default",
      apiKeyRequired: false,
      authorizationType: "NONE",
      operationName: 'default',
      target: `integrations/${cfnIntegration.ref}`,
    });

    new apigatewayv2.CfnStage(this, `api-stage-for-${projectName}`, {
      apiId: websocketapi.attrApiId,
      stageName: stage
    });

    new cdk.CfnOutput(this, `FAQ-Update-for-${projectName}`, {
      value: 'aws kendra create-faq --index-id ' + kendraIndex + ' --name FAQ_banking --s3-path \'{\"Bucket\":\"' + s3Bucket.bucketName + '\", \"Key\":\"faq/faq-banking.csv\"}\' --role-arn ' + roleLambdaWebsocket.roleArn + ' --language-code ko --region ' + kendra_region + ' --file-format CSV',
      description: 'The commend for uploading contents of FAQ',
    });

    // deploy components
    new componentDeployment(scope, `component-deployment-of-${projectName}`, websocketapi.attrApiId)        
  }
}

export class componentDeployment extends cdk.Stack {
  constructor(scope: Construct, id: string, appId: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new apigatewayv2.CfnDeployment(this, `api-deployment-of-${projectName}`, {
      apiId: appId,
      description: "deploy api gateway using websocker",  // $default
      stageName: stage
    });
  }
} 