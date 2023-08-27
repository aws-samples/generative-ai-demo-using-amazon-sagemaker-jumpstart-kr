# CDK 인프라 배포하기

여기서는 [cdk-varco-opensearch-stack.ts](./lib/cdk-varco-opensearch-stack.ts)에서 정의한 인프라 코드에 대하여 설명합니다.

Chatbot UI를 보여지기 위하여 CloudFront는 S3에 저장된 html, css, image파일을 로드합니다. 또한 S3는 OpenSearch에 문서 파일을 업로드하기 스토리지로도 사용됩니다.

```java
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

Call log를 저장하고 활용하기 위하여, 아래와 같이  DyanmoDB를 정의합니다.

```java
const callLogTableName = `db-call-log-for-${projectName}`;
const callLogDataTable = new dynamodb.Table(this, `db-call-log-for-${projectName}`, {
    tableName: callLogTableName,
    partitionKey: { name: 'user-id', type: dynamodb.AttributeType.STRING },
    sortKey: { name: 'request-id', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
});
const callLogIndexName = `index-type-for-${projectName}`;
callLogDataTable.addGlobalSecondaryIndex({ // GSI
    indexName: callLogIndexName,
    partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
});
```

CloudFront에서 참조할 Web 파일들을 S3에 업로드 합니다.

```java
new s3Deploy.BucketDeployment(this, `upload-HTML-for-${projectName}`, {
    sources: [s3Deploy.Source.asset("../html")],
    destinationBucket: s3Bucket,
});
```



OpenSearch를 위한 Role을 정의합니다.

```java
const domainName = `${projectName}`
const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const resourceArn = `arn:aws:es:${region}:${accountId}:domain/${domainName}/*`
const OpenSearchPolicy = new iam.PolicyStatement({
    resources: [resourceArn],
    actions: ['es:*'],
});
const OpenSearchAccessPolicy = new iam.PolicyStatement({
    resources: [resourceArn],
    actions: ['es:*'],
    effect: iam.Effect.ALLOW,
    principals: [new iam.AnyPrincipal()],
});  
```



아래와 같이 OpenSearch를 정의합니다.

```java
let opensearch_url = "";
const domain = new opensearch.Domain(this, 'Domain', {
    version: opensearch.EngineVersion.OPENSEARCH_2_3,

    domainName: domainName,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    enforceHttps: true,
    fineGrainedAccessControl: {
        masterUserName: opensearch_account,
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

CloudFront를 정의합니다.

```java
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


Chat에 사용할 Lambda의 Role을 정의합니다.

```java
const roleLambda = new iam.Role(this, `role-lambda-chat-for-${projectName}`, {
    roleName: `role-lambda-chat-for-${projectName}`,
    assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com")
    )
});
roleLambda.addManagedPolicy({
    managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
});
roleLambda.attachInlinePolicy( // add opensearch policy
    new iam.Policy(this, `opensearch-policy-for-${projectName}`, {
        statements: [OpenSearchPolicy],
    }),
);
```


lambda-chat을 아래와 같이 정의하고 필요한 권한을 부여합니다.

```java
const lambdaChatApi = new lambda.DockerImageFunction(this, `lambda-chat-for-${projectName}`, {
    description: 'lambda for chat api',
    functionName: `lambda-chat-api-for-${projectName}`,
    code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../lambda-chat')),
    timeout: cdk.Duration.seconds(60),
    memorySize: 4096,
    role: roleLambda,
    environment: {
        opensearch_url: opensearch_url,
        s3_bucket: s3Bucket.bucketName,
        s3_prefix: s3_prefix,
        callLogTableName: callLogTableName,
        varco_region: varco_region,
        endpoint_name: endpoint_name,
        opensearch_account: opensearch_account,
        opensearch_passwd: opensearch_passwd,
        embedding_region: embedding_region,
        endpoint_embedding: endpoint_embedding,
        enableOpenSearch: enableOpenSearch,
        enableReference: enableReference
    }
});
lambdaChatApi.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
s3Bucket.grantRead(lambdaChatApi); // permission for s3
callLogDataTable.grantReadWriteData(lambdaChatApi); // permission for dynamo
```

VARCO LLM이 SageMaker Endpoint를 이용해 제공되므로, 아래와 같이 SageMaker 사용을 위한 권한도 부여합니다.
```java
const SageMakerPolicy = new iam.PolicyStatement({  // policy statement for sagemaker
    actions: ['sagemaker:*'],
    resources: ['*'],
});
lambdaChatApi.role?.attachInlinePolicy( // add sagemaker policy
    new iam.Policy(this, `sagemaker-policy-for-${projectName}`, {
        statements: [SageMakerPolicy],
    }),
);
```

API Gateway를 위한 Role을 정의합니다.

```java
const role = new iam.Role(this, `api-role-for-${projectName}`, {
    roleName: `api-role-for-${projectName}`,
    assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
});
role.addToPolicy(new iam.PolicyStatement({
    resources: ['*'],
    actions: ['lambda:InvokeFunction']
}));
role.addManagedPolicy({
    managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaExecute',
});
```

API Gateway를 정의하고 chat API를 위해 http post로 /chat 를 정의합니다.

```java
const api = new apiGateway.RestApi(this, `api-chatbot-for-${projectName}`, {
    description: 'API Gateway for chatbot',
    endpointTypes: [apiGateway.EndpointType.REGIONAL],
    binaryMediaTypes: ['application/pdf', 'text/plain', 'text/csv'],
    deployOptions: {
        stageName: stage,

        // logging for debug
        // loggingLevel: apiGateway.MethodLoggingLevel.INFO, 
        // dataTraceEnabled: true,
    },
});

// POST method
const chat = api.root.addResource('chat');
chat.addMethod('POST', new apiGateway.LambdaIntegration(lambdaChatApi, {
    passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
    credentialsRole: role,
    integrationResponses: [{
        statusCode: '200',
    }],
    proxy: false,
}), {
    methodResponses: [   // API Gateway sends to the client that called a method.
        {
            statusCode: '200',
            responseModels: {
                'application/json': apiGateway.Model.EMPTY_MODEL,
            },
        }
    ]
}); 
```

CloudFront에서 chat api를 쓸수 있도록 추가합니다.

```java
distribution.addBehavior("/chat", new origins.RestApiOrigin(api), {
    cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
    viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
});
```


Presigned URL을 얻어 올 수 있도록 도와주는 lambda-upload를 정의합니다.

```java
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
```

Upload API를 위해 API Gateway와 CloudFront에 아래와 같이 등록합니다.

```java
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

distribution.addBehavior("/upload", new origins.RestApiOrigin(api), {
    cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
    viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
});
```

