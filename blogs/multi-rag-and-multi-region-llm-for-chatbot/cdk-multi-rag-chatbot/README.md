# CDK로 인프라 설치하기

S3 Bucket을 생성합니다.

```typescript
const s3Bucket = new s3.Bucket(this, `storage-${projectName}`, {
    bucketName: bucketName,
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

컨텐츠를 S3로 복사합니다. 

```typescript
new s3Deploy.BucketDeployment(this, `upload-contents-for-${projectName}`, {
    sources: [
        s3Deploy.Source.asset("../contents/faq/")
    ],
    destinationBucket: s3Bucket,
    destinationKeyPrefix: 'faq/'
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

대화이력을 저장하기 위한 DynamoDB를 생성합니다. 

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

lambda(chat)위한 Role을 준비합니다.
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

Kendra Index를 생성하고 Role을 생성합니다.

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

const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const kendraResourceArn = `arn:aws:kendra:${kendra_region}:${accountId}:index/${cfnIndex.attrId}`

const kendraPolicy = new iam.PolicyStatement({
    resources: [kendraResourceArn],
    actions: ['kendra:*'],
});
roleKendra.attachInlinePolicy( // add kendra policy
    new iam.Policy(this, `kendra-inline-policy-for-${projectName}`, {
        statements: [kendraPolicy],
    }),
);
kendraIndex = cfnIndex.attrId;

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

OpenSearch의 Domain을 생성합니다.

```typescript
const domainName = projectName
const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const resourceArn = `arn:aws:es:${region}:${accountId}:domain/${domainName}/*`
if (debug) {
    new cdk.CfnOutput(this, `resource-arn-for-${projectName}`, {
        value: resourceArn,
        description: 'The arn of resource',
    });
}

const OpenSearchAccessPolicy = new iam.PolicyStatement({
    resources: [resourceArn],
    actions: ['es:*'],
    effect: iam.Effect.ALLOW,
    principals: [new iam.AnyPrincipal()],
});

const domain = new opensearch.Domain(this, 'Domain', {
    version: opensearch.EngineVersion.OPENSEARCH_2_3,

    domainName: domainName,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    enforceHttps: true,
    fineGrainedAccessControl: {
        masterUserName: opensearch_account,
        // masterUserPassword: cdk.SecretValue.secretsManager('opensearch-private-key'),
        masterUserPassword: cdk.SecretValue.unsafePlainText(opensearch_passwd)
    },
    capacity: {
        masterNodes: 3,
        masterNodeInstanceType: 'm6g.large.search',
        dataNodes: 3,
        dataNodeInstanceType: 'r6g.large.search',
    },
    accessPolicies: [OpenSearchAccessPolicy],
    ebs: {
        volumeSize: 100,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
    },
    nodeToNodeEncryption: true,
    encryptionAtRest: {
        enabled: true,
    },
    zoneAwareness: {
        enabled: true,
        availabilityZoneCount: 3,
    }
});

opensearch_url = 'https://' + domain.domainEndpoint;
```

API Gateway를 생성합니다.

```typescript
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

Websocket을 처리하기 위한 API Gateway를 생성합니다.

```typescript
const websocketapi = new apigatewayv2.CfnApi(this, `ws-api-for-${projectName}`, {
    description: 'API Gateway for chatbot using websocket',
    apiKeySelectionExpression: "$request.header.x-api-key",
    name: 'api-' + projectName,
    protocolType: "WEBSOCKET", // WEBSOCKET or HTTP
    routeSelectionExpression: "$request.body.action",
});
websocketapi.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY); // DESTROY, RETAIN

const wss_url = `wss://${websocketapi.attrApiId}.execute-api.${region}.amazonaws.com/${stage}`;
const connection_url = `https://${websocketapi.attrApiId}.execute-api.${region}.amazonaws.com/${stage}`;
```

lambda(chat)을 생성하고 권한을 설정합니다.

```typescript
const lambdaChatWebsocket = new lambda.DockerImageFunction(this, `lambda-chat-ws-for-${projectName}`, {
    description: 'lambda for chat using websocket',
    functionName: `lambda-chat-ws-for-${projectName}`,
    code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../lambda-chat-ws')),
    timeout: cdk.Duration.seconds(300),
    memorySize: 8192,
    role: roleLambdaWebsocket,
    environment: {
        // bedrock_region: bedrock_region,
        kendra_region: kendra_region,
        // model_id: model_id,
        s3_bucket: s3Bucket.bucketName,
        s3_prefix: s3_prefix,
        callLogTableName: callLogTableName,
        connection_url: connection_url,
        enableReference: enableReference,
        opensearch_account: opensearch_account,
        opensearch_passwd: opensearch_passwd,
        opensearch_url: opensearch_url,
        path: 'https://' + distribution.domainName + '/docs/',
        kendraIndex: kendraIndex,
        roleArn: roleLambdaWebsocket.roleArn,
        debugMessageMode: debugMessageMode,
        useParallelUpload: useParallelUpload,
        useParallelRAG: useParallelRAG,
        numberOfRelevantDocs: numberOfRelevantDocs,
        number_of_LLMs: number_of_LLMs,
        profile_of_LLMs: profile_of_LLMs,
        capabilities: capabilities
    }
});
lambdaChatWebsocket.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
s3Bucket.grantRead(lambdaChatWebsocket); // permission for s3
callLogDataTable.grantReadWriteData(lambdaChatWebsocket); // permission for dynamo 
```

Websocket을 처리하기 위해 API gateway를 설정합니다. 

```typescript
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

API Gateway를 deploy 합니다. 

```typescript
new apigatewayv2.CfnDeployment(this, `api-deployment-of-${projectName}`, {
    apiId: appId,
    description: "deploy api gateway using websocker",  // $default
    stageName: stage
});   
```
