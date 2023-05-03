const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB.DocumentClient();
const sqs = new aws.SQS({apiVersion: '2012-11-05'});
const tableName = process.env.tableName;
const sqsUrl = process.env.sqsUrl;
const itemTableName = process.env.itemTableName;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));

    // let isCompleted = false;
    let response;
    for (let i in event.Records) {
        // Get the object from the event and show its content type
        const eventName = event.Records[i].eventName; // ObjectCreated:Put        
        console.log('eventName: ' + eventName);

        const bucket = event.Records[i].s3.bucket.name;
        const key = decodeURIComponent(event.Records[i].s3.object.key.replace(/\+/g, ' '));

        console.log('bucket: ' + bucket);
        console.log('key: ' + key);

        var splitKey = key.split("/");
        console.log('splitKey: ' + splitKey);
        console.log('length: ' + splitKey.length);

        let emotion, favorite, fname;

        if (splitKey.length == 3) {
            emotion = splitKey[1];
            console.log('emotion: ', emotion);
            fname = splitKey[2];
            console.log('fname: ', fname);
        }
        else if (splitKey.length == 4) {
            emotion = splitKey[1];
            console.log('emotion: ', splitKey[1]);
            favorite = splitKey[2];
            console.log('favorite: ', splitKey[2]);
            fname = splitKey[3];
            console.log('fname: ', splitKey[3]);
        }
        else {
            console.log('error: ', splitKey);
        }

        if (eventName == 'ObjectCreated:Put') {
            let date = new Date();
            const timestamp = Math.floor(date.getTime()/1000);
            console.log('timestamp: ', timestamp);

            // putItem to DynamoDB            
            let searchKey;
            if (splitKey.length >= 4) {
                searchKey = emotion + '/' + favorite;
            }
            else if (splitKey.length == 3) {
                searchKey = emotion;
            }
            else {
                return {
                    statusCode: 500,
                    body: splitKey
                };
            }

            const jsonData = {
                key: key,
                timestamp: timestamp,
                searchKey: searchKey
            };
            console.log('jsonData: ', JSON.stringify(jsonData));

            // push the event to SQS
            try {
                let params = {
                    // DelaySeconds: 10, // not allow for fifo
                    MessageDeduplicationId: key,
                    MessageAttributes: {},
                    MessageBody: JSON.stringify(jsonData), 
                    QueueUrl: sqsUrl,
                    MessageGroupId: "putItem"  // use single lambda for stable diffusion 
                };         
                console.log('params: '+JSON.stringify(params));
        
                let result = await sqs.sendMessage(params).promise();  
                console.log("result="+JSON.stringify(result));
            } catch (err) {
                console.log(err);
            }             
        }
        else if (eventName == 'ObjectRemoved:Delete') {
            // emotin-garden
            var params = {
                TableName: tableName,
                Key: {
                    ObjKey: key,
                },
            };
            
            dynamo.delete(params, function (err, data) {
                if (err) {
                    console.log('Failure: ' + err);
                } else {
                    console.log("emotion garden: deleteItem succeeded:", JSON.stringify(data, null, 2));
                }
            });

            // personalize
            var personalzeParams = {
                TableName: itemTableName,
                Key: {
                    ITEM_ID: key,
                },
            };
            
            dynamo.delete(personalzeParams, function (err, data) {
                if (err) {
                    console.log('Failure: ' + err);
                } else {
                    console.log("personalize: deleteItem succeeded:", JSON.stringify(data, null, 2));
                }
            });
        }
    }

  /*  function wait() {
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

    response = {
        statusCode: 200,
    }; */

    return response;
};
