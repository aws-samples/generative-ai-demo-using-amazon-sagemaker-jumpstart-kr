# Rekognition을 이용한 Emotion 분석

Amazon Rekognition을 이용하여 Emotion을 분석하는 Architecture는 아래와 같습니다. 웹브라우저를 접속할 경우에는 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)를 우회하기 위하여 CloudFront 도메인을 Endpoint로 합니다. Device는 CORS이슈가 없으므로 API Gateway로 바로 접속가능합니다.

![image](https://user-images.githubusercontent.com/52392004/226761472-f18dd4c3-2e87-4dc3-9710-4881adcace89.png)

API의 Resouce는 '/emotion'으로 아래와 같이 CloudFront Domain을 활용하여 RESTful API의 POST method로 요청합니다.

```java
https://d3ic6ryvcaoqdy.cloudfront.net/emotion
```

Client에서 사용할 수 있는 javascript 예제는 아래와 같습니다.

```java
const uri = "https://d3ic6ryvcaoqdy.cloudfront.net/emotion";
const xhr = new XMLHttpRequest();

xhr.open("POST", uri, true);
xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
        alert(xhr.responseText); 
    }
};

var blob = new Blob([file], {type: 'image/jpeg'});
xhr.send(blob);
```

Rekognition을 이용하여 emotion을 분석후 아래와 같은 결과를 리턴합니다. 

```java
{
    "id": "bfc150a5-07ad-45a0-87e8-435e8a21d6ee",
    "bucket": "cdkemotiongardenstack-emotiongardenstorage163b614-18zt1jiogggyl",
    "key": "profile/bfc150a5-07ad-45a0-87e8-435e8a21d6ee.jpeg",
    "ageRange": {
        "Low": 13,
        "High": 21
    },
    "smile": true,
    "eyeglasses": true,
    "sunglasses": false,
    "gender": "Male",
    "beard": false,
    "mustache": false,
    "eyesOpen": true,
    "mouthOpen": true,
    "emotions": "HAPPY",
    "generation": "teanager"
}
```

Rekognition의 감정분석 API는 아래를 참조합니다. 

[Facial analysis](https://github.com/kyopark2014/emotion-garden/blob/main/facial-analysis.md)

### 시험 방법

#### Test Page Web을 접속하여 확인하는 방법

Test Page에 접속합니다. 여기서 test page의 주소는 "https://d3ic6ryvcaoqdy.cloudfront.net/html/emotion.html" 입니다. CloudFront의 도메인은 변경될 수 있습니다. 

#### Curl 명령어로 확인하는 방법

Emotion을 확인하기 위해 아래처러 curl로 파일명을 지정하여 전송합니다.

```java
curl -i https://d3ic6ryvcaoqdy.cloudfront.net/emotion -X POST --data-binary '@bfeacaab-3aab-48e7-a4bc-f4edbe466826.jpeg' -H 'Content-Type: image/jpeg'
```

이때의 결과는 아래와 같습니다.

```java
HTTP/2 200
content-type: application/json
content-length: 359
date: Thu, 23 Feb 2023 20:59:10 GMT
x-amzn-requestid: 64513da8-5cde-453e-9591-b0f99181bd4b
x-amz-apigw-id: Az4AkENfoE0Ferg=
x-amzn-trace-id: Root=1-63f7d39c-575fea4367d7dcbf080a573f;Sampled=0
x-cache: Miss from cloudfront
via: 1.1 4e7cb5238b8bf39c2881bea34913cbf4.cloudfront.net (CloudFront)
x-amz-cf-pop: ICN54-C1
x-amz-cf-id: 6zrBBy0NAKT7ARC_dARICyzWAk2i78FWni5MIOl_oj8wZQxcnB77lg==

{"Id":"f10595b9-a664-4b99-a971-ea54ee359edf","Bucket":"cdkemotiongardenstack-emotiongardenstorage163b614-18zt1jiogggyl","Key":"profile/f10595b9-a664-4b99-a971-ea54ee359edf.jpeg","ageRange":{"Low":13,"High":21},"smile":true,"eyeglasses":true,"sunglasses":false,"gender":"Male","beard":false,"mustache":false,"eyesOpen":true,"mouthOpen":true,"emotions":"HAPPY"}%
```

#### API Gateway로 바로 접속할 경우

API Gateway로 바로 접속할 경우는 uuid를 header를 통해 지정할 수 있습니다. 이때 사용하는 header의 이믈은 'X-user-id"입니다. 서버는 해당 헤더가 없는 경우에는 uuid를 생성합니다. 여기서 접속하는 API Gateway Endpoint 주소는 "https://rzyoyd47yg.execute-api.ap-northeast-1.amazonaws.com/dev/emotion" 입니다.

아래와 같이 "Content-Type"과 "X-user-id"를 설정합니다.

![noname](https://user-images.githubusercontent.com/52392004/226769553-bc2fd3b4-d665-4368-9786-4c0d1837e8c2.png)

이후 아래와 같이 Body - binary에서 분석할 이미지 파일을 선택합니다.

![noname](https://user-images.githubusercontent.com/52392004/226769785-53075a14-979e-4666-8d80-fcb909abee10.png)

이때의 결과는 아래와 같습니다.

```java
{
    "id": "1234567890",
    "bucket": "demo-emotion-garden",
    "key": "profile/1234567890.jpeg",
    "ageRange": {
        "Low": 22,
        "High": 30
    },
    "smile": true,
    "eyeglasses": false,
    "sunglasses": false,
    "gender": "Female",
    "beard": false,
    "mustache": false,
    "eyesOpen": true,
    "mouthOpen": true,
    "emotions": "HAPPY",
    "generation": "adult"
}
```

