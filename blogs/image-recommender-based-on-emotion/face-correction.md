# 사용자 분석

## Correction의 정의

[Face correction](https://docs.aws.amazon.com/rekognition/latest/dg/collections.html)을 이용하여 이미지에 있는 사용자를 인지하고자 합니다. [CDK Stack](./cdk-image-recommender/lib/cdk-image-recommender-stack.ts)에서는 이미지에서 추출된 얼굴에 대한 correction을 생성합니다.

```java
const collectionId = 'image-recommender-collectionId';
const cfnCollection = new rekognition.CfnCollection(this, 'MyCfnCollection', {
    collectionId: collectionId,
});
```

## 사용자(userId) 찾기

[SearchFacesByImage](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_SearchFacesByImage.html)를 이용하여 기존에 correction에 유사 이미지가 있는지 확인할 수 있습니다. [lambda-emotion](./lambda-emotion/index.js)에서는 아래와 같이 searchFacesByImage을 이용하여 매칭되는 얼굴 이미지를 찾습니다. 

```java
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
```


## 얼굴(Face) 등록

유사한 얼굴 이미지가 등록되어 있지 않다면, [IndexFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_IndexFaces.html)을 이용하여 이미지에서 추출된 얼굴로 userId를 생성합니다. [lambda-emotion](./lambda-emotion/index.js)에서는 아래와 같이 매칭되는 얼굴 이미지가 없는 경우에 indexFaces를 이용하여 얼굴(Face)를 등록하고 faceId를 추출하여 userId로 사용합니다.

```java
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
```

