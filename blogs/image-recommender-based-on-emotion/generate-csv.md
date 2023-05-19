# DynamoDB로 부터 CSV 파일 생성

[lambda-generate-csv](https://github.com/kyopark2014/emotion-garden/blob/main/lambda-generate-csv/index.js)에서는 DynamoDB의 user, item, interaction을 CSV 파일로 저장합니다. 

JSON을 CSV로 변환하는 라이브러리를 아래와 같이 설치합니다.

```java
npm install json2csv
```

그리고 아래와 같이 라이브러리를 코드에 추가합니다.

```java
const json2csv = require('json2csv');
```

interaction에 대한 데이터 처리는 아래와 같습니다. DynamoDB Table을 scan하여 모든 데이터를 읽어서 item에 대한 내용을 payload로 저장합니다. 이후 json2csv를 이용해 parsing한 후에 bucket에 저장합니다.


```java
const interactionTableName = process.env.interactionTableName;

    // interaction
    let interactionDynamoParams = {
        TableName: interactionTableName,
    };

    let interactionDynamoScan; 
    try {
        interactionDynamoScan = await dynamo.scan(interactionDynamoParams).promise();

        console.log('interactionDynamoScan: '+JSON.stringify(interactionDynamoScan));
        console.log('interactionDynamoScan: '+interactionDynamoScan.Count);      
    } catch (error) {
        console.log(error);
        return;
    }  
    
    try {
        const payload = interactionDynamoScan['Items'];
        console.log('payload: ' + JSON.stringify(payload)); 

        const csvPayload = json2csv.parse(payload, { 
            header: true, 
        });

        var params = {
            Bucket: bucketName,
            Key: 'dataset/interactions/interactions.csv',
            Body: csvPayload,
        }

        await s3.upload(params).promise();  
    } catch (error) {
        console.log(error);
        return;        
    }  
```

user 데이터셋에 대한 처리는 아래와 같습니다.

```java
// user
    let userDynamoParams = {
        TableName: userTableName,
    };

    let userDynamoScan; 
    try {
        userDynamoScan = await dynamo.scan(userDynamoParams).promise();

        console.log('userDynamoScan: '+JSON.stringify(userDynamoScan));
        console.log('userDynamoScan: '+userDynamoScan.Count);      
    } catch (error) {
        console.log(error);
        return;
    }  
    
    try {
        const payload = userDynamoScan['Items'];
        console.log('payload: ' + JSON.stringify(payload)); 

        const csvPayload = json2csv.parse(payload, { 
            header: true, 
        });

        var params = {
            Bucket: bucketName,
            Key: 'dataset/users/users.csv',
            Body: csvPayload,
        }

        await s3.upload(params).promise();  
    } catch (error) {
        console.log(error);
        return;        
    }
```

item에 대한 처리는 아래와 같습니다.
      
```java
   // items
    let itemDynamoParams = {
        TableName: itemTableName,
    };

    let itemDynamoScan; 
    try {
        itemDynamoScan = await dynamo.scan(itemDynamoParams).promise();

        console.log('itemDynamoScan: '+JSON.stringify(itemDynamoScan));
        console.log('itemDynamoScan: '+itemDynamoScan.Count);      
    } catch (error) {
        console.log(error);
        return;
    }  
    
    try {
        const payload = itemDynamoScan['Items'];
        console.log('payload: ' + JSON.stringify(payload)); 

        const csvPayload = json2csv.parse(payload, { 
            header: true, 
        });

        var params = {
            Bucket: bucketName,
            Key: 'dataset/items/items.csv',
            Body: csvPayload,
        }

        await s3.upload(params).promise();  

        isCompleted = true;
    } catch (error) {
        console.log(error);
        return;        
    }
```

