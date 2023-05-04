# CDK로 Personalize에 저장하는 DataSet의 Schema 정의

[cdk-emotion-garden](./cdk-emotion-garden/lib/cdk-emotion-garden-stack.ts)에서는 DataSet에 대한 Schema를 정의합니다.

## Interaction

```java
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
```

## User의 정의

User에 대한 Schema를 정의합니다.

```java
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
```

## Item의 정의

Item에 대한 Schema를 정의합니다.

```java
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
```
