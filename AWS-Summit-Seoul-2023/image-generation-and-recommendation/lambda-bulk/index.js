const aws = require('aws-sdk');
const sqs = new aws.SQS({apiVersion: '2012-11-05'});
const sqsBulkUrl = JSON.parse(process.env.sqsBulkUrl);
const nproc = process.env.nproc;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event))
    
    const body = Buffer.from(event["body"], "base64");
    const jsonData = JSON.parse(body)
    console.log('jsonData: ' + JSON.stringify(jsonData));

    const index = jsonData.index;
    const idx = index % nproc;
    console.log('idx: ', idx);
    
    console.log('MessageDeduplicationId: ', jsonData.fname+'_'+index);
    console.log('sqsUrl: ', sqsBulkUrl[idx]);
    try {
        let params = {
            // DelaySeconds: 10, // not allow for fifo
            MessageDeduplicationId: jsonData.fname+'_'+index,
            MessageAttributes: {},
            MessageBody: JSON.stringify(jsonData), 
            QueueUrl: sqsBulkUrl[idx],
            MessageGroupId: "emotion"  // use single lambda for stable diffusion 
        };         
        console.log('params: '+JSON.stringify(params));

        let result = await sqs.sendMessage(params).promise();  
        console.log("result="+JSON.stringify(result));
    } catch (err) {
        console.log(err);
    } 

    const response = {
        statusCode: 200,
        body: JSON.stringify(jsonData)
    };
    return response;
};