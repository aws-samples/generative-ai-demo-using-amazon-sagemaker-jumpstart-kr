# **DashBoard**

사용자가 Kiosk에서 생성한 데이터를 볼 수 있는 Dashboard입니다. Dashboard는 Amazon의 Cloud Native BI서비스인 Amazon Quicksight를 사용하였습니다. Dashboard는 감정 중심의 통계를 볼 수 있는 Emotion, 사용자의 데이터를 집계한 Owner, 가장 많은 좋아요를 받은 이미지 20개를 보여주는 Gallery까지 총 3개의 Sheet로 구성했습니다. Dashboard를 통해 AWS Summit Seoul 2023기간동안 My Emotion Gardens Booth에 방문한 사람들로부터 모아진 데이터를 한 눈에 볼 수 있습니다.

<br>

## Demo Dashboard

1. Emotion
Amazon Rekognition을 사용해 분석한 Emotion값을 기준으로 감정별 나이대, 성별등 Emotion을 기준으로 My Emotion Garden에서 수집한 데이터를 볼 수 있습니다.
![QS-EmotionSheet](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/98747932/34c5acb9-728f-4ab5-9bbb-12840bb873af)

2. Owner
Kiosk에서 찍은 사용자 이미지는 Amazon Rekognition으로 보내지고 해당 이미지의 분석 결과는 DynamoDB에 Kiosk의 선택 데이터와 함께 저장됩니다. Owner Sheet에서는 Rekognition에서 분석 결과 중 하나인 사진으로부터 예측한 사용자의 나이 정보를 포함해 Kiosk에서 선택한 선호하는 계절, 날씨, 시간대 등 사용자 기준으로 데이터를 집계하여 볼 수 있습니다.
![QS-OwnerSheet](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/98747932/e3ba214f-fbb5-47e9-a8d4-6314163b39ed)


3. Gallery
Gallery는 Demo Booth에 방문한 사용자들으로부터 가장 많은 좋아요를 받은 20개의 이미지를 보여주기 위한 간단한 웹사이트를 만들고 해당 웹사이트를 QS내에 인입하여 볼 수 있도록 구현했습니다.
![QS-GallerySheet](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/98747932/aa59065d-6840-429e-ae0f-6394b85e815a)

---

<br>

## 구현 방식


Kiosk에서 생성되는 Data는 Amazon DynamoDB에 저장됩니다. DynamoDB에 저장된 Data를 QuickSight에서 DataSource로 가져오기위해서는 Athena를 사용했습니다.
Athena에서 DynamoDB의 Data를 연결하기위해 Lambda Connector를 사용합니다.

![QS-Architecture](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/98747932/3d8c2276-d1f5-4133-b729-cb347a3f5687)



<br>

위와 같이 Quicksight에 연결한 DataSource는 자동으로 Refresh 할 수 있도록 Schedule을 설정할 수 있습니다. Refresh에는 Full refresh와 Incremental refresh가 있습니다. 여기에서는 Incremental refresh Schedule을 설정하여 Booth 방문한 사용자의 데이터를 15분 주기로 가져올 수 있도록 했습니다.

![QS-DataSourceRefresh](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/98747932/5a63797b-1e35-46e4-8118-3d22afd9ca63)

<br>

QuickSight의 Analysis에서 필요한 Data생성을 위해서 Calculated fields를 생성할 수 있습니다. Calculated fields에는 간단한 연산자나 수식을 지원하므로 기존의 데이터를 사용하여 원하는 데이터를 만들 수 있습니다. 여기서는 Rekognition에서 추측한 사용자들의 Age 평균값을 계산하여 Demo Booth 방문자의 평균 연령을 계산하는 등에 사용했습니다.
![QS-CalculatedFields](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/assets/98747932/15beff12-177f-483e-afa7-98038c1c9a69)

<br>

----

## Gallery
Gallery에서는 좋아요 개수가 많은 순으로 이미지를 조회하여 보여줍니다. 좋아요 순으로 이미지를 조회하고 정렬하기 위해 Lambda함수를 사용하여 간단한 조회화면을 구현한 뒤 Quicksight에 인입했습니다.<br>
[Lambda Function](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/tree/main/AWS-Summit-Seoul-2023/dashboard/lambda-top-likes-image-list)
<br>

----

<br>

해당 Repository에는 Demo에서 사용한 Dashboard를 json형태로 추출한 파일이 포함되어 있습니다
해당 json파일을 사용하여 Dashboard를 생성하는 방법은 아래 AWS Blog를 참고하시기 바랍니다.

[New Amazon QuickSight API Capabilities to Accelerate Your BI Transformation](https://aws.amazon.com/blogs/aws/new-amazon-quicksight-api-capabilities-to-accelerate-your-bi-transformation/)

