const aws = require('aws-sdk');
const s3 = new aws.S3();
const bucketName = process.env.bucketName;
const dynamo = new aws.DynamoDB.DocumentClient();
const tableName = process.env.tableName;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    console.log('body: ' + JSON.stringify(body));

    let list = body['objName'];
    console.log('object: ', JSON.stringify(list));
    
    let isCompleted = false;
    for (let i in list) {
        console.log('object: ', list[i]);
        
        let s3Params = {
            Bucket: bucketName,
            Key: list[i]
        };
        console.log('s3 params: ', JSON.stringify(s3Params));        
        s3.deleteObject(s3Params, function (err, data) {
            if (err) console.log(err, err.stack);  // error

            console.log('Success: ', data);            
            // console.log('i: ', i);
            // console.log('length: ', list.length);            
        });

        var dynamoParams = {
            TableName: tableName,
            Key: {
                ObjKey: list[i],
            },
        };
        console.log('dynamodb params: ', JSON.stringify(dynamoParams));
        dynamo.delete(dynamoParams, function (err, data) {
            if (err) {
                console.log('Failure: ' + err);
            } else {
                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));

                if(i==list.length-1) isCompleted = true;
            }
        });
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
        // body: JSON.stringify(urlList)
    };
    return response;
};