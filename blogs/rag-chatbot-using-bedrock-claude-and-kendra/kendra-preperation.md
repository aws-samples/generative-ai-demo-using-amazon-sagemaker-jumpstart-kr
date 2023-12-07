## Kendra 사용 준비

[cdk-rag-chatbot-with-kendra-stack.ts](./cdk-rag-chatbot-with-kendra/lib/cdk-rag-chatbot-with-kendra-stack.ts)에서는 AWS CDK로 Kendra를 설치하고 Lambda에 관련된 권한을 부여합니다.

### Kendra Index의 생성

Kendra를 위한 IAM Role을 생성하고 Index를 만듧니다. 

```python
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

### IAM Role

Kendra Role은 아래와 같은 권한을 가져야 합니다.

```java
{
    "Effect": "Allow",
    "Action": [
        "kendra:*"
    ],
    "Resource": "arn:aws:kendra:[your-region]:[your-account-id]:index/[index-id]"
}
```

이를 CDK로 구현하기 위해 아래와 같이 kendra policy를 생성하여 Lambda의 policy에 추가 합니다

```java
const region = process.env.CDK_DEFAULT_REGION;
const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const kendraResourceArn = `arn:aws:kendra:${kendra_region}:${accountId}:index/${cfnIndex.attrId}`
const kendraPolicy = new iam.PolicyStatement({
    resources: [kendraResourceArn],
    actions: ['kendra:*'],
});

roleLambdaWebsocket.attachInlinePolicy(
    new iam.Policy(this, `lambda-inline-policy-for-kendra-in-${projectName}`, {
        statements: [kendraPolicy],
    }),
);
```

Kendra를 위한 Trust Statement는 아래와 같습니다.

```java
{
   "Version":"2012-10-17",
   "Statement":[
      {
         "Effect":"Allow",
         "Principal":{
            "Service":"kendra.amazonaws.com"
         },
         "Action":"sts:AssumeRole"
      }
   ]
}
```

CDK로 아래와 같이 "kendra.amazonaws.com"을 추가합니다.

```java
const roleLambdaWebsocketWebsocket = new iam.Role(this, `role-lambda-chat-for-${projectName}`, {
    roleName: `role-lambda-chat-for-${projectName}`,
    assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("bedrock.amazonaws.com"),
        new iam.ServicePrincipal("kendra.amazonaws.com")
    )
});
```

[Troubleshooting Amazon Kendra Identity and Access](https://docs.aws.amazon.com/kendra/latest/dg/security_iam_troubleshoot.html)와 같이 Kendra는 "iam:PassRole"을 포함하여야 합니다. 

```java
{
    "Action": [
        "iam:PassRole"
    ],
    "Resource": [
        "arn:aws:iam::[account-id]:role/role-lambda-chat-for-chatbot-with-kendra",
    ],
    "Effect": "Allow"
}
```

이를 [cdk-chatbot-with-kendra-stack.ts](./cdk-rag-chatbot-with-kendra/lib/cdk-rag-chatbot-with-kendra-stack.ts)에서는 아래와 같이 구현할 수 있습니다.

```java
const passRoleResourceArn = roleLambdaWebsocketWebsocket.roleArn;
const passRolePolicy = new iam.PolicyStatement({
    resources: [passRoleResourceArn],
    actions: ['iam:PassRole'],
});
roleLambdaWebsocketWebsocket.attachInlinePolicy(
    new iam.Policy(this, `pass-role-of-kendra-for-${projectName}`, {
        statements: [passRolePolicy],
    }),
);
```  
