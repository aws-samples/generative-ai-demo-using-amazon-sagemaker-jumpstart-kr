# 이미지에서 ID 인식

이미지에서 특정 얼굴을 찾아서 인증에 활용하고자 Amazon Rekognition을 이용합니다.

[Face correction](https://docs.aws.amazon.com/rekognition/latest/dg/collections.html)을 이용하여 이미지에 있는 사용자를 인지하고자 합니다.

[SearchFacesByImage](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_SearchFacesByImage.html)로 기존에 correction에 유사 이미지가 있는지 확인합니다. 

없다면 [IndexFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_IndexFaces.html)을 이용하여 등록합니다. 이때의 결과의 예는 아래와 같습니다.

```java
{
    "FaceRecords": [
        {
            "Face": {
                "FaceId": "10139039-5d61-4cae-9bae-b8fe3edc935a",
                "BoundingBox": {
                    "Width": 0.27077770233154297,
                    "Height": 0.4570070207118988,
                    "Left": 0.3187447786331177,
                    "Top": 0.3381121754646301
                },
                "ImageId": "57e616c6-d392-3cc3-a677-7c52b37d3ea4",
                "Confidence": 99.99275207519531
            },
            "FaceDetail": {
                "BoundingBox": {
                    "Width": 0.27077770233154297,
                    "Height": 0.4570070207118988,
                    "Left": 0.3187447786331177,
                    "Top": 0.3381121754646301
                },
                "Landmarks": [
                    {
                        "Type": "eyeLeft",
                        "X": 0.3871886730194092,
                        "Y": 0.4961209297180176
                    },
                    {
                        "Type": "eyeRight",
                        "X": 0.504764199256897,
                        "Y": 0.471485435962677
                    },
                    {
                        "Type": "mouthLeft",
                        "X": 0.4191719591617584,
                        "Y": 0.6802089214324951
                    },
                    {
                        "Type": "mouthRight",
                        "X": 0.5171637535095215,
                        "Y": 0.6596701145172119
                    },
                    {
                        "Type": "nose",
                        "X": 0.4558113217353821,
                        "Y": 0.56198650598526
                    }
                ],
                "Pose": {
                    "Roll": -9.84632396697998,
                    "Yaw": 0.471945583820343,
                    "Pitch": 14.356444358825684
                },
                "Quality": {
                    "Brightness": 88.36627960205078,
                    "Sharpness": 60.49041748046875
                },
                "Confidence": 99.99275207519531
            }
        }
    ],
    "FaceModelVersion": "6.0",
    "UnindexedFaces": []
}
```

다시 SearchFacesByImage을 수행하면 아래와 같은 결과를 얻습니다.

```java
{
    "SearchedFaceBoundingBox": {
        "Width": 0.23304933309555054,
        "Height": 0.4102589786052704,
        "Left": 0.332182914018631,
        "Top": 0.45135027170181274
    },
    "SearchedFaceConfidence": 99.997314453125,
    "FaceMatches": [
        {
            "Similarity": 99.99998474121094,
            "Face": {
                "FaceId": "10139039-5d61-4cae-9bae-b8fe3edc935a",
                "BoundingBox": {
                    "Width": 0.27077800035476685,
                    "Height": 0.4570069909095764,
                    "Left": 0.3187449872493744,
                    "Top": 0.3381119966506958
                },
                "ImageId": "57e616c6-d392-3cc3-a677-7c52b37d3ea4",
                "Confidence": 99.9927978515625,
                "IndexFacesModelVersion": "6.0"
            }
        }
    ],
    "FaceModelVersion": "6.0"
}
```

## Reference 

[Searching faces in a collection](https://docs.aws.amazon.com/rekognition/latest/dg/collections.html)

[CreateCollection](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_CreateCollection.html)

[class CfnCollection (construct)](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rekognition.CfnCollection.html)

