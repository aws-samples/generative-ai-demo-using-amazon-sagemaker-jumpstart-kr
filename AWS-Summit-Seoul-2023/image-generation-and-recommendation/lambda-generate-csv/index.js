const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB.DocumentClient();
const s3 = new aws.S3();
const json2csv = require('json2csv');

const bucketName = process.env.bucketName;
const userTableName = process.env.userTableName;
const interactionTableName = process.env.interactionTableName;
const itemTableName = process.env.itemTableName;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));

    let isCompleted = false;

    // interaction
    let interactionDynamoParams = {
        TableName: interactionTableName,
        //FilterExpression: "Emotion = :emotion",
        //ExpressionAttributeValues: {
        //    ":emotion": emotion
        //}
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

    function wait() {
        return new Promise((resolve, reject) => {
            if (!isCompleted) {
                setTimeout(() => resolve("wait..."), 1000);
            }
            else {
                setTimeout(() => resolve("done..."), 0);
            }
        });
    }
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());

    const response = {
        statusCode: 200,
        //body: JSON.stringify(result)
    };

    return response;
};
