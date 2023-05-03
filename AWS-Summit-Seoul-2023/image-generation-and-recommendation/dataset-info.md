# DataSet에 대한 정보를 수집

## Interaction DataSet 입력하기

[lambda-like](https://github.com/kyopark2014/emotion-garden/blob/main/lambda-like/index.js)에서 interaction과 관련된 정보를 수집합니다.

```java
const personalize = new aws.Personalize();
const trackingId = process.env.trackingId;
```

client가 보낸 like event를 interaction으로 처리합니다.

```java
const body = JSON.parse(Buffer.from(event["body"], "base64"));
console.log('likeInfo: ' + JSON.stringify(body));

let userId = body['id'];
console.log('userId: ', userId);

let itemId = body['itemId'];
console.log('itemId: ', itemId);

let impression = body['impression'];
console.log('impression: ', JSON.stringify(impression));
```    

Personalize에 putEvent로 like 정보를 전달합니다.

```java
let date = new Date();
const timestamp = date.getTime();

var params = {            
        sessionId: itemId,
        trackingId: trackingId,
        userId: userId,
        eventList: [{
            eventType: "click",  // 'rating'
            sentAt: timestamp,
            eventId: uuidv4(),
            // eventValue: 11,                
            itemId: itemId,
            impression: impression,
        }],
};

const result = await personalizeevents.putEvents(params).promise();
```    
    

impression을 CSV 파일로 저장하기 위하여 DynamoDB에 이벤트 정보를 저장합니다. 이때 String으로 처리하기 위하여, JSON을 "|"으로 구분하여야 합니다. 

```java
let impressionStr = "";
if(impression.length==1) {
    impressionStr = impression[0];
}
else {
    let i=0;
    for(; i<impression.length-1; i++) {                
        impressionStr += impression[i];    
        impressionStr += '|'
    }
    impressionStr += impression[i]
}
console.log('impressionStr: ' + impressionStr);

// DynamodB for personalize interactions
var personalzeParams = {
    TableName: interactionTableName,
    Item: {
        USER_ID: userId,
        ITEM_ID: itemId,
        TIMESTAMP: timestamp,
        EVENT_TYPE: "click",
        IMPRESSION: impressionStr,
    }
};
console.log('personalzeParams: ' + JSON.stringify(personalzeParams));

dynamo.put(personalzeParams, function (err, data) {
    if (err) {
        console.log('Failure: ' + err);
    }
    else {
        console.log('dynamodb put result: ' + JSON.stringify(data));
    }
});
```

## Item DataSet 수집

[lambda-putItem](https://github.com/kyopark2014/emotion-garden/blob/main/lambda-putItem/index.js)에서는 Item 정보를 수집힙니다.

personalizeevents.putItems()으로 Personlize에 데이터를 import 합니다.

```java
const personalizeevents = new aws.PersonalizeEvents();

const datasetArn = process.env.datasetArn;
const body = JSON.parse(records[i].body);

let key = body.key;
let timestamp = body.timestamp;
let searchKey = body.searchKey;

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

const result = await personalizeevents.putItems(params).promise();
```            

추후 CSV 파일 생성을 위하여 DynamoDB에 저장합니다.

```java
const itemTableName = process.env.itemTableName;
const dynamo = new aws.DynamoDB.DocumentClient();

// DynamodB for personalize items
var personalzeParams = {
  TableName: itemTableName,
  Item: {
    ITEM_ID: key,
    TIMESTAMP: timestamp,
    EMOTION: searchKey,
  }
};
console.log('personalzeParams: ' + JSON.stringify(personalzeParams));

dynamo.put(personalzeParams, function (err, data) {
  if (err) {
    console.log('Failure: ' + err);
  }
  else {
    console.log('dynamodb put result: ' + JSON.stringify(data));
  }
});
```        

 ## User DataSet 수집하기 

[lambda-emotion](https://github.com/kyopark2014/emotion-garden/blob/main/lambda-emotion/index.js)에서는 User에 대한 정보를 수집합니다.

```java
const datasetArn = process.env.datasetArn;

let userId;
if (header['X-user-id']) {
  userId = String(header['X-user-id']);
}
else {
  userId = uuidv4();
}

let generation;
let ageRangeLow = ageRange.Low;
let ageRangeHigh = ageRange.High;
let middleAge = (ageRangeLow + ageRangeHigh) / 2;
if (middleAge <= 5) generation = 'toddler'; // 유아
else if (middleAge <= 12) generation = 'child'; // 아동
else if (middleAge <= 18) generation = 'teenager'; // 청소년
else if (middleAge <= 25) generation = 'young-adult'; // 청년
else if (middleAge <= 49) generation = 'adult'; // 중년
else if (middleAge <= 64) generation = 'middle-age'; // 장년
else if (middleAge >= 65) generation = 'elder'; // 노년

const gender = profile['Gender']['Value'];

const emotions = profile['Emotions'][0]['Type'];

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
```

CSV 파일 변환을 위해 DynamoDB에도 저장합니다.

```java
// DynamodB for personalize users
var personalzeParams = {
  TableName: userTableName,
  Item: {
      USER_ID: userId,
      GENERATION: generation,
      GENDER: gender,
      EMOTION: emotions,
  }
};
console.log('personalzeParams: ' + JSON.stringify(personalzeParams));

dynamo.put(personalzeParams, function (err, data) {
  if (err) {
      console.log('Failure: ' + err);
  }
  else {
      console.log('dynamodb put result: ' + JSON.stringify(data));
  }
});
```
