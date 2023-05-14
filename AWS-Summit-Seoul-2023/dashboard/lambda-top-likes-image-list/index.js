const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB.DocumentClient();
const tableName = process.env.tableName;
const indexName = process.env.indexName;
const bucketName = process.env.bucketName;

exports.handler = async (event) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));
    
    console.log('tableName: ' + tableName);
    let queryParams = {
        TableName: tableName,
        IndexName: indexName,
        ProjectionExpression: "likeCount, id", 
        Limit: 20,
        KeyConditionExpression: "bucketName = :bucketName",
        ExpressionAttributeValues: {
         ":bucketName": bucketName
         },
        ScanIndexForward: false
    };
    
    console.log('## queryParams: ' + JSON.stringify(queryParams) );        
    
    let dynamoQuery; 
    try {
        dynamoQuery = await dynamo.query(queryParams).promise();

        console.log('queryDynamo: '+JSON.stringify(dynamoQuery));
        console.log('queryDynamo: '+dynamoQuery.Count);      
    } catch (error) {
        console.log(error);
        return;
    }  
    
    const response = {
        statusCode: 200,
        body: JSON.stringify(dynamoQuery),
    };
    return response;
};
