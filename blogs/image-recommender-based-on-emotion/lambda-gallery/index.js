const aws = require('aws-sdk');
const personalizeRuntime = new aws.PersonalizeRuntime();
const campaignArn = process.env.campaignArn

exports.handler = async (event, context) => {
    //console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    //console.log('## EVENT: ' + JSON.stringify(event));
    
    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    //console.log('gardenRequestInfo: ' + JSON.stringify(body));

    let userId = body['userId'];
    console.log('userId: ', userId);

    let emotion = body['emotion'];
    console.log('emotion: ', emotion);

    let recommendationParams = {
        campaignArn: campaignArn,
        userId: userId
    };

    let recommendation; 
    try {
        recommendation = await personalizeRuntime.getRecommendations(recommendationParams).promise();
        console.log ('recommendation: ', JSON.stringify(recommendation));
    } catch (error) {
        console.log(error);
        return;
    }  

    let result = [];
    for(let i in recommendation['itemList']) {
        let itemStr = recommendation['itemList'][i].itemId;
        console.log("itemStr: ", itemStr);

        //const url = 'https://'+domainName+'/'+itemStr;
        const url = itemStr;
        console.log('url: ', url);

        const imgProfile = {
            url: url,
        };

        result.push(imgProfile);
    }    

    let response = {
        statusCode: 200,
        body: JSON.stringify(result)
    };
    console.debug('response: ', JSON.stringify(response));

    return response;
};

