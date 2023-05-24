const aws = require('aws-sdk');
const sqs = new aws.SQS({apiVersion: '2012-11-05'});
const dynamo = new aws.DynamoDB.DocumentClient();
const queueUrl = process.env.queueUrl;
const interactionTableName = process.env.interactionTableName;
const personalizeevents = new aws.PersonalizeEvents();

exports.handler = async (event, context) => {
    // console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));
    
    const records = event['Records'];
    console.log('records: ' + JSON.stringify(records));
    
    let response;

    for(let i in records) {
        let receiptHandle = records[i].receiptHandle;

        const body = JSON.parse(records[i].body);
        console.log('body: ' + JSON.stringify(body));

        const trackingId = body['trackingId'];
        const itemId = body['itemId'];
        const userId = body['userId'];
        const eventType = body['eventType'];
        const eventId = body['eventId'];
        const timestamp = body['timestamp'];

        let impression = [];
        impression.push(itemId);

        // put interaction dataset
        try {
            let params = {            
                sessionId: itemId,
                trackingId: trackingId,
                userId: userId,
                eventList: [{
                    eventType: eventType,  
                    sentAt: timestamp,
                    eventId: eventId,
                    itemId: itemId,
                    impression: impression,
                }],
            };
            console.log('putEvent params: ', JSON.stringify(params));

            const result = await personalizeevents.putEvents(params).promise();
            console.log('putEvent result: ' + JSON.stringify(result));

            let impressionStr = "";
            if(impression.length==1) {
                impressionStr = impression[0];
            }
            else {
                let i=0;
                for(; i<impression.length-1; i++) {                
                    impressionStr += impression[i];    
                    impressionStr += '|';
                }
                impressionStr += impression[i];
            }
            // console.log('impressionStr: ' + impressionStr); 
            
            // DynamodB for personalize interactions
            let dynamoParams = {
                TableName: interactionTableName,
                Item: {
                    USER_ID: userId,
                    ITEM_ID: itemId,
                    TIMESTAMP: timestamp,
                    EVENT_TYPE: eventType,
                    IMPRESSION: impressionStr,
                }
            };
            console.log('dynamoParams: ' + JSON.stringify(dynamoParams));

            dynamo.put(dynamoParams, function (err, data) {
                if (err) {
                    console.log('Failure: ' + err);
                }
                else {
                    console.log('dynamodb put result: ' + JSON.stringify(data));
                }
            });        
            
        } catch (error) {
            console.log(error);

            response = {
                statusCode: 500,
                body: error
            };
            
            return response;
        }
        
        // delete queue message
        try {
            let deleteParams = {
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle
            };
        
            sqs.deleteMessage(deleteParams, function(err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    console.log("deleting messagQueue: ", data.ResponseMetadata.RequestId);
                }
            });
        } catch (err) {
            console.log(err);
        }
    }
    
    response = {
        statusCode: 200,
        body: "Success"
    };
            
    return response;
};