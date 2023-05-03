# My Emotion Gardens의 이미지 생성 및 추천

이미지를 Stable Diffusion 모델을 이용해 생성하고, emotion을 분석하며, 추천을 통해 좀더 다양한 이미지를 사용자가 선택할 수 있습니다.

전체적인 Architecture는 아래와 같습니다. Stable Diffusion을 이용하면 텍스트로된 prompt로 부터 창조적인 이미지를 생성할 수 있습니다. 하지만, 생성된 이미지를 서비스하기 위해서는 관리자(Administrator)에 의해 이미지를 취사선택하는 과정이 필요합니다. 따라서, 아래 Architecture에서는 "/bulk" API를 통해 다수 생성한 후에 확인(retrieve)하고, 적절하지 않은 이미지를 삭제하는 과정을 수행합니다. 이를 통해 정리된 이미지들을 S3로 복사하여 사용할 수 있게 합니다. 복사시에 다수의 이미지가 한꺼번에 로딩 될 수 있으므로 FIFO방식의 SQS에 저장한 후에 Lambda에서 꺼내서 Personalize에 아이템으로 등록합니다. 
사용자는 별도의 클라이언트를 통해 API Gateway를 통해 먼저 감정(Emotion)분석을 합니다. Emotion분석은 Rekognition을 이용하며, 이때 Personalize에 User 메타데이터를 등록합니다. 감정 분석시 얻은 사용자 아이디(UserID)를 가지고 Personalize에 현재의 사용자 감정에 맞는 이미지 추천을 요청합니다. 이때 이미지 리스트로된 응답을 받은 후 화면에 3개씩 표시해줍니다. 사용자는 이미지들중에 맘에 드는 이미지를 고를수 있고, 이때 사용자의 interaction은 "/like" API를 통해 Personalize에 전달되어 좀더 나은 추천이 이루어 질 수 있게 됩니다. 


