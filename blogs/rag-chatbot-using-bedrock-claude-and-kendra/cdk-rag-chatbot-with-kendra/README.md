# CDK로 인프라 구현하기

파일 업로드 및 CloudFront의 정적 보관소를 위해 S3 Bucket을 생성합니다.

```typescript
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
```

FAQ sample을 S3에 복사합니다. Webpage는 S3의 루트에 저장되어야 하므로 아래처럼 복사합니다.

```typescript
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
```

CloudFront를 생성합니다.

```typescript
const distribution = new cloudFront.Distribution(this, `cloudfront-for-${projectName}`, {
    defaultBehavior: {
        origin: new origins.S3Origin(s3Bucket),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
    priceClass: cloudFront.PriceClass.PRICE_CLASS_200,
});
```

채팅이력을 저장하기 위해 DynamoDB를 생성합니다. 

```typescript
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
```

Lambda(chat)을 위한 Role을 설정합니다.

```typescript
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
```

Kendra와 Kendra를 위한 Role을 생성합니다.

```typescript
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
```

Lambda(chat)이 Kendra를 사용할 수 있도록 권한을 부여합니다. 

```typescript
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
```

API Gateway와 Role을 생성합니다.

```typescript
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
    },
});
```

파일 업로드를 위한 Lambda와 API를 설정합니다.

```typescript
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

// cloudfront setting  
distribution.addBehavior("/upload", new origins.RestApiOrigin(api), {
    cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
    viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
});
```

Client에서 검색을 위해 사용하는 API를 설정합니다.

```typescript
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
```


Client에서 채팅 이력을 가져오기 위한 API를 설정합니다.

```typescript
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
```

Client에서 채팅 이력을 삭제하기 위한 API를 설정합니다.

```typescript
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
```

Stream은 Web Socket을 이용하므로 API Gateway를 추가로 생성합니다.

```typescript
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
```

Lambda(chat)을 생성하고 Websocket과 관련된 설정을 합니다.

```typescript
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
```


API Gateway를 deploy하도록 멀티스택을 구현합니다.

```typescript
new componentDeployment(scope, `component-deployment-of-${projectName}`, websocketapi.attrApiId)

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
```
