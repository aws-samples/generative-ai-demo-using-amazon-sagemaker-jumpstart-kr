# Personalize의 User 정보 수집

얼굴로 인식한 사용자 정보를 Personalize에 사용자(User)로 등록합니다.

## 사용자(User) Metadata

Personalize의 사용자(User)에 대한 메타 정보는 USER_ID, GENDER, EMOTION 로 구성됩니다. 

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


## 사용자 정보의 수집

[lambda-createUser](./lambda-createUser/index.js)에서는 DynamoDB에 기존에 이미 등록된 사용자가 있는지 확인하여 없는 경우에 Personalize에 사용자(User)로 등록합니다. 등록할 때에는 [putUsers](https://docs.aws.amazon.com/personalize/latest/dg/API_UBS_PutUsers.html)를 사용합니다. 

```java
let queryParams = {
    TableName: userTableName,
    KeyConditionExpression: "USER_ID = :userId",
    ExpressionAttributeValues: {
        ":userId": userId
    }
};

let dynamoQuery = await dynamo.query(queryParams).promise();

if (!dynamoQuery.Count) {
    // Personalize
    var params = {
        datasetArn: datasetArn,
        users: [{
            userId: userId,
            properties: {
                "GENDER": gender,
                "EMOTION": emotion
            }
        }]
    };
    await personalizeevents.putUsers(params).promise();
}
```

## 사용자 데이터셋 정의

[CDK stack](./cdk-image-recommender/lib/cdk-image-recommender-stack.ts)에서는 아래와 같이 사용자 스키마로 사용자 데이터셋을 정의합니다.

```java
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
```