![image](https://user-images.githubusercontent.com/52392004/233786237-7981f65c-5b32-44d4-a82c-7fe6865bb202.png)

<!--
![image](https://user-images.githubusercontent.com/52392004/226938546-99d6b50b-90e1-4f66-a1dc-4375fe16b734.png)
-->

## Client에서 Emoton Garden을 구성하기 위해 필요한 API

### Emotion API

이미지로부터 Emotion 분석을 하기 위한 Emotion API는 아래와 같습니다. CloudFront를 이용한 Endpoint는 아래와 같습니다. HTTPS POST Method로 이미지를 전송하면 Emotion 결과를 리턴합니다. 상세한 정보는 [Emotion 분석](https://github.com/kyopark2014/emotion-garden/blob/main/emotion.md)에서 확인합니다.

```java
https://[CloudFront Domain]/emotion
```

### gardenfromDB API

emotion과 favorite로 생성한 이미지를 로드하여 사용자에게 보여줍니다. 이미지 생성시에는 image pool에 저장되지만, administrator에 적절한 이미지가 선택이 되면, serving image를 저장하는 bucket으로 파일을 옮깁니다. 이때 S3 putEvent를 catch하여 DynamoDB에 이미지에 대한 정보를 저장하고, 사용자가 처음에 emotion garden에 진입시 해당 이미지를 DynamoDB에서 로딩하여 보여줍니다.  

```java
https://[CloudFront Domain]/gardenfromDB
```

### Garden API

Emotion으로 생성한 이미지를 조회하는 Garden API는 아래와 같습니다. 이미지 조회를 위한 API의 리소스 이름은 /garden 이고, HTTPS POST Method로 요청을 수행합니다. 상세한 정보는 [Garden API](https://github.com/kyopark2014/emotion-garden/blob/main/garden.md)에서 확인합니다.  

```java
https://[CloudFront Domain]/garden
```



### Like API

사용자의 연령, 성별을 가지고 적절한 컨텐츠를 추천하기 위해서 Like에 대한 선호를 서버로 전송합니다. 

```java
https://[CloudFront Domain]/like
```

java script 예제입니다.

```java
const url = "/like";
const xhr = new XMLHttpRequest();

xhr.open("POST", url, true);
xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
        console.log("--> responseText: " + xhr.responseText);
    }
};

let requestObj = {
    "id": userId,
    "itemId": itemId,
    "impression": impression,
};
console.log("request: " + JSON.stringify(requestObj));

let blob = new Blob([JSON.stringify(requestObj)], { type: 'application/json' });

xhr.send(blob);
```

서버로 보내는 json 입력의 형태는 아래와 같습니다. id는 사용자의 아이디이며, itemId는 선택된 이미지에 대한 object의 key이고, impression은 화면에 표시되는 3개의 이미지에 대한 object key들입니다. Personalize에서는 3개의 이미지중에 1개의 이미지를 선호했다는 의미로 인지하게 됩니다.

```java
{
    "id": "bfc150a5-07ad-45a0-87e8-435e8a21d6ee",
    "itemId": "emotions/calm/img_20230320-121242_6h.jpeg",
    "impression": [
        "emotions/calm/img_20230320-121242_6h.jpeg",
        "emotions/calm/img_20230320-121242_3h.jpeg",
        "emotions/calm/img_20230320-00504_2h.jpeg"
    ]
}
```

## Personalize

추천은 [Personalize](https://github.com/kyopark2014/emotion-garden/blob/main/personalize.md)를 이용해 구현합니다.

## 배포방법

Emotion Garden을 설치하는 방법은 [Emotion Garden 배포 방법](https://github.com/kyopark2014/emotion-garden/blob/main/deployment.md)에 따라 진행합니다. 


## 각종 Test용 웹 페이지 정보

### Emotion 

Emotion 분석을 테스트할 수 있습니다.

1) "https://[CloudFront Domain]/html/emotion/emotion.html" 로 접속합니다.
2) [Video] 버튼을 선택하여 비디오 사용을 allow 해줍니다. 
3) [Emotion] 버튼을 선택하여 화면 캡춰를 수행하면, [Emotion API](https://github.com/kyopark2014/emotion-garden#emotion-api)로 접속하여 Emotion 분석을 수행하고 결과를 하단에 보여줍니다. 

이때의 결과의 예는 아래와 같습니다.

```java
Emotion: 평온 (CALM)
Age: 13 ~ 21 (남자)
Features: 안경 눈뜨고있음
```




### Garden

Emotion 분석으로 얻어진 결과로 생성된 Stable Diffusion 이미지를 보여줍니다. Personlize에서 결과를 얻기 위해서는 최소 10000개의 interaction event가 필요합니다. Garden에서는 각 emotion에 대해 DynamoDB에 있는 모든 이미지를 보여줍니다. 이때 like 버튼을 통해 interaction data를 수집할 수 있습니다.

1) "https://[CloudFront Domain]/html/garden/garden.html" 로 접속합니다.
2) [Video] 버튼을 선택하여 비디오 사용을 allow 해줍니다. 
3) Favorite에 좋아하는 동물이나 사물을 추가할 수 있습니다. 단, 미리 정의되지 않은 Favorite의 경우에는 "No images"로 보여줍니다. 
4) [Emotion] 버튼을 선택하여 화면 캡춰된 이미지로 Emotion분석을 한 후에, [Garden API](https://github.com/kyopark2014/emotion-garden#garden-api)를 이용하여 미리 생성된 Stable Diffusion 이미지들을 보여줍니다. 이때 얻어진 결과의 예는 아래와 같습니다.

![image](https://user-images.githubusercontent.com/52392004/227059404-4a56c15e-74ec-41d9-956b-21a58b99c547.png)

5) Next 버튼을 눌러서, 다른 이미지들을 순차적으로 확인합니다.



### Emotion Garden

1) "https://[CloudFront Domain]/html/emotion-garden/emotion-garden.html" 에 접속합니다.
2) Video를 “allow”하고, 적당한 화면에서 “Emotion” 버튼을 누릅니다. 이때 화면캡춰 이미지가 오른쪽 Preview에 보여집니다.
3) Preview 이미지를 Rekognition에 보내서 emotion을 분석하고 결과를 아래에 보여줍니다.
4) DynamoDB에 저장된 emotion에 해당되는 이미지를 불러오고 아래에 3개를 보여줍니다. 서버에서는 landscape와 portrait 2개 타입으로 전체 이미지 리스트를 전달하고, client에서 일부를 보여주는 형태로 동작합니다. Test Page에서는 UI상 landscape만 보여줍니다. 
5) 이미지 오른쪽에 dislike/like 버튼을 선택하여, like를 표시할 수 있습니다. like를 선택하면 어떤 연령, 성별의 사람이 어떤 이미지를 선택하였는지, 서버로 전달되어 추천용도로 사용됩니다. (dislike에서 like로 전환되고, 이후는 like를 유지)
6) [Nex] 버튼을 선택하면 다음 이미지 3개를 보여주고, 모두 다 보여주면 처음으로 돌아갑니다.



