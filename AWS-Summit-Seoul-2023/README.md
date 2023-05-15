# My Emotion Gardens 

AWS Summit Seoul 2023에서 "My Emotion Gardens"가 메인 데모로 전시되었습니다. "My Emotion Gardens"의 주요 구성은 아래와 같습니다.

![IMG_20230508_104538_959](https://user-images.githubusercontent.com/52392004/236716359-1fffda3f-4cbf-4f34-b002-d0a334c5e08a.jpg)


## 이미지 생성 및 추천

[이미지 생성 및 추천](https://github.com/aws-samples/generative-ai-demo-using-amazon-sagemaker-jumpstart-kr/tree/main/AWS-Summit-Seoul-2023/image-generation-and-recommendation)에서는 감정(emotion)과 키워드(favorite)를 이용한 Stable Diffusion 이미지 생성을 진행하고 이를 제공하기 하기 위한 Architecture를 보여줍니다. 생성된 이미지는 API를 통해 Kiosk 및 여러 대의 Display에서 사용되며, 사용자는 여러개의 디스플레이에서 이미지를 선택한 이후에 선택한 이미지와 Amazon Personalize를 통해 추천된 이미지들중에 최종적으로 이미지를 선택하여 가져갈 수 있습니다. 

## Kiosk

## IoT 

## Dashboard
[Dashboard](./dashboard)에서는 사용자가 Kiosk에서 생성한 데이터를 볼 수 있는 Dashboard에 대해 설명하고 있습니다. Dashboard는 Amazon의 Cloud Native BI서비스인 [Amazon Quicksight](https://aws.amazon.com/ko/quicksight/)를 사용하였습니다. Dashboard는 감정 중심의 통계를 볼 수 있는 Emotion, 사용자의 데이터를 집계한 Owner, 가장 많은 좋아요를 받은 이미지 20개를 보여주는 Gallery까지 총 3개의 Sheet로 구성했습니다.

## Display

[display-viewer](./display-viewer) 생성된 이미지를 정원의 디스플레이를 통해 보여주는 뷰어입니다.

[prompt-generator](./prompt-generator) My Emotion Gardens에 사용될 이미지 생성을 위해 사용한 Prompt Generator 입니다. 

