const aws = require('aws-sdk');
const s3 = new aws.S3();
const bucketName = process.env.bucketName;

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
        
        let params = {
            Bucket: bucketName,
            Key: list[i]
        };

        s3.deleteObject(params, function (err, data) {
            if (err) console.log(err, err.stack);  // error

            console.log('Success: ', data);
            
            // console.log('i: ', i);
            // console.log('length: ', list.length);
            if(i==list.length-1) isCompleted = true;
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