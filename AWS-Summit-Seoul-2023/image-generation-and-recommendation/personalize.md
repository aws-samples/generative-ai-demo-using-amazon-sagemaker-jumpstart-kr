# Personalize를 이용한 추천 구현


## 사용자(User) Metadata



### Schema

```java
{
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
}
```

### 구현

[lambda-emotion](https://github.com/kyopark2014/emotion-garden/blob/main/lambda-emotion/index.js)에서 사용자 정보를 personalize에 전달합니다.


```java
var params = {
    datasetArn: datasetArn,
    users: [{
        userId: userId,
        properties: {
            "GENERATION": generation,
            "GENDER": gender,
            "EMOTION": emotions
        }
    }]
};
console.log('user params: ', JSON.stringify(params));

const result = await personalizeevents.putUsers(params).promise(); 
console.log('putUser result: '+JSON.stringify(result));
```



## 아이템(Item) Metadata

### Schema

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

## 구현

[lambda-putItem](https://github.com/kyopark2014/emotion-garden/blob/main/lambda-putItem/index.js)에서 사용자 정보를 personalize에 전달합니다.

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
console.log('user params: ', JSON.stringify(params));

const result = await personalizeevents.putItems(params).promise(); 
console.log('putItem result: '+JSON.stringify(result));
```


## 상호작용(interacion)

### Schema

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

### 구현

[lambda-like](https://github.com/kyopark2014/emotion-garden/blob/main/lambda-like/index.js)에서 사용자 정보를 personalize에 전달합니다.

```java
var params = {            
    sessionId: '1',
    trackingId: trackingId,
    userId: userId,
    eventList: [{
        eventType: "click",  // 'rating'
        sentAt: timestamp,
        eventId: userId,
        itemId: itemId,
        impression: impression,
    }],
};
console.log('event params: ', JSON.stringify(params));

const result = await personalizeevents.putEvents(params).promise();
console.log('putEvent result: ' + JSON.stringify(result));
```

## CDK로 구현하기

[personalize-schema](https://github.com/kyopark2014/emotion-garden/blob/main/personalize-schema.md)에서는 CDK로 Personalize Schema를 구현하는 것에 대해 설명합니다.

## Referecne

[Building Your First Campaign](https://github.com/aws-samples/amazon-personalize-samples/blob/master/getting_started/notebooks/1.Building_Your_First_Campaign.ipynb)

[user-personalization-with-exploration.ipynb](https://github.com/aws-samples/amazon-personalize-samples/blob/master/next_steps/core_use_cases/user_personalization/user-personalization-with-exploration.ipynb)

