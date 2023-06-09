# My Emotion Gardens 

AWS Summit Seoul 2023에서 "My Emotion Gardens"가 메인 데모로 전시되었습니다. "My Emotion Gardens"의 주요 구성은 아래와 같습니다.

![IMG_20230508_104538_959](https://user-images.githubusercontent.com/52392004/236716359-1fffda3f-4cbf-4f34-b002-d0a334c5e08a.jpg)

## 데모 시나리오

> 이상적인 시나리오는 사용자의 감정 및 주요 키워드, 조도, 습도 등의 센서 정보를 기반으로 SageMaker JumpStart 내의 Stable Diffusion 모델에서 실시간으로 생성한 이미지들을 보여주며, 앞의 정보들이 변경될 때마다 실시간으로 이미지가 변경되는 모습입니다. 데모 환경에서는 환경 변화에 대한 센싱이 명확하지 않으며 실시간 이미지 생성의 대기시간이 현장의 인터넷 환경을 고려할 때 데모에 적합한 수준을 벗어난다고 판단되어, IoT 기기는 고객의 감정에 따른 output 으로 활용하고 미리 생성AI 기술을 통해 만들어진 이미지 셋트를 보유한 상태로 시작합니다. 현장에서 라이브로 구현되는 부분은 Amazon Rekognition 을 통한 머신러닝 기반의 이미지(사진) 분석 및 Amazon Personalize 를 통한 이미지 추천, IoT 기기들의 변화 그리고 각종 데이터에 대한 대시보드로의 반영입니다.

1. 디스플레이는 사용자가 없는 상태에서 이미지를 리프레쉬 하면서 자동 디스플레이를 하고 있으며, 조명은 대기모드로 준비중입니다. 
2. 사용자가 Kiosk 를 사용하기 시작하면 조명이 점멸됩니다.
3. 사용자가 Kiosk 에서 사진을 촬영하고, 선호하는 날씨와 계절 및 시간대를 선택합니다. 촬영된 사진은 Amazon Rekognition 에서 사용자가 현재 어떤 감정 상태이고 어떤 사람인지(나이, 성별)를 분석하는데 사용되며, 저장되지 않습니다. 사용자에 대한 분석이 완료되면, 그 정보와 함께 앞서 사용자가 선택한 날씨, 계절, 시간대에 해당하는 이미지를 gardenfromDB API 을 통해 DynamoDB 에서 검색하여 이미지를 추출합니다.
4. 추출된 이미지는 디스플레이 기기와 Kiosk에 보여지며, 사용자의 감정과 현재 상태에 어울리는 색상으로 조명이 변경됩니다. 가습기와 펜은 일부 사용자의 상태에 맞게 조절됩니다.
5. 사용자가 Kiosk 에서 가장 선호하는 이미지를 하나 고르면, 다음 화면에서 선택한 1개의 이미지와 함께 Like API 를 통해 Amazon Personalize 에서 고객의 감정/성별/연령대 정보로 추천된 이미지 2개가 함께 보여집니다.
6. 최종적으로 사용자가 소유하고 싶은 하나의 이미지를 선택하면 해당 이미지에 대한 QR 코드가 발급되고, 사용자는 핸드폰 카메라로 QR 코드를 통해 본인이 선택한 이미지를 다운로드 하여 가져갈 수 있습니다.


## 전체 아키텍처
![2023 AWS Summit Seoul_MyEmotionGardens_Architecture](./images/MyEmotionGardens_Architecture.png)

1. [Amazon SageMaker](https://aws.amazon.com/ko/sagemaker/)의 [JumpStart](https://aws.amazon.com/ko/sagemaker/jumpstart/)을 사용하여 Stable Diffusion Foundation Model을 생성하고, SageMaker Endpoint를 배포합니다.
2. [AWS Lambda](https://aws.amazon.com/ko/lambda/) 함수는 SageMaker Endpoint를 이용하여 이미지를 생성하고, [Amazon S3](https://aws.amazon.com/ko/s3/)에 저장합니다.
3. S3에 저장된 이미지 정보는 [Amazon DynamoDB](https://aws.amazon.com/ko/dynamodb/)에 저장되고, 향후 추천을 위해 [Amazon Personalize](https://aws.amazon.com/ko/personalize/) 에도 아이템으로 넣어줍니다.
4. Kiosk 앱은 [Amazon Amplify](https://aws.amazon.com/ko/amplify/)로 제작되었습니다. [Amazon Cognito](https://aws.amazon.com/ko/cognito/)를 통해 인증 처리를 하고, [AWS AppSync](https://aws.amazon.com/ko/appsync/)를 이용해 DynamoDB 데이터를 읽고 쓸 수 있습니다.
5. [Amazon API Gateway](https://aws.amazon.com/ko/api-gateway/)를 통해 백엔드의 Lambda 함수를 호출합니다. [Amazon CloudFront](https://aws.amazon.com/ko/cloudfront/)의 배포를 통해 이미지를 비롯한 정적 컨텐츠, API들이 서비스 됩니다. 
6. Kiosk에서 사진을 찍으면 [Amazon Rekognition](https://aws.amazon.com/ko/rekognition/) 서비스에서 얼굴 이미지를 분석하여 감정(Emotion) 정보를 얻습니다.
7. [Amazon Personalize](https://aws.amazon.com/ko/personalize/)에서 이 감정과 사용자 선택 정보에 맞는 이미지를 추천합니다. 사용자는 추천된 이미지 중에 마음에 드는 이미지를 선택할 수 있고, 이 선택은 Personalize에 더 나은 추천을 위한 이벤트 정보로 입력되고, DynamoDB에도 저장됩니다. 
8. 이미지들이 Kiosk에 디스플레이되고, 동시에 [AWS IoT Core](https://aws.amazon.com/ko/iot-core/)를 통해 Thing(라즈베리파이)에 명령을 전달하고, 조명과 가습기, 서큘레이터들이 사용자의 선택과 추천된 이미지에 어울리게 동작합니다.
9. [Amazon QuickSight](https://aws.amazon.com/ko/quicksight/) 대시보드는 Demo zone에서의 데이터를 집계하여 보여줍니다. NoSQL DB인 DynamoDB의 데이터 연결을 위해서 [Amazon Athena](https://aws.amazon.com/ko/athena/)가 같이 사용됩니다. 


## 이미지 생성 및 추천

[이미지 생성 및 추천](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/tree/main/AWS-Summit-Seoul-2023/image-generation-and-recommendation)에서는 감정(emotion)과 키워드(favorite)를 이용한 Stable Diffusion 이미지 생성을 진행하고 이를 제공하기 하기 위한 Architecture를 보여줍니다. 생성된 이미지는 API를 통해 Kiosk 및 여러 대의 Display에서 사용되며, 사용자는 여러개의 디스플레이에서 이미지를 선택한 이후에 선택한 이미지와 Amazon Personalize를 통해 추천된 이미지들중에 최종적으로 이미지를 선택하여 가져갈 수 있습니다. 

## 이미지 생성에 사용된 Generative AI
Generative AI는 인공 지능 분야의 하나로, 기존의 데이터에서 패턴을 학습하고 이를 기반으로 새로운 데이터나 새로운 콘텐츠를 생성하는 시스템을 말합니다. 이러한 시스템은 기계 학습 알고리즘을 사용하여 새로운 텍스트, 이미지, 음성 녹음 등을 생성할 수 있습니다. Generative AI는 예술, 디자인, 문학, 음악 등 다양한 분야에서 창작물을 만드는 데 활용될 수 있습니다. Generative AI 시스템은 일반적으로 대량의 데이터를 기반으로 학습됩니다. 예를 들어, 언어 모델을 학습하기 위해서는 대량의 텍스트 데이터가 필요합니다. 학습 데이터를 기반으로 모델은 데이터 내에서 패턴을 찾고, 이를 이용해 새로운 데이터를 생성할 수 있습니다.

### My Emotion Gardens 에서 생성한 이미지 예시

**입력한 프롬프트**
> botanic garden with flowers and ((dog)), very strong (((happy))) nature, best quality, ((sunny)), ((spring)), cinematic lighting, dramatic angle, wide angle view, [illustration: real artstation: 0.4], stunningly beautiful, dystopian, (day)


**생성된 이미지**
![img_20230418-05818_14h](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/1788481/68694742-4490-4d80-b8c7-748195ffe20b)

## Kiosk

## IoT 

## Dashboard
[Dashboard](./dashboard)에서는 사용자가 Kiosk에서 생성한 데이터를 볼 수 있는 Dashboard에 대해 설명하고 있습니다. Dashboard는 Amazon의 Cloud Native BI서비스인 [Amazon Quicksight](https://aws.amazon.com/ko/quicksight/)를 사용하였습니다. Dashboard는 감정 중심의 통계를 볼 수 있는 Emotion, 사용자의 데이터를 집계한 Owner, 가장 많은 좋아요를 받은 이미지 20개를 보여주는 Gallery까지 총 3개의 Sheet로 구성했습니다.

## Display

[display-viewer](./display-viewer) 생성된 이미지를 정원의 디스플레이를 통해 보여주는 뷰어입니다.

[prompt-generator](./prompt-generator) My Emotion Gardens에 사용될 이미지 생성을 위해 사용한 Prompt Generator 입니다. 

