const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB.DocumentClient();
const tableName = process.env.tableName;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));

    let isCompleted = false;
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
            const timestamp = Math.floor(date.getTime()/1000.0);
            console.log('timestamp: ', timestamp);

            // putItem to DynamoDB
            let putParams;
            let searchKey;
            if (splitKey.length >= 4) {
                searchKey = emotion + '/' + favorite;
            }
            else if (splitKey.length == 3) {
                searchKey = emotion;
            }
            else {
                return response = {
                    statusCode: 500,
                    body: splitKey
                };
            }

            putParams = {
                TableName: tableName,
                Item: {
                    ObjKey: key,
                    Timestamp: timestamp,
                    Emotion: searchKey,
                }
            };
            console.log('putParams: ' + JSON.stringify(putParams));

            dynamo.put(putParams, function (err, data) {
                if (err) {
                    console.log('Failure: ' + err);
                }

                console.log('data: ' + JSON.stringify(data));
                isCompleted = true;
            });

            console.log('event.Records.length: ', event.Records.length);
            console.log('i: ', i);            
        }
        else if (eventName == 'ObjectRemoved:Delete') {
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
                    console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                }
            });
        }
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
    };

    return response;
};

