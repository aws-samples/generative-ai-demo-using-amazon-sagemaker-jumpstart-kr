const aws = require('aws-sdk');
const s3 = new aws.S3();

const bucketName = process.env.bucket;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));

    const body = JSON.parse(Buffer.from(event["body"], "base64"));
    console.log('body: ' + JSON.stringify(body));

    let zoneName = body.zone;
    console.log('zoneName: ' + zoneName);

    let keyLandscape = [];
    for(let i=1;i<=8;i++) {
        keyLandscape.push(`display/${zoneName}/img${i}h.jpeg`);
    }
    console.log('key landscape: ', JSON.stringify(keyLandscape));

    let keyPortlate = [];
    for(let i=1;i<=8;i++) {
        keyPortlate.push(`display/${zoneName}/img${i}v.jpeg`);
    }
    console.log('key portrait: ', JSON.stringify(keyPortlate));
    
    let landscapeImgs = body.landscape;
    for(let i in landscapeImgs) {
        console.log('landscape: ', landscapeImgs[i]);
    }
    let portraitImgs = body.portrait;
    for(let i in portraitImgs) {
        console.log('portrait: ', portraitImgs[i]);
    }

    for(let i=0;i<8;i++) {
        if(landscapeImgs[i]) {
            const copyparams = {
                CopySource : encodeURI(`${bucketName}/${landscapeImgs[i]}`),
                Bucket : bucketName,
                Key :  keyLandscape[i]
            };
            console.log('copyparams: ', JSON.stringify(copyparams));
    
            await s3.copyObject(copyparams).promise();
        }        
    }    

    for(let i=0;i<8;i++) {
        if(portraitImgs[i]) {
            const copyparams = {
                CopySource : encodeURI(`${bucketName}/${portraitImgs[i]}`),
                Bucket : bucketName,
                Key :  keyPortlate[i]
            };
            console.log('copyparams: ', JSON.stringify(copyparams));
    
            await s3.copyObject(copyparams).promise();
        }        
    }

    let response = {
        statusCode: 200,
        body: "sucess"
    };
    console.debug('response: ', JSON.stringify(response));

    return response;
};

