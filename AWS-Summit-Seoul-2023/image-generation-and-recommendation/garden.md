# Garden API

Emotion으로 생성한 이미지를 조회하는 API입니다. 이미지 조회를 위한 API의 리소스 이름은 /garden 이고, HTTPS POST Method로 요청을 수행합니다. API 호출시 전달하는 json값은 "emotion", "generation", "gender"입니다. 

```java
{
    "id": "47f9eeb5-4252-435e-a1c9-b4a936f015ae",
    "emotion": "calm",
    "generation": "adult",
    "gender": "Male"
}
```

javascript로 API를 호출하고, landscape와 portrait를 구분하는 예제는 아래와 같습니다.  

```java
const uri = "garden";
const xhr = new XMLHttpRequest();

xhr.open("POST", uri, true);
xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
        let response = JSON.parse(xhr.responseText)
        let landscape = response['landscape'];
        console.log("landscape: " + landscape);
        let portrait = response['portrait'];
        console.log("portrait: " + portrait);
    }
};

let requestObj = {
    "id": userId,
    "emotion": emotionValue,
    "generation": generation,
    "gender": gender,
};

let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

xhr.send(blob);
```

### Postman으로 시험하기

CloudFront를 endpoint로 사용시 주소는 "https://[CloudFront Domain].cloudfront.net/garden"이며 POST Method를 이용합니다. 이때 json 입력은 [Body]에서 raw 포맷으로 아래와 같이 입력합니다.

```java
{
    "id": "47f9eeb5-4252-435e-a1c9-b4a936f015ae",
    "emotion": "calm",
    "generation": "adult",
    "gender": "Male"
}
```

실제 입력은 아래와 같습니다. 


![noname](https://user-images.githubusercontent.com/52392004/227067966-db3d8962-7dbf-48a5-a30f-60af7cde3edd.png)