### Stable Diffusion 이미지 생성에 필요한 Prompt 준비

1) "https://[CloudFront Domain]/html/text2image.html" 에 접속합니다. 
2) 적당한 이미지를 Prompt에 입력합니다. 
3) Resolution에서 적절한 해상도를 선택합니다. 여기서는 기본(768x512), WXGA(1024x600), WXGA(1280x800)를 지정할 수 있습니다. 

![image](https://user-images.githubusercontent.com/52392004/226779121-12ef5889-22f7-4a07-86bd-d4e535dc9d2b.png)





### 다수의 이미지 생성 방법

다수의 이미지를 생성하기 위한 웯 페이지입니다. 생성된 이미지를 확인하고 삭제할 수 있습니다. 이미지는 바로 Serviring되지 않고 이미지 Pool(Bucket의 imgPool)에 저장됩니다.

1) "https://[CloudFront Domain]/html/pool/bulk/bulk.html" 에 접속합니다.
2) RepeatCount는 같은 prompt로 생성하는 이미지의 숫자를 의미합니다.
3) Emotion을 선택하고,
4) 추가로 넣을 값 (Favorite)이 있을 경우에 입력합니다.
5) prompt에 넣을 여타 다른값들을 입력합니다. 기본값은 "flowers, fantasy, concept art, trending on artstation, highly detailed, intricate, sharp focus, digital art" 입니다.

- [Generate]: 이미지 생성 버튼
- [Update]: 생성된 이미지 확인
- [Remove]: dislike로 불필요한 이미지 삭제

Bucket의 imgPool에 저장된 이지는 [Previw](https://d3ic6ryvcaoqdy.cloudfront.net/html/pool/preview/preview.html)를 통해 전체적인 확인을 하고, 만족할만큼 정리가 되면 실제 Serving을 위한 폴더인 "/emotions"로 복사합니다. 

```java
aws s3 cp s3://demo-emotion-garden/imgPool/ ./imgPool/ --recursive
aws s3 cp ./imgPool/ s3://demo-emotion-garden/emotions/ --recursive
```

S3에 Object가 저장될때 발생하는 putEvent를 이용하여 Lambda가 Object Key로 부터 emotion을 분류하고, Personalzie에 item으로 등록됩니다. 기준이 되는 ITEM_ID가 동일하므로 중복으로 파일을 업로드해도 업데이트가 됩니다.


### S3에 저장된 이미지 확인

생성된 이미지들중에 좋은 이미지를 선택하기 위하여 DynamoDB에 저장된 index를 기준으로 S3에 저장된 이미지를 확인하고 필요시 삭제할 수 있습니다. 

1) "https://[CloudFront Domain]/html/viewer/viewer.html" 에 접속합니다.
2) Emotion과 Favorite를 선택합니다.
3) Retrieve를 선택하여 S3에 있는 이미지를 가져옵니다. 이미지가 많은 경우에 “Start”를 조정하면 뒤쪽의 이미지를 확인할 수 있습니다. 최대로 보여줄수 있는 이미지의 숫자는 "Number of Images"로 100개까지 지정할 수 있습니다.
4) 불필요한 이미지는 아래처럼 dislike 선택후 [Remove] 버튼을 통해 삭제합니다. 

