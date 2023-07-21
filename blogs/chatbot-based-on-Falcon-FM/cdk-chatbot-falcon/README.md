# CDK를 이용한 인프라 구현

[cdk-chatbot-falcon-stack.ts](./lib/cdk-chatbot-falcon-stack.ts)에 대해 설명합니다.

Chatbot에서 chat을 처리하는 lambda를 python3.9로 아래와 같이 구현합니다. 이때 environment의 endpoint는 Falcon FM에서 생성된 endpoint 이름을 입력합니다.

```python
const lambdaChatApi = new lambda.Function(this, 'lambda-chat', {
    description: 'lambda for chat api',
    functionName: 'lambda-chat-api',
    handler: 'lambda_function.lambda_handler',
    runtime: lambda.Runtime.PYTHON_3_9,
    code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-chat')),
    timeout: cdk.Duration.seconds(120),
    logRetention: logs.RetentionDays.ONE_DAY,
    environment: {
        endpoint: endpoint,
    }
});
```

lambda-chat의 퍼미션은 아래와 같이 SageMaker를 사용할 수 있는 권한와 API Gateway를 invoke 할 수 있도록 설정합니다.

```python
const SageMakerPolicy = new iam.PolicyStatement({  
    actions: ['sagemaker:*'],
    resources: ['*'],
});
lambdaChatApi.role?.attachInlinePolicy(
    new iam.Policy(this, 'sagemaker-policy', {
        statements: [SageMakerPolicy],
    }),
);
lambdaChatApi.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));  
```

마찬가지로 PDF에서 요약(Summary)를 수행하는 lambda-pdf-summay를 Docker Conatiner를 이용하여 정의합니다. 아래와 같이 파일 저장할 bucket의 이름과 폴더를 지정하고, SageMaker, S3 읽기, API Gateway Invoke에 대한 권한을 설정합니다. 

```python
const lambdaPdfApi = new lambda.DockerImageFunction(this, "lambda-pdf-summay", {
    description: 'lambda for pdf api',
    functionName: 'lambda-pdf-api',
    code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../lambda-pdf-summary')),
    timeout: cdk.Duration.seconds(60),
    //logRetention: logs.RetentionDays.ONE_DAY,
    environment: {
        endpoint: endpoint,
        s3_bucket: s3Bucket.bucketName,
        s3_prefix: s3_prefix
    }
});
const version = lambdaPdfApi.currentVersion;
const alias = new lambda.Alias(this, 'LambdaAlias', {
    aliasName: 'Dev',
    version,
});

lambdaPdfApi.role?.attachInlinePolicy( // add sagemaker policy
    new iam.Policy(this, 'sagemaker-policy-for-lambda-pdf', {
        statements: [SageMakerPolicy],
    }),
);
s3Bucket.grantRead(lambdaPdfApi); // permission for s3
lambdaPdfApi.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
```

API Gateway에 대한 권한 및 POST 방식의 '/chat' API를 생성합니다.

```python
// role
const role = new iam.Role(this, "api-role-chatbot", {
    roleName: "api-role-chatbot",
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
const api = new apiGateway.RestApi(this, 'api-chatbot', {
    description: 'API Gateway for chatbot',
    endpointTypes: [apiGateway.EndpointType.REGIONAL],
    deployOptions: {
        stageName: stage,

        // logging for debug
        loggingLevel: apiGateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
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


CloudFront와 API Gateway를 연결하도록 아래와 같이 설정합니다.

```python
const distribution = new cloudFront.Distribution(this, 'cloudfront', {
    defaultBehavior: {
        origin: new origins.S3Origin(s3Bucket),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
    priceClass: cloudFront.PriceClass.PRICE_CLASS_200,
});
new cdk.CfnOutput(this, 'distributionDomainName', {
    value: distribution.domainName,
    description: 'The domain name of the Distribution',
});

distribution.addBehavior("/chat", new origins.RestApiOrigin(api), {
    cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
    allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
    viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
});
```

마찬가지로 [cdk-chatbot-falcon-stack.ts](./cdk-chatbot-falcon/lib/cdk-chatbot-falcon-stack.ts)에서는 '/pdf', '/upload' API를 설정하고 있습니다.




