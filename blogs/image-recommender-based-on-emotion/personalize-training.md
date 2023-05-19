# Personalize 학습

## Event Tracker 설정 

Personalize에서 User와 Interaction 데이터를 수집하기 위해서는 Event Tracker를 생성하여야 합니다. [Data Group Console](https://ap-northeast-2.console.aws.amazon.com/personalize/home?region=ap-northeast-2#datasetGroups)로 진입하여, 아래와 같이 "image-recommender-dataset"을 선택합니다. 이후 [Create event tracker]를 선택합니다. 
![image](https://user-images.githubusercontent.com/52392004/236887595-2f4f3ab7-2e68-4fec-94d1-309cc9708d36.png)

![noname](https://user-images.githubusercontent.com/52392004/235288753-56861bb5-33f8-42d6-8f2b-9db63ea2ebc1.png)

[Configure tracker]에서 아래와 같이 [Tracker name]로 "image-recommender-event-tracker"로 입력 후에 [Next]를 선택하고, [Finish]를 선택합니다.

![noname](https://user-images.githubusercontent.com/52392004/235288895-e64a2799-6070-4d5b-9929-33e31f384a13.png)

왼쪽 메뉴의 [Event trackers]를 선택한 후에 "image-recommender-event-tracker"를 선택하면, 아래와 같이 Tracking ID를 확인할 수 있습니다. 아래와 같이 여기에서는 Tracking ID가 "326c8489-2683-420c-b7eb-4ac44bde346d"임을 알 수 있습니다.

![noname](https://user-images.githubusercontent.com/52392004/235289151-d19d0cc7-7e61-4acc-8faf-fde2083d9b16.png)

Tracking ID 정보를 업데이트하여야 하므로, 다시 Cloud9의 왼쪽 메뉴에서 "image-recommender-based-on-emotion/cdk-image-recommender/lib/cdk-image-recommender-stack.ts"을 오픈후에 아래와 같이 trackingId를 업데이트 합니다.

![noname](https://github.com/kyopark2014/image-recommender-based-on-emotion/assets/52392004/09c14bb0-5646-434e-838e-b7a79ecafc89)

이후 터미널에서 아래와 같이 CDK folder로 이동하여 재배포를 합니다.

```java
cd cdk-image-recommender/ && cdk deploy
```


## Personalize DataSet 준비

Personalize는 최소 25명 이상의 user와 최소 1000개 이상의 interaction 데이터가 있어야 합니다. 따라서 gallery에서 이미지를 보여주기 위해서는 먼저 최소한의 Traning Dateset을 준비하여야 합니다.

### Enabler 이용한 데이터셋 생성

Enabler를 이용하여 데이터를 수집할 수 있습니다. Enabler는 DynamoDB에서 item 정보를 가져와서 감정에 따라 보여주고, 사용자의 선호를 like API를 이용해 수집합니다. Enabler의 접속은 Output의 주소 "Enabler"를 이용합니다. Enabler를 이용하여 25명에 대한 1000개의 interaction 데이터셋을 수집하는 것은 많은 시간이 소요되므로 아래와 같이 Dataset Generator을 사용하여 편리하게 생성할 수 있습니다.

### Dataset Generator를 이용한 데이터셋 생성

Dataset Generator를 이용해 Personalize에 dataset을 push 합니다. Dataset Generator의 접속 위치는 Output의 "DatasetGenerator"을 이용하여 아래와 같이 접속 후에 [Generate]를 선택합니다.

![noname](https://user-images.githubusercontent.com/52392004/236651606-a6e41a37-526f-459a-9992-c2d153deb021.png)

Dataset Generator는 [datasetGenerator.js](./html/datasetGenerator.js)와 같이 userId를 `${gender}/${emotions[i]}`와 같이 성별(gender)과 감정(emotion)에 따라 [lambda-generate-dataset](./utils/lambda-generate-dataset/index.js)을 호출합니다. lambda-generate-dataset은 DynamoDB에 있는 item 데이터를 이용하여 interaction 데이터셋을 생성합니다.


## Solution / Campaign 생성

[Dataset groups Console](https://ap-northeast-2.console.aws.amazon.com/personalize/home?region=ap-northeast-2#datasetGroups)로 접속하여 "image-recommender-dataset"로 접속하여 왼쪽 메뉴의 [Datasets] - [Data analysis]을 선택한 후에 [Run analysis]을 선택하여 분석합니다. 분석 결과(Insights)에서 User의 숫자가 25이하, interaction이 1000이하로 알림이 발생하면, Personalize에서 입력한 데이터가 분석중임으로 수분 정도 대기한 후에 재시도 합니다.

![noname](https://user-images.githubusercontent.com/52392004/236587998-9eb43e7d-8a70-405b-a375-0e5cd4443f69.png)

[Solution Console](https://ap-northeast-2.console.aws.amazon.com/personalize/home?region=ap-northeast-2#datasetGroups)로 접속하여, 이미 생성한 dataset인 "image-recommender-dataset"을 선택하여 진입한 후에 [Create solution]을 선택합니다. 이후 아래와 같이 [Solution name]으로 "image-recommender-solution"을 입력하고 [Solution type]으로 "Item recommendation"을 선택한 다음에 [Recipe]로 "aws-user-personalization"을 선택합니다. Solution 생성에는 약 20분정도가 소요됩니다. 

![noname](https://user-images.githubusercontent.com/52392004/236587663-303ddd63-7d15-4c08-854a-6bc83e71114e.png)

왼쪽 메뉴에서 아래와 같이 [Campaigns]를 선택한 후에 [Create campaign]을 선택합니다.

![noname](https://user-images.githubusercontent.com/52392004/236588384-30301d37-b432-4ebc-9914-f43438e06005.png)

아래와 같이 [Campaign name]으로 "image-recommender-campaign"으로 입력한 후에 [Solution]으로 "image-recommender-solution"을 선택합니다. 이후 [Create campaign]을 선택하면 약 10분 정도후에 Campaign이 생성합니다.  

![noname](https://user-images.githubusercontent.com/52392004/236588352-c2f038f8-c456-424d-b2f5-f4d3134d8f7f.png)



