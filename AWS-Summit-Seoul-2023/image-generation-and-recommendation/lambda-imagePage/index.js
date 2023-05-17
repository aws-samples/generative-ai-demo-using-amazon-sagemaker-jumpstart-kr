const aws = require('aws-sdk');
const domainName = process.env.domainName;
/*const msg = `This image was created by Stable Diffusion v2-1 base from SageMaker JumpStart for demonstration purposes.
This model is available under the CreativeML Open RAIL++-M license: <a href="https://huggingface.co/stabilityai/stable-diffusion-2/blob/main/LICENSE-MODEL">License</a>. This is a text-to-image model from <a href="https://stability.ai/blog/stable-diffusion-public-release">Stability AI</a> and downloaded from <a href="https://huggingface.co/stabilityai/stable-diffusion-2-1-base">HuggingFace</a>. It takes a textual description as input and returns a generated image from the description.`;*/
const msg1 = `Created by Stable Diffusion v2-1 base from SageMaker JumpStart for demonstration purposes under the CreativeML Open RAIL++-M license: <a href="https://huggingface.co/stabilityai/stable-diffusion-2/blob/main/LICENSE-MODEL">License</a>.`;
const msg2 = `The model is from <a href="https://stability.ai/blog/stable-diffusion-public-release">Stability AI</a> downloaded from <a href="https://huggingface.co/stabilityai/stable-diffusion-2-1-base">HuggingFace</a>.`;

exports.handler = async (event, context) => {
    console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    console.log('## EVENT: ' + JSON.stringify(event));
    
    let contentName = event['queryStringParameters'].content;
    console.log('content: ' + contentName);

    let url = `https://${domainName}/${contentName}`;
    let html = `<html><body><meta charset="UTF-8"><center><h2>AWS Seoul Summit 2023: My Emotion Gardens</h2><img src=`+url+`></center><a style-"font-size:1">`+msg1+`</p<a style-"font-size:1>`+msg2+`</p></body></html>`;
    
    console.log('html: ' + html);

    let response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html',
        },
        body: html
    };
    console.debug('response: ', JSON.stringify(response));

    return response;
};

