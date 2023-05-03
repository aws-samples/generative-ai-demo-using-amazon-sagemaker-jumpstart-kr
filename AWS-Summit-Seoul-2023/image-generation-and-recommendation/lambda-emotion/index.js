const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new aws.S3();
const personalizeevents = new aws.PersonalizeEvents();
const sqs = new aws.SQS({apiVersion: '2012-11-05'});

const bucketName = process.env.bucketName;
const datasetArn = process.env.datasetArn;
const sqsOpenSearchUrl = process.env.sqsOpenSearchUrl;
const userTableName = process.env.userTableName;
const dynamo = new aws.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    // console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env));
    // console.log('## EVENT: ' + JSON.stringify(event))

    const body = Buffer.from(event["body"], "base64");
    // console.log('body: ' + body)
    const header = event['multiValueHeaders'];
    // console.log('header: ' + JSON.stringify(header));

    let contentType;
    if (header['content-type']) {
        contentType = String(header['content-type']);
    }
    if (header['Content-Type']) {
        contentType = String(header['Content-Type']);
    }
    // console.log('contentType = '+contentType);    

    let userId;
    if (header['X-user-id']) {
        userId = String(header['X-user-id']);
    }
    else {
        userId = uuidv4();
    }

    const fileName = 'profile/' + userId + '.jpeg';
    // console.log('fileName = '+fileName);

    try {
        const destparams = {
            Bucket: bucketName,
            Key: fileName,
            Body: body,
            ContentType: contentType
        };

        //  console.log('destparams: ' + JSON.stringify(destparams));
        const { putResult } = await s3.putObject(destparams).promise();

        // console.log('### finish upload: ' + userId);
    } catch (error) {
        console.log(error);
        return;
    }

    let response = "";
    let isCompleted = false;
    try {
        // console.log('**start emotion detection');
        const rekognition = new aws.Rekognition();
        const rekognitionParams = {
            Image: {
                S3Object: {
                    Bucket: bucketName,
                    Name: fileName
                },
            },
            Attributes: ['ALL']
        };
        // console.log('rekognitionParams = '+JSON.stringify(rekognitionParams))

        const data = await rekognition.detectFaces(rekognitionParams).promise();
        // console.log('data: '+JSON.stringify(data));

        if (data['FaceDetails'][0]) {
            const profile = data['FaceDetails'][0];

            const ageRange = profile['AgeRange'];
            // console.log('ageRange: '+JSON.stringify(ageRange));
            const smile = profile['Smile']['Value'];
            // console.log('smile: ', smile);
            const eyeglasses = profile['Eyeglasses']['Value'];
            // console.log('smile: ', smile);
            const sunglasses = profile['Sunglasses']['Value'];
            // console.log('sunglasses: ', sunglasses);
            const gender = profile['Gender']['Value'];
            // console.log('gender: ', gender);
            const beard = profile['Beard']['Value'];
            // console.log('beard: ', beard);
            const mustache = profile['Mustache']['Value'];
            // console.log('mustache: ', mustache);
            const eyesOpen = profile['EyesOpen']['Value'];
            // console.log('eyesOpen: ', eyesOpen);
            const mouthOpen = profile['MouthOpen']['Value'];
            // console.log('mouthOpen: ', mouthOpen);
            const emotions = profile['Emotions'][0]['Type'];
            // console.log('emotions: ', emotions);

            let generation;
            let ageRangeLow = ageRange.Low;
            let ageRangeHigh = ageRange.High;
            let middleAge = (ageRangeLow + ageRangeHigh) / 2;
            if (middleAge <= 5) generation = 'toddler'; // 유아
            else if (middleAge <= 12) generation = 'child'; // 아동
            else if (middleAge <= 18) generation = 'teenager'; // 청소년
            else if (middleAge <= 25) generation = 'young-adult'; // 청년
            else if (middleAge <= 49) generation = 'adult'; // 중년
            else if (middleAge <= 64) generation = 'middle-age'; // 장년
            else if (middleAge >= 65) generation = 'elder'; // 노년

            // console.log('**finish emotion detection');
            const emotionInfo = {
                id: userId,
                bucket: bucketName,
                key: fileName,
                ageRange: ageRange,
                smile: smile,
                eyeglasses: eyeglasses,
                sunglasses: sunglasses,
                gender: gender,
                beard: beard,
                mustache: mustache,
                eyesOpen: eyesOpen,
                mouthOpen: mouthOpen,
                emotions: emotions,
                generation: generation
            };
            console.info('emotionInfo: ' + JSON.stringify(emotionInfo));

            response = {
                statusCode: 200,
                body: JSON.stringify(emotionInfo)
            };

            // create user dataset
            try {
                var params = {
                    datasetArn: datasetArn,
                    users: [{
                        userId: userId,
                        properties: {
                            "GENERATION": generation,
                            "GENDER": gender,
                            "EMOTION": emotions
                        }
                    }]
                };
                console.log('user params: ', JSON.stringify(params));

                const result = await personalizeevents.putUsers(params).promise(); 
                console.log('putUser result: '+JSON.stringify(result));                
            } catch (error) {
                console.log(error);
                isCompleted = true;

                response = {
                    statusCode: 500,
                    body: error
                };
            }

            // DynamodB for personalize users
            var personalzeParams = {
                TableName: userTableName,
                Item: {
                    USER_ID: userId,
                    GENERATION: generation,
                    GENDER: gender,
                    EMOTION: emotions,
                }
            };
            console.log('personalzeParams: ' + JSON.stringify(personalzeParams));

            dynamo.put(personalzeParams, function (err, data) {
                if (err) {
                    console.log('Failure: ' + err);
                }
                else {
                    console.log('dynamodb put result: ' + JSON.stringify(data));
                }
            });

            // for logging            
            const osqParams = { // opensearch queue params
                DelaySeconds: 10,
                MessageAttributes: {},
                MessageBody: JSON.stringify(emotionInfo), 
                QueueUrl: sqsOpenSearchUrl
            };  
            console.log('osqParams: '+JSON.stringify(osqParams));
            try {
                let sqsResponse = await sqs.sendMessage(osqParams).promise();  
                // console.log("sqsResponse: "+JSON.stringify(sqsResponse));
                isCompleted = true;   
            } catch (err) {
                console.log(err);
            }

            // delete profile image
            try {
                let deleteParams = {  
                    Bucket: bucketName, 
                    Key: fileName 
                };

                s3.deleteObject(deleteParams).promise();
            } catch (err) {
                console.log(err);
            }
        }
        else {
            response = {
                statusCode: 404,
                body: "No Face"
            };
        }
    } catch (error) {
        console.log(error);

        response = {
            statusCode: 500,
            body: error
        };
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

    console.debug('emotion response: ' + JSON.stringify(response));
    return response;
};


