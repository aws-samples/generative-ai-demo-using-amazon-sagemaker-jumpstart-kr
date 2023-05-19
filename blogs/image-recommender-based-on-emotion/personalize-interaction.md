# Personalize의 상호작용(interaction) 정보 수집

사용자의 event를 상호작용(interaction)로 등록하여 개인화 추천에 사용합니다.

## 상호작용(interaction) Metadata

Personalize의 상호작용(interaction)에 대한 메타 정보는 USER_ID, ITEM_ID, TIMESTAMP, EVENT_TYPE, IMPRESSION로 구성됩니다. 

```java
{
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
}
```

## 상호작용 정보의 수집

[lambda-like](./lambda-like/index.js)에서는 Personalize의 상호작용(interaction) 정보를 등록합니다. 등록할 때에는 [putEvents](https://docs.aws.amazon.com/personalize/latest/dg/API_UBS_PutEvents.html)를 사용합니다. 

```java
let params = {            
    sessionId: itemId,
    trackingId: trackingId,
    userId: userId,
    eventList: [{
        eventType: "click", 
        sentAt: timestamp,
        eventId: uuidv4(),
        itemId: itemId,
        impression: impression, 
    }],
};
console.log('event params: ', JSON.stringify(params));

await personalizeevents.putEvents(params).promise();
```

## 상호작용 데이터셋 정의

[CDK stack](./cdk-image-recommender/lib/cdk-image-recommender-stack.ts)에서는 아래와 같이 상호작용 스키마로 상호작용 데이터셋을 정의합니다.

```java
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
```