<img src="https://user-images.githubusercontent.com/52392004/226780516-579c7f8d-5b0d-4512-be48-b5de4c68bacc.png" width="600">

## 기타 중요한 내용

### 여러개의 Stable Diffusion 이미지 생성시 속도 향상 방법

이미지 생성시간을 단축하기 위하여 병렬처리를 수행합니다. 상세한 내용은 [Stable Diffusion 이미지 생성하기](./stable-diffusion.md)를 참조합니다.

### 지원해상도 및 소요시간

현재 GPU를 이용해 계산한 결과는 아래와 같습니다.

#### Stable Diffusion 2.1
- XGA 1024 x 768 (x)

- WSVGA 1024 x 576 28s

- WSVGA 1024 x 600 30s

- DVGA 960 x 640 29s

- SVGA 800 x 600 22s

- (Basic) 768 x 512 17s

- VGA 640 x 480 15s

* Chrome 브라우저에서 요청시 timeout이 30s로 고정되어 있어서 실제 API는 성공하더라도 브라우저에 표시 안됨
  실행시간은 CPU 부하에 따라 변동됨
  
#### Stable Diffusion 2 fp16

- Basic: 768 x 512 (11s)

- WSVGA: 1024 x 600 (14s)

- WXGA: 1280 x 800 (26s)



### 이미지 백업 및 복구

#### 이미지 백업

Cloud9 용량을 확장합니다.

```java
wget https://raw.githubusercontent.com/kyopark2014/technical-summary/main/resize.sh
chmod a+rx resize.sh
./resize.sh 100
```

아래 명령어로 이미지를 다운로드 합니다. 

```java
aws s3 cp s3://demo-emotion-garden/emotions/ ./emotions --recursive
```

#### 이미지 복원

아래 명령어로 이미지들을 다시 S3로 업로드 할 수 있습니다. 업로드되는 이미지는 S3 put event를 이용하여 DynamoDB의 "db-emotion-garden"에 저장됩니다. 

```java
aws s3 cp emotions/ s3://demo-emotion-garden/emotions/ --recursive
```

#### Data Set 복사

```java
aws s3 cp s3://demo-emotion-garden/dataset/ ./dataset --recursive
aws s3 cp dataset/ s3://demo-emotion-garden/dataset/ --recursive
```

## 중요 코드 정리

### CSV 파일 생성

[generate-csv](./generate-csv.md)에서는 DynamoDB에 저장된 user, item, interaction 데이터를 CSV 파일로 변환하여 S3에 저장합니다.

### Recommendation 리스트 가져오기

[recommendation](./recommendation.md)에서는 userId로 해당 사용자에 대한 추천이미지를 읽어옵니다.


### DataSet에 데이터 추가

[dataset-info](./dataset-info.md)에서는 user, item, interaction의 DataSet에 대한 정보를 수집합니다.



## Reference

[[Python] 병렬처리(Multiprocessing)를 통한 연산속도 개선](https://yganalyst.github.io/data_handling/memo_17_parallel/)

[Running On-Demand P instances](https://ap-northeast-2.console.aws.amazon.com/servicequotas/home/services/ec2/quotas/L-417A185B)

[ml.p3.2xlarge for endpoint usage](https://ap-northeast-2.console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas/L-1623D0BE)

[AI Art 모델인 Stable Diffusion을 쉽고 편리하게 이용하기](https://github.com/kyopark2014/stable-diffusion-api-server)

[How TO - CSS Loader](https://www.w3schools.com/howto/howto_css_loader.asp)

[Stable Diffusion 1 vs 2 - What you need to know](https://www.assemblyai.com/blog/stable-diffusion-1-vs-2-what-you-need-to-know/)

[How to generate stunning images using Stable Diffusion](https://babich.biz/how-to-use-stable-diffusion/)

[Get personalized recommendations using AWS and Node.JS](https://medium.com/analytics-vidhya/get-personalized-recommendations-using-aws-and-node-js-e79f7442549d)
