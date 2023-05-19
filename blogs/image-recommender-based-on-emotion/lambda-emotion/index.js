const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const s3 = new aws.S3();
const bucketName = process.env.bucketName;
const collectionId = process.env.collectionId;

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
            const gender = profile['Gender']['Value'].toLowerCase();
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

            // search the face for identification
            let faceId;
            try {
                const searchFacesByImageParams = {
                    CollectionId: collectionId,
                    FaceMatchThreshold: 80, //default
                    Image: {
                        S3Object: {
                            Bucket: bucketName,
                            Name: fileName
                        },
                    },
                };
                // console.log('rekognitionParams = '+JSON.stringify(searchFacesByImageParams))
                const data = await rekognition.searchFacesByImage(searchFacesByImageParams).promise();
                console.log('data: '+JSON.stringify(data));

                if(!data['FaceMatches'].length) {  // if no matched face
                    try {
                        const indexFacesParams = {
                            CollectionId: collectionId,
                            Image: {
                                S3Object: {
                                    Bucket: bucketName,
                                    Name: fileName
                                },
                            },
                        };
                        // console.log('rekognitionParams = '+JSON.stringify(indexFacesParams))
                        const data = await rekognition.indexFaces(indexFacesParams).promise();
                        console.log('data: '+JSON.stringify(data));

                        faceId = data['FaceRecords'][0]['Face'].FaceId;
                    } catch (err) {
                        console.log(err);
                    }
                }
                else { // if there is a matech image
                    faceId = data['FaceMatches'][0]['Face'].FaceId;
                    console.log('faceId: ', faceId);
                }

            } catch (err) {
                console.log(err);
            }

            const emotionInfo = {
                id: faceId,
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

        isCompleted = true;
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


