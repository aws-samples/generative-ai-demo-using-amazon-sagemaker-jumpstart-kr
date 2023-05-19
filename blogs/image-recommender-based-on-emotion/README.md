# Amazon Rekognition과 Personalize를 이용하여 감정으로 이미지 추천하기

카메라로 사람의 표정을 분석하여 현재의 감정(Emotion)을 얻을 수 있다면, 개인화된 추천 시스템에서 유용하게 활용할 수 있습니다. 여기서는 [Amazon Rekognition](https://aws.amazon.com/ko/rekognition/)을 이용하여 사용자의 감정을 얻고, 사용자의 감정을 잘 표현하는 이미지를 [Amazon Personlize](https://aws.amazon.com/ko/personalize/)를 이용하여 추천합니다. 이를 통해 Amazon의 완전관리형 서비스인 Rekognition과 Personalize를 효과적으로 사용하는 방법을 이해할 수 있습니다. 또한 감정을 표현하는 이미지는 [Amazon SageMaker JumpStart](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-jumpstart.html)의 [Stable Diffusion 모델](https://aws.amazon.com/ko/blogs/tech/ai-art-stable-diffusion-sagemaker-jumpstart/)을 이용해 생성합니다. Stable Diffision 모델은 텍스트로 이미지를 생성하는 기초 모델 (Foundation Model)으로서, SageMaker JumpStart를 이용하면 생성 AI로 감정을 나타내는 이미지들을 쉽게 생성할 수 있습니다. 

개인화 추천의 경우에 사용자의 이전 상호작용(interaction)을 이용하여 추천을 수행하게 되는데, 이전 상호작용이 없거나 충분하지 않은 경우에는 감정(emotion)에 맞는 적절한 추천을 할 수 없습니다. 따라서, 여기에서는 이전 상호작용이 부족한 경우에는 감정 정보를 바탕으로 미리 학습한 데이터를 이용하여 "감정 추천"을 수행하고, 일정량의 데이터가 확보되었을 때에 "개인화 추천"을 수행하는 방법을 이용합니다. 아래는 사용자의 감정에 따라 이미지를 추천하는 시스템 아키텍처를 보여주고 있습니다.

## 감정으로 이미지 추천하는 아키텍처

아래의 아키텍처(Archtiecture)에서는 사용자(user)에게 감정 기반의 이미지 추천(Image Recommendation)하고 시스템 관리자(administrator)가 이미지를 생성(Image Creation)하는 구조로 구성됩니다. 

![image](https://github.com/kyopark2014/image-recommender-based-on-emotion/assets/52392004/1dc33a35-66a2-4794-ad47-a1f61927e313)


감정 이미지 생성에 필요한 인프라인 [SageMaker Endpoint](https://docs.aws.amazon.com/sagemaker/latest/dg/realtime-endpoints-deployment.html)는 GPU를 가진 EC2로 구성되므로 다수의 이미지를 일정 시간동안 빠르게 생성하고 중지시키는 것이 비용면에서 효율적입니다. 이를 위해서 [Event driven 방식](https://aws.amazon.com/ko/event-driven-architecture/)으로 [FIFO 형태의 Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html)를 사용하여 이미지를 생성하며, 생성된 이미지는 상용 폴더가 아닌 이미지풀(image pool)에 우선 저장합니다. 시스템 관리자는 이미지풀에 저장된 이미지가 적절하게 감정을 표현했는지 확인하고, 상용 폴더로 복사합니다. 상용 폴더에 다수의 이미지가 한꺼번에 들어올 수 있으므로 FIFO 형태의 SQS와 [Amazon Lambda](https://aws.amazon.com/ko/lambda/)를 통해 순차적으로 아이템 데이터셋에 저장합니다. 이후 사용자가 카메라를 이용해 화면을 캡처하면, [Amazon CloudFront](https://aws.amazon.com/ko/cloudfront/) / [API Gateway](https://aws.amazon.com/ko/api-gateway/)를 통해 이미지가 인입되고 Lambda를 통해 Rekognition에서 이미지를 분석합니다. 이후 사용자가 감정에 따른 이미지 추천을 요청하면 Lambda를 통해 Personalize에 추천 추론(inference)을 요청합니다. 추천 추론의 결과는 이미지 리스트로서 웹페이지에 전달되어 보여집니다. 사용자는 자신의 감정에 맞는 이미지를 선택하여 선호(like)를 표시할 수 있으며, 이때 생성된 상호활동(interaction) 이벤트를 상호활동 데이터셋으로 저장하여 추천 추론(inferece)을 향상시키는 데에 활용합니다.

전체적인 신호 흐름도(signal flow)는 아래를 참조합니다.

1) 시스템 관리자(administrator)는 감정(emotion)에 맞게 생성된 이미지를 S3 bucket에 복사합니다. 
2) 이미지가 S3 Bucket에 복사되면서 발생한 [S3 put event](https://docs.aws.amazon.com/ko_kr/AmazonS3/latest/userguide/NotificationHowTo.html)를 이용하여 [aws lambda (s3-event)](https://aws.amazon.com/ko/lambda/)를 통해 FIFO 형태의 SQS에 저장합니다. 이후 Lambda(putItem)를 이용하여 순차적으로 꺼내서 [personalize에 putItem](https://docs.aws.amazon.com/ko_kr/personalize/latest/dg/API_UBS_PutItems.html)으로 전달하여 아이템 데이터셋을 생성합니다.
3) 사용자가 카메라 앞에 있을 때에 [Personalize의 detectFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_DetectFaces.html)를 이용해서 감정(emotion)을 분석합니다. 
4) [Personalize의 searchFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_SearchFaces.html)을 이용하여 사용자 아이디(userId)를 확인합니다. 기존에 등록된 얼굴 정보가 없는 경우에는 [rekognition의 Correction](https://docs.aws.amazon.com/rekognition/latest/dg/collections.html)에 신규로 등록합니다. 
5) 사용자는 Rekognition에서 전달받은 userId, emotion이 처음으로 생성되었는지를 DynamoDB 조회를 통해 확인하며, 신규인 경우에는 [Personalize의 putUsers](https://docs.aws.amazon.com/ko_kr/personalize/latest/dg/API_UBS_PutUsers.html)를 이용하여 Personalize의 사용자 데이터셋에 업데이트합니다.
6) 사용자는 [Personalize의 getRecommendations](https://docs.aws.amazon.com/ko_kr/personalize/latest/dg/API_RS_GetRecommendations.html)을 이용하여 "감정 추천" 및 "개인화 추천"을 이용합니다. 
9) 사용자가 감정 이미지를 선택하는 경우에 상호작용(interaction)을 [Personalize의 putEvents](https://docs.aws.amazon.com/personalize/latest/dg/API_UBS_PutEvents.html)을 이용하여 저장하여, 상호작용 데이터셋을 생성합니다. 

![sequence](https://user-images.githubusercontent.com/52392004/236805345-c56801a4-dc53-457d-b1f7-200db0edb02d.png)





## 상세 시스템 구현하기

### 감정(emotion) 확인

[감정 분석](./face-search.md)에서는 [Rekognition의 detectFaces](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_DetectFaces.html)를 이용하여 사용자의 감정 및 성별을 확인하는 방법에 대해 설명합니다.

### 사용자(userId) 확인

[사용자 분석](./face-correction.md)에서는 [Rekognition의 SearchFacesByImageRequest](https://docs.aws.amazon.com/rekognition/latest/dg/search-face-with-image-procedure.html)를 이용하여 사용자의 아이디를 확인합니다.

### 사용자 정보 수집

[사용자 정보 분석](./personalize-user.md)에서는 Personalize에서 사용되는 사용자의 정보의 Schema와 수집방법에 대해 설명합니다.


### 아이템 정보 수집

[Item 정보 수집](./personalize-item.md)에서는 Personalize에서 사용되는 아이템 정보의 Schema와 수집방법에 대해 설명합니다.


### 상호작용 정보 수집

[Interaction 정보 수집](./personalize-interaction.md)에서는 Personalize에서 사용되는 상호작용 정보의 Schema와 수집방법에 대해 설명합니다.


### 추천 Inference 구현

[추천 추론](./recommendation.md)에서는 Personalize로 부터 추론(inference) 요청하는것에 대해 설명합니다. "감정 추천"은 감정에 따라 추천을 수행할 수 있도록 사전에 정의한 상호작용 데이터를 기반으로 추천을 수행하고, "개인화 추천"은 "감정 추천"을 통해 사용자의 상호작용 데이터가 충분히 확보되면 이를 기반으로 추천을 수행합니다. 

## 직접 실습해 보기

### SageMaker JumpStart로 Stable Diffusion 설치

[Stable Diffusion 인프라 설치](./stable-diffusion-deployment.md)를 참조하여 Stable Diffusion을 위한 SageMaker Endpoint를 생성합니다. 

### Cloud9로 인프라 설치

[Cloud9로 인프라 설치](./deployment.md)을 참조하여 인프라를 설치합니다.

### 이미지 생성

[이미지 생성하기](https://github.com/kyopark2014/image-recommender-based-on-emotion/blob/main/image-generation.md)를 따라서 8개 감정에 대한 이미지를 생성합니다. 

### Personalize 학습

[Personalize 학습](https://github.com/kyopark2014/image-recommender-based-on-emotion/blob/main/personalize-training.md)에서는 추천을 위해 Personlize 환경을 준비하는 과정을 설명합니다.

### 실행하기

웹 브라우저를 이용하여 Output의 "Gallery"의 URL로 접속하면 아래와 같은 이미지 추천을 이용할 수 있습니다. [Video] 버튼을 눌러서 video권한을 허용하면 Video화면을 볼 수 있습니다. "감정 추천"을 선택하면 "gender/emotion"로 Personalize의 추천 추론을 수행하며, 해당되는 감정 이미지를 하단에서 3개씩 보여줍니다. [Next]를 통해 다음 순위의 추천 이미지를 3개씩 볼 수 있습니다. 
"개인화 추천"을 선택하면 "userId/emotion"로 추천 추론의 결과를 얻습니다. 처음에는 사용자에 대한 상호작용(interaction) 데이터가 없으므로 최신 아이템 순서대로 보여줍니다. 하지만, 하단의 Like에 해당하는 버튼을 클릭하여 상호작용 결과를 Personalize에 전달하면, 이후에는 개인화된 추천을 이용할 수 있습니다. Personalize는 상호작용에 대한 업데이트를 [2시간 간격으로 자동으로 반영](https://docs.aws.amazon.com/personalize/latest/dg/native-recipe-new-item-USER_PERSONALIZATION.html)하므로 Like 버튼을 10회이상 선택후 일정시간 이후에 개인화된 추천동작을 확인 할 수 있습니다. 

![noname](https://user-images.githubusercontent.com/52392004/236821778-076f6d9c-d338-442e-9ce5-b8c34b79b6ec.png)

### 리소스 정리하기

더이상 인프라를 사용하지 않는 경우에 아래처럼 모든 리소스를 삭제할 수 있습니다. 먼저 [Personalize Console](https://ap-northeast-2.console.aws.amazon.com/personalize/home?region=ap-northeast-2#datasetGroups)에 접속하여, "image-recommender-dataset"을 선택하여 들어간 후에 좌측의 [Custom resouces]에서 Campaign과 Solution을 차례로 삭제합니다. 이후 [Event trackers]를 선택하여 "image-recommender-event-tracker"을 삭제합니다. 

Cloud9의 터미널에 접속하여 아래와 같이 설치한 인프라들을 삭제합니다.

```java
cdk destroy
```

또한, 본 실습에서는 GPU를 사용하는 SageMaker Endpoint를 사용하므로 실습이 끝나고 반드시 삭제하여야 합니다. [SageMaker Models](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/models), [SageMaker Endpoints](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/endpoints), [SageMaker Endpoint configuration](https://ap-northeast-2.console.aws.amazon.com/sagemaker/home?region=ap-northeast-2#/endpointConfig)에서 생성했던model, endpoint, endpoint configuration을 모두 삭제합니다.

[Cloud9 console](https://ap-northeast-2.console.aws.amazon.com/cloud9control/home?region=ap-northeast-2#/)에서 배포에 사용되었던 Cloud9을 삭제합니다.


## 결론

AWS의 완전 관리형 AI 서비스인 Amazon Rekognition을 이용하여 카메라로 부터 얻어진 얼굴 이미지로부터 감정을 분석하고 얼굴 아이디를 생성하였습니다. 또한, Amazon Personalize를 이용하여 상호작용(interaction) 데이터가 없는 경우에는 "감정 추천"을 적용하고, 데이터가 쌓이면 "개인화 추천"을 제공하는 방법을 제안하였습니다. 감정을 표현하기 위해 생성한 이미지들은 SageMaker JumpStart의 생성 AI 모델인 Stable Diffusion을 이용하였으며, 비용 효율적으로 다수의 이미지를 빠르게 생성할 수 있는 Event Driven 아키텍처를 구현하였습니다. 감정을 활용한 개인화 추천은 개별 상황에 최적화된 추천을 수행할 수 있어서 다양한 용도로 활용될 수 있을 것으로 기대됩니다.
