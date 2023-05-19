const aws = require('aws-sdk');

const personalizeevents = new aws.PersonalizeEvents();

const datasetArn = process.env.datasetArn;
const userTableName = process.env.userTableName;
const dynamo = new aws.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    //console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    //console.log('## EVENT: ' + JSON.stringify(event));

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    //console.log('body: ' + JSON.stringify(body));
    //const header = event['multiValueHeaders'];
    //console.log('header: ' + JSON.stringify(header));

    const userId = body['userId'];
    console.log('userId: ' + userId);

    const gender = body['gender'];
    console.log('gender: ' + gender);

    const emotion = body['emotion'];
    console.log('emotion: ' + emotion);

    let response = "";
    let isCompleted = false;

    let queryParams = {
        TableName: userTableName,
        KeyConditionExpression: "USER_ID = :userId",
        ExpressionAttributeValues: {
            ":userId": userId
        }
    };

    // check the user's existence. if not, create a user 
    let dynamoQuery; 
    try {
        dynamoQuery = await dynamo.query(queryParams).promise();

        console.log('queryDynamo: '+JSON.stringify(dynamoQuery));
        console.log('queryDynamo: '+dynamoQuery.Count);      

        if(!dynamoQuery.Count) {
            // create the user dataset
            try {
                let params = {
                    datasetArn: datasetArn,
                    users: [{
                        userId: userId,
                        properties: {
                            "GENDER": gender,
                            "EMOTION": emotion
                        }
                    }]
                };
                console.log('user params: ', JSON.stringify(params));

                const result = await personalizeevents.putUsers(params).promise(); 
                console.log('putUser result: '+JSON.stringify(result));                
            } catch (error) {
                console.log(error);

                response = {
                    statusCode: 500,
                    body: error
                };
            }

            try {
                // DynamodB for personalize users
                let personalzeParams = {
                    TableName: userTableName,
                    Item: {
                        USER_ID: userId,
                        GENDER: gender,
                        EMOTION: emotion,
                    }
                };
                console.log('personalzeParams: ' + JSON.stringify(personalzeParams));

                dynamo.put(personalzeParams, function (err, data) {
                    if (err) {
                        console.log('Failure: ' + err);
                    }
                    else {
                        console.log('dynamodb put result: ' + JSON.stringify(data));

                        isCompleted = true;
                        console.log('created: ', userId);

                        response = {
                            statusCode: 200,
                            body: JSON.stringify({
                                userId: userId,
                                gender: gender,
                                emotion: emotion,
                            })
                        };
                    }                    
                }); 
            } catch (error) {
                console.log(error);

                response = {
                    statusCode: 500,
                    body: error
                };
            }
        }
        else {
            isCompleted = true;
            console.log('existed: ', userId);
            
            response = {
                statusCode: 200,
                body: JSON.stringify({
                    userId: userId,
                    gender: gender,
                    emotion: emotion,
                })
            };
        }
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

    console.debug('response: ' + JSON.stringify(response));
    return response;
};


