const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB.DocumentClient();
const tableName = process.env.tableName;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    console.log('body: ' + JSON.stringify(body));

    let objName = body['objName'];
    console.log('objName: ', objName);

    var params = {
        TableName: tableName,
        Key: {
            ObjKey: objName,
        },
    };

    let isCompleted = false;
    dynamo.delete(params, function (err, data) {
        if (err) {
            console.log('Failure: ' + err);
        } else {
            isCompleted = true;
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
        }
    });

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