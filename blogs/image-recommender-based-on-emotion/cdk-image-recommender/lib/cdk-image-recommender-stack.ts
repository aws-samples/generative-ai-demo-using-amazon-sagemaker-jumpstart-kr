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
import * as rekognition from 'aws-cdk-lib/aws-rekognition';

const debug = false;
const stage = "dev";

const endpoints = [
  "jumpstart-example-model-txt2img-stabili-2023-05-23-11-01-09-198",
]
const nproc = 1;
const trackingId = "916f972e-f7a2-49ce-ab1b-9802ae166c6e";

export class CdkImageRecommenderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // s3 
    const s3Bucket = new s3.Bucket(this, "image-recommender-storage", {
      // bucketName: "image-recommender",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
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

    // copy image data into s3 bucket
  /*  new s3Deploy.BucketDeployment(this, "upload-image-data", {
      sources: [s3Deploy.Source.asset("../data")],
      destinationBucket: s3Bucket,
    }); */

    // cloudfront
    const distribution = new cloudFront.Distribution(this, 'cloudfront-image-recommender', {
      defaultBehavior: {
        origin: new origins.S3Origin(s3Bucket),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      priceClass: cloudFront.PriceClass.PRICE_CLASS_200,
    });

    const collectionId = 'image-recommender-collectionId';
    const cfnCollection = new rekognition.CfnCollection(this, 'MyCfnCollection', {
      collectionId: collectionId,
    });
    if (debug) {
      new cdk.CfnOutput(this, 'Collection-attrArn', {
        value: cfnCollection.attrArn,
        description: 'The arn of correction in Rekognition',
      }); 
    }

    // API Gateway
    const role = new iam.Role(this, `api-role-image-recommender`, {
      roleName: `api-role-image-recommender-${cdk.Stack.of(this).region}`,
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
    });
    role.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['lambda:InvokeFunction']
    }));
    role.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaExecute',
    });
    
    const api = new apiGateway.RestApi(this, 'api-image-recommender', {
      description: 'API Gateway for emotion gallery',
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      binaryMediaTypes: ['*/*'],
      deployOptions: {
        stageName: stage,

        // logging for debug
        // loggingLevel: apiGateway.MethodLoggingLevel.INFO,
        // dataTraceEnabled: true,
      },
    });

    // SQS - Bulk    
    let queueUrl:string[] = [];
    let queue:any[] = [];
    for(let i=0;i<nproc;i++) {
      queue[i] = new sqs.Queue(this, 'QueueBulk'+i, {
        visibilityTimeout: cdk.Duration.seconds(310),
        queueName: 'queue-image-recommender'+i+'.fifo',
        fifo: true,
        contentBasedDeduplication: false,
        deliveryDelay: cdk.Duration.millis(0),
        retentionPeriod: cdk.Duration.days(2),
      });

      queueUrl.push(queue[i].queueUrl);
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
    const SageMakerPolicy = new iam.PolicyStatement({  // policy statement for sagemaker
      actions: ['sagemaker:*'],
      resources: ['*'],
    });

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
          imgWidth: String(768),   // max 1280 x 800
          imgHeight: String(512)
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

    // DynamoDB for emotion gallery
    const tableName = 'db-image-recommender';
    const dataTable = new dynamodb.Table(this, 'dynamodb-gallery', {
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
      partitionKey: { name: 'ITEM_ID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'TIMESTAMP', type: dynamodb.AttributeType.NUMBER }, 
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // personalize
    const datasetGroup = new personalize.CfnDatasetGroup(this, 'DatasetGroup', {
      name: 'image-recommender-dataset',
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
      name: 'image-recommender-interaction-schema',
      schema: interactionSchemaJson,
    });

    const interactionDataset = new personalize.CfnDataset(this, 'InteractionDataset', {
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      datasetType: 'Interactions',
      name: 'image-recommender-interaction-dataset',
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
    // {
    //  "name": "GENERATION",
    //  "type": "string",
    //  "categorical": true
    // }
    
    const userSchema = new personalize.CfnSchema(this, 'UserSchema', {
      name: 'image-recommender-user-schema',
      schema: userSchemaJson,
    });

    const userDataset = new personalize.CfnDataset(this, 'UserDataset', {
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      datasetType: 'Users',
      name: 'image-recommender-user-dataset',
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
      name: 'image-recommender-itemSchema',
      schema: itemSchemaJson,
    });

    const itemDataset = new personalize.CfnDataset(this, 'ItemDataset', {
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      datasetType: 'Items',
      name: 'image-recommender-itemDataset',
      schemaArn: itemSchema.attrSchemaArn,
    });

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
        itemTableName: itemTableName
      }
    });
    dataTable.grantReadWriteData(lambdaPutItem); // permission for dynamo
    itemDataTable.grantReadWriteData(lambdaPutItem); // permission for personalize
    lambdaPutItem.addEventSource(new SqsEventSource(queueS3PutItem)); // add event source 

    const PersonalizePolicy = new iam.PolicyStatement({
      actions: ['personalize:*'],
      resources: ['*'],
    });
    lambdaPutItem.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdaPutItem', {
        statements: [PersonalizePolicy],
      }),
    );

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
        collectionId: collectionId
      }
    });
    s3Bucket.grantReadWrite(lambdaEmotion);
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

    // Lambda - createUser
    const lambdaCreateUser = new lambda.Function(this, "lambdaCreateUser", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-createUser",
      code: lambda.Code.fromAsset("../lambda-createUser"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        datasetArn: userDataset.attrDatasetArn,
        userTableName: userTableName
      }
    });
    userDataTable.grantReadWriteData(lambdaCreateUser); // permission for dynamo
    
    lambdaCreateUser.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdaEmotion', {
        statements: [PersonalizePolicy],
      }),
    );

    // POST method
    const createUser = api.root.addResource("createUser");
    createUser.addMethod('POST', new apiGateway.LambdaIntegration(lambdaCreateUser, {
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

    // cloudfront setting for api gateway of createUser
    distribution.addBehavior("/createUser", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Lambda for gallery
    const lambdagallery = new lambda.Function(this, 'lambda-gallery', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-gallery",
      code: lambda.Code.fromAsset("../lambda-gallery"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        campaignArn: `arn:aws:personalize:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:campaign/image-recommender-campaign`
      }
    });
    lambdagallery.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdagallery', {
        statements: [PersonalizePolicy],
      }),
    );
    
    // POST method
    const gallery = api.root.addResource('gallery');
    gallery.addMethod('POST', new apiGateway.LambdaIntegration(lambdagallery, {
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

    // cloudfront setting for api gateway of gallery
    distribution.addBehavior("/gallery", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
        interactionTableName: interactionTableName,
        trackingId: trackingId
      }
    });
    lambdaLike.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambdaLike', {
        statements: [PersonalizePolicy],
      }),
    );
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
    // cloudfront setting for api gateway of like
    distribution.addBehavior("/like", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    /////////////// UTILITY /////////////
    // Lambda for gallery from dynamodb
    const lambdagalleryFromDynamoDB = new lambda.Function(this, 'lambda-gallery-from-dynamodb', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-gallery-from-dynamodb",
      code: lambda.Code.fromAsset("../utils/lambda-gallery-from-dynamodb"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        tableName: tableName,
        indexName: indexName,
      }
    });
    dataTable.grantReadWriteData(lambdagalleryFromDynamoDB); // permission for dynamo 

    // POST method
    const galleryfromDB = api.root.addResource('galleryfromDB');
    galleryfromDB.addMethod('POST', new apiGateway.LambdaIntegration(lambdagalleryFromDynamoDB, {
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
    // cloudfront setting for api gateway of gallery from dynamoDB
    distribution.addBehavior("/galleryfromDB", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

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

    // UTIL: Lambda for s3 trigger for image pool
    const lambdaS3eventImagePool = new lambda.Function(this, 'lambda-S3-event-image-pool', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-s3-event-image-pool",
      code: lambda.Code.fromAsset("../utils/lambda-s3-event-image-pool"),
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

    // UTIL: Lambda for retrieve in image pool
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
        // domainName: cloudFrontDomain,
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
    // cloudfront setting for api gateway of gallery
    distribution.addBehavior("/retrieve", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // UTIL: Lambda for remove (image pool)
    const lambdaRemoveImagePool = new lambda.Function(this, 'lambda-remove-image-pool', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-remove-image-pool",
      code: lambda.Code.fromAsset("../utils/lambda-remove-image-pool"),
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

    // UTIL: Lambda for clear-dynamo-index
    const lambdaClearDynamoIndex = new lambda.Function(this, 'lambda-clear-dynamo-index', {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-clear-dynamo-index",
      code: lambda.Code.fromAsset("../utils/lambda-clear-dynamo-index"),
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

    // UTIL: CSV generator
    const lambdaGenerateCSV = new lambda.Function(this, "lambda-generate-csv", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-generate-csv",
      code: lambda.Code.fromAsset("../utils/lambda-generate-csv"),
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
    
    // UTIL: generate dataset for user and interaction
    // SQS - GenDataset    
    const queuePutInteractionDataset = new sqs.Queue(this, 'queuePutInteractionDataset', {
      visibilityTimeout: cdk.Duration.seconds(310),
      queueName: 'queue-put-interaction-dataset.fifo',
      fifo: true,
      contentBasedDeduplication: false,
      deliveryDelay: cdk.Duration.millis(0),
      retentionPeriod: cdk.Duration.days(2),
    });

    const lambdaGenerateDataset = new lambda.Function(this, "lambda-generate-dataset", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-generate-dataset",
      code: lambda.Code.fromAsset("../utils/lambda-generate-dataset"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(180),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        //datasetArn: interactionDataset.attrDatasetArn,
        userDatasetArn: userDataset.attrDatasetArn,
        userTableName: userTableName,
        tableName: tableName,
        indexName: indexName,
        queueUrl: queuePutInteractionDataset.queueUrl
      }
    });    
    interactionDataTable.grantReadWriteData(lambdaGenerateDataset);
    userDataTable.grantReadWriteData(lambdaGenerateDataset); 
    dataTable.grantReadWriteData(lambdaGenerateDataset); // permission for dynamo 
    queuePutInteractionDataset.grantSendMessages(lambdaGenerateDataset); // permision for SQS putItem    
    lambdaGenerateDataset.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambda-generate-dataset', {
        statements: [PersonalizePolicy],
      }),
    );

    const lambdaPutInteractionDataset = new lambda.Function(this, "lambda-put-interaction-dataset", {
      runtime: lambda.Runtime.NODEJS_16_X,
      functionName: "lambda-put-interaction-dataset",
      code: lambda.Code.fromAsset("../utils/lambda-putInteractionDataset"),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(180),
      logRetention: logs.RetentionDays.ONE_DAY,
      environment: {
        interactionTableName: interactionTableName,
        queueUrl: queuePutInteractionDataset.queueUrl,
        trackingId: trackingId
      }
    });    
    interactionDataTable.grantReadWriteData(lambdaPutInteractionDataset); // permission for dynamo 
    queuePutInteractionDataset.grantSendMessages(lambdaPutInteractionDataset); // permision for SQS putItem
    lambdaPutInteractionDataset.role?.attachInlinePolicy(
      new iam.Policy(this, 'personalize-policy-for-lambda-put-interaction-dataset', {
        statements: [PersonalizePolicy],
      }),
    );
    lambdaPutInteractionDataset.addEventSource(new SqsEventSource(queuePutInteractionDataset)); // add event source 

    // POST method
    const generateDataset = api.root.addResource('generateDataset');
    generateDataset.addMethod('POST', new apiGateway.LambdaIntegration(lambdaGenerateDataset, {
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
    distribution.addBehavior("/generateDataset", new origins.RestApiOrigin(api), {
      cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });

    // Outputs
    new cdk.CfnOutput(this, 'CopyHtml', {
      value: 'aws s3 cp ../html/ ' + 's3://' + s3Bucket.bucketName + '/ --recursive',
      description: 'copy commend for data',
    }); 

    new cdk.CfnOutput(this, 'CopySample', {
      value: 'cd .. && unzip samples.zip && aws s3 cp ./samples/ ' + 's3://' + s3Bucket.bucketName + '/ --recursive',
      description: 'copy commend for samples',
    }); 

    new cdk.CfnOutput(this, 'ImageGenerator', {
      value: 'https://' + distribution.domainName + '/imgGenerator.html',
      description: 'url of image generator',
    });

    new cdk.CfnOutput(this, 'Preview', {
      value: 'https://' + distribution.domainName + '/preview.html',
      description: 'url of preview',
    });

    new cdk.CfnOutput(this, 'DatasetGenerator', {
      value: 'https://' + distribution.domainName + '/datasetGenerator.html',
      description: 'url of dataset generator',
    });

    new cdk.CfnOutput(this, 'Gallery', {
      value: 'https://' + distribution.domainName + '/gallery.html',
      description: 'url of gallery',
    }); 
        
    new cdk.CfnOutput(this, 'Enabler', {
      value: 'https://' + distribution.domainName + '/enabler.html',
      description: 'url of enabler',
    });     

    if (debug) {
      new cdk.CfnOutput(this, 'ApiGatewayUrl', {
        value: api.url,
        description: 'The url of API Gateway',
      });
    } 
  } 
}
