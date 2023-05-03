const aws = require('aws-sdk');
const sqs = new aws.SQS({apiVersion: '2012-11-05'});

const sqsOpenSearchUrl = process.env.sqsOpenSearchUrl;

exports.handler = async (event) => {
    // console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env))
    console.log('## EVENT: ' + JSON.stringify(event))    

    for(let i in event['Records']) {
        const receiptHandle = event['Records'][i]['receiptHandle'];
    
        const body = JSON.parse(event.Records[i].body);
        console.log('body: '+JSON.stringify(body));
        
        // delete messageQueue
        try {
            var deleteParams = {
                QueueUrl: sqsOpenSearchUrl,
                ReceiptHandle: receiptHandle
            };

            sqs.deleteMessage(deleteParams, function(err, data) {
                if (err) {
                console.log("Delete Error", err);
                } else {
                // console.log("Success to delete messageQueue: "+id+", deleting messagQueue: ", data.ResponseMetadata.RequestId);
                }
            });
        } catch (err) {
            console.log(err);
        } 
    }

    const response = {
        statusCode: 200    
    };
    return response;
};