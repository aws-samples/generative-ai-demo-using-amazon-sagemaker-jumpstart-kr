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
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const region = process.env.CDK_DEFAULT_REGION;   
const debug = false;
const stage = 'dev';
const s3_prefix = 'docs';
const endpoint_url = "https://prod.us-west-2.frontend.bedrock.aws.dev";
const model_id = "amazon.titan-tg1-large"; // amazon.titan-e1t-medium, anthropic.claude-v1
const userName = "kyopark";
const projectName = `chatbot-os-${userName}`;
const bucketName = `storage-for-${projectName}-${region}`; 
const rag_type = 'opensearch';  // faiss or opensearch
const opensearch_account = "admin";
const opensearch_passwd = "Wifi1234!";
const accessType = "preview"; // aws or preview
const bedrock_region = "us-east-1";  // "us-east-1" "us-west-2" 

export class CdkQaWithRagStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // s3 
    const s3Bucket = new s3.Bucket(this, `storage-${projectName}`,{
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
    if(debug) {
      new cdk.CfnOutput(this, 'bucketName', {
        value: s3Bucket.bucketName,
        description: 'The nmae of bucket',
      });
      new cdk.CfnOutput(this, 's3Arn', {
        value: s3Bucket.bucketArn,
        description: 'The arn of s3',
      });
      new cdk.CfnOutput(this, 's3Path', {
        value: 's3://'+s3Bucket.bucketName,
        description: 'The path of s3',
      });
    }

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

    // DynamoDB for configuration
    const configTableName = `db-configuration-for-${projectName}`;
    const configDataTable = new dynamodb.Table(this, `dynamodb-configuration-for-${projectName}`, {
      tableName: configTableName,
      partitionKey: { name: 'user-id', type: dynamodb.AttributeType.STRING },      
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // copy web application files into s3 bucket
    new s3Deploy.BucketDeployment(this, `upload-HTML-for-${projectName}`, {
      sources: [s3Deploy.Source.asset("../html")],
      destinationBucket: s3Bucket,
    });
    
    // Permission for OpenSearch
    const domainName = `os-${projectName}`
    const accountId = process.env.CDK_DEFAULT_ACCOUNT;
    const resourceArn = `arn:aws:es:${region}:${accountId}:domain/${domainName}/*`
    if(debug) {
      new cdk.CfnOutput(this, `resource-arn-for-${projectName}`, {
        value: resourceArn,
        description: 'The arn of resource',
      }); 
    }

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

    // OpenSearch
    const domain = new opensearch.Domain(this, 'Domain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_3,
      
      domainName: domainName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enforceHttps: true,
      fineGrainedAccessControl: {
        masterUserName: opensearch_account,
        // masterUserPassword: cdk.SecretValue.secretsManager('opensearch-private-key'),
        masterUserPassword:cdk.SecretValue.unsafePlainText(opensearch_passwd)
      },
      capacity: {
        masterNodes: 3,
        masterNodeInstanceType: 'm6g.large.search',
        // multiAzWithStandbyEnabled: false,
        dataNodes: 3,
        dataNodeInstanceType: 'r6g.large.search',        
        // warmNodes: 2,
        // warmInstanceType: 'ultrawarm1.medium.search',
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
    new cdk.CfnOutput(this, `Domain-of-OpenSearch-for-${projectName}`, {
      value: domain.domainArn,
      description: 'The arm of OpenSearch Domain',
    });
    new cdk.CfnOutput(this, `Endpoint-of-OpenSearch-for-${projectName}`, {
      value: 'https://'+domain.domainEndpoint,
      description: 'The endpoint of OpenSearch Domain',
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

    const roleLambda = new iam.Role(this, `role-lambda-chat-for-${projectName}`, {
      roleName: `role-lambda-chat-for-${projectName}-${region}`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("bedrock.amazonaws.com"),
      )
    });
    roleLambda.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    });
    const BedrockPolicy = new iam.PolicyStatement({ 
      resources: ['*'],
      actions: ['bedrock:*'],
    });        
    roleLambda.attachInlinePolicy( // add bedrock policy
      new iam.Policy(this, `bedrock-policy-for-${projectName}`, {
        statements: [BedrockPolicy],
      }),
    );         
    roleLambda.attachInlinePolicy( // add opensearch policy
      new iam.Policy(this, `opensearch-policy-for-${projectName}`, {
        statements: [OpenSearchPolicy],
      }),
    );       

    // Lambda for chat using langchain (container)
    const lambdaChatApi = new lambda.DockerImageFunction(this, `lambda-chat-for-${projectName}`, {
      description: 'lambda for chat api',
      functionName: `lambda-chat-api-for-${projectName}`,
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../lambda-chat')),
      timeout: cdk.Duration.seconds(600),
      memorySize: 4096,
      role: roleLambda,
      environment: {
        bedrock_region: bedrock_region,
        endpoint_url: endpoint_url,
        opensearch_url: 'https://'+domain.domainEndpoint,
        model_id: model_id,
        s3_bucket: s3Bucket.bucketName,
        s3_prefix: s3_prefix,
        callLogTableName: callLogTableName,
        configTableName: configTableName,
        rag_type: rag_type,
        opensearch_account: opensearch_account,
        opensearch_passwd: opensearch_passwd,
        accessType: accessType 
      }
    });     
    lambdaChatApi.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));  
    s3Bucket.grantRead(lambdaChatApi); // permission for s3
    callLogDataTable.grantReadWriteData(lambdaChatApi); // permission for dynamo
    configDataTable.grantReadWriteData(lambdaChatApi); // permission for dynamo

    // role
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
      binaryMediaTypes: ['application/pdf', 'text/plain', 'text/csv'], 
      deployOptions: {
        stageName: stage,

        // logging for debug
        //loggingLevel: apiGateway.MethodLoggingLevel.INFO, 
        //dataTraceEnabled: true,
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
      proxy:false, 
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

    if(debug) {
      new cdk.CfnOutput(this, `apiUrl-chat-for-${projectName}`, {
        value: api.url,
        description: 'The url of API Gateway',
      }); 
      new cdk.CfnOutput(this, `curlUrl-chat-for-${projectName}`, {
        value: "curl -X POST "+api.url+'chat -H "Content-Type: application/json" -d \'{"text":"who are u?"}\'',
        description: 'Curl commend of API Gateway',
      }); 
    }

    // cloudfront setting for api gateway of stable diffusion
    distribution.addBehavior("/chat", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,  
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });    
   
    new cdk.CfnOutput(this, `WebUrl-for-${projectName}`, {
      value: 'https://'+distribution.domainName+'/chat.html',      
      description: 'The web url of request for chat',
    });

    new cdk.CfnOutput(this, `UpdateCommend-for-${projectName}`, {
      value: 'aws s3 cp ../html/chat.js '+'s3://'+s3Bucket.bucketName,
      description: 'The url of web file upload',
    });

    // Lambda - Upload
    const lambdaUpload = new lambda.Function(this, `lambda-upload-for-${projectName}`, {
      runtime: lambda.Runtime.NODEJS_16_X, 
      functionName: `lambda-upload-for-${projectName}`,
      code: lambda.Code.fromAsset("../lambda-upload"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(60),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucketName: s3Bucket.bucketName,
        s3_prefix:  s3_prefix
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
      proxy:false, 
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
        tableName: callLogTableName
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
      proxy:false, 
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
  }
}
