const searchFacesByImageParams = {
    CollectionId: collectionId,
    FaceMatchThreshold: 80, 
    Image: {
        S3Object: {
            Bucket: bucketName,
            Name: fileName
        },
    },
};
const data = await rekognition.searchFacesByImage(searchFacesByImageParams).promise();
faceId = data['FaceMatches'][0]['Face'].FaceId;
