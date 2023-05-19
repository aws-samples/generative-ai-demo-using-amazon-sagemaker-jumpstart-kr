const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const personalizeevents = new aws.PersonalizeEvents();
const sqs = new aws.SQS({apiVersion: '2012-11-05'});

const datasetArn = process.env.datasetArn;
const datasetGroupArn = process.env.datasetGroupArn;
const personalize = new aws.Personalize();

const interactionTableName = process.env.interactionTableName;
const dynamo = new aws.DynamoDB.DocumentClient();
const trackingId = process.env.trackingId;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    console.log('likeInfo: ' + JSON.stringify(body));

    let userId = body['id'];
    console.log('userId: ', userId);

    let itemId = body['itemId'];
    console.log('itemId: ', itemId);

    let impression = body['impression'];
    console.log('impression: ', JSON.stringify(impression));

 /*   
    var params = {
        datasetGroupArn: datasetGroupArn, 
        name: "eventTracker",
    };
 
    try {
        const result = await personalize.createEventTracker(params).promise();
        console.log('putEvent result: ' + JSON.stringify(result));
        trackingId = result.trackingId;
    } catch (error) {
        console.log(error);
        isCompleted = true;

        response = {
            statusCode: 500,
            body: error
        };
    } */


    let date = new Date();
    const timestamp = Math.floor(date.getTime()/1000.0);
    console.log('timestamp: ', timestamp);

    let response;
    let isCompleted = false;
    // put event dataset
    try {
        let params = {            
            sessionId: itemId,
            trackingId: trackingId,
            userId: userId,
            eventList: [{
                eventType: "click",  // 'watched', 'rating'
                sentAt: timestamp,
                eventId: uuidv4(),
                // eventValue: 11,                
                itemId: itemId,
                impression: impression, 
            }],
        };
        console.log('event params: ', JSON.stringify(params));

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
                impressionStr += '|'     // vertical bar (<1000)
            }
            impressionStr += impression[i]
        }
        console.log('impressionStr: ' + impressionStr);
        
        // DynamodB for personalize interactions
        let dynamoParams = {
            TableName: interactionTableName,
            Item: {
                USER_ID: userId,
                ITEM_ID: itemId,
                TIMESTAMP: timestamp,
                EVENT_TYPE: "click",
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

                isCompleted = true;
            }
        });        
        
        response = {
            statusCode: 200,
            body: "Success"
        };
    } catch (error) {
        console.log(error);

        response = {
            statusCode: 500,
            body: error
        };
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

    return response;
};