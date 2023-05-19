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
    
    const payloadInteraction = interactionDynamoScan['Items'];
    // console.log('payloadInteraction: ' + JSON.stringify(payloadInteraction)); 
    if(payloadInteraction.length) {
        try {        
            const csvPayload = json2csv.parse(payloadInteraction, { 
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
    }
    else {
        console.log('Interaction payload is empty!'); 
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
    
    const payloadUser = userDynamoScan['Items'];
    // console.log('payloadUser: ' + JSON.stringify(payloadUser)); 
    if(payloadUser.length) {
        try {        
            const csvPayload = json2csv.parse(payloadUser, { 
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
    }
    else {
        console.log('User payload is empty!'); 
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
    
    const payloadItem = itemDynamoScan['Items'];
    // console.log('payloadItem: ' + JSON.stringify(payloadItem)); 
    if(payloadItem.length) {
        try {
            const csvPayload = json2csv.parse(payloadItem, { 
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
    }    
    else {
        console.log('Item payload is empty!'); 
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
