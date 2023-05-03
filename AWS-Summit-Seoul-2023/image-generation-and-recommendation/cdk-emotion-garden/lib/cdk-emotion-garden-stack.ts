import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import * as logs from "aws-cdk-lib/aws-logs"
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as personalize from 'aws-cdk-lib/aws-personalize';

const debug = false;
const stage = "dev";
const endpoints = [
  "emotion-garden-model-1",
  "emotion-garden-model-2",
  "emotion-garden-model-3",
  "emotion-garden-model-4",
  "emotion-garden-model-5",
  "emotion-garden-model-6",
  "emotion-garden-model-7",
  "emotion-garden-model-8",
  "emotion-garden-model-9"
]
const nproc = 1;
const cloudFrontDomain = "d3ic6ryvcaoqdy.cloudfront.net";

export class CdkEmotionGardenStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // DynamoDB for emotion garden
    const tableName = 'db-emotion-garden';
    const dataTable = new dynamodb.Table(this, 'dynamodb-emotion-garden', {
      tableName: tableName,
      partitionKey: { name: 'ObjKey', type: dynamodb.AttributeType.STRING },
      //sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING }, // no need
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const indexName = 'Emotion-index';
    dataTable.addGlobalSecondaryIndex({ // GSI
      indexName: indexName,
      partitionKey: { name: 'Emotion', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB for personalize
    const itemTableName = 'db-personalize-items';
    const itemDataTable = new dynamodb.Table(this, 'dynamodb-personalize-item', {
      tableName: itemTableName,
      partitionKey: { name: 'ITEM_ID', type: dynamodb.AttributeType.STRING },
      //sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING }, // no need
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userTableName = 'db-personalize-users';
    const userDataTable = new dynamodb.Table(this, 'dynamodb-personalize-users', {
      tableName: userTableName,
      partitionKey: { name: 'USER_ID', type: dynamodb.AttributeType.STRING },
      //sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING }, // no need
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const interactionTableName = 'db-personalize-interactions';
    const interactionDataTable = new dynamodb.Table(this, 'dynamodb-personalize-interactions', {
      tableName: interactionTableName,
      partitionKey: { name: 'USER_ID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'TIMESTAMP', type: dynamodb.AttributeType.NUMBER }, // no need
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // personalize
    const datasetGroup = new personalize.CfnDatasetGroup(this, 'DatasetGroup', {
      name: 'demo-emotion-garden-dataset',
    });

    const interactionSchemaJson = `{
      "type": "record",
      "name": "Interactions",
      "namespace": "com.amazonaws.personalize.schema",
      "fields": [
        {
          "name": "USER_ID",
          "type": "string"
        },
        {
          "name": "ITEM_ID",
          "type": "string"
        },
        {
          "name": "TIMESTAMP",
          "type": "long"
        },
        { 
          "name": "EVENT_TYPE",
          "type": "string"
        },
        {
          "name": "IMPRESSION",
          "type": "string"
        }
      ],
      "version": "1.0"
    }`;
    const interactionSchema = new personalize.CfnSchema(this, 'InteractionSchema', {
      name: 'emotion-garden-interaction-schema',
      schema: interactionSchemaJson,
    });

    const interactionDataset = new personalize.CfnDataset(this, 'InteractionDataset', {
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      datasetType: 'Interactions',
      name: 'emotion-garden-interaction-dataset',
      schemaArn: interactionSchema.attrSchemaArn,
    });

    const userSchemaJson = `{
      "type": "record",
      "name": "Users",
      "namespace": "com.amazonaws.personalize.schema",
      "fields": [
        {
          "name": "USER_ID",
          "type": "string"
        },
        {
          "name": "GENERATION",
          "type": "string",
          "categorical": true
        },
        {
          "name": "GENDER",
          "type": "string",
          "categorical": true
        },
        {
          "name": "EMOTION",
          "type": "string",
          "categorical": true
        }
      ],
      "version": "1.0"
    }`;
    const userSchema = new personalize.CfnSchema(this, 'UserSchema', {
      name: 'emotion-garden-user-schema',
      schema: userSchemaJson,
    });

    const userDataset = new personalize.CfnDataset(this, 'UserDataset', {
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      datasetType: 'Users',
      name: 'emotion-garden-user-dataset',
      schemaArn: userSchema.attrSchemaArn,
    });


    const itemSchemaJson = `{
      "type": "record",
      "name": "Items",
      "namespace": "com.amazonaws.personalize.schema",
      "fields": [
        {
          "name": "ITEM_ID",
          "type": "string"
        },
        {
          "name": "TIMESTAMP",
          "type": "long"
        },
        {
          "name": "EMOTION",
          "type": "string",
          "categorical": true
        }
      ],
      "version": "1.0"
    }`;
    const itemSchema = new personalize.CfnSchema(this, 'ItemSchema', {
      name: 'emotion-garden-itemSchema',
      schema: itemSchemaJson,
    });

    const itemDataset = new personalize.CfnDataset(this, 'ItemDataset', {
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      datasetType: 'Items',
      name: 'emotion-garden-itemDataset',
      schemaArn: itemSchema.attrSchemaArn,
    });

    // s3 
    const s3Bucket = new s3.Bucket(this, "emotion-garden-storage", {
      bucketName: "demo-emotion-garden",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // removalPolicy: cdk.RemovalPolicy.DESTROY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // autoDeleteObjects: true,
      autoDeleteObjects: false,
      publicReadAccess: false,
      versioned: false,
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
    /*  new s3Deploy.BucketDeployment(this, "upload-HTML-stable-diffusion", {
        sources: [s3Deploy.Source.asset("../html")],
        destinationBucket: s3Bucket,
      }); */

    // cloudfront
    const distribution = new cloudFront.Distribution(this, 'cloudfront-emotion-garden', {
      defaultBehavior: {
        origin: new origins.S3Origin(s3Bucket),
        //  originRequestPolicy: customOriginRequestPolicy,
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      priceClass: cloudFront.PriceClass.PRICE_CLASS_200,
    });

    new cdk.CfnOutput(this, 'distributionDomainName-emotion-garden', {
      value: distribution.domainName,
      description: 'The domain name of the Distribution',
    });

    // Lambda for stable diffusion 
    const lambdaText2Image = new lambda.Function(this, 'lambda-stable-diffusion', {
      description: 'lambda for stable diffusion',
      functionName: 'lambda-stable-diffusion',
      handler: 'lambda_function.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-stable-diffusion')),
      timeout: cdk.Duration.seconds(120),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucket: s3Bucket.bucketName,
        endpoints: JSON.stringify(endpoints),
        //domain: distribution.domainName
        domain: cloudFrontDomain,
        nproc: String(1)
      }
    });

    s3Bucket.grantReadWrite(lambdaText2Image); // permission for s3
    const SageMakerPolicy = new iam.PolicyStatement({  // policy statement for sagemaker
      actions: ['sagemaker:*'],
      resources: ['*'],
    });
    lambdaText2Image.role?.attachInlinePolicy( // add sagemaker policy
      new iam.Policy(this, 'sagemaker-policy', {
        statements: [SageMakerPolicy],
      }),
    );
    // permission for api Gateway
    lambdaText2Image.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // role
    const role = new iam.Role(this, "api-role-emotion-garden", {
      roleName: "api-role-emotion-garden",
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
    const api = new apiGateway.RestApi(this, 'api-emotion-garden', {
      description: 'API Gateway for emotion garden',
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      binaryMediaTypes: ['*/*'],
      deployOptions: {
        stageName: stage,

        // logging for debug
        loggingLevel: apiGateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    // POST method
    const text2image = api.root.addResource('text2image');
    text2image.addMethod('POST', new apiGateway.LambdaIntegration(lambdaText2Image, {
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

    new cdk.CfnOutput(this, 'apiUrl-emotion-garden', {
      value: api.url,
      description: 'The url of API Gateway',
    });
    new cdk.CfnOutput(this, 'curlUrl-emotion-gardenl', {
      value: "curl -X POST " + api.url + 'text2image -H "Content-Type: application/json" -d \'{"text":"astronaut on a horse"}\'',
      description: 'Curl commend of API Gateway',
    });

    // cloudfront setting for api gateway of stable diffusion
    distribution.addBehavior("/text2image", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    new cdk.CfnOutput(this, 'StableDiffusionWebUrl', {
      value: 'https://' + distribution.domainName + '/text2image.html',
      description: 'The web url for text2image',
    });

    // Queue for Search
    const queueOpenSearch = new sqs.Queue(this, 'QueueOpenSearch', {
      queueName: "queue-opensearch",
    });

    // Lambda - emotion
    const lambdaEmotion = new lambda.Function(this, "lambdaEmotion", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-emotion",
      code: lambda.Code.fromAsset("../lambda-emotion"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucketName: s3Bucket.bucketName,
        datasetArn: userDataset.attrDatasetArn,
        sqsOpenSearchUrl: queueOpenSearch.queueUrl,
        userTableName: userTableName
      }
    });
    s3Bucket.grantReadWrite(lambdaEmotion);
    queueOpenSearch.grantSendMessages(lambdaEmotion);
    userDataTable.grantReadWriteData(lambdaEmotion); // permission for dynamo

    const RekognitionPolicy = new iam.PolicyStatement({
      actions: ['rekognition:*'],
      resources: ['*'],
    });
    lambdaEmotion.role?.attachInlinePolicy(
      new iam.Policy(this, 'rekognition-policy', {
        statements: [RekognitionPolicy],
      }),
    );

    const PersonalizePolicy = new iam.PolicyStatement({
      actions: ['personalize:*'],
      resources: ['*'],
    });
    lambdaEmotion.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdaEmotion', {
        statements: [PersonalizePolicy],
      }),
    );

    // POST method
    const resourceName = "emotion";
    const emotion = api.root.addResource(resourceName);
    emotion.addMethod('POST', new apiGateway.LambdaIntegration(lambdaEmotion, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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

    // cloudfront setting for api gateway of emotion
    distribution.addBehavior("/emotion", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    new cdk.CfnOutput(this, 'EmotionWebUrl', {
      value: 'https://' + distribution.domainName + '/emotion.html',
      description: 'The web url of emotion',
    });

    // SQS - Bulk    
    let queueUrl:string[] = [];
    let queue:any[] = [];
    for(let i=0;i<nproc;i++) {
      queue[i] = new sqs.Queue(this, 'QueueBulk'+i, {
        visibilityTimeout: cdk.Duration.seconds(310),
        queueName: 'queue-emotion-garden'+i+'.fifo',
        fifo: true,
        contentBasedDeduplication: false,
        deliveryDelay: cdk.Duration.millis(0),
        retentionPeriod: cdk.Duration.days(2),
      });

      queueUrl.push(queue[i].queueUrl);

      /*new cdk.CfnOutput(this, 'sqsBulkUrl', {
        value: queueBulk.queueUrl,
        description: 'The url of the Queue',
      }); */
    }

    // Lambda - bulk
    const lambdaBulk = new lambda.Function(this, "lambdaBulk", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-bulk",
      code: lambda.Code.fromAsset("../lambda-bulk"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        sqsBulkUrl: JSON.stringify(queueUrl),
        nproc: String(nproc)
      }
    });
    for(let i=0;i<nproc;i++) {
      queue[i].grantSendMessages(lambdaBulk);
    }
    
    // permission for api Gateway
    lambdaBulk.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // POST method
    const bulk = api.root.addResource('bulk');
    bulk.addMethod('POST', new apiGateway.LambdaIntegration(lambdaBulk, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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

    // cloudfront setting for api gateway of bulk
    distribution.addBehavior("/bulk", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda for bulk-stable-diffusion    
    let lambdaBulkStableDiffusion:any[] = [];
    for(let i=0;i<nproc;i++) {
      lambdaBulkStableDiffusion[i] = new lambda.Function(this, 'lambda-bulk-stable-diffusion'+i, {
        description: 'lambda for bulk emotion'+i,
        functionName: 'lambda-bulk-stable-diffusion'+i,
        handler: 'lambda_function.lambda_handler',
        runtime: lambda.Runtime.PYTHON_3_9,
        code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-bulk-stable-diffusion')),
        timeout: cdk.Duration.seconds(300),
        logRetention: logs.RetentionDays.ONE_DAY,
        environment: {
          bucket: s3Bucket.bucketName,
          endpoint: endpoints[i],
          sqsBulkUrl: queue[i].queueUrl,
        }
      });
      lambdaBulkStableDiffusion[i].addEventSource(new SqsEventSource(queue[i]));
      s3Bucket.grantReadWrite(lambdaBulkStableDiffusion[i]); // permission for s3
      lambdaBulkStableDiffusion[i].role?.attachInlinePolicy( // add sagemaker policy
        new iam.Policy(this, 'sagemaker-policy-for-bulk'+i, {
          statements: [SageMakerPolicy],
        }),
      );
    }

    // PutItem
    // SQS for S3 putItem
    const queueS3PutItem = new sqs.Queue(this, 'QueueS3PutItem', {
      visibilityTimeout: cdk.Duration.seconds(310),
      queueName: "queue-s3-putitem.fifo",
      fifo: true,
      contentBasedDeduplication: false,
      deliveryDelay: cdk.Duration.millis(0),
      retentionPeriod: cdk.Duration.days(2),
    });
    if (debug) {
      new cdk.CfnOutput(this, 'sqsS3PutItemUrl', {
        value: queueS3PutItem.queueUrl,
        description: 'The url of the S3 putItem Queue',
      });
    }

    // Lambda for s3 event
    const lambdaS3event = new lambda.Function(this, 'lambda-S3-event', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-s3-event",
      code: lambda.Code.fromAsset("../lambda-s3-event"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: tableName,
        sqsUrl: queueS3PutItem.queueUrl,
        itemTableName: itemTableName
      }
    });
    s3Bucket.grantReadWrite(lambdaS3event); // permission for s3
    dataTable.grantReadWriteData(lambdaS3event); // permission for dynamo
    queueS3PutItem.grantSendMessages(lambdaS3event); // permision for SQS putItem
    itemDataTable.grantReadWriteData(lambdaS3event); // permission for personalize

    // s3 put/delete event source
    const s3PutEventSource = new lambdaEventSources.S3EventSource(s3Bucket, {
      events: [
        s3.EventType.OBJECT_CREATED_PUT,
        s3.EventType.OBJECT_REMOVED_DELETE
      ],
      filters: [
        { prefix: 'emotions/' },
      ]
    });
    lambdaS3event.addEventSource(s3PutEventSource);

    // Lambda for s3 putItem
    const lambdaPutItem = new lambda.Function(this, 'lambda-putItem', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-putItem",
      code: lambda.Code.fromAsset("../lambda-putItem"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: tableName,
        datasetArn: itemDataset.attrDatasetArn,
        sqsUrl: queueS3PutItem.queueUrl,
        sqsOpenSearchUrl: queueOpenSearch.queueUrl,
        itemTableName: itemTableName
      }
    });
    dataTable.grantReadWriteData(lambdaPutItem); // permission for dynamo
    itemDataTable.grantReadWriteData(lambdaPutItem); // permission for personalize
    lambdaPutItem.addEventSource(new SqsEventSource(queueS3PutItem)); // add event source 
    queueOpenSearch.grantSendMessages(lambdaPutItem);
    lambdaPutItem.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdaPutItem', {
        statements: [PersonalizePolicy],
      }),
    );

    // Lambda for garden
    const lambdaGarden = new lambda.Function(this, 'lambda-garden', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-garden",
      code: lambda.Code.fromAsset("../lambda-garden"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        // tableName: tableName,
        // indexName: indexName,
        domainName: cloudFrontDomain,
        campaignArn: `arn:aws:personalize:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:campaign/image-recommender-campaign`
      }
    });
    lambdaGarden.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdaGarden', {
        statements: [PersonalizePolicy],
      }),
    );
    // dataTable.grantReadWriteData(lambdaGarden); // permission for dynamo 

    // POST method
    const garden = api.root.addResource('garden');
    garden.addMethod('POST', new apiGateway.LambdaIntegration(lambdaGarden, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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

    // cloudfront setting for api gateway of garden
    distribution.addBehavior("/garden", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    new cdk.CfnOutput(this, 'GardenWebUrl', {
      value: 'https://' + distribution.domainName + '/garden.html',
      description: 'The web url of garden',
    });

    // Lambda for garden
    const lambdaGardenFromDynamoDB = new lambda.Function(this, 'lambda-garden-from-dynamodb', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-garden-from-dynamodb",
      code: lambda.Code.fromAsset("../lambda-garden-from-dynamodb"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: tableName,
        indexName: indexName,
        domainName: cloudFrontDomain,
      }
    });
    dataTable.grantReadWriteData(lambdaGardenFromDynamoDB); // permission for dynamo 

    // POST method
    const gardenfromDB = api.root.addResource('gardenfromDB');
    gardenfromDB.addMethod('POST', new apiGateway.LambdaIntegration(lambdaGardenFromDynamoDB, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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
    // cloudfront setting for api gateway of garden from dynamoDB
    distribution.addBehavior("/gardenfromDB", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda for remove
    const lambdaRemove = new lambda.Function(this, 'lambda-remove', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-remove",
      code: lambda.Code.fromAsset("../lambda-remove"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucketName: s3Bucket.bucketName,
      }
    });
    s3Bucket.grantReadWrite(lambdaRemove); // permission for s3    
    // POST method
    const remove = api.root.addResource('remove');
    remove.addMethod('POST', new apiGateway.LambdaIntegration(lambdaRemove, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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
    // cloudfront setting for api gateway of remove
    distribution.addBehavior("/remove", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda for clear-dynamo-index
    const lambdaClearDynamoIndex = new lambda.Function(this, 'lambda-clear-dynamo-index', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-clear-dynamo-index",
      code: lambda.Code.fromAsset("../lambda-clear-dynamo-index"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: tableName,
      }
    });
    dataTable.grantReadWriteData(lambdaClearDynamoIndex); // permission for dynamo 
    // POST method
    const clearIndex = api.root.addResource('clearIndex');
    clearIndex.addMethod('POST', new apiGateway.LambdaIntegration(lambdaClearDynamoIndex, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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
    // cloudfront setting for api gateway of clearIndex
    distribution.addBehavior("/clearIndex", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    new cdk.CfnOutput(this, 'HtmlUpdateCommend', {
      value: 'aws s3 cp ../html/ ' + 's3://' + s3Bucket.bucketName + '/html --recursive',
      description: 'copy commend for web pages',
    });
    new cdk.CfnOutput(this, 'BackupCommend', {
      value: 'aws s3 cp ' + 's3://' + s3Bucket.bucketName + '/emotions/ ./emotions/ --recursive',
      description: 'copy commend for backup images',
    });
    new cdk.CfnOutput(this, 'RestoreCommend', {
      value: 'aws s3 cp ./emotions/ ' + 's3://' + s3Bucket.bucketName + '/emotions/ --recursive',
      description: 'copy commend for restore images',
    });
    new cdk.CfnOutput(this, 'UploadCommend', {
      value: 'aws s3 cp imgPool/ ' + 's3://' + s3Bucket.bucketName + '/emotions/ . --recursive',
      description: 'copy commend for backup images',
    });

    new cdk.CfnOutput(this, 'downloadCommendFromImagePool', {
      value: 'aws s3 cp s3://' + s3Bucket.bucketName + '/imgPool/ ./imgPool/ --recursive',
      description: 'copy commend for backup images in image pool',
    });
    new cdk.CfnOutput(this, 'uploadCommendFromImagePool', {
      value: 'aws s3 cp ./imgPool/ s3://' + s3Bucket.bucketName + '/emotions/ --recursive',
      description: 'retore commend for backup images in image pool',
    });

    // Lambda - like
    const lambdaLike = new lambda.Function(this, "lambdaLike", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-like",
      code: lambda.Code.fromAsset("../lambda-like"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        datasetArn: interactionDataset.attrDatasetArn,
        datasetGroupArn: datasetGroup.attrDatasetGroupArn,
        sqsOpenSearchUrl: queueOpenSearch.queueUrl,
        interactionTableName: interactionTableName,
        trackingId: "c6321b19-9ba0-4b69-8a39-69d954affa59"
      }
    });
    lambdaLike.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdaLike', {
        statements: [PersonalizePolicy],
      }),
    );
    queueOpenSearch.grantSendMessages(lambdaLike);
    interactionDataTable.grantReadWriteData(lambdaLike); // personalize 

    // POST method
    const resourceLike = api.root.addResource('like');
    resourceLike.addMethod('POST', new apiGateway.LambdaIntegration(lambdaLike, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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
    // cloudfront setting for api gateway of clearIndex
    distribution.addBehavior("/like", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });


    // Image Pool
    // DynamoDB for image pool
    const imgPoolTableName = 'db-image-pool';
    const imgPoolDataTable = new dynamodb.Table(this, 'dynamodb-image-pool', {
      tableName: imgPoolTableName,
      partitionKey: { name: 'ObjKey', type: dynamodb.AttributeType.STRING },
      //sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING }, // no need
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const imgPoolIndexName = 'ImagePool-index';
    imgPoolDataTable.addGlobalSecondaryIndex({ // GSI
      indexName: imgPoolIndexName,
      partitionKey: { name: 'Emotion', type: dynamodb.AttributeType.STRING },
    });

    // Lambda for s3 trigger for image pool
    const lambdaS3eventImagePool = new lambda.Function(this, 'lambda-S3-event-image-pool', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-s3-event-image-pool",
      code: lambda.Code.fromAsset("../lambda-s3-event-image-pool"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: imgPoolTableName,
      }
    });
    s3Bucket.grantReadWrite(lambdaS3eventImagePool); // permission for s3
    imgPoolDataTable.grantReadWriteData(lambdaS3eventImagePool); // permission for dynamo

    // s3 put/delete event source
    const imgPoolS3PutEventSource = new lambdaEventSources.S3EventSource(s3Bucket, {
      events: [
        s3.EventType.OBJECT_CREATED_PUT,
        s3.EventType.OBJECT_REMOVED_DELETE
      ],
      filters: [
        { prefix: 'imgPool/' },
      ]
    });
    lambdaS3eventImagePool.addEventSource(imgPoolS3PutEventSource);

    // Lambda for retrieve 
    const lambdaRetrieve = new lambda.Function(this, 'lambda-retrieve', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-retrieve",
      code: lambda.Code.fromAsset("../lambda-retrieve"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: imgPoolTableName,
        indexName: imgPoolIndexName,
        domainName: cloudFrontDomain,
      }
    });
    imgPoolDataTable.grantReadWriteData(lambdaRetrieve); // permission for dynamo 
    // POST method
    const retrieve = api.root.addResource('retrieve');
    retrieve.addMethod('POST', new apiGateway.LambdaIntegration(lambdaRetrieve, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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
    // cloudfront setting for api gateway of garden
    distribution.addBehavior("/retrieve", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda for remove (image pool)
    const lambdaRemoveImagePool = new lambda.Function(this, 'lambda-remove-image-pool', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-remove-image-pool",
      code: lambda.Code.fromAsset("../lambda-remove-image-pool"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucketName: s3Bucket.bucketName,
        tableName: imgPoolTableName,
      }
    });
    s3Bucket.grantReadWrite(lambdaRemoveImagePool); // permission for s3    
    // POST method
    const removePool = api.root.addResource('removePool');
    removePool.addMethod('POST', new apiGateway.LambdaIntegration(lambdaRemoveImagePool, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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
    // cloudfront setting for api gateway of remove
    distribution.addBehavior("/removePool", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda - opensearch
    const lambdaOpensearch = new lambda.Function(this, "LambdaOpensearch", {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: "lambda-opensearch",
      code: lambda.Code.fromAsset("../lambda-opensearch"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      environment: {
        sqsOpenSearchUrl: queueOpenSearch.queueUrl
      }
    });
    lambdaOpensearch.addEventSource(new SqsEventSource(queueOpenSearch));

    // DynamoDB for Personalize
    const lambdaGenerateCSV = new lambda.Function(this, "lambda-generate-csv", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-generate-csv",
      code: lambda.Code.fromAsset("../lambda-generate-csv"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucketName: s3Bucket.bucketName,
        userTableName: userTableName,
        interactionTableName: interactionTableName,
        itemTableName: itemTableName
      }
    });
    s3Bucket.grantReadWrite(lambdaGenerateCSV);
    interactionDataTable.grantReadWriteData(lambdaGenerateCSV);
    itemDataTable.grantReadWriteData(lambdaGenerateCSV);
    userDataTable.grantReadWriteData(lambdaGenerateCSV); // permission for dynamo

    // Lambda - imagePage
    const lambdaImagePage = new lambda.Function(this, "lambdaImagePage", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-imagePage",
      code: lambda.Code.fromAsset("../lambda-imagePage"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        domainName: cloudFrontDomain
      }
    });

    // querystring
    // define template
    const templateString: string = `#set($inputRoot = $input.path('$'))
    {
        "content": "$input.params('content')"
    }`;

    const requestTemplates = { // path through
      'application/json': templateString,
    };

    // POST method
    const resourceImagePage = api.root.addResource('image');
    resourceImagePage.addMethod('GET', new apiGateway.LambdaIntegration(lambdaImagePage, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: requestTemplates,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
    }), {
      requestParameters: {
        'method.request.querystring.content': true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          },
        }
      ]
    });
    // cloudfront setting for api gateway of clearIndex
    distribution.addBehavior("/image", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda - updateDisplay
    const lambdaUpdateDisplay = new lambda.Function(this, "lambdaUpdateDisplay", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-updateDisplay",
      code: lambda.Code.fromAsset("../lambda-updateDisplay"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        bucket: s3Bucket.bucketName
      }
    });
    s3Bucket.grantReadWrite(lambdaUpdateDisplay);
    
    // POST method
    const resourceUpdateDisplay = api.root.addResource('updateDisplay');
    resourceUpdateDisplay.addMethod('POST', new apiGateway.LambdaIntegration(lambdaUpdateDisplay, {
      passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      credentialsRole: role,
      integrationResponses: [{
        statusCode: '200',
      }],
      proxy: true,
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
    // cloudfront setting for api gateway of clearIndex
    distribution.addBehavior("/updateDisplay", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });
  }
}

