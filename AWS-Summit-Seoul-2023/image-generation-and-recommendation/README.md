# My Emotion Gardens의 이미지 생성 및 추천

이미지를 Stable Diffusion 모델을 이용해 생성하고, 감정(emotion)을 분석하며, 추천을 통해 좀더 다양한 이미지를 사용자가 선택할 수 있습니다. 이미지 생성시에는 image pool에 저장되지만, administrator에 적절한 이미지가 선택이 되면, serving image를 저장하는 bucket으로 파일을 옮깁니다. 이때 S3 putEvent를 catch하여 DynamoDB에 이미지에 대한 정보를 저장하고, Personzliae의 Item으로도 등록을 수행합니다. 사용자의 얼굴 표정을 통해 분석한 감정(emotion)과 선호하는 걔절, 날씨, 시간으로 favorite를 이용하여 이미지를 사용자에게 보여주고 선택하면 이를 이용하여 Amazon Personlize로 선호도에 대한 분석을 수행할 수 있습니다. 또한, Amazon Personlize를 통해 유사한 성향을 가진 사람들이 좋아했던 이미지들을 추천할 수 있습니다.

전체적인 Architecture는 아래와 같습니다. Stable Diffusion을 이용하면 텍스트로된 prompt로 부터 창조적인 이미지를 생성할 수 있습니다. 하지만, 생성된 이미지를 서비스하기 위해서는 관리자(Administrator)에 의해 이미지를 취사선택하는 과정이 필요합니다. 따라서, 아래 Architecture에서는 "/bulk" API를 통해 다수 생성한 후에 확인(retrieve)하고, 적절하지 않은 이미지를 삭제하는 과정을 수행합니다. 이를 통해 정리된 이미지들을 S3로 복사하여 사용할 수 있게 합니다. 복사시에 다수의 이미지가 한꺼번에 로딩 될 수 있으므로 FIFO방식의 SQS에 저장한 후에 Lambda에서 꺼내서 Personalize에 아이템으로 등록합니다. 
사용자는 별도의 클라이언트를 통해 API Gateway를 통해 먼저 감정(Emotion)분석을 합니다. Emotion분석은 Rekognition을 이용하며, 이때 Personalize에 User 메타데이터를 등록합니다. 감정 분석시 얻은 사용자 아이디(UserID)를 가지고 Personalize에 현재의 사용자 감정에 맞는 이미지 추천을 요청합니다. 이때 이미지 리스트로된 응답을 받은 후 화면에 표시합니다. 사용자는 이미지들중에 맘에 드는 이미지를 고를수 있고, 이때 사용자의 interaction은 "/like" API를 통해 Personalize에 전달되어 좀더 나은 추천이 이루어 질 수 있게 됩니다. 


