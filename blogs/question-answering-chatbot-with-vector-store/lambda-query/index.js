const aws = require('aws-sdk');

var dynamo = new aws.DynamoDB();
const tableName = process.env.tableName;

exports.handler = async (event, context) => {
    //console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    //console.log('## EVENT: ' + JSON.stringify(event));

    const userId = event['user-id'];
    const requestId = event['request-id'];

    let msg = "";
    try {
        const key = {
            "user-id": {"S": userId}, 
            "request-id": {"S": requestId}
        };
        console.log("key: ", key);

        var params = {
            Key: key, 
            TableName: tableName
        };
        var result = await dynamo.getItem(params).promise();
        console.log(JSON.stringify(result));

        msg = result['Item']['msg']['S'];
    } catch (error) {
        console.error(error);
    }

    const response = {
        statusCode: 200,
        msg: msg
    };
    return response;
};