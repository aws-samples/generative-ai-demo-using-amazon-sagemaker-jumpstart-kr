const aws = require('aws-sdk');
const sqs = new aws.SQS({apiVersion: '2012-11-05'});
const { v4: uuidv4 } = require('uuid');

const personalizeevents = new aws.PersonalizeEvents();

const userDatasetArn = process.env.userDatasetArn;
const userTableName = process.env.userTableName;
const dynamo = new aws.DynamoDB.DocumentClient();

const tableName = process.env.tableName;
const indexName = process.env.indexName;
const queueUrl = process.env.queueUrl;

exports.handler = async (event, context) => {
    //console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    //console.log('## EVENT: ' + JSON.stringify(event));

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    console.log('body: ' + JSON.stringify(body));
    //const header = event['multiValueHeaders'];
    //console.log('header: ' + JSON.stringify(header));

    let response = "";

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

            // push the event to SQS
            try {                
                let uuid = uuidv4();
                let params = {
                    MessageDeduplicationId: uuid,
                    MessageAttributes: {},
                    MessageBody: JSON.stringify({
                        itemId: itemId,
                        userId: userId,
                        eventType: "click",
                        eventId: uuid,
                        timestamp: timestamp
                    }), 
                    QueueUrl: queueUrl,
                    MessageGroupId: "generateDataset"  // use single lambda for stable diffusion 
                };         
                console.log('params: '+JSON.stringify(params));

                let result = await sqs.sendMessage(params).promise();  
                console.log("result="+JSON.stringify(result));

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

    console.debug('response: ' + JSON.stringify(response));
    return response;
};