![image](https://user-images.githubusercontent.com/52392004/233786237-7981f65c-5b32-44d4-a82c-7fe6865bb202.png)


## Client에서 Emoton Garden을 구성하기 위해 필요한 API


### Emotion API

이미지로부터 Emotion 분석을 하기 위한 Emotion API는 '/emotion'입니다. HTTPS POST Method로 이미지를 전송하면 Emotion 분석 결과를 리턴합니다. 상세한 정보는 [Emotion 분석](./emotion.md)에서 확인합니다.

### Garden API

Emotion으로 생성한 이미지를 조회하는 API는 '/garden'입니다. HTTPS POST Method로 요청을 수행합니다. 상세한 정보는 [Garden API](./garden.md)에서 확인합니다.  

### gardenfromDB API

Emotion과 favorite로 생성한 이미지를 로드하여 보여주기 위한 API는 '/gardenfromDB' 입니다. 사용자가 kiosk에서 emotion과 favorite를 선택하고 보여지는 페이지는 DynamoDB로 부터 가져온 생성된 이미지들입니다. '/gardenfromDB'로 요청하는 포맷은 '/garden'과 동일합니다.

### Like API

사용자의 연령, 성별을 가지고 적절한 컨텐츠를 추천하기 위해서는 선호도를 저장하고 분석하여야 합니다. 선호도를 수집하기 위한 API는 '/like'입니다. 상세한 정보는 [Like API](./like.md)에서 확인합니다.  

## Personalize

추천은 [Personalize](./personalize.md)를 이용해 구현합니다.

## 배포방법

인프라를 설치하는 방법은 [배포 방법](./deployment.md)에 따라 진행합니다. 

## 이미지 생성 및 시험

### Prompt 테스트 방법

Prompt를 테스트 할 수 있는 웹페이지는 아래와 같습니다. 여기서 적절한 Prompt를 시험하고 이미지를 확인할 수 있습니다.

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

Bucket의 imgPool에 저장된 이미지는 [preview.html](./html/preview.html)를 통해 S3에 저장된 이미지를 확인을 할 수 있습니다. 확인된 이미지를 Serving을 위한 폴더인 "/emotions"로 복사하는 명령어는 아래와 같습니다. S3에 파일을 복사할때 발생하는 putEvent를 이용하여 DynamoDB 및 Personalize에 정보가 기록되므로 아래와 같이 다운로드후에 업로드하는 과정을 거쳐야 합니다. SQS FIFO의 size가 15000이므로 파일을 올릴때 이보다 적은 숫자를 업로드합니다. 만약 이보다 크다면 나누어서 업로드하여야 합니다. 

```java
aws s3 cp s3://demo-emotion-garden/imgPool/ ./imgPool/ --recursive
aws s3 cp ./imgPool/ s3://demo-emotion-garden/emotions/ --recursive
```

### S3에 저장된 이미지 확인

생성된 이미지들중에 좋은 이미지를 선택하기 위하여 DynamoDB에 저장된 index를 기준으로 S3에 저장된 이미지를 확인하고 필요시 삭제할 수 있습니다. 

1) "https://[CloudFront Domain]/html/viewer/viewer.html" 에 접속합니다.
2) Emotion과 Favorite를 선택합니다.
3) Retrieve를 선택하여 S3에 있는 이미지를 가져옵니다. 이미지가 많은 경우에 “Start”를 조정하면 뒤쪽의 이미지를 확인할 수 있습니다. 최대로 보여줄수 있는 이미지의 숫자는 "Number of Images"로 100개까지 지정할 수 있습니다.
4) 불필요한 이미지는 아래처럼 dislike 선택후 [Remove] 버튼을 통해 삭제합니다. 


![noname](https://user-images.githubusercontent.com/52392004/236373208-e0f7a19e-5727-460b-92f7-b7ca9580d746.png)


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

## 그밖의 구현 사항

### 생성된 이미지를 디스플레이에 보여주기

kiosk에서 생성된 이미지를 각 Zone에 설치된 디스플레이에 보여주기 위해 [생성된 이미지를 보여주기](./updateDisplay.md)에 따라 디스플레이에서 이미지를 주기적으로 로드합니다.

### CSV 파일 생성

[generate-csv](./generate-csv.md)에서는 DynamoDB에 저장된 user, item, interaction 데이터를 CSV 파일로 변환하여 S3에 저장합니다.

### Recommendation 리스트 가져오기

[recommendation](./recommendation.md)에서는 userId로 해당 사용자에 대한 추천이미지를 읽어옵니다.

### DataSet에 데이터 추가

[dataset-info](./dataset-info.md)에서는 user, item, interaction의 DataSet에 대한 정보를 수집합니다.

### 이미지 공유

이미지는 아래와 같은 웹페이지로 공유 됩니다. 이때 이용되는 API는 '/image'이며, [lambda-imagePage](./lambda-imagePage/index.js)와 같이 구현됩니다.

<img src="https://user-images.githubusercontent.com/52392004/236335259-3c32a005-2917-4264-b5ee-e0ab4086b072.jpg" width="500">


## Reference

[Running On-Demand P instances](https://ap-northeast-2.console.aws.amazon.com/servicequotas/home/services/ec2/quotas/L-417A185B)

[ml.p3.2xlarge for endpoint usage](https://ap-northeast-2.console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas/L-1623D0BE)

[Stable Diffusion을 Amazon SageMaker JumpStart로 편리하게 이용하기](https://aws.amazon.com/ko/blogs/tech/ai-art-stable-diffusion-sagemaker-jumpstart/)
