# CDK로 인프라 정의하기

여기서는 [cdk-qa-with-rag-stack.ts](./lib/cdk-qa-with-rag-stack.ts)에 대하여 설명합니다.


아래와 같이 S3를 project name을 이용하여 생성합니다. 외부에서 직접 접속은 보안을 위해 막고 편의상 프로젝트 종료로 인프라 삭제시 동시에 삭제되도록 하였습니다.

```java
const projectName = "qa-chatbot-with-rag"
const bucketName = `storage-for-${projectName}`;

const s3Bucket = new s3.Bucket(this, `storage-${projectName}`, {
    bucketName: bucketName,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    publicReadAccess: false,
    versioned: false,
    cors: [{
        allowedHeaders: ['*'],
        allowedMethods: [
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
        ],
        allowedOrigins: ['*'],
    }],
});
```


Call log를 저장하기 위하여 DynamoDB Table을 생성합니다. Table은 User ID(user-id)를 파티션키로 Request ID(request-id)를 Sort Key로 지정하엿습니다. On-Demend로 과금되게 하였고 프로젝트 종료시 다른 인프라와 같이 삭제되도록 설정하였습니다. 검색의 편의를 위하여 GSI로 메시지 type을 지정하였습니다. 메시지 type은 text와 object 두가지를 제공합니다.

```java
// DynamoDB for call log
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

Configuration 정보를 저장하기 위하여 DynamoDB Table을 생성합니다. 여기서 파티션키는 User ID(user-id)입니다. 이것은 Client가 UUID를 이용하여 생성한 고유키로서 사용자를 구분하는데 사용됩니다. 만약 사용자가 titan LLM을 사용하다가 anthrophic LLM으로 변경하면 해당 정보를 저장하였다가 계속적으로 사용할 수 있습니다. 단, 여기서 테스트를 위해 제공하는 Web 기반의 챗봇은 브라우저에서 refresh하면 새로 User ID를 생성하므로 초기화 됩니다.

```java
// DynamoDB for configuration
const configTableName = `db-configuration-for-${projectName}`;
const configDataTable = new dynamodb.Table(this, `dynamodb-configuration-for-${projectName}`, {
    tableName: configTableName,
    partitionKey: { name: 'user-id', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

OpenSearch를 위한 Policy와 Access Policy를 아래와 같이 정의합니다.

```java
const domainName = `os-${projectName}`
const region = process.env.CDK_DEFAULT_REGION;
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

OpenSearch에 대해 아래와 같이 정의합니다.

```java
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
```


Chat을 위한 Lambda를 설정합니다. 현재(2023년 7월) 기준으로 LangChain 라이브러리를 lambda에서 바로 실행할 수가 없어서, 컨테이너로 빌드하여 Lambda에서 수행합니다. Bedrock의 region name, endpoint url, model Id등을 파라미터로 제공합니다. 

```java
// Lambda for chat using langchain (container)
const lambdaChatApi = new lambda.DockerImageFunction(this, `lambda-chat-for-${projectName}`, {
    description: 'lambda for chat api',
    functionName: `lambda-chat-api-for-${projectName}`,
    code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../lambda-chat')),
    timeout: cdk.Duration.seconds(60),
    role: roleLambda,
    environment: {
        bedrock_region: bedrock_region,
        endpoint_url: endpoint_url,
        model_id: model_id,
        s3_bucket: s3Bucket.bucketName,
        s3_prefix: s3_prefix,
        callLogTableName: callLogTableName,
        configTableName: configTableName
    }
});
lambdaChatApi.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
s3Bucket.grantRead(lambdaChatApi); // permission for s3
callLogDataTable.grantReadWriteData(lambdaChatApi); // permission for dynamo
configDataTable.grantReadWriteData(lambdaChatApi); // permission for dynamo
```

SageMaker 사용에 필요한 권한을 추가합니다. 

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


Lambda가 외부와 연결하기 위하서는 API Gateway를 사용합니다. 아래와 같이 IAM Role과 API Gateway를 선언합니다. 

```java
// role
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

// API Gateway
const api = new apiGateway.RestApi(this, `api-chatbot-for-${projectName}`, {
    description: 'API Gateway for chatbot',
    endpointTypes: [apiGateway.EndpointType.REGIONAL],
    binaryMediaTypes: ['application/pdf', 'text/plain', 'text/csv'],
    deployOptions: {
        stageName: stage,

        // logging for debug
        loggingLevel: apiGateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
    },
});  
```

'/chat' API를 위해 HTTP POST를 사용하고 CloudFront와 연결합니다. 

```java
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

distribution.addBehavior("/chat", new origins.RestApiOrigin(api), {
    cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
    viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
});
```

파일업로드시 S3에 저장하는 Lambda를 정의합니다. 

```java
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
```

마찬가지로 '/upload'를 HTTP POST 방식으로 선언하고 CloudFront와 연결합니다.

```java
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
```
