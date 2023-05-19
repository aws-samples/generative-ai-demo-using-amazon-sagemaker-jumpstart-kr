# 감정 분석  

## Rekognition의 Facial analysis

Rekognition의 [Facial analysis](https://docs.aws.amazon.com/rekognition/latest/dg/faces.html)을 이용하면, [Facial analysis 예제](./sample-facial-analysis.json)와 같이 성별(Gender), 나이 범위(AgeRange), 감정(Emotion)등에 대한 정보를 얻을 수 있습니다. 특히 감정(Emotion)은 HAPPY, SURPRISED, CALM, ANGRY, FEAR, CONFUSED, DISGUSTED, SAD와 같이 8가지 형태의 결과를 얻을 수 있습니다.

[lambda-emotion](./lambda-emotion/index.js)은 Rekognition에 얼굴분석을 요청하여 감정(emotion) 정보를 수집합니다. Rekognition은 bucket에 저장된 이미지를 이용하므로 먼저 S3에 저장을 수행합니다.

```java
const destparams = {
    Bucket: bucketName,
    Key: fileName,
    Body: body,
    ContentType: contentType
};

await s3.putObject(destparams).promise();
```

[Rekognition의 detectFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_DetectFaces.html)을 이용하여 성별(gender) 및 감정(emotion)을 얻어옵니다.

```java
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

const data = await rekognition.detectFaces(rekognitionParams).promise();

if (data['FaceDetails'][0]) {
    const gender = profile['Gender']['Value'].toLowerCase();
    const emotions = profile['Emotions'][0]['Type'];
}
```

사용자가 감정 분석을 요청할 때는 [gallery.js](./html/gallery.js)의 "getEmotion()"와 같이 REST API를 이용합니다.

```java
const uri = "emotion";
const xhr = new XMLHttpRequest();

xhr.open("POST", uri, true);
xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
        let response = JSON.parse(xhr.responseText);
        
        gender = response.gender;
        emotionValue = response.emotions.toLowerCase();
    }
};

canvas.toBlob(function (blob) {
    xhr.send(blob);
});
```

