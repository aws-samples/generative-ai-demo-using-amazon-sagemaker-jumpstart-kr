const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB.DocumentClient();
const tableName = process.env.tableName;
const indexName = process.env.indexName;
// const domainName = process.env.domainName;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));
    
    console.log('indexName: ' + indexName);

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    console.log('gardenRequestInfo: ' + JSON.stringify(body));

    let userId = body['id'];
    console.log('userId: ', userId);

    let emotion = body['emotion'];
    console.log('emotion: ', emotion);
    
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

        console.log('queryDynamo: '+JSON.stringify(dynamoQuery));
        console.log('queryDynamo: '+dynamoQuery.Count);      
    } catch (error) {
        console.log(error);
        return;
    }  

    let imgInfo = [];
    for(let i in dynamoQuery['Items']) {
        const objKey = dynamoQuery['Items'][i]['ObjKey'];
        const timestamp = dynamoQuery['Items'][i]['Timestamp'];
        const emotion = dynamoQuery['Items'][i]['Emotion'];

        console.log('objKey: ', objKey);
        console.log('timestamp: ', timestamp);
        console.log('emotion: ', emotion);
        
        // const url = 'https://'+domainName+'/'+objKey;
        const url = objKey;
        // console.log('url: ', url);

        const imgProfile = {
            url: url,
            // emotion: emotion,
        }

        imgInfo.push(imgProfile);
    }

    console.log('imgInfo: ', JSON.stringify(imgInfo));

    let landscape = [];
    let portrait = [];
    for(let i in imgInfo) {
        let pos = imgInfo[i].url.indexOf('.jpeg');
        // console.log("url: ", imgInfo[i].url);
        // console.log("pos: ", pos);
        
        let identifier = imgInfo[i].url[pos - 1];
        // console.log("identifier: ", identifier);    

        if (identifier == 'v') {
            portrait.push(imgInfo[i]);
        }
        else {
            landscape.push(imgInfo[i]);
        }
    }
    console.log('landscape: ', JSON.stringify(landscape));
    console.log('portrait: ', JSON.stringify(portrait));
    
    let result = {
        landscape: landscape,
        portrait: portrait
    }
    console.info('result: ', JSON.stringify(result));

    const response = {
        statusCode: 200,
        body: JSON.stringify(result)
    };
    console.debug('response: ', JSON.stringify(response));

    return response;
};

