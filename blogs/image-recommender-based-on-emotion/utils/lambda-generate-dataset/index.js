const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const personalizeevents = new aws.PersonalizeEvents();

const userDatasetArn = process.env.userDatasetArn;
const userTableName = process.env.userTableName;
const dynamo = new aws.DynamoDB.DocumentClient();

const tableName = process.env.tableName;
const indexName = process.env.indexName;
const trackingId = process.env.trackingId;
const interactionTableName = process.env.interactionTableName;

exports.handler = async (event, context) => {
    //console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    //console.log('## EVENT: ' + JSON.stringify(event));

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    console.log('body: ' + JSON.stringify(body));
    //const header = event['multiValueHeaders'];
    //console.log('header: ' + JSON.stringify(header));

    let response = "";
    let isCompleted = false;

    for(let i in body) {
        let userId = body[i]['userId'];
        console.log('userId: ' + userId);
        let gender = body[i]['gender'];
        console.log('gender: ' + gender);
        let emotion = body[i]['emotion'];
        console.log('emotion: ' + emotion);

        // create user dataset
        try {
            var params = {
                datasetArn: userDatasetArn,
                users: [{
                    userId: userId,
                    properties: {
                    //    "GENERATION": generation,
                        "GENDER": gender,
                        "EMOTION": emotion
                    }
                }]
            };
            console.log('user params: ', JSON.stringify(params));

            const result = await personalizeevents.putUsers(params).promise(); 
            //console.log('putUser result: '+JSON.stringify(result));                
        } catch (error) {
            console.log(error);

            response = {
                statusCode: 500,
                body: error
            };
        }

        // DynamodB for personalize users
        var personalzeParams = {
            TableName: userTableName,
            Item: {
                USER_ID: userId,
                // GENERATION: generation,
                GENDER: gender,
                EMOTION: emotion,
            }
        };
        // console.log('personalzeParams: ' + JSON.stringify(personalzeParams));

        dynamo.put(personalzeParams, function (err, data) {
            if (err) {
                console.log('Failure: ' + err);
            }
            else {
                // console.log('dynamodb put result: ' + JSON.stringify(data));
            }
        });

        let queryParams = {
            TableName: tableName,
            IndexName: indexName,    
            KeyConditionExpression: "Emotion = :emotion",
            ExpressionAttributeValues: {
                ":emotion": emotion
            }
        };

        let dynamoQuery; 
        try {
            dynamoQuery = await dynamo.query(queryParams).promise();

            // console.log('queryDynamo: '+JSON.stringify(dynamoQuery));
            // console.log('queryDynamo: '+dynamoQuery.Count);      
        } catch (error) {
            console.log(error);
            return;
        }  

        let date = new Date();
        const current = Math.floor(date.getTime()/1000.0);
        console.log('current: ', current);

        for(let i in dynamoQuery['Items']) {    
            let itemId = dynamoQuery['Items'][i]['ObjKey'];
            let timestamp = current + parseInt(i);
            let impression = [];
            impression.push(itemId);

            // put event dataset
            try {
                var params = {            
                    sessionId: itemId,
                    trackingId: trackingId,
                    userId: userId,
                    eventList: [{
                        eventType: "click",  // 'rating'
                        sentAt: timestamp,
                        eventId: uuidv4(),
                        itemId: itemId,
                        impression: impression,
                    }],
                };
                // console.log('event params: ', JSON.stringify(params));

                const result = await personalizeevents.putEvents(params).promise();
                // console.log('putEvent result: ' + JSON.stringify(result));

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
                // console.log('impressionStr: ' + impressionStr); 
                
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
                // console.log('personalzeParams: ' + JSON.stringify(personalzeParams));

                dynamo.put(personalzeParams, function (err, data) {
                    if (err) {
                        console.log('Failure: ' + err);
                    }
                    else {
                        // console.log('dynamodb put result: ' + JSON.stringify(data));
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
        } 
    }
    isCompleted = true;

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

    console.debug('response: ' + JSON.stringify(response));
    return response;
};


