const aws = require('aws-sdk');
const {v4: uuidv4} = require('uuid');

const s3 = new aws.S3({ apiVersion: '2006-03-01' });

const bucketName = process.env.bucketName;
const s3_prefix = process.env.s3_prefix;

exports.handler = async (event, context) => {
    //console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    //console.log('## EVENT: ' + JSON.stringify(event))
    
    const body = Buffer.from(event["body"], "base64");
    console.log('body: ' + body);
    const header = event['multiValueHeaders'];
    console.log('header: ' + JSON.stringify(header));
            
    let contentType = 'application/pdf';
    if(header['Content-Type']) {
        contentType = String(header['Content-Type']);
    } 
    console.log('contentType = '+contentType); 

    let contentDisposition="";
    if(header['Content-Disposition']) {
        contentDisposition = String(header['Content-Disposition']);  
    } 
    console.log('disposition = '+contentDisposition);
    
    let filename = "";
    const uuid = uuidv4();   
    filename = uuid+'.pdf';
    console.log('filename = '+filename);
    
    try {
        const destparams = {
            Bucket: bucketName, 
            Key: s3_prefix+'/'+filename,
            Body: body,
            ContentType: contentType
        };
        
      //  console.log('destparams: ' + JSON.stringify(destparams));
        const {putResult} = await s3.putObject(destparams).promise(); 

        console.log('### finish upload: ' + uuid);
    } catch (error) {
        console.log(error);
        return;
    } 
    
    const fileInfo = {
        Id: uuid,
        Bucket: bucketName, 
        Key: filename,
    }; 
    console.log('file info: ' + JSON.stringify(fileInfo));
    
    const response = {
        statusCode: 200,
        body: JSON.stringify(fileInfo)
    };
    return response;
};