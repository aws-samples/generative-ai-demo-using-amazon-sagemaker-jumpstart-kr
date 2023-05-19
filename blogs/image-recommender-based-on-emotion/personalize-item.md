# Personalize의 Item 정보 수집

이미지들이 S3에 저장될때 발생하는 put event를 이용하여 Item 정보를 수집합니다. 

## 아이템(Item) Metadata

이미지에 대한 하나의 아이템에 대한 메타 정보는 ITEM_ID, TIMESTAMP, EMOTION로 아래와 같이 구성합니다. 

```java
{
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
}
```

## 아이템 정보의 수집

하나의 이미지가 S3 bucket에 저장될 때 "emotions/happy/img_20230423-101932_1h.jpeg"와 같이 저장되면 오브젝트의 경로를 이용하여 이미지가 분류되었던 감정(emotion)을 추출할 수 있습니다. S3의 "emotions" 폴더에 대한 이벤트 정보의 수집할 수 있도록 [CDK Stack](./cdk-image-recommender/lib/cdk-image-recommender-stack.ts)에서 "event source"로 아래와 같이 설정합니다.

```java
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
```

[lambda-s3-event](./lambda-s3-event/index.js)와 같이 파일 이름에서 감정을 분류합니다. 이미지 정보는 SQS에 저장되어 이후 [lambda-putItem](./lambda-putItem/index.js)에서 이용됩니다. 

```java
const eventName = event.Records[i].eventName;       
console.log('eventName: ' + eventName);

const bucket = event.Records[i].s3.bucket.name;
const key = decodeURIComponent(event.Records[i].s3.object.key.replace(/\+/g, ' '));

let splitKey = key.split("/");
let emotion, fname;

emotion = splitKey[1];
fname = splitKey[2];

if (eventName == 'ObjectCreated:Put') {
    let date = new Date();
    const timestamp = Math.floor(date.getTime() / 1000.0);

    let searchKey;
    searchKey = emotion;

    const jsonData = {
        key: key,
        timestamp: timestamp,
        searchKey: searchKey
    };

    // push the event to SQS
    let params = {
        MessageDeduplicationId: key,
        MessageAttributes: {},
        MessageBody: JSON.stringify(jsonData),
        QueueUrl: sqsUrl,
        MessageGroupId: "putItem"  // use single lambda for stable diffusion 
    };

    await sqs.sendMessage(params).promise();
}
```

## Personalize에 아이템 정보 전달

[lambda-putItem](./lambda-putItem/index.js)은 아래와 같이 [putItems](https://docs.aws.amazon.com/personalize/latest/dg/API_UBS_PutItems.html)을 이용하여 아이템에 대한 정보를 personalize에 전달합니다.

```java
var params = {
    datasetArn: datasetArn,
    items: [{
        itemId: key,
        properties: {
            "TIMESTAMP": timestamp,
            "EMOTION": searchKey,
        }
    }]
};

await personalizeevents.putItems(params).promise(); 
```

## 아이템 데이터셋 정의

[CDK stack](./cdk-image-recommender/lib/cdk-image-recommender-stack.ts)에서는 아래와 같이 아이템 스키마로 아이템 데이터셋을 정의합니다.

```java
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
```
